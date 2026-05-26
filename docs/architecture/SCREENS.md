# MIOMIKA — SCREEN ARCHITECTURE (locked May 25 2026)

> **For any new Claude or Cursor session.** This document defines the five-nav structure, what each screen is for, and what it must NOT become. Read this alongside `/MIOMIKA.md` and `/MASTER-HANDOFF.md`.

---

## The five primary surfaces (locked by Mike, May 25 2026)

The Miomika app has **five primary surfaces**, each accessible from a bottom nav. The center surface is the AI-powered hub. The four side surfaces are practical companions to it.
[ Home ]  [ Dashboard ]  [ TALK (center, big, AI brain) ]  [ Marketplace ]  [ Profile ]

### Why five and not fewer

Each surface serves a fundamentally different user intent. Collapsing them would force users to mentally categorize where things live. With five, every action has an obvious home.

### Why center emphasis on Talk

Talk is the AI brain. Every other surface either feeds into Talk (Dashboard generates content Talk delivers), supports Talk (Profile sets Talk's voice/language/identity), monetizes Talk (Marketplace), or relaxes with Talk's companion side (Home).

---

## Surface 1: HOME

**What it is (Mike's words):** A place users can play, feed, relax, take, track what they need to do.

**Primary feeling:** warm, alive, "she's happy I'm here."

**What lives here:**
- Persistent Miomi character (large, animated, mood-driven)
- Daily greeting from Miomi (ice-breaker from `lib/voice/warmth.ts`)
- Light "what's waiting for you today" affordances (NOT a dashboard — just gentle reminders: "3 words to practice", "1 draft pending")
- Quick-action verbs as soft tiles users can ignore (Teach, Translate, Write, Just-chat)
- Streak indicator (subtle, celebratory, never punitive)
- Companion idle behaviors (breathing, occasional reactions, ambient presence)

**What MUST NOT be here:**
- Dashboard-style stats
- Fuel bars dominant in layout (those move to Profile or appear contextually)
- Verb tiles dominant in layout — Miomi must be the dominant element
- Pricing pressure
- Cold metrics

**Conversion role:** Day 1-3 sessions live here. Build the bond. No money pressure.

---

## Surface 2: DASHBOARD

**What it is (Mike's words):** A practical place where users can trace, practice, copy-paste whatever they generate.

**Primary feeling:** productive, in-control, "I'm getting things done."

**What lives here (verb-aware, contents adapt to the user):**

For **content creators** (primary audience):
- Active content topics in flight (50-100 possible)
- Drafts pending
- Posting schedule
- What's working (engagement signals if available)
- Quick-generate buttons (caption, script, bio, hashtags)
- Copy-paste-ready outputs from previous Talk generations

For **language learners** (primary audience):
- Words mastered (visual proof — not just a number)
- Reviews due today (spaced repetition surface)
- Mastery progress per topic
- Next milestone
- Streak with emotional framing ("Miomi is proud of your 7 days")

For **professionals using Translate**:
- Recent translation history
- Saved phrases
- Common templates

**What MUST NOT be here:**
- "Minutes practiced" or any cold metric for its own sake
- Generic charts that don't tell a story
- Anything users can't act on
- Generic "Welcome to your dashboard" framing

**Key principle:** Every element on Dashboard answers "what did I do?" or "what should I do next?" — never "here are some numbers."

**Conversion role:** Day 4-7+ sessions live here. Power users return because Dashboard saves them work.

---

## Surface 3: TALK (CENTER, AI-POWERED HUB)

**What it is (Mike's words):** Where users can order, deliver, receive, translate, learn, or achieve anything.

**Primary feeling:** intelligent, responsive, "she gets me."

**Already shipped and SEALED at S3.5 (commit 8d030b4).** Do not modify without explicit founder approval.

**What lives here:**
- Persistent Miomi (96px head, mood animation)
- Voice-first conversation (Whisper + browser TTS)
- Mode carousel (Auto / Teach / Social / Translate / Chat — selected centers in orb)
- Toolbox (right column, transparent: keyboard / Aa length / globe language / TTS)
- Conversation transcript (user + Miomi bubbles)
- Guest gate (5 exchanges → auto-CTA)
- Ice-breaker greeting on session start
- **Pro badges on locked features** — Pro features show subtle Pro badge; tapping as Free user opens warm upgrade moment

**Architecture anchors (locked):**
- `userIntentRef` is single source of truth for mic state (never auto-restart on re-render)
- Warm VAD lifecycle (pause on stop, resume on restart, destroy only on lock/unmount)
- Carousel MicRow (selected mode centers, 2 left + 2 right rotate)
- Transparent shell (#FDFAF2 warm cream gradient)
- Auto language detection from user transcript
- Level mirroring in engine prompt

**Conversion role:** Every session. This is the product's heart. If Talk fails, the product fails. Pro feature gating happens here in-context.

---

## Surface 4: MARKETPLACE

> **⚠️ First job when /marketplace is built (locked May 26 2026):** The "Plan with me" / Upgrade section must be architected from a **conversion psychology** standpoint — not as a feature list. Required elements:
> - Two clear primary options (Pro monthly + Pro yearly), Pro Max as a soft third option
> - Anchor-pricing presentation (yearly saves 2 months — show the math visually)
> - Loss-framing on Free ("what you're missing" warmly, never punitively)
> - Social proof if available (X Thai families learning together)
> - Festival pricing slots (Songkran, back-to-school) per /MIOMIKA.md §1.10
> - PromptPay-first checkout (Thai market default; Stripe second)
> - NO lock icons. NO "UPGRADE NOW" caps. ALL framing warm — Miomi inviting, never demanding.
> 
> See /MIOMIKA.md §6.1 for tier truth. The /me Card 2 stub ("Go Pro together?") routes here.

**What it is (Mike's words):** Characters, teams, e-books, future features; also houses referral system and Star economy and pricing entry — all in one screen, all related to the app's economy and growth-of-the-app.

**Primary feeling:** delightful, optional, "look at all the things she can be."

### Why all four economy actions live here together

Refer & Earn, Upgrade to Pro, Buy Characters, and the Stars wallet are all **economic actions in the Miomika ecosystem**. A free user lands here and sees the full picture: "I can invite friends to earn Stars (free), I can upgrade to Pro (more intelligent AI), or I can spend Stars on characters/items." The conversion path is visually obvious — free → paid — without any single action feeling forced.

### Layout (scrollable landing — NOT a carousel)

Reasoning: Talk's mode carousel works because all five modes are equivalent verbs of the same intent (conversation). Marketplace's actions are fundamentally different contexts. A carousel would force the user to swipe between unrelated actions = friction. Cards visible at once = clarity.
[ Marketplace ]
⭐ Your Stars: 1,250          [+ Top up]
┌──────────────────────────┐
│ 🎁 Refer & Earn          │
│ Invite a friend, both    │
│ get 50 stars             │
└──────────────────────────┘
┌──────────────────────────┐
│ ✨ Upgrade to Pro        │
│ More intelligent AI,     │
│ unlimited memory         │
└──────────────────────────┘
┌──────────────────────────┐
│ 🛍️ Characters & Items    │
│ K-pop Bunny, Anime Hero  │
│ E-books, outfits         │
└──────────────────────────┘

> **Note on emojis in this wireframe:** The 🎁 / ✨ / 🛍️ symbols above are wireframe shorthand to communicate what each section is about. They are NOT a directive to ship emojis in the UI. Real implementation uses lucide-react icons (e.g. `Gift`, `Sparkles`, `ShoppingBag` or equivalents) per `/docs/architecture/DESIGN-RULES.md` §A.6. Emojis in UI chrome are forbidden.

### Section 1: Stars wallet (top, persistent context)
- Current balance
- Top-up packs button (buy Stars with real money; bonus tiers for larger purchases)
- Transaction history (earned vs spent vs purchased)

### Section 2: Refer & Earn (free marketing exchange)
- "Invite a friend → both get 50 Stars"
- Personal referral link (shareable URL: `miomika.com/invite/<username>`)
- Share to LINE / WhatsApp / TikTok / clipboard
- Track invites sent + accepted
- This is what free users give back in return for free app use. Free marketing = the contract.

### Section 3: Upgrade to Pro / Pro Max
- Tier comparison (Free / Pro / Pro Max)
- "More intelligent AI" framing (smarter conversations, unlimited memory, premium voice)
- Current tier displayed with Pro badge if applicable
- Upgrade flow → payment (Omise PromptPay / Stripe)
- This is where Pro/Pro Max subscriptions are actually purchased.

### Section 4: Characters & Items (Phase 7 build; surface scaffold earlier)
- Browse characters (Miomi free; K-pop Bunny, Anime Hero, Wise Fox — paid in Stars)
- E-books (AI-generated, personalized)
- Outfits and accessories
- Future: prompt packs, content templates users sell to each other
- Spent in Stars (earned from referrals OR purchased with money)

### What is NOT in Marketplace
- Subscription **management** UI (cancel, billing history, plan change) — that lives in Profile alongside identity. Marketplace is the BUY surface; Profile is the MANAGE surface.

### Key distinction (locked)
- **Marketplace items** (Stars-purchased) = one-time things you own
- **Pro/Pro Max subscriptions** (recurring) = bought IN Marketplace, MANAGED in Profile
- **Premium Voice tokens** = a separate add-on category; balance shown in Profile, top-up entry in Marketplace

**Conversion role:** Whales spend here. SEA markets respond to character-driven economies (Genshin, Roblox, LINE stickers). Free users discover the upgrade path naturally alongside the referral path. This is Miomika's moat against generic AI tools.

---

## Surface 5: PROFILE (route: /me, UI label: "Profile")

**What it is:** The relationship surface. Answers four user questions in order: (1) Am I making progress? (2) Am I getting value from my plan? (3) How do I shape Miomi and the app? (4) Am I safe and supported?

**Primary feeling:** in-control, known, "this is mine and she knows me."

**Status:** Visual layer LOCKED at v2.1 (May 26 2026). Content wiring debt tracked in /MIOMIKA.md §9.0.

### The 7-card anatomy (shipped)

**Hero (no card, floats on cream):**
- Avatar 80px circle
- Display name
- ONE tier chip ("Miomika Free" / "Miomika Pro" / "Miomika Pro Max")
- NO journey stage chip, NO bio fields, NO "Lives in X" — those are settings, not identity broadcast

**Card 1 — Our progress together (the proud card):**
- CEFR level + progress bar to next level (or "Starting fresh together~" empty state)
- Days learning together (only if days ≥ 2)
- Three stat columns: Words / Streak / Conversations
  - Populated: numeric value + label
  - Empty: motivating lucide icon (BookOpen / Flame / MessageCircle) + invitation copy
- "See all progress" outline button → /dashboard

**Card 2 — Your plan with me (the money card):**
- Tier name + plan summary line
- Stars row with balance + "Top up" pill → /marketplace
- Voice tokens row with balance + "Add more" pill → /marketplace
- Bottom CTA: Free → honey-gold "Go Pro together?" → /marketplace § Upgrade. Pro/Pro Max → secondary outline "Manage plan" → /me/billing

**Card 3 — Who Miomi is to you (the bond card):**
This is where the user shapes the cat. Critical: this is NOT a settings card, it's a relationship card.
- Her name (rename Miomi)
- How she sounds (Free / Premium voice)
- How she talks to you (conversation mode, reads `miomika.talk_config`)
- Her warmth (Soft / Balanced / Playful)
- What she calls you (display name — edited HERE, not echoed as a fake memory)

**Card 4 — App preferences (the cold-but-needed card):**
- Theme (Light / Auto / Dark)
- Sound effects toggle
- Alerts toggle
- App language

**Card 5 — Your privacy with me (the trust card):**
- "Things I've learned from us — N" (real memories from conversations, NOT signup fields)
- "Download my data" (Thai PDPA + GDPR)
- "Forget everything and start over" (calm muted, not destructive red)
- Empty state when N=0: "Nothing yet — we'll grow into this together"

**Card 6 — Help & feedback (the problem-solving card):**
- "Something's broken or confusing"
- "Help center"
- "Chat with a human"
- "What's new in Miomika"

**Card 7 — About & legal (the quiet card):**
- Privacy / Terms / About Miomika

**Logout:**
- Muted text link, centered, warm phrase ("Until next time~"), NOT a button, NOT red

### What this anatomy gets right (locked reasoning, do not regress)

1. **Progress before identity broadcast.** Users open /me to see they're growing, not to read back what they typed at signup.
2. **No fake memories.** "Things I remember about you" filled with signup form data is surveillance theater. Real memories live in Card 5; identity facts are NOT memories.
3. **Settings split by intent.** Card 3 (Relationship) is warm — how Miomi behaves toward you. Card 4 (App preferences) is cold — how the shell behaves. Mixing them is wrong.
4. **One honey-gold CTA.** Free → "Go Pro together?". Pro → zero gold buttons on this screen.
5. **Privacy is one card, calm, honest, not a placeholder.** Phase 3B fills it with real data; visual contract holds today.
6. **Problem-solving has a first-class card.** Most apps bury Contact. /me elevates "Something's broken" to a row.

### What MUST NOT be here

- iOS Settings cold-list aesthetic
- Bureaucratic identity forms (DOB, address, etc)
- Emojis in section headers or chrome
- Multiple honey-gold buttons
- Lock icons for Pro gating (Pro is celebrated as identity via chip, never gated here)
- Re-display of signup fields as memories
- Journey stage chip on display (it's a setting, accessed via Card 3)

### Conversion role

Where Pro identity is celebrated. Where memory control earns trust. Where the user shapes Miomi to their preferences. The relationship surface — not iOS Settings.

---

## The cross-cutting principle: subscription appears in three places by design

This is intentional. Not duplication.

| Where | Why |
|---|---|
| **Profile** | Subscription tier IS identity. Pro badge displayed proudly. Manage billing, change plan, cancel — all here. |
| **Marketplace** | Upgrade is one of three economy actions a user can take (alongside Refer & Earn, Spend Stars on Characters). This is where conversion happens — users see all paths to value side-by-side. |
| **Talk** | Feature gating happens in-context. Pro features show subtle Pro badges. Tapping as Free user opens warm upgrade moment that routes to Marketplace § Upgrade. |

**Same subscription truth, three contexts, each context serves a different intent.** Discovery (Marketplace), in-context conversion (Talk), identity + management (Profile).

---

## The audience truth (locked)

**Primary audience (the wedge):**
- **Thai content creators** who face an English barrier when expanding their reach (TikTok, Instagram, YouTube globally)
- **Thai students** at every level — primary, secondary, university, adult learners — who need English to access opportunity

**Secondary audience (the expansion):**
- **English speakers learning Thai** — the Tourist → Student → Worker → Resident → Entrepreneur flywheel describes how a single secondary user evolves across years. They arrive as tourists, fall in love with the country, become students, then workers, then residents, then entrepreneurs. Miomi grows with them across all stages. This is NOT a description of the primary audience.

**Enterprise (the rocket):**
- Schools, hotels, cafes, hospitals onboard their users en masse. Institution pays the bridge. User continues paying personally once hooked. Net acquisition cost: negative.

---

## What this document is NOT

- Not a feature list
- Not a build order (see MIOMIKA.md §7 Build Plan)
- Not a design spec (see MIOMIKA.md §4 Engineering Contract and design tokens)
- Not a complete documentation (read MIOMIKA.md alongside this)

This document exists for ONE reason: every future Claude/Cursor session must understand the five-nav architecture, the audience truth, and the cross-cutting principles without Mike having to re-explain. If you are a new session reading this — you now know. Build accordingly.

---

## Archive policy

Any major rewrite of this file or `/MIOMIKA.md` saves the previous version to `/docs/architecture/ARCHIVE/` with a timestamp BEFORE editing. **Never delete a previous version.** Use `git log` and the archive together for full history.
