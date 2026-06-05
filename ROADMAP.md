# Miomika — Roadmap & Strategy

_Canonical strategy doc. Last updated: 2026-06-05. Every session should read this._

---

## North Star

Miomika is an AI companion — the cat **Miomi** — for **connection through language** (Thai ⇄ English, voice-first). The product is the *bond* and the *people you connect to*, not a language drill. Language is the acquisition wedge; the **People Layer** (relational memory + social) is the moat and the viral engine.

---

## Architecture decision (LOCKED)

- **Conversation core = audio-native (Google Gemini Live)**, replacing the legacy ASR → LLM → TTS pipeline. The pipeline is retired from **`/talk`** (legacy routes may remain for other surfaces until fully removed).
- Audio-native is fast, hears any language natively (kills the Thai/English lock), and is continuous + barge-in (kills the "is it recording?" confusion). Three of the worst complaints die with this one move.
- **One system, two modalities:** *voice* runs on Gemini Live (premium + the free taste); *text* runs on a cheap text model (free daily engagement). Cost matched to value.
- **Cost is controlled by metering minutes, not by engine choice** (pipeline ≈ Live per-minute; the only real lever is limits).
- Production **`/talk`** is **LOCKED 2026-06-05** on Gemini Live (`MiomiLiveClient` + `/api/live-token` ephemeral mint). Do not revert to transcribe/miomi/speak on this route without Mike sign-off and full guest-flow re-verify.

### `/talk` frozen contracts (LOCKED 2026-06-05)

Do **not** change any item below without re-verifying the full `/talk` + guest flow (ear + 5-exchange sheet + teach-word mid-convo):

| Contract | Where |
|---|---|
| Audio-native Gemini Live; key server-side via ephemeral token | `app/(app)/talk/page.tsx`, `lib/live/miomi-client.ts`, `app/api/live-token/route.ts` |
| Persona: Leda, occasional meow, leads, slow new phrases, short replies | `lib/live/live-config.ts` (`PERSONA_CORE`, `LIVE_VOICE`) |
| Icebreaker voice on entry; mic press is separate orb tap | `app/(app)/talk/page.tsx` (entry effect + `awaitingMic` after kickoff) |
| Guest 5-exchange hook; 5th reply = open loop in bubble; invite = spoken cue + signup sheet only | `lib/live/live-config.ts` (`LAST_TURN_HANDOFF`, `GUEST_INVITATION_CUE`), `app/(app)/talk/page.tsx`, `lib/live/media-handler.ts` (`waitForPlaybackIdle`) |
| `teach-word` never 401 guests; tool handler always `sendToolResponse`, never throws | `app/api/teach-word/route.ts`, `lib/live/miomi-client.ts` |
| Tool 1 `get_word_to_teach` → `pickWordToIntroduce` + `introduceWord` (member saves; guest A1 no-save) | `lib/live/live-config.ts`, `app/api/teach-word/route.ts`, `lib/brain/teaching.ts` |

Code sites carry `LOCKED 2026-06-05` comments — search before editing.

---

## Monetization (LOCKED — all prices in THB)

Voice cost estimate ≈ **0.36 ฿/min** (≈ $0.01). **Verify the exact Gemini Live native-audio rate before final commit — it is the one number that sets the margins.** Rule: **every paid tier margin ≥ 70%.**

| Tier | Price | Voice allowance | Notes |
|---|---|---|---|
| Guest | free | 5 exchanges | hook → signup |
| Free | free | 10-min **lifetime** voice trial + cheap text + small earned voice | trial verification-gated (1 real person = 1 trial) |
| **Pro** | **299 ฿/mo** | ~8–10 min/day | volume anchor; ~5 hrs/mo |
| **Pro Max** | **599 ฿/mo** | 15 min/day + premium features (people layer, advanced teaching, badges) | margin ~73% |
| **Confident Speaking** | **799 ฿ / 5 hrs** · **1,499 ฿ / 10 hrs** | one-time packs | margin ~86%; pay-per-use makes heavy users profitable, never a loss |

**Positioning weapon — price per HOUR, not per month:** a human tutor in Thailand is **300 ฿/hr**. Miomi is ~**40–80 ฿/hr** (4–7× cheaper), 24/7, infinitely patient, and remembers you.

---

## Free-tier economics (the cost solve)

