# MIOMIKA — BRAIN PLAN (locked 2026-05-29)
> Read after SYSTEM-MAP.md and PRODUCT-DECISIONS.md.
> This is HOW Miomi becomes a warm Thai-English teacher who makes the user
> brave enough to speak.

## THE TARGET
A Thai user opens Miomika. Miomi greets them by name, remembers what they
said yesterday, mirrors their level, drops a new Thai word naturally, celebrates
when they use it, never punishes a mistake. After a week: 12 mastered words,
7-day streak, no red error, no judgment, no hard sell. They tap "Go Pro together"
because they're in love.

## THE THREE LAYERS

### Layer 1 — Smart Context Engine
Every reply built with full awareness of profile + last 10 exchanges + emotional
state + intent. A lightweight FSM picks the move (casual / teach / listen /
practice / celebrate). One teacher-persona prompt replaces the generic prompt.
Memory lives in a new `conversations` table.

### Layer 2 — Teaching Loop
Words introduced in Teach mode are tracked in vocabulary_user_state. User reuse
advances mastery via advance_word_mastery RPC. Three correct uses = mastered =
celebration + stars + dashboard. Spiral schedule (1,2,4,7,12 days). Beautiful
in-chat word cards. Activities (roleplay, mini-missions) gated to Pro.

### Layer 3 — Library Moat + Opus Seeds
Opus (Claude in chat) hand-writes 200–300 masterpiece library entries — the
highest-value moments, especially guest first-impression. They live in
library_entries with quality_score 1.0. Live AI replies log signals to
library_interactions. Nightly cron clusters + scores + writes candidates to a
new promotion_candidates table.

## THE REVIEW LOOP (automated for the founder)
The founder does NOT manually review promotion candidates.
- Cron writes candidates with signals into promotion_candidates table.
- Periodically (weekly/monthly), the founder asks Opus to review.
- Opus reads the candidates via Composer, judges each against Miomika's soul,
  and writes a single approval prompt back to Composer.
- Composer executes: approved → library_entries (quality 1.0), edited entries
  promoted with Opus's rewrites, rejected entries dropped.
- The founder's role: paste two prompts. No judgment burden.
- This keeps Miomi's voice consistent forever — one curator (Opus) across all
  promotions.

## BUILD ORDER (each step testable, none make things worse)
1. conversations table migration + memory write
2. lib/brain/state.ts + move.ts + new prompt builder
3. Connect new prompt to /api/miomi/route.ts
4. Wire vocabulary mastery (introduce + advance + celebrate)
5. /me + /dashboard read real mastery data
6. Opus hand-writes seed library (200–300 entries) → Composer inserts
7. pgvector embedding match + quality scoring
8. Promotion cron + promotion_candidates table (no admin UI needed)
9. Feedback table + help center + signup email fix
10. Payment + legal (Stripe + Omise) + launch

## THE OPUS QUALITY BAR
Replies must feel hand-crafted by a warm, intelligent Thai-English teacher.
Three mechanisms guarantee this:
1. OPUS WRITES THE SEEDS — masterpiece replies for the first impression.
2. OPUS DESIGNS THE PROMPTS — every live reply uses Opus-crafted instruction.
3. OPUS CURATES PROMOTION — only Opus-approved entries graduate.
Result: Opus-quality experience at near-zero marginal cost.

## PARKED (built later, not part of brain)
- ElevenLabs cute voice (Pro Max, after revenue)
- Social-media B2B (post-launch growth)
- Marketplace / characters / gems (Phase 7)
- WebSocket TTS streaming (breaks cache)
- Multi-language beyond Thai-English (Phase 8)
- Perfect "Miomi" pronunciation (parked with ElevenLabs)

## END STATE
A product that, three weeks after launch, has users saying "Miomi knows me."
A library that, three months in, serves 80% of replies at $0. A founder who,
six months in, spends 30 seconds a week curating because Opus does the work.

— Locked 2026-05-29
