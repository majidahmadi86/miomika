# Miomika — Resilience & Viability Spec

*A measure-twice document. It reads our build; it changes nothing. Its job is to make the next code surgical.*

*Date: 2026-06-12 · All costs verified against current (June 2026) Google pricing, not memory.*

---

## 0. Why this document exists

Tonight the whole app went dark because one external dependency — the Gemini API — ran out of fuel. Not the Speaking Room. **Everything.** Chat, teach, translate, the brain, all of it, because they all call the same provider and nothing caught them when it fell.

That is the real finding, and it is an architecture problem, not a billing accident. Mike warned about it repeatedly. This document fixes it on paper before we touch code.

Two corrections to earlier assumptions are baked in here, both found by finally checking the source instead of trusting memory:

- **The ฿9,751 Google Cloud trial credit cannot pay for the Gemini API.** Google excludes it explicitly (since March 2026). It was never going to fund the first 100 users' voice. Verified at ai.google.dev/gemini-api/docs/billing.
- **Live voice costs ~1.32฿/min, not 0.36฿/min.** The old filed figure was wrong by ~3.6×. Real rate: ~$0.0368/min (Google's pricing page, updated 2026-06-09). Every number below uses the real rate at ฿36/$.

The standard going forward: anything touching money, survival, or a hard external limit gets verified against current sources *before* it enters the plan — not the night it breaks.

---

## 1. The core principle: independence means layered, not provider-free

No app is "independent" of all external services — they all call something. Independence means **no single external failure can flatline the whole product.** The fix is layers, cheapest and most robust first. Mike named most of these himself.

| Layer | What it is | Cost | Fails when… | What the user sees if it's down |
|---|---|---|---|---|
| **L1 — Banked DB content** | Common outputs generated once, stored in your DB, served forever (Smart Library, extended to teach words + translations + stock phrases) | ~0 after first generation | Never (it's your own database) | Nothing — this always works |
| **L2 — Text generation w/ provider fallback** | On-demand text via Groq **or** Gemini; if one is down the other catches; if both down, L1 still serves | Fractions of a satang per message | Both providers down AND not in L1 | Honest "thinking is busy, try again" — rare |
| **L3 — Voice-to-text + text reply** | User speaks → cheap transcription → Miomi replies in **text** (how most free apps work) | Very cheap (transcription only) | Transcription provider down | Falls back to typing |
| **L4 — Real-time Live voice** | The Speaking Room. Streaming spoken conversation. The premium experience. | **~1.32฿/min** — metered | Live API down / no credit | Honest banner + fall back to L1–L3 |

**The failure tonight:** only L4-style direct API calls were wired. When the provider emptied, there was no L1 fallback, no L2 provider-switch that survived, nothing. Everything sat on the single fragile layer, so everything fell.

**The fix is not a rebuild.** Your features already mostly sit on L1 (Smart Library). The gaps are: extend L1 to teach/translate, make L2's fallback actually survive a double-outage by falling through to L1, add L3 as the robust everyday voice path, and keep L4 (the Room) as the metered premium layer it must be.

---

## 2. The Speaking Room stays real-time. Non-negotiable, and correct.

The CS Room **is** real-time Live voice (L4). A "speaking room" that replied in text wouldn't be a speaking room. It's already feature-complete (through RM12). Nothing in this document changes that.

What *does* change: **the Room must be metered from the first second.** At 1.32฿/min, an unmetered Room is the single biggest financial risk in the product. Metering is what turns the Room from a leak into a paid wedge that pays for itself. This is why metering moves to the front of the queue (Section 6).

---

## 3. The library-flush problem — root-caused, and killed for good

**Mike's hunch tonight was right and it's a genuine root cause.** Repeatedly running `delete from session_library;` to test didn't just clear test data — it forced *every following session* to regenerate from scratch, firing fresh API calls each time. A day of repeated flushes is a direct, plausible path to burning Groq's 100k daily tokens and Gemini's free quota to zero. The flush was contributing to the fuel crisis, not just sitting beside it.

**Why the flush existed:** when the brain's generation prompts changed (which happened often during Room hardening), old banked plans were stale and had to be cleared so new ones would generate. The nuclear `delete` was the crude way to do that.

**The permanent fix — versioning, no more nuclear flush:**

- Add a `prompt_version` (or `brain_version`) column to `session_library` (and any future banked tables).
- The generator stamps the current version on every banked row.
- When serving from the library, match on version. A stale-version row is ignored (and can be lazily regenerated or cleaned in the background).
- Changing the brain = bump the version constant. Old entries auto-invalidate. **No flush, no regeneration storm, no fuel drain.**

This means: in the future we never clear the whole library to start fresh. Stale content ages out automatically, one entry at a time, only when actually requested. **This goes in the build queue right after metering.**

---

## 4. Verified costs per feature, per tier (June 2026 rates)

**Rates used** (all current, sourced this session):
- Live voice (L4): **~1.32฿/min** ($0.0368/min × ฿36)
- Text generation (L2), Gemini 2.5 Flash: ~$0.30/M input, ~$2.50/M output → **fractions of a satang per typical message**
- Transcription (L3): cheap, per-minute, far below Live voice
- Banked content (L1): **~0** after first generation
- Groq free tier: 100k tokens/day (the attempt-0 optimizer; free but exhaustible)

### Per-feature cost class

| Feature | Layer | Cost class | Notes |
|---|---|---|---|
| Smart Library lessons/plans | L1 | ~0 at scale | Generated once per (level+topic+register), shared across all users |
| Teach (with voice playback) | L1 + pre-made TTS | ~0–trivial | Bank common words; TTS is cheap and cacheable |
| Chat (text) | L2 → L1 | satang | Provider fallback; bank common exchanges |
| Translate | L2 → L1 | satang | Highly bankable — same phrases requested constantly |
| Voice-to-text reply | L3 | cheap | Transcription + L2 text reply |
| **Speaking Room** | **L4** | **~1.32฿/min — METERED** | The premium wedge |

### The "100 users" question, answered with real math

- One 10-min free voice trial ≈ **13฿** per user, once, lifetime.
- 100 free users each using their full 10-min voice trial ≈ **~1,300฿** — *if metered so none exceed the cap.*
- Text/teach/translate for those same 100 users: **a few hundred baht at most**, and far less if L1 banking is working.

**So: ~1,300–2,000฿ can carry roughly 100 free users — but only with voice metering as the hard wall.** Without metering, a handful of binge users eat it in a day. The number works; the guardrail is mandatory.

### The "10,000 users" question

- 10,000 free users × 13฿ lifetime voice cap = **~130,000฿ spread across their entire lifetimes**, not monthly — and most never exhaust the cap, so real spend is a fraction of that.
- Text for 10,000 users with L1 banking: low thousands of baht/month, because **text cost scales with content variety, not user count.** 10,000 users asking for "Eating out" hit one banked entry, not 10,000 generations.

**Affordable at 10,000 users only if:** (a) voice is metered per user, (b) the free tier leans on L1/L2/L3 (cheap, robust) and treats L4 voice as a metered taste, (c) common content is banked. All three are architecture decisions in this document, not hopes.

---

## 5. The free vs. paid line, redrawn around cost and resilience

The old instinct ("voice-first free, give them a real taste") is the most expensive and most fragile possible free tier. Redraw it:

### FREE tier — cheap, robust, genuinely useful
- **Full text chat** with Miomi (L2 → L1) — works even if Live voice is down
- **Teach** with voice playback (L1 + cheap TTS)
- **Translate** (L2 → L1)
- **Voice-to-text → text reply** (L3) — they can *speak* and be understood, reply comes back in text, like every free app they already use
- **A taste of L4 Live voice** — the 10-min lifetime trial, metered, as the upgrade hook
- Journey, placement, games (banked/cheap)

### PAID tier (Pro) — the real-time premium
- **Unmetered-feeling Live voice** via a generous monthly allowance (~200–240 min — stamped precisely at the pricing session), then packs on top
- The full Speaking Room with real-time conversation
- Tests, certificates, reading — the structured-progress layer

### Why this works on both cost and strategy
- **Cost:** the free tier is dominated by L1/L2/L3 (near-free, outage-resistant). The expensive, fragile L4 is mostly behind the paywall and metered everywhere.
- **Strategy:** "free AI voice chat" is a commodity others give away. Your **moat is the teaching system** — structured curriculum, earned progress, pronunciation grading, bilingual Thai-first design, Miomi's character and continuity. That's what someone pays for, and it's exactly what the competitors handing out raw AI chat don't have. Voice is the demo and the hook; the *system around it* is the product.

---

## 6. What this means for the build queue

The resilience layers aren't new features competing with the launch list — they're the **foundation that makes the launch list survivable.** Reordered:

**Immediate (unblock + safety):**
1. **Top-up Prepay** (~300–500฿, auto-reload OFF) — buys back testing. A dev expense, not a strategy commitment. *Mike, in parallel with this document.*
2. **Verify the Room on the restored key** — the adversarial run that was already queued (RM12 walls: challenge, non-answers, mispronunciation). Clean = Room closed.

**Foundation (the real lesson of tonight — before cosmetic polish):**
3. **METERING** — at the `/api/live-token` choke point: balance check before a session opens, minute accounting, hard stop + warm upsell. This is what makes L4 voice safe to expose to anyone. *Highest priority after Room verification.*
4. **Library versioning** (Section 3) — `prompt_version` column; kills the nuclear-flush fuel drain forever.
5. **L2 provider-fallback that survives** — when generation is needed and one provider is down, the other catches; when both are down, fall through to L1 banked content instead of hard-failing.
6. **Graceful degradation** (L4 down → honest banner → fall back to L1–L3 text). Voice down ≠ app down.
7. **Extend L1 banking** to teach words + translations (not just session plans).

**Then the existing roadmap, unchanged and now survivable:**
8. Free scenario choice + more courses per level
9. L10N (whole app)
10. Tests + placement → Reading/Fun → pricing session → first-launch plumbing (UI/UX polish, profile, dashboard, notifications, help center, social login, payments, email, SEO, security, PDPA)

**Nothing built so far is discarded.** The features sit on top of these layers unchanged. This is reinforcement of the foundation, not demolition of the house.

---

## 7. The honest risk table (what Mike should hold onto)

| Risk | Status | Mitigation in this spec |
|---|---|---|
| Single provider outage kills whole app | **Happened tonight** | L1–L4 layering (§1) |
| Voice cost runs away | High without metering | Metering first in queue (§6.3) |
| Library flush drains fuel | **Contributed tonight** | Versioning, no more flush (§3) |
| Trial credit assumed usable for Gemini | **Was wrong** | Verified excluded; budget for real Prepay (§0, §4) |
| Voice cost underestimated 3.6× | **Was wrong** | All math redone at 1.32฿/min (§4) |
| "Why pay vs. free competitors?" | Open strategic question | Moat = teaching system, not raw chat (§5) |
| Build depends on Fable availability | Mike's concern | Document is the durable spec; any capable model + Composer can execute from it |

---

## 8. The one-paragraph version (for when you're tired)

The app went dark tonight because every feature leaned on one external API with nothing to catch it. The fix is four layers: bank common stuff in your own DB (free, never fails), generate text with a provider that has a backup (cheap), let users speak-to-text and get text back (cheap, robust), and keep real-time Live voice as the metered premium Speaking Room (the paid wedge). The free tier lives on the cheap robust layers; voice is the paid hook. Verified costs say ~1,300–2,000฿ carries 100 metered users, and 10,000 is affordable because banked text scales with *content*, not *people*. The trial credit can't pay for Gemini (Google excludes it), so a small real top-up unblocks testing now. Don't flush the library anymore — version it. Build metering first, then the resilience layers, then keep going with everything already planned. Nothing built is wasted.
