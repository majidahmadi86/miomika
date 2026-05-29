# CONVERSATION-ARCHITECTURE v1.2

Authoritative design for `/talk` voice, mic, and audio flow.
Commit 1/3 implements items **1–17** and **21**. Items **22–28** (choreography) and **29–30** (soul) ship in commits 2 and 3.

---

## Core rules

### 1. Audio singleton (RULE 1)
`AudioOrchestrator` holds at most one active `HTMLAudioElement` OR `SpeechSynthesisUtterance`.
All playback paths go through it. `lib/voice/tts.ts` `speak()` delegates here; no generation counters.

### 2. Orchestrator owns the flow
`ConversationOrchestrator` is the single authority for mic state, transcription, engine calls, TTS, and transitions.
`/talk/page.tsx` and `MicButton.tsx` never call `speak()` or manage mic lifecycle directly.

### 3. Buffer window (RULE 3)
When a transcript arrives, start a **600ms** timer. If a second transcript arrives within 600ms, concatenate with `", "`, cancel the timer, restart 600ms. After 600ms silence, send concatenated text to the engine. Prevents "she replied to half my sentence."

### 4. Explicit first gesture
Initial state `AWAITING_FIRST_GESTURE` until the user taps (browser audio unlock). Fresh sessions then enter `OPENING`; resumed sessions skip to `IDLE`.

### 5. One mic owner
`MicButton` owns the `@ricky0123/vad-web` instance. VAD callbacks delegate to the orchestrator. Transcription lives in the orchestrator, not MicButton.

### 6. Interrupt behavior
**During `AI_SPEAKING`:** VAD threshold **0.65**, redemption **0.3s**. On speech-start: `AudioOrchestrator.killAll()` in <50ms, transition to `USER_SPEAKING`, restore threshold **0.5** / redemption **1.2s**.

**During `AI_THINKING`:** VAD stays at full sensitivity. On speech-start: abort in-flight engine fetch via `AbortController`, buffer prior transcript; next request appends.

### 7. Network timeouts
Every orchestrator fetch uses `AbortController` + wall-clock timeout:
| Route | Timeout |
|---|---|
| `/api/talk/transcribe` | 8000ms |
| `/api/miomi` | 12000ms |
| `/api/talk/speak` | 10000ms |

On timeout → `ERROR` state (800ms recovery → `IDLE`).

Request deduplication: identical transcript text sent within **3s** returns the cached in-flight Promise.

### 8. Session persistence
`sessionStorage` via `lib/conversation/session.ts`:
- `saveSession(sessionId, lastExchangeAt)`
- `loadSession()` → `{ sessionId, lastExchangeAt } | null`
- `shouldResume()` → true if last exchange < **5 minutes** ago

On init: resume reuses `sessionId` and skips `OPENING`. On unmount: save with `session_end_reason: "user_left"`.

### 9. State pub/sub
Orchestrator exposes `onStateChange` and `onMessage` via a tiny `Set<(…) => void>` pub/sub. UI subscribes; no duplicated state in React except render mirrors.

### 10. Hallucination guard
`isLikelyHallucination(text, userSpeaksLanguage, isPracticeAttempt)` in `lib/conversation/hallucination.ts`:
- English user + >70% Thai chars + not practice → drop
- Thai user + >70% Latin chars + no meaningful English words → drop
- Log `[orch] dropped hallucination: "…"` and return to `IDLE` silently

### 11. Allowed short utterances
Texts < 2 chars are dropped unless in: `yes`, `no`, `ok`, `okay`, `hi`, `hey`, `ใช่`, `ไม่`, `อืม`, `ค่ะ`, `ครับ`.

### 12. Empty transcript
Whisper empty result → `IDLE` silently (no error bubble).

### 13. TTS fallback
When server MP3 fails after retries, `AudioOrchestrator.playBrowserTts` fires. **Miomi never silent** invariant preserved.

### 14. Guest limits
Server-enforced via `/api/miomi`. Orchestrator checks client guest counter before send; limit hit → guest sheet, mic stop.

### 15. Engine unchanged
`lib/brain/*` and `/api/*` routes are not modified by conversation commits. Orchestrator is a client-side wrapper.

### 16. No UI invention
Commit 1 changes data plumbing only. Layout, tokens, and components stay as-is.

