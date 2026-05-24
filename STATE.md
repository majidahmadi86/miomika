# MIOMIKA — STATE OF THE PROJECT

> This is the only document any new developer or AI session needs to read.
> Read this top-to-bottom. Then read the code. You have full context.
>
> Last clean reset: RESET-FOUNDATION (May 2026)

---

## What Miomika is

An AI companion (a cat named Miomi) that teaches English to Thai users
through conversation. Voice-first. Mobile-primary. Built by Mike, a
solo founder in Bangkok. Hosted on Vercel + Supabase + Groq.

The cat is the product. Language learning is the wedge.

---

## Tech stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **Auth + DB:** Supabase (project `dfufsjnneiwzllkawahv`)
- **AI:**
  - Google Gemini (`@google/genai`) — conversational engine
  - Groq Whisper Large v3 Turbo — speech-to-text
- **Voice activity detection:** `@ricky0123/vad-web` (Silero VAD ONNX model, runs in-browser)
- **Hosting:** Vercel (function region pinned to `sin1` for Thai latency)
- **Monitoring:** Sentry (`@sentry/nextjs`)
- **Styling:** Tailwind 4

Canonical host: **`www.miomika.com`** (apex `miomika.com` 307→ www).
Supabase Site URL: `https://www.miomika.com`. Redirect URLs allow-list must be www-only.

---

## File map — only what matters

| Concern | File |
|---|---|
| OAuth callback handler | `app/auth/callback/route.ts` |
| Post-signup router (client-called) | `app/api/auth/post-signup/route.ts` |
| Voice transcription (Groq Whisper) | `app/api/talk/transcribe/route.ts` |
| Mic button (VAD-driven) | `components/talk/MicButton.tsx` |
| Middleware (auth + language cookie) | `middleware.ts` |
| Server-side profile read | `lib/auth/get-server-profile.ts` |
| Client-side profile hook | `lib/auth/use-profile.ts` |
| Supabase clients | `lib/supabase/{client,server,middleware}.ts` |
| Unified logger | `lib/debug/log.ts` |
| Drift check (runs in predeploy) | `scripts/check-drift.ts` |
| Design tokens (colors, gradients) | `lib/design/colors.ts` |
| Thai/English warm phrases | `lib/voice/warmth.ts` |

Anything not listed: don't touch without re-reading this doc.

---

## Auth flow (one paragraph)

User clicks Google on `/login` or `/signup` → Supabase OAuth → returns to
`https://www.miomika.com/auth/callback?code=...` → callback exchanges code,
writes `sb-*-auth-token` cookies onto its response, reads
`getServerProfile()` inline (no fetch hop), redirects to `/onboarding` if
new user OR `/home` if returning. Onboarding is a 3-second celebration
(no form), marks `profiles.onboarding_completed_at`, auto-routes to
`/home?celebrate=signup`. Returning users go straight to `/home`.

**Critical:** middleware MUST NOT touch `/auth/callback`. The matcher
excludes it explicitly. Wrapping the callback's redirect response in
middleware strips its `Set-Cookie` headers on Android Chrome.

---

## Voice flow (one paragraph)

User opens `/talk` → MicButton mounts → on first tap, requests mic permission
once and starts a VAD session via `@ricky0123/vad-web`. VAD continuously
listens, detects speech start (real onset, not amplitude threshold),
detects speech end (genuine pause, works in noisy environments),
auto-emits a complete utterance blob. Blob is POSTed to
`/api/talk/transcribe` with `credentials: "include"`. Server validates,
calls Groq Whisper, returns `{ text }`. Parent component handles the
text. The VAD session stays warm across utterances — no stream
re-acquisition between turns. Releases on unmount or 60s idle.

**Guests CAN use voice.** Voice is the conversion mechanism, not a
gated feature.

---

## State of truth

| Where you are | Use this |
|---|---|
| Server component / API route / server action | `getServerProfile()` |
| Client component | `useProfile()` returns `{ profile, loading, authReady }` |

