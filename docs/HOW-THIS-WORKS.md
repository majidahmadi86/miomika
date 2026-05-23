# How Miomika Works

> The single technical truth for this project. If code disagrees with this doc, ONE of them is wrong — fix immediately. Drift is the #1 expensive bug class.
>
> Last updated: RESET-3 (May 2026)
> Audience: any developer or Claude/Cursor session opening this repo for the first time.

---

## 1. Auth flow

### The happy path (Google OAuth)

1. User opens `/login` or `/signup` and clicks "Sign in with Google".
2. Browser is sent to Supabase OAuth (`dfufsjnneiwzllkawahv.supabase.co/auth/v1/authorize?...`).
3. Supabase redirects to Google consent screen.
4. Google bounces back to Supabase with an authorization grant.
5. Supabase redirects to **`https://www.miomika.com/auth/callback?code=...`**.
6. The route handler `app/auth/callback/route.ts` runs:
   - Calls `supabase.auth.exchangeCodeForSession(code)` which sets `sb-*-auth-token` cookies on the response.
   - Calls `getServerProfile()` inline (no HTTP hop — cookies are already on `next/headers`).
   - Picks redirect destination:
     - No `onboarding_completed_at` → `/onboarding`
     - Completed less than 30s ago → `/home?celebrate=signup`
     - Otherwise → `/home`
7. Browser follows the 307 to the destination with session cookies attached.

### Email/password signup

1. User submits the signup form on `/signup`.
2. Client calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`.
3. Supabase sends a confirmation email.
4. User clicks the link → lands on `/onboarding`.
5. Onboarding completion writes `onboarding_completed_at` to the profile and dispatches `window.dispatchEvent("miomika:profile-refresh")`. Client hits `/api/auth/post-signup` to get the next destination.

### Critical invariants

- **Canonical host is `www.miomika.com`.** Apex `miomika.com` 307-redirects to www at the Vercel layer. All Supabase cookies are scoped to www. If you ever see a cookie on `miomika.com` (no www) in DevTools, something is misconfigured.
- **Supabase Dashboard Site URL is `https://www.miomika.com`.** Redirect URLs allow-list must include `https://www.miomika.com/**`. Do NOT include the apex.
- **`/auth/callback` is the only OAuth landing route.** The path **/api/auth/callback** does not exist as a real route — it appears only in old Google Cloud Console redirect URI entries that are dead and can be deleted (cosmetic).
- **`/api/auth/post-signup`** is called by client code after onboarding completes. It is NOT called from inside the callback handler — that pattern is broken because `cookies()` from `next/headers` reads the outer request, not a manually-forwarded `Cookie:` header.

---

## 2. State of truth

### Identity, tier, onboarding status

| Where you are | Use this |
|---|---|
| Server component, API route, server action | `getServerProfile()` from `lib/auth/get-server-profile.ts` |
| Client component | `useProfile()` from `lib/auth/use-profile.ts` |

**Rules:**

- `getServerProfile()` returns `null` for guests. Always check.
- `useProfile()` returns `{ profile, loading, authReady }`. **Always gate on `authReady === true`** before treating `profile === null` as "guest" — otherwise you flash guest UI to logged-in users during the first render.
- **Never** trust `tier`, `userId`, `isGuest`, or any identity field sent in a request body. Always re-resolve server-side with `getServerProfile()`.

### Canonical tables

- `public.profiles` — the only user table. Keyed by `id` (= auth.users.id).
- `public.users_legacy_backup` — does not exist (dropped in migration 0012).

If you find code reading `public.users` anywhere, that is a bug. Replace it with a `getServerProfile()` call.

### Onboarding completion (the contract)

- Source of truth: `profiles.onboarding_completed_at` (timestamp or null).
- Client must not decide "onboarding is done" from local state alone.
- On completion: write to DB → `window.dispatchEvent("miomika:profile-refresh")` → `useProfile` re-fetches → router pushes to `/home?celebrate=signup`.

---

## 3. Voice (MediaRecorder + Groq Whisper)

### Strategy: record audio, transcribe server-side

`components/talk/MicButton.tsx` uses `MediaRecorder` to capture an audio blob, then POSTs it to `/api/talk/transcribe` which transcribes via Groq Whisper.

Why not Web Speech API: it's broken on many Android Chrome builds (silent `onstart → onend` with no audio delivered). Server-side STT bypasses platform inconsistency entirely.

### Recording lifecycle

1. User taps mic → `getUserMedia({ audio: true })` acquires stream.
2. `MediaRecorder` starts recording. `AudioContext` analyzer monitors amplitude.
3. When amplitude stays below `SILENCE_THRESHOLD` (0.03) for `SILENCE_DURATION_MS` (1500ms), recording stops automatically.
4. User can also tap mic to stop manually.
5. Hard cap at `MAX_RECORDING_MS` (12000ms) prevents runaway recordings.
6. On stop, audio blob is POSTed to `/api/talk/transcribe` with the language preference.
7. Server returns `{ text }` → `onTranscript(text, true)` fires → parent moves to `processing` → `speaking`.

### Recovery from denied permission