- **Daily engagement = text** (≈ free) — full Miomi personality, teaching, social. The sticky daily habit (Duolingo-style).
- **Voice = a bounded wow, not a daily buffet:** a generous **day-1 onboarding voice session** (the conversion + screenshot-and-share moment) + a small earned daily treat. Free voice costs ~pennies **once** per user, not monthly.
- Profitability: roughly break-even at ~1% conversion; clear profit at ~2–3%+. Higher tiers, the fraud-proof referral, and the viral social loop drive conversion up. You keep **~65–86%** of paid revenue — not "working for Google."

---

## Cost levers

- **Concise replies — "efficient eloquence."** Charming, smart, funny, complete — but never rambling or repetitive. Output audio is the costly half, so every word earns its place. (Better voice UX *and* cheaper.)
- **Context caching (Gemini):** ~90% off repeated persona/history input tokens. Invisible to the user; does **not** cause repetition (it caches the input setup, not her words).
- **Smart lib:** a *genuinely intelligent* teaching engine (CEFR-adaptive, spaced-repetition spiral 1/2/4/7/12 days, anti-repetition) that precomputes and serves content — fewer LLM calls **and** higher quality. It must be real intelligence, never a dumb cache.

---

## Referral (fraud-proof — LOCKED rule)

**Governing rule:** a referral must net more revenue than it pays out — the reward is always *less* than the revenue that triggers it, and pays out only *after* that revenue lands. Then cheating always costs the fraudster more than they gain.

- Friend pays full **299 ฿** (no revenue-cutting discount; a tiny welcome perk only).
- Referrer earns **30 ฿ credit** on next bill, **only when the friend's first Pro payment clears**.
- Net **+269 ฿** per referral; fraud is always a net loss for the cheater.
- Free trial is **verification-gated** (phone/device) so fake accounts can't farm free minutes.
- Bigger rewards later must be **retention-gated** (e.g., on the friend's 2nd payment).

---

## Engagement & growth

- **Achievements / levels / badges** — tiered status ("blue-tick"-style), streaks, unlocks. (Directly requested by a real test user.)
- **Cat-led guidance** — Miomi as the five-star host: onboards, leads each step, and drops the *right* CTA at the *right* moment (upgrade after a great session at the limit; referral after a "wow" moment; lesson nudges when ready). She leads, never abandons.

---

## Known issues / bugs

- Stale old welcome icon shows for new users (cached asset).
- Thai phone UI → can't hear English (ASR language lock) — **fixed by the audio-native migration.**
- Confusing mic ("is it recording / active?") — **fixed by audio-native (continuous + barge-in).**
- Profile / settings not editable (language, profile pic) — `/me` stubs.
- Dashboard only shows words learned — wants a status badge / level.
- (Parked) transcribe-phase turn abort = likely the 8s client STT timeout on slow Google STT — legacy pipeline, moot post-migration.
- Signup email broken (launch blocker). `GEMINI_API_KEY` in Vercel. Garbled Thai characters.

---

## Phased plan

1. **Speed + core voice — migrate to audio-native.** Fixes slow + English-deafness + mic-confusion together. **`/talk` shipped on Gemini Live (LOCKED 2026-06-05).** Legacy pipeline retired from `/talk`; spike-live may remain for experiments.
2. **Smart + usable** — teaching brain (CEFR, spaced repetition, word cards) wired as Live tools; fix profile/settings; add status badges / levels.
3. **The moat** — relational People Layer, social connect (FB / TikTok / Instagram), Miomi-with-friends, learner / creator network. The viral engine.

---

## Guardrails / working method

- **Opus = brain; Composer = hands** (exact, no-decision instructions); **Mike = interface**. Repo is not mounted to Opus.
- 100% understanding before any edit; never blind-code; **one concern per commit**; every change runs `tsc --noEmit` + `lint` + VAD churn, then commit + push; verify by Mike + real logs, not Composer's "done".
- **Never** push to `main`, change Vercel env, or deploy without Mike's explicit per-step OK.
- **Frozen + verified (2026-06-05):** production `/talk` Gemini Live stack — see Architecture § frozen contracts table. Search `LOCKED 2026-06-05` before editing. Guest invitation decouple (commits `e9ba8b8` / `77996e0`) remains in force.

---

## Open verification items

- **Exact Gemini Live native-audio token rate** — the one number gating final margins.
- Live model: `gemini-3.1-flash-live-preview` (or current). Audition voices for Miomi (Leda, etc.).
- Thai support quality + input/output transcription accuracy (needed for the learning UI / word cards).
