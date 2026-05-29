# MIOMIKA — SYSTEM MAP (ground truth)
> Read this FIRST, before MIOMIKA.md or MASTER-HANDOFF.md.
> This file describes what the code ACTUALLY does today. If a doc disagrees with
> this file about what is BUILT, this file wins. If a doc describes a DESIGN
> (tokens, screens, soul), that doc wins.
> Last verified against repo: 2026-05-29 (voice Aoede, bilingual STT, auto language).
> Update the "Last verified" line + the status tags every time code ships.

---

## 0. The one-paragraph truth

Miomika is a Next.js 16 / Supabase app. A user talks to Miomi (a cat) on the
sealed `/talk` screen. Every message hits ONE engine route — `app/api/miomi/route.ts` —
which runs a 12-stage pipeline: resolve identity server-side, enforce the guest
limit, detect language, classify intent, then try to answer from the local
library (`library_entries`); on a library miss it calls a free AI (Groq, then
Gemini, then a warm canned failover) and logs the result to `library_interactions`.
That is the whole intelligence today. There are NO separate "brains," NO Anthropic,
NO memory of past conversations, NO promotion of AI replies into the library yet.
Those are designed in MIOMIKA.md but not built. The visual layer (/talk, /me, /home)
is done; the intelligence layer is a single engine waiting to become the brain system.

---

## 1. STATUS LEGEND

- BUILT — code exists, wired, working in repo
- PARTIAL — some code exists, not fully wired or not closed end-to-end
- NOT BUILT — described in docs only, zero code
- APPLIED? — exists in repo but live-DB application unverified

---

## 2. THE REQUEST PIPELINE (the only "brain" that exists today)

```
User speaks/types on /talk
        |
        v
[ /api/talk/transcribe ]  BUILT  Groq whisper-large-v3-turbo (voice -> text)
        |
        v
[ /api/miomi/route.ts ]  BUILT  THE ENGINE (373 lines, 12 stages)
        |
        |- 1. getServerProfile()        BUILT  identity from cookie (never trust client)
        |- 2. guest limit check         BUILT  GUEST_EXCHANGE_LIMIT = 5
        |- 3. detect language           BUILT  Thai unicode vs Latin
        |- 4. classify intent           BUILT  lib/ai/intents.ts (keyword/regex)
        |- 5. session mode + recovery   BUILT  negative-emotion override -> warm phrase
        |- 6. clarification gate        BUILT
        |- 7. LIBRARY MATCH             BUILT  matchLibraryFromDB -> library_entries
        |        |
        |        |- HIT  -> serve from library, $0 cost   BUILT
        |        |- MISS -> v
        |- 8. pick word to introduce    PARTIAL  reads vocabulary_bank; mastery NOT closed
        |- 9. build adaptive prompt     BUILT  lib/ai/prompt.ts
        |- 10. AI CALL                  BUILT  lib/ai/router.ts
        |        Groq -> Gemini -> canned failover
        |        (NO Anthropic, NO tier routing, NO cost cap)  NOT BUILT
        |- 11. log interaction          BUILT  -> library_interactions (+ aiCostUsd)
        |- 12. return + update session  BUILT
```