When `getUserMedia` throws (user blocked mic), component enters `needs-permission` state. UI renders recovery card with "Tap to allow again." Re-tap calls `getUserMedia` again to re-prompt.

### Debug overlay

Long-press the mic button (800ms) toggles a debug overlay showing the last 10 events, current state, and current amplitude. Essential for diagnosing voice issues on real devices.

### Browser support

| Browser | Status |
|---|---|
| Chrome (Android, desktop) | Supported |
| Edge (desktop, mobile) | Supported |
| Safari (iOS, macOS) | Supported |
| Samsung Internet | Supported (works now — previously broken with Web Speech API) |
| Firefox | Supported |

Fallback (no `MediaRecorder` or no `getUserMedia`) shows "Voice unavailable~ just type below" message.

### Cost

Groq Whisper Large v3 Turbo: roughly $0.0001 per utterance. A user speaking 100 times costs ~$0.01. Acceptable for our usage envelope.

---

## 4. Debugging

### Client logs

By default, the client console is silent in production. To enable for your session:

- Append `?debug=1` to any URL, OR
- Run in DevTools console: `localStorage.setItem("miomika_debug", "1")` (persists across reloads until you clear it)

In development, client logs are always on.

### Server logs

Always on. View at: **https://vercel.com/miomika/logs** (or your team's Vercel project).

Filter by scope using the search box, e.g. search `[auth.callback]` to see only OAuth callback events.

### The log function

All logging goes through `log(scope, msg, data?)` from `lib/debug/log.ts`. Example:

```ts
import { log } from "@/lib/debug/log";

log("auth.callback", "exchanged session", { user: data.user?.email });
log("mic", "state idle→listening", { lang: "en-US" });
log("profile.server", "fetched", { tier: profile.tier, latency: 42 });
```

Email addresses are auto-redacted in production (`majid@x.com` → `maj…@`).

### Pre-deploy verification

`npm run build` automatically runs `npm run predeploy` first, which chains:

1. `tsc --noEmit` — TypeScript compiles cleanly
2. `npm run lint` — ESLint passes
3. `npm run check:drift` — every route documented in this file has a corresponding `route.ts` implementation

If any of those fail, the build aborts. **You cannot deploy broken code.**

To run the drift check by itself: `npm run check:drift`

### Sentry

Sentry auto-captures unhandled errors. To make filtering useful, every major flow boundary sets a `flow` tag:

| Boundary | Tag value |
|---|---|
| `app/auth/callback/route.ts` | `oauth` |
| `app/api/auth/post-signup/route.ts` | `oauth` |
| `components/talk/MicButton.tsx` (first user interaction) | `voice` |
| `app/api/engine/**/*` | `engine` |

In Sentry, filter by `flow:oauth` to see only auth callback errors, `flow:voice` for mic issues, etc.

To add a new flow boundary: `import * as Sentry from "@sentry/nextjs"` and call `Sentry.setTag("flow", "your-flow-name")` at the top of the handler.

---

## 5. Known dead ends and why

These are written down so future sessions don't waste time re-discovering them.

- **Path /api/auth/callback** — does NOT exist as a real route. Old Google Cloud Console redirect URIs point there; they're harmless leftovers from before the codebase used the `/auth/callback` (App Router) path. Clean up when convenient.
- **Calling `/api/auth/post-signup` from inside the callback handler via `fetch()` with a manually-forwarded `Cookie:` header** — does NOT work. `cookies()` from `next/headers` reads the outer request, not the forwarded header. The callback handler resolves the profile inline via `getServerProfile()` instead.
- **`recognition.start()` inside `onend`** — triggers Chrome anti-abuse, mic gets revoked after 1-2 utterances. Use single-shot recognition instead.
- **Setting Supabase Site URL to `https://miomika.com`** (no www) when the browser is on `www.miomika.com` — causes `bad_oauth_state` because the PKCE code-verifier cookie is on a different host than the one Supabase tries to redirect back to. Always use the canonical host (www).
- **Samsung Internet + Web Speech API** — not supported. The MicButton renders a fallback message asking the user to open in Chrome.

---

## 6. File map (where things live)

| Concern | File |
|---|---|
| Server-side profile read | `lib/auth/get-server-profile.ts` |
| Client-side profile hook | `lib/auth/use-profile.ts` |
| Supabase server client | `lib/supabase/server.ts` |
| Supabase browser client | `lib/supabase/client.ts` |
| Supabase middleware helper | `lib/supabase/middleware.ts` |
| OAuth callback handler | `app/auth/callback/route.ts` |
| Post-signup router | `app/api/auth/post-signup/route.ts` |
| Mic button + voice recognition | `components/talk/MicButton.tsx` |
| Speech API helpers | `lib/talk/speech-support.ts` |
| Warmth phrases (Thai/English UI strings) | `lib/voice/warmth.ts` |
| Design tokens (colors, gradients) | `lib/design/colors.ts` |
| Unified logger | `lib/debug/log.ts` |
| Drift check script | `scripts/check-drift.ts` |

For everything else, see `/MIOMIKA.md` §11 Codebase Map.