**Always gate client UI on `authReady === true`** before treating
`profile === null` as guest. Never trust client-sent tier or userId.

---

## Debugging

- **Client logs:** add `?debug=1` to URL, or `localStorage.miomika_debug = "1"`. Otherwise silent in production.
- **Server logs:** always on at `vercel.com/miomika/logs`. Search by scope prefix like `[auth.callback]` or `[voice.transcribe]`.
- **All logs go through `log(scope, msg, data?)`** from `lib/debug/log.ts`. Auto-redacts emails in production.
- **Sentry:** every flow boundary calls `Sentry.setTag("flow", "...")` — values: `oauth`, `voice`, `engine`. Filter Sentry by `flow:voice` to see only mic issues.
- **Pre-deploy:** `npm run build` automatically runs `tsc + lint + drift check`. Cannot deploy broken code.
- **Drift check:** `scripts/check-drift.ts` verifies every route mentioned in this STATE.md exists as a `route.ts` file. Runs in `predeploy`.

---

## Environment variables

Required in `.env.local` for dev AND in Vercel project settings for prod:

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase clients |
| `GROQ_API_KEY` | `/api/talk/transcribe` |
| `RESEND_API_KEY` | welcome email |
| `SENTRY_AUTH_TOKEN` | source maps upload (CI only) |

---

## Database (Supabase)

Single user table: `public.profiles`, keyed by `id` (= `auth.users.id`).
Migration `0012_brutal_reset.sql` dropped the legacy `users_legacy_backup` table permanently. There is no `public.users` table. If you find code reading `public.users`, replace with `getServerProfile()`.

Schema fields you'll actually use (from `lib/auth/get-server-profile.ts`):
`id, email, display_name, tier, journey_stage, gender, ui_language, primary_language, learning_target_language, miomi_stars, xp, level, streak, mood, welcome_shown_at, onboarding_completed_at, last_seen_at`

Tiers: `guest | free | pro | pro_max`.

---

## Routes documented (drift check verifies these exist)

- `/auth/callback`
- `/api/auth/post-signup`
- `/api/talk/transcribe`

---

## Migration to another host

If you ever leave Vercel:
1. The codebase is standard Next.js — works on any Node host (Render, Railway, Fly, AWS).
2. Update Supabase Dashboard → URL Configuration → new domain in Site URL + Redirect URLs.
3. Update Google Cloud Console → OAuth Client → Authorized redirect URIs (Supabase URL stays; add new host if used directly).
4. Set the same environment variables on the new host.
5. Region pin in `app/api/talk/transcribe/route.ts` (`preferredRegion = ["sin1"]`) is Vercel-specific — remove or replace with host equivalent.

---

## Known dead ends (do not re-investigate)

- `/api/auth/callback` is NOT a real route. Old Google Cloud Console redirect URIs point there; harmless, cosmetic only.
- Web Speech API on Android Chrome is broken (silent `onstart → onend`). We use MediaRecorder + Groq Whisper + VAD instead. Don't try to "fix" Web Speech.
- Calling `/api/auth/post-signup` from inside the callback via internal fetch — doesn't work, `cookies()` from `next/headers` reads the outer request not forwarded headers. The callback resolves the profile inline.
- Wrapping the OAuth callback in middleware (even passthrough) — strips `Set-Cookie` on Android Chrome. Matcher excludes `/auth/callback`.
- Using RMS amplitude for silence detection — fails in noisy environments. We use VAD.

---

## Build commands

```
npm run dev          # local dev
npm run build        # tsc + lint + drift, then production build
npm run check:drift  # standalone drift check
```

---

## Founder context

Mike (Majid Ahmadi), Persian, 40s, Bangkok. Solo founder, self-funded, no investors.
Building until master-class, not until MVP. Mobile-primary (Samsung A52 is the test phone). Rates work 1/10 to 10/10 — only 10 = pass. Direct, brutal, allergic to bullshit and credit waste. Read the code before proposing changes. Never claim something is fixed without verifying.