One paragraph: This pipeline is real and solid. Its weak points are stage 8
(teaching loop not closed — vocabulary_user_state is created but never read/written
by the engine) and stages 10-11 (the AI is free-tier only, and logged replies are
never promoted back into the library, so the "moat" doesn't compound yet).

---

## 3. SYSTEM-BY-SYSTEM STATUS

| System | Status | Reality |
|---|---|---|
| Identity / auth | BUILT | getServerProfile() from cookie. OAuth callback solid. |
| /talk screen | BUILT | SEALED at 8d030b4. Voice in (Groq STT) + out (Google TTS server route). |
| Voice (TTS) | BUILT | Google Aoede (th-TH-Chirp3-HD-Aoede + en-US), speed 0.93, ค่ะ/นะคะ/เลย warm-lengthen, 3-strike cache, server route, browser fallback only on hard failure. |
| Voice input (STT) | BUILT | Groq Whisper with bilingual prompt (Thai+English), VAD redemptionFrames raised for natural breath pauses. |
| Language routing | BUILT | Auto-detected per message via detectLang(). One voice per reply, no manual toggle. Default Thai; profile ui_language overrides. |
| /me screen | BUILT | Visual LOCKED v2.1. Most destinations are stubs (wiring debt). |
| /home screen | BUILT | Alive companion surface, ambient Miomi. |
| Warmth system | BUILT | lib/voice/warmth.ts — large, typed, healthy. The real moat today. |
| Library MATCH | BUILT | matchLibraryFromDB keyword/template. NO embeddings (doc says 0.85 cosine — FALSE). |
| Library LOG | BUILT | Writes library_interactions with quality-signal columns. |
| Library PROMOTE | NOT BUILT | No cron, no scoring, no admin, no talk_completions. Half a moat. |
| AI provider | PARTIAL | Groq->Gemini->failover. Free only. No Anthropic/tier/cost-cap/kill-switch. |
| Seven brains | NOT BUILT | Concept only. ONE monolithic engine exists. No lib/brain/. |
| Memory (cross-session) | NOT BUILT | No conversations table. Engine sees only current session. |
| Teaching loop | PARTIAL | vocabulary_user_state table + RPCs exist (0008) but engine never calls them. |
| Payments / Stars | NOT BUILT | Phase 5. Nothing wired. |
| Marketplace | NOT BUILT | Phase 7. Nothing wired. |

---

## 4. THE TWO-MATCHER PROBLEM

**RESOLVED** — /talk template shortcut removed; all messages go through /api/miomi.
`matchLibrary` no longer used in /talk. Engine path: `matchLibraryFromDB()` only
(`lib/library/supabase-matcher.ts`).

---

## 5. SCHEMA TRUTH

The repo does NOT contain CREATE TABLE for the core tables. They live only in the
Supabase DB. Repo migrations only ALTER / add RLS / drop. This means: the live
Supabase database is the schema source of truth, not the repo. To rebuild from
scratch you cannot use the repo alone. (This is a gap to close.)

Tables, by reality:
- has CREATE in repo: vocabulary_user_state (0008)
- assumed pre-existing (no CREATE in repo): profiles, vocabulary_bank,
  phrases_bank, library_entries, library_interactions,
  library_promotions_queue, user_sessions
- DROPPED permanently (0012): users_legacy_backup
- CONFLICT: 0007 creates public.users, but section 11.8 says public.users is GONE.
  Treat public.profiles as the only user table. Confirm 0007's users block is
  dead and remove/annotate it.

Migrations present: 0001, 0002, 0003, 0007, 0008, 0009, 0010, 0011, 0012.
Missing by design: 0004-0006 (were OPUS pipeline; folded into future Phase 4).
APPLIED-state of 0009-0012 in live Supabase: UNVERIFIED from repo. Mike must confirm.

---

## 6. WHAT EACH DOC IS FOR (so nobody reads the wrong one)

| Doc | Read it for | Do NOT trust it for |
|---|---|---|
| SYSTEM-MAP.md (this) | What's BUILT, the real pipeline, schema truth | Design/soul |
| MIOMIKA.md v6 | Soul, design tokens, screens, build plan, target architecture | "Is it built?" — describes the destination, not today |
| MASTER-HANDOFF.md | Mike's story, communication style | Build state (was stale; fixed) |
| SCREENS.md | Five-nav, per-screen purpose | Engine/brain |
| DESIGN-RULES.md | Visual law, warmth law | Engine/brain |
| PRODUCT-DECISIONS.md | What we're building + why (confident speaking, revenue, voice, teaching) | engine internals |
| LAUNCH-CHECKLIST.md | Every launch essential + status | design/soul |

---

## 7. FOR THE NEXT CHAT — start here, spend no Opus credits re-learning

1. Read this file. You now know what's real.
2. Read MIOMIKA.md v6 for the destination.
3. The current job is the brain system (Phase 4). The engine in section 2 is what
   becomes the brain. Do not rebuild it; evolve it.
4. Never confuse NOT BUILT items for existing code.
