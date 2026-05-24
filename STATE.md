# MIOMIKA — STATE OF THE PROJECT (technical pointer)

> **Read MIOMIKA.md and MASTER-HANDOFF.md FIRST.** They are the soul
> of the project — why it exists, who it serves, what makes it
> different. This file is just a short technical pointer to where
> things live in code.

---

## The soul of the project

- **MIOMIKA.md** — the product vision, the verb stack, the trojan-horse strategy, the laws.
- **MASTER-HANDOFF.md** — founder context (Mike, Bangkok, Persian, building this for Thai families who deserve better than the corrupt private tutoring industry), product philosophy, non-negotiables.

Anyone touching this codebase reads those two files first. Without them you cannot make good decisions, only technically correct ones.

---

## Tech stack

- Next.js 16 App Router, React 19, TypeScript
- Supabase (auth + DB, project `dfufsjnneiwzllkawahv`)
- Google Gemini conversational engine (`@google/genai`)
- Groq Whisper Large v3 Turbo for speech-to-text
- `@ricky0123/vad-web` for voice activity detection (ONNX model, runs in-browser)
- Vercel (function region pinned to `sin1`)
- Sentry monitoring
- Tailwind 4

Canonical host: `www.miomika.com`. Supabase Site URL must match.

---

## File map (where code lives)

| Concern | File |
|---|---|
| OAuth callback | `app/auth/callback/route.ts` |
| Post-signup router (client-called) | `app/api/auth/post-signup/route.ts` |
| Voice transcription | `app/api/talk/transcribe/route.ts` |
| Mic button (currently buggy, see Known Issues) | `components/talk/MicButton.tsx` |
| Middleware | `middleware.ts` |
| Server profile read | `lib/auth/get-server-profile.ts` |
| Client profile hook | `lib/auth/use-profile.ts` |
| Supabase clients | `lib/supabase/{client,server,middleware}.ts` |
| Logger | `lib/debug/log.ts` |
| Drift check | `scripts/check-drift.ts` |
| Design tokens | `lib/design/colors.ts` |
| Warmth phrases | `lib/voice/warmth.ts` |

## Routes documented (drift check verifies)

- `/auth/callback`
- `/api/auth/post-signup`
- `/api/talk/transcribe`

---

## Environment variables required

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN`

---

## Debugging

- Client logs: `?debug=1` in URL or `localStorage.miomika_debug = "1"`
- Server logs: vercel.com/miomika/logs, search by scope like `[voice.transcribe]`
- Sentry: filter by `flow:oauth | voice | engine`
- Pre-deploy: `npm run build` auto-runs `tsc + lint + drift`

---

## Known Issues (for next session)

1. **MicButton voice flow is buggy.** Currently uses `@ricky0123/vad-web` for VAD. Symptoms:
   - VAD detects speech start, then `destroy` is called mid-speech before `onSpeechEnd` can fire
   - Result: no transcription, VAD reloads every tap (~1.5s delay each time), feels like double-tap is needed
   - Likely cause: a React lifecycle effect with bad dependencies in MicButton.tsx, OR an upstream parent component calling destroy when state transitions occur
   - Fix attempted but not verified: changing the lifecycle `useEffect` deps to `[]` (empty). Was about to push when handed off.
   - **Recommended approach for next session:** look at `components/talk/MicButton.tsx` and the parent `/talk` page together. The destroy is likely triggered by a stale closure or a `useEffect` somewhere that re-runs on state change. The VAD instance must live across `state idle → listening → processing → speaking → idle` cycles without ever being destroyed until either (a) component unmount or (b) explicit user action.
   - The VAD library, ONNX model, and wasm assets are all in place at `public/vad/`. Middleware excludes `/vad/`. The library loads fine. The problem is purely React lifecycle management.

2. **Onboarding works** but is a simple 3-second celebration. Per Mike's vision (see MIOMIKA.md), this should eventually be replaced with an intelligent first-conversation experience — Miomi learning about the user naturally, not a form. Phase 3B work.

---

## Build commands

```
npm run dev          # local dev
npm run build        # tsc + lint + drift, then production build
npm run check:drift  # standalone drift check
```