### 17. Error recovery
`ERROR` state lasts **800ms**, then auto-transition to `IDLE`. No red toasts.

---

## State machine (9 states)

| State | Meaning |
|---|---|
| `AWAITING_FIRST_GESTURE` | Initial; waiting for user tap (audio unlock) |
| `OPENING` | Playing opener; mic muted |
| `IDLE` | Mic listening; no audio |
| `USER_SPEAKING` | VAD capturing |
| `TRANSCRIBING` | Sending audio to Whisper |
| `AI_THINKING` | Engine call in flight |
| `AI_SPEAKING` | Voice playing; mic in interrupt mode |
| `INTERRUPTED` | Micro-state; immediately → `USER_SPEAKING` |
| `ERROR` | 800ms recovery → `IDLE` |

### Transition summary

```
AWAITING_FIRST_GESTURE ──tap──► OPENING ──TTS end──► IDLE
                    └──resume──► IDLE (skip OPENING)

IDLE ──VAD start──► USER_SPEAKING ──VAD end (≥1.2s silence)──► TRANSCRIBING
TRANSCRIBING ──text──► buffer 600ms ──► AI_THINKING
TRANSCRIBING ──empty──► IDLE
AI_THINKING ──response──► AI_SPEAKING ──TTS end──► IDLE
AI_THINKING ──VAD start──► USER_SPEAKING (abort fetch, buffer text)
AI_SPEAKING ──VAD start──► INTERRUPTED ──► USER_SPEAKING (kill audio)
any fetch timeout ──► ERROR ──800ms──► IDLE
```

---

## File map

| File | Role |
|---|---|
| `lib/conversation/orchestrator.ts` | State machine class |
| `lib/conversation/audio.ts` | `AudioOrchestrator` singleton |
| `lib/conversation/hallucination.ts` | Whisper sanity guard |
| `lib/conversation/session.ts` | `sessionStorage` persistence |
| `lib/voice/tts.ts` | Thin wrapper → `AudioOrchestrator` |
| `app/(app)/talk/page.tsx` | Subscribes to orchestrator |
| `components/talk/MicButton.tsx` | VAD only; delegates events |

---

## Item 21 — Session contract (expanded)

- `sessionId` is a UUID created per conversation arc.
- Passed to `/api/miomi` on every engine call.
- `lastExchangeAt` updated after each successful engine response.
- Resume window: **5 minutes** (sessionStorage, tab-scoped).
- Unmount writes `session_end_reason: "user_left"` for analytics/debug.

---

## Items 22–28 — Choreography (commit 2)

*Not implemented in commit 1.*

22. **Opener choreography** — timed ice-breaker animation sequence before first mic open.
23. **Micro-acknowledgment sounds** — subtle audio cues on speech-start / transcribe-start.
24. **Orb motion curves** — map orchestrator states to Framer Motion curves from design tokens.
25. **Word-card handoff animation** — card slides from Miomi chest into canvas.
26. **Thinking beat** — minimum dwell in `AI_THINKING` before TTS (feels considered, not instant).
27. **Interrupt fade** — audio kill with 40ms fade instead of hard stop (optional polish).
28. **Canvas scroll choreography** — smooth scroll tied to message kind (user vs artifact).

---

## Items 29–30 — Soul (commit 3)

*Not implemented in commit 1.*

29. **Emotional temperature** — session-level warmth scalar influences opener selection and response pacing.
30. **Retention guards** — gentle nudges when user is about to leave mid-exchange; ties to session persistence.

---

## Acceptance (commit 1)

- [ ] 9 states implemented in `ConversationOrchestrator`
- [ ] 600ms buffer window before engine send
- [ ] Interrupt during `AI_THINKING` cancels fetch and buffers text
- [ ] Interrupt during `AI_SPEAKING` kills audio <50ms
- [ ] Hallucination guard drops bad transcripts silently
- [ ] Transcribe 8s / engine 12s / TTS 10s timeouts → `ERROR`
- [ ] Session resume within 5 minutes skips `OPENING`
- [ ] `AudioOrchestrator` owns all audio playback
- [ ] `/talk` and `MicButton` delegate to orchestrator
- [ ] `tsc --noEmit` and `lint` pass
