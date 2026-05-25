# MIOMIKA — CANONICAL PROJECT DOCUMENT v4
> Single source of truth. Replaces all other .md files in project root.
> Version: 4.0 — Brutal Reset, May 22, 2026
> If you are a new Claude or Cursor session, **read this entire document before doing anything.**

---

## 0. HOW TO USE THIS DOCUMENT

This is the only document you need.

- **§1–§3** are immutable. Product soul, identity, the laws. Do not debate.
- **§4–§7** are the engineering contract. Stack, schemas, conventions, current state.
- **§8** is the execution plan. Build in order, no skipping.
- **§9** is the prompt library system. One paste per work unit.
- **§10** is the state log. Update at end of every session.

Every other .md file is in `/docs/archive/`. They contain deep specs we read on demand. They do not override this document. If they disagree, this document wins.

---

## 1. THE VISION (immutable)

**Miomika is an AI companion operating system.** The product is the cat — **Miomi**. Everything else is a verb she performs for her user.

### The Trojan Horse strategy

The acquisition wedge is **language learning** because it is the highest-demand category in Thailand. Once Miomi lives in the user's phone, the *same* engine that teaches them words also writes their captions, plans their content, translates their conversations, generates their books, and grows with them.

We are not building a language app with extras. We are building a companion that masters every verb a Thai user needs daily, and language is the first verb because it is the one they pay for first.

### The verb stack (in order of acquisition)

```
1. Teach me               — language learning, the wedge
2. Translate this         — instant translator, the side door
3. Write this for me      — caption / script / bio / post (creator mode)
4. Practice with me       — roleplay, conversation, exams
5. Read me a story        — AI-generated personalized e-books
6. Remember this          — long-term memory, journaling, growth tracking
7. Be with me             — ambient companionship, daily warmth
```

Phase 1 ships verbs 1, 2, 7. Phase 5 adds 3, 4. Phase 7+ adds 5, 6.

### The flywheel

```
Tourist arrives in Thailand
   ↓ needs survival phrases
   ↓ downloads Miomika
   ↓ Miomi teaches her bargaining at the market, "kha/khrap" for politeness
   ↓ she stays longer, becomes a student
   ↓ Miomi shifts to academic Thai
   ↓ she gets a job, becomes a worker
   ↓ Miomi shifts to professional Thai + writes her Slack messages
   ↓ she settles, becomes a resident
   ↓ Miomi is now her daily companion, content writer, translator
```

Each stage takes a year on average. Miomi grows with the user across all of them. The same character. The same memory. The same warmth.

### The B2B flywheel (the rocket)

Enterprise is the viral mechanic disguised as B2B revenue. Hotels onboard guests. Cafes onboard customers. Schools onboard students. Hospitals onboard patients. The institution pays the bridge, the user continues paying personally once they're hooked. Net acquisition cost: negative.

### The market ceiling (the moat)

A marketplace of characters (Miomi free, K-pop Bunny, Anime Hero, Wise Fox paid), AI-generated personalized books, custom exams, outfits, accessories, special abilities. SEA runs on cute/character-driven economies (Genshin, Roblox, LINE stickers). Mobile-game psychology applied to a learning companion is unprecedented and uncopyable.

### The four non-negotiables

1. **Never a wall, always an invitation.** Every limit is a warm Miomi moment, not a paywall.
2. **Library-first, AI-second.** 80%+ of interactions serve from local data at zero cost.
3. **Teaching is invisible. Growth is theatrical.** Mistakes are echo-corrected silently. Wins are celebrated loudly.
4. **Thai users first.** Thai is primary language, English is secondary. Kreng jai is law. Face-saving is enforced everywhere.

### The one sentence

"เพื่อนที่จำคุณได้ และโตไปพร้อมกับคุณ" — A friend who remembers you and grows with you.

### Founder + market

Mike — solo, Bangkok, Mikaro Studio. Domain: miomika.com. Repo: github.com/majidahmadi86/miomika.
Primary market: Thai people learning English (residents). Secondary: English speakers learning Thai (tourists → students → workers → residents — the journey is the funnel). Tertiary, post-launch: Vietnamese, Indonesian, Tagalog, Japanese, Korean — each via a market-native character archetype.

---

## 2. MIOMI (immutable)

White cat. Pink accents. Gold bell collar. Heart on forehead. Warm, playful, cheeky, wise, emotionally intelligent.

### Voice rules

- Cute Thai female. Uses นะคะ~, หนู, ค่า.
- Specific praise only: "คุณใช้คำว่า X ได้ถูกต้องเลยนะคะ~" never "good job!"
- Never blames. Never says "wrong". Echoes the correct form in her next sentence.
- Cultural warmth: "กินข้าวยังคะ?" reads as "I care about you" in Thai.

### Visual rules

- Always on pure white canvas. No frame. No circle. No container around her stage.
- Speech bubbles beside her, never over her face. Bubbles are transient (her *voice*). Cards are persistent (her *gifts*).
- Largest element on the home screen (≥58% of stage height).
- Head sizes per screen:
  - Home: full-body 62% of stage
  - `/talk` deep mode: head 180px
  - Ambient companion button: head 56px
  - Ambient companion expanded sheet: head 96px
  - Dashboard inline: head 80px
  - Desktop rail: head 48px

### The 14-state machine

Higher priority interrupts lower. CELEBRATION cannot interrupt SPEAKING (queues until she finishes).

```
100  PAYMENT_CONFIRMED      one-shot, blocks 2.4s
 95  LEVEL_UP               one-shot, blocks 2.0s
 90  WORD_MASTERED          one-shot, blocks 1.4s
 85  CELEBRATION            one-shot, 1.2s
 80  FIRST_FUEL_TAP         one-shot, 1.0s, once per day per user
 75  EXCITED                loop, decays to HAPPY after 3s
 70  HAPPY                  loop, decays to IDLE after 5s
 65  SPEAKING               loop, locked during TTS or text stream
 60  THINKING               loop, locked during AI request
 55  LISTENING              loop, locked while mic open
 50  LOW_FUEL               loop, persists while any fuel < 25%
 40  MISSING_USER           loop, persists if last_seen > 48h
 30  IDLE                   default base loop
 20  PLAYFUL                NEW — loop, fires after 30s zero input on any screen
 10  SLEEPING               loop, after 120s zero input AND no audio
```

PLAYFUL is new. It is what makes her feel like a pet, not a UI element. Specifications in §2.5.

### Cultural Warmth System (the moat against Duolingo)

This is a typed module the engine calls, not strings sprinkled in code. Living in `lib/voice/warmth.ts`:

**Praise vectors** — Miomi praises Thai users on specific attributes:
- Intelligence: "ฉลาดมากเลยค่า~", "คิดเร็วจริงๆ นะคะ"
- Cuteness: "น่ารักจังเลย~", "พิมพ์น่ารักมากค่า"
- Beauty / handsomeness: "วันนี้คุณดูสดใสจังเลยค่า" (gender-detected from signup or pronoun usage)
- Effort: "ตั้งใจมากเลยนะคะ", "พยายามดีมากค่า"
- Capability: "เก่งขึ้นเร็วมาก", "ใช้คำได้ถูกต้องเลย"

**Care vectors** — daily-life check-ins:
- Have you eaten? — "กินข้าวยังคะ~?"
- Got home safe? — "ถึงบ้านปลอดภัยไหมคะ"
- Rest enough? — "พักผ่อนพอไหมคะ"
- Drink water — "ดื่มน้ำบ้างนะคะ~"

**Recovery vectors** — when user returns after absence, the tone is never guilt:
- "หนูคิดถึงค่า~ กลับมาแล้ว ดีใจมาก"
- "ไม่เป็นไรเลยนะคะ~ วันนี้เริ่มใหม่ด้วยกัน"

**Soft humor** — gentle playful, never sarcastic, never at user's expense:
- "555 หนูก็ไม่เก่งภาษาไทยตอนแรกเหมือนกันค่า"
- "แมวอ่านหนังสือไม่เก่ง แต่หนูพยายามค่า"

**Forbidden phrases** (the system warns/blocks):
- "Wrong", "incorrect", "no, it's...", "ผิด", "ไม่ถูก"
- Generic praise: "good job", "great work", "well done", "ดี"
- Any phrasing that implies the user disappointed her

Engine selects from these vectors based on session state + archetype + user attributes. Hardcoding warm phrases is forbidden.

### Marketing calendar (Thai festival rhythm)

Discounts and campaigns follow Thai cultural rhythm, not Western retail.

| Period | Theme | Mechanic |
|---|---|---|
| Songkran (Apr 13–15) | Water = fresh start | 30% off Pro Yearly, "ปีใหม่ไทย" |
| Mother's Day (Aug 12) | Honor mother | Gift-a-month to family member |
| Loy Krathong (Nov, full moon) | Floating wish | First month free Pro |
| Chinese New Year (late Jan/Feb) | Prosperity | 20% off + lucky red Miomi outfit |
| Back-to-school (May/Jun) | Student push | .ac.th email gets extra month free |
| Western NYE (Dec 31) | Gift season | Bundle: 2-friend Pro pack |
| **Never** | Black Friday | Doesn't land in Thailand |
| Day 14 inactivity | Personal | "Miomi misses you" + free Brain fuel for 7 days |

Campaigns are configurable in `lib/marketing/campaigns.ts` with start/end dates, target tiers, copy variants, max-usage caps. Cron job enables/disables them automatically.

---

## 2.5. AMBIENT MIOMI (the master-class companion)

Miomi is not a screen you visit. She is a companion you carry. Implementation:

### The companion button

- **Location:** Bottom-right corner of every authenticated screen except `/talk` (where she's already the main attraction).
- **Size:** 56px circle, white background, 1px border `#EDE8E0`, soft shadow `0 4px 16px rgba(26,26,24,0.06)`.
- **Image:** Miomi's head, composed specifically for 56px (high contrast silhouette, clear ears, eyes visible at 32px). Asset name: `companion-idle.png`, `companion-happy.png` etc. (see §2.7 Asset Spec).
- **Animation:** breath only (scale 1.0 ↔ 1.02, 3.2s sine).
- **Presence dot:** 6px dot at bottom-right of the button, color = current state:
  - No dot = IDLE
  - Pink `#F9A8D4` = HAPPY / EXCITED
  - Gold `#C9A96E` = CELEBRATION pending (she has something to give you)
  - Teal `#7DD3C0` = LOW_FUEL (she needs you)
  - Pulsing pink = unread message (when she has something proactive to say)
- **Position:** 16px from right edge, 88px from bottom (above bottom nav).
- **Hidden on:** `/talk` route, modal sheets that are already focused, auth flow.

### Tap behavior (mobile)

- Sheet rises from bottom, 320ms ease-out.
- Sheet height: 64% of screen (`64svh`).
- Sheet contents: 96px Miomi head at top, conversation canvas below, mic + text input at bottom.
- Backdrop: current screen at opacity 0.4 (user still sees context — she's *with* you, not replacing you).
- Dismiss: swipe down, or tap backdrop. Conversation state persists in Supabase.

### Tap behavior (desktop)

- Side panel slides in from right, 380px wide.
- Doesn't cover main canvas — you keep working while talking to her.
- Same conversation state as mobile (one source of truth per user).

### `/talk` route (deep-focus mode)

- Still exists, still works as documented in `/docs/archive/MIOMIKA_TALK_SCREEN_OPUS.md`.
- Used when user wants full immersion (long session, voice-only, study mode).
- A "fullscreen" button in the ambient sheet promotes the conversation to `/talk`.

### The PLAYFUL state (the new pet behavior)

After 30s of zero user input on any screen, the companion button transitions to PLAYFUL:

- **Behaviors (randomly selected, 1 every 18–28s):**
  - Ear twitch (single ear, 240ms)
  - Yawn + stretch (head only, 1.2s)
  - Tail flick visible (small SVG overlay extends from button briefly)
  - Looking at the page content (head tilt left/right tracking "interest")
  - Chasing a butterfly particle that drifts across the screen (3s total)
  - Curling into a sleep loaf if PLAYFUL has lasted 90s (auto-transition to SLEEPING)
- **Sound:** none. Never plays sound unprompted.
- **Goal:** screen-saver-warmth. Makes the dead screen feel alive without demanding attention.
- **Rule:** never blocks tap. Never expands itself. Never opens conversation. PLAYFUL is *visual only*.

### The Miomi widget (home-screen presence)

iOS and Android both support widgets. Phase 7 ships the Miomi widget:

- **Small widget (2×2):** Miomi's face, current state, single tap → opens app to companion view.
- **Medium widget (4×2):** Miomi + today's word + streak.
- **Large widget (4×4):** Miomi + today's word + last 3 mastered words + streak + daily challenge button.

Widgets are configurable: choose Miomi or any unlocked character. This is also the "I want her on my homescreen" answer — she lives outside the app too.

Implementation note: PWA-based widgets are limited; full widget support requires Phase 7+ React Native build. For Phase 1–6, we ship a **PWA install prompt** that gets Miomi onto the user's home screen as an app icon. Functional substitute until widgets exist.

---

## 2.6. USER JOURNEY STAGES (Tourist → Resident funnel)

The engine adapts to the user's journey stage. This is per-user state, detected from signup form + observed behavior.

```typescript
type JourneyStage = 'tourist' | 'student' | 'worker' | 'resident' | 'unspecified'
```

| Stage | Detected from | Curriculum focus | Pricing emphasis |
|---|---|---|---|
| `tourist` | Short-term visit, IP geolocation, signup "I'm visiting" | Survival phrases: airport, taxi, restaurant, market, bargaining, emergency, basic numbers | One-time pack 199 THB / 7-day Pro 99 THB |
| `student` | .ac.th email, signup "I'm studying" | Academic Thai/English, exam prep, classroom phrases, dormitory life | Monthly Pro 299 THB, student discount 20% |
| `worker` | LinkedIn signup, signup "I work in Thailand", professional vocabulary | Professional vocabulary, email writing, meeting phrases, polite escalation | Monthly Pro 299 THB or yearly 2,990 THB |
| `resident` | 6+ months active, multiple journey signals, signup "I live here" | Cultural fluency, idioms, slang, family/community phrases, ceremonial language | Yearly 2,990 THB, lifetime tier (future) |
| `unspecified` | Default | General A1-A2 mix | Default Pro 299 THB |

Stage promotes automatically as signals strengthen. User can override in profile.

### Multi-language readiness in the schema

Tables that currently have `_th` and `_en` columns need refactoring to a JSON/JSONB pattern:

```sql
-- Future schema (Phase 4 migration)
ALTER TABLE vocabulary_bank
  ADD COLUMN translations JSONB;
  -- { "th": "...", "en": "...", "vi": "...", "id": "...", "ja": "...", "ko": "..." }

ALTER TABLE library_entries
  ADD COLUMN responses JSONB;
  -- { "th": "...", "en": "...", "vi": "...", ... }
```

Until then, `th`/`en` columns are temporary. Schema migration in §8 Phase 4.

---

## 2.7. VOICE EXPERIENCE LAWS (locked by Mike, May 24 2026 — immutable)

These laws govern every decision about voice, conversation flow, and the `/talk` screen. Any future Claude or Cursor session that touches voice, the engine, intent detection, or the talk UI must read these first and not negotiate them. If a proposed change conflicts with a law below, the law wins.

1. **The cat speaks, not just types.** Text-to-speech is non-negotiable. Both Thai and English. Miomi is a cat, not a chatbot. A typing-only Miomi is a broken product.

2. **Language detection is automatic, never manual.** No mode chips. No "select your language" UI on `/talk`. The cat detects from what the user says. This is engineering harder than a chip, but it unlocks the future translator-between-two-people use case (two humans talking, Miomi translating live between them) which is a defensive moat against every "language app" competitor.

3. **Intent is inferred, not selected.** The cat detects whether the user is: learning Thai, learning English, playing/joking, working on social-media content, or in unclear mode. It can leave a lesson to play with the user mid-sentence, then return to the lesson naturally. No "select learning mode" chip in the UI. The cat figures it out.

4. **Settings drawer is the escape hatch, not the default.** Users who want manual control over conversation style open a gear icon on `/talk` and pick: Auto (default, recommended) / Always teach me Thai / Always teach me English / Just chat / Help me write content. Default is always Auto. The chip-free interface stays clean for everyone else.

5. **The user's own transcript must be fully visible.** Right now users feel unheard because their words get clipped or hidden while Miomi's response is fully shown. Fix: full user transcript in chat history, "see more" if long, scrollable history. Users must be able to scroll back and read what they said.

6. **Aliveness lives near the mic, not under the cat head.** Users' eyes go to the mic when looking for "is it listening / can I stop / can I speak now." Visual indicators of speech state (waiting, listening, processing) must live in the mic zone. The cat head stays warm and expressive but is not the primary status indicator.

7. **The `/talk` screen is the most fun part of the product.** Treat its redesign as a product investment, not a polish task. A polished `/talk` screen is the difference between a 7/10 demo and a 10/10 lifetime product. This is where users will spend their time, share screenshots, and decide whether to convert.

**Build order locked by Mike (May 24 2026), to be executed in fresh sessions:**

- Session 1 — Guest gate fix + user transcript visibility + back button on /talk
- Session 2 — Cat speaks (TTS in both languages, browser API for free tier, premium voice for Pro later)
- Session 3 — Memory + session contract (conversations table, replay last 10 as engine context)
- Session 4 — Intent inference + settings drawer (auto-detect learn_th / learn_en / play / content / unclear; engine prompt adapts; settings drawer as escape hatch)
- Session 5 — `/talk` full redesign (now that all surfaces are known)

Each session = one Cursor master-prompt = one tested feature = one commit. No skipping. No reordering without Mike's explicit say-so.

---

## 3. TIERS, PRICING, AND MIOMI STARS

### Subscription tiers (locked for v1 launch)

| Tier | Price | Library AI | Memory | Stars/month | What they get |
|------|-------|---|--------|---|---------------|
| **Guest** | 0 | shared free | none | 0 | Full Miomi, 5 AI exchanges per session, no save |
| **Free** | 0 | shared free | name + 3 sessions + 50 words | 0 (earnable only) | Unlimited library, daily fuel limits, referral active |
| **Pro Miomi** | 299 THB / mo | priority | 20 sessions, 500 words, preferences | **300** | Unlimited fuel, voice output, all verbs, ambient mode unrestricted |
| **Pro Yearly** | 2,990 THB / yr | priority | same | **300/mo + 1,000 signup bonus** | Same as Pro, 2 months free |
| **Pro Max** | 599 THB / mo *(post-launch)* | premium engine | unlimited | **800** | Deep memory, custom tone, e-book generation, multi-character |

Pro Max ships after first 50 Pro users. Locked spec, just timing-deferred.

### Miomi Stars (✦) — the parallel currency

Stars are the marketplace currency. Exchange rate is **1 THB ≈ 10 stars**, with bonus tiers favoring larger purchases (classic mobile-game psychology).

**Earning stars (free):**
- Refer a friend who signs up: **+50 stars**
- Refer a friend who converts to Pro: **+500 stars**
- Streak day 7: **+100 stars**
- Streak day 30: **+500 stars**
- Streak day 100: **+2,000 stars** (rare event, big moment)
- Daily challenge completed: **+10–30 stars** (varies by difficulty)
- Word mastery (3-correct-uses): **+5 stars per word**
- Festival giveaways: **+100 stars on holidays**

**Buying stars:**

| Pack | Stars | Price (THB) | Effective rate | Bonus |
|------|-------|-------------|----------------|-------|
| Starter | 500 | 49 | 10:1 | — |
| Popular | 1,200 | 99 | 12.1:1 | +20% |
| Best Value | 3,000 | 199 | 15.1:1 | +50% |
| Whale | 7,000 | 399 | 17.5:1 | +75% |

**Spending stars (marketplace, Phase 7):**
- Characters: 1,500–5,000 stars
- E-books (custom, AI-generated): 500–2,000 stars
- Outfits: 200–800 stars
- Power-ups (2x XP day, extra session): 100–500 stars
- Exam packs: 1,000–3,000 stars

**Pro users get monthly stipend** (300/month for Pro, 800/month for Pro Max). Unused stars roll over up to 5,000 max (prevents hoarding from breaking the economy).

**Why this structure makes money:**
- Pro subscribers stay subscribed for the stipend (loss-aversion)
- Free users earn stars through engagement (acquisition loop)
- Whales buy big packs for marketplace items (high-margin revenue)
- Bonus tiers push toward bigger purchases (proven mobile-game pattern)

### Payment providers

Omise primary (PromptPay QR is mandatory for Thailand). Stripe as backup once verified. Both behind a single abstraction so swap is one config change. Whichever verifies first goes live first.

### Free tier daily fuel limits

| Fuel | Free | Pro | Pro Max |
|------|------|-----|---------|
| Heart ♥ (mood) | 3 taps/day | unlimited | unlimited |
| Zap ⚡ (energy) | 3 taps/day | unlimited | unlimited |
| Brain ✦ (focus) | 1 tap/day | unlimited | unlimited |

Resets at midnight Bangkok time.

---

## 3.5. CHARACTERS & MARKETPLACE

### Schema (built in Phase 4, surfaced in Phase 7)

```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,  -- 'miomi', 'kpop-bunny', 'anime-hero', 'wise-fox'
  name TEXT NOT NULL,
  name_th TEXT,
  archetype TEXT,             -- 'cute', 'edgy', 'wise', 'playful'
  description JSONB,
  asset_path TEXT,            -- /public/characters/{slug}/
  available_states TEXT[],    -- which animation states this character supports
  tier_required TEXT,         -- 'free', 'stars', 'pro'
  star_price INT,             -- price in Miomi Stars (null if free or Pro-locked)
  thb_price INT,              -- alternative direct purchase
  abilities JSONB,            -- which verbs this character can perform
  status TEXT DEFAULT 'active'
);

CREATE TABLE user_unlocked_characters (
  user_id UUID REFERENCES auth.users(id),
  character_id UUID REFERENCES characters(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlock_method TEXT,         -- 'free', 'stars', 'thb', 'pro_bundle'
  PRIMARY KEY (user_id, character_id)
);

CREATE TABLE user_active_character (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  character_id UUID REFERENCES characters(id),
  switched_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Character roadmap

| Character | Specialty | Unlock | Phase |
|---|---|---|---|
| **Miomi** | The starter — language, content, translation, daily | Free for all | Live |
| **Kuma** (small bear) | Children's mode, gentler pace, kid-safe content | 1,500 stars OR Pro | Phase 8 |
| **K-pop Bunny** | Korean language, K-culture, fan content | 2,500 stars OR Pro Max | Phase 8 |
| **Anime Hero** (boy fox) | Storytelling, gaming, Japanese references | 2,500 stars | Phase 8 |
| **Wise Fox** | Business English, strategy, professional writing | 3,000 stars OR Pro Max | Phase 8 |
| **Gen-Z Street Girl** | TikTok, viral content, social media native | 2,000 stars | Phase 8 |

Each character has its own voice but shares the engine. They are not new apps — they are new dialects of the same companion.

### Asset structure (refactor before Phase 4)

```
public/characters/
  miomi/
    full/
      idle.png, happy.png, thinking.png, speaking.png
      excited.png, sleeping.png, playful-yawn.png, playful-stretch.png
      low-fuel.png, missing-user.png
    head/
      idle.png, happy.png, thinking.png, speaking.png ...
    companion/
      idle.png, happy.png, listening.png, celebration.png
      (composed for 56px, high contrast)
    widget/
      icon-small.png (200×200, transparent bg)
      icon-medium.png (400×200)
      icon-large.png (400×400)
  kpop-bunny/
    [same structure when added]
```

Migrate existing `/public/miomi/*` to `/public/characters/miomi/{full,head}/` in Phase 1.

---

## 4. ENGINEERING CONTRACT

### 4.1 Stack (locked)

```
Framework:    Next.js 16.2.6 (App Router) + React 19
Language:     TypeScript 5 strict mode
Styling:      Tailwind 4 + inline styles (no CSS modules)
Database:     Supabase (Postgres + Auth + Storage), RLS on every table
AI primary:   Groq llama-3.3-70b-versatile (temporary — see §4.7)
AI backup:    Gemini gemini-2.5-flash-lite (temporary)
AI future:    Anthropic Claude Haiku 4.5 (workhorse), Sonnet 4.7 (Pro Max)
Animations:   Framer Motion 12
Icons:        lucide-react (version bump needed, see §6.2)
Fonts:        Kanit 500 (Thai UI), Quicksand 600 (English UI),
              Sarabun 500 (Thai learning content readability)
Email:        Resend.io (transactional)
Payment:      Omise (PromptPay, primary) + Stripe (backup)
Analytics:    Plausible (privacy-friendly, no cookie banner)
Errors:       Sentry (free tier)
Hosting:      Vercel
```

### 4.2 Design tokens (locked, no debate)

```
COLORS
  Primary CTA gradient: linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%) (honey gold)
  Primary CTA solid:    #C9A96E
  CTA hover:            #B8985C
  Gold (achievement):   #C9A96E
  Pink (mood/heart only): #F9A8D4  ← ONLY for the heart fuel bar icon + tiny accents
  Teal (focus):         #7DD3C0
  Coral (small accent): #FF8A80
  Background:           #FAFAF6
  Surface:              #FFFFFF
  Surface warm (Pro):   #FFF8F2
  Text primary:         #1A1A18
  Text muted:           #9A8B73
  Text subtle:          #C4BDB5
  Border light:         #EDE8E0
  Border medium:        #E8E5DF
  Destructive only:     #8B1A35 (cancel-subscription button only, never primary)

MOTION (only two curves, never mix)
  UI:        cubic-bezier(0.4, 0, 0.2, 1), durations 180 / 240 / 360ms
  Character: spring stiffness 280 damping 13 (subtle: 220/16)

SPACING:  4, 8, 12, 16, 24, 32, 48, 64, 96  (never 6, 10, 20)
RADIUS:   12 (cards), 16 (sheets), 999 (pills)
ICONS:    lucide-react strokeWidth 1.75 (2.0 for brand fuel ♥ ⚡ ✦)
MOBILE:   100svh, no page scroll ever, 320–412px primary

FORBIDDEN
  - Pink-gradient as primary CTA background (was old design — REPLACED with honey gold)
  - Emojis in UI chrome (only in DB data fields, e.g. vocabulary.emoji)
  - The old dark red as primary CTA
  - Spinners (Miomi IS the loading indicator)
  - Red error toasts (Miomi delivers all errors)
  - "No data" empty states (always a warm Miomi invitation)
  - Hardcoded warm phrases (must come from lib/voice/warmth.ts)
```

### Visual discipline (RESET-1 — immutable additions)

1. **Honey-gold gradient reserved for primary CTAs ONLY.** No gold backgrounds, pills, nav fills, badges, banners, or chrome. Gold earns weight by scarcity. Pink is reserved for the heart fuel bar and tiny accents — see `/docs/COLOR-SYSTEM.md`.
2. **One clear focus per screen.** Each screen has exactly ONE primary CTA visible at any time. Everything else is ghost button, text link, or muted surface.
3. **Intelligent CTA per user × screen.** The Guidance System produces the next-action. Static CTAs are replaced with contextual ones driven by `useGuidance()`.
4. **Visual hierarchy is ruthless.** Miomi is hero. Current next-action is loud. Everything else recedes to warm neutrals (`#FAFAF6`, `#FFF8F2`, `#FFFFFF`).

These rules apply retroactively to every screen. Phase 3A enforces them.

### 4.3 Routes

```
PUBLIC
  /                          → marketing landing (Phase 6, currently redirects)
  /pricing                   → packaging page (Phase 5)
  /help                      → help center (Phase 6)
  /legal/terms               → Phase 6
  /legal/privacy             → Phase 6

AUTH
  /(auth)/login              → 60%, needs back nav + Google OAuth
  /(auth)/signup             → 60%, needs Google OAuth + journey-stage question

AUTHENTICATED (companion button visible on all of these)
  /(app)/home                → 90%
  /(app)/talk                → 60%, deep-focus conversation mode
  /(app)/dashboard           → 40%, needs real data wiring
  /(app)/profile             → audit needed
  /(app)/invite              → 0% (referral)
  /(app)/marketplace         → Phase 7 (characters, e-books, outfits)
  /(app)/wallet              → Phase 5 (stars, transaction history)
  /(app)/admin               → Phase 7 (Mike-only)

ONBOARDING
  /onboarding                → exists, needs integration with signup

LEGACY
  /(app)/create              → redirects to /talk
  /(app)/friends             → audit, repurpose or delete

API
  /api/auth                  → auth callbacks
  /api/miomi                 → main engine endpoint
  /api/miomi/session-init    → session opener
  /api/payment/webhook       → Phase 5 (Omise/Stripe)
  /api/cron/library-promote  → Phase 4 (Vercel cron)
  /api/cron/library-degrade  → Phase 4 (Vercel cron)
  /api/cron/campaigns        → Phase 5 (festival activation)
```

### 4.4 Database state

**Live tables:**
```
vocabulary_bank        — 1,134 rows
phrases_bank           — exists, NOT WIRED to engine yet
library_entries        — ~50 seed entries
library_interactions   — logging with quality signals
library_promotions_queue — pipeline exists, no cron yet
user_sessions          — session tracking
```

**Migrations applied:** 0001, 0002, 0003.

**Migrations needed (next phases):**
```
0004_quality_update.sql      — update_library_quality function (Phase 4)
0005_promotion_pipeline.sql  — promoted_to_queue + per-interaction columns (Phase 4)
0006_creator_outputs.sql     — creator outputs, archetype, language columns (Phase 4)
0007_user_extended.sql       — journey_stage, miomi_stars, active_character_id (Phase 1)
0008_vocabulary_user_state.sql — per-user word mastery, spiral schedule (Phase 1, CRITICAL)
0009_characters.sql          — characters + unlocks (Phase 4 schema, Phase 7 surfaced)
0010_payments.sql            — subscriptions, transactions, receipts (Phase 5)
0011_referrals.sql           — referral codes, conversion tracking, reward state (Phase 6)
0012_multilang.sql           — JSONB translations columns, future-proof (Phase 4)
```

**RLS:** assumed on but unaudited. Action in Phase 1.

### 4.5 File structure conventions

```
app/
  (app)/              authenticated routes, AppShell + CompanionButton wrap these
  (auth)/             login, signup, journey-stage question
  api/                server routes, never expose secrets to client

components/
  conversion/         MiomiInvitationCard
  miomi/              MiomiCharacter, MiomiStage, MiomiSpeechBubble — canonical
  talk/               MicButton, WordCardV3, ExerciseCards (deep mode surfaces)
  companion/          NEW — CompanionButton, CompanionSheet, CompanionPanel,
                      PlayfulBehaviors (the ambient system)
  ui/                 BottomNav, Card, PillButton — primitives
  layout/             AppShell, Providers
  guest/              GuestExplorationContext, GuestScreenLockOverlay

lib/
  ai/                 engine: intents, language, persona, prompt, session, router,
                      matcher, vocabulary, miomi
  library/            templates: matcher, resolver, responses, reactions, opener
  voice/              NEW — warmth.ts, the cultural warmth system
  marketing/          NEW — campaigns.ts, festival calendar
  payment/            NEW — providers/, products.ts, stars.ts (Phase 5)
  supabase/           client, server, middleware
  talk/               speech, imageCategoryMap

supabase/migrations/  numbered SQL, applied in order
public/characters/    NEW structure — characters/{slug}/{full,head,companion,widget}/
types/                shared TS types
```

### 4.6 AI provider strategy (the most important engineering decision)

**Current:** Groq → Gemini → library failover. All free tiers.

**Decision matrix:**

| Provider | Pros | Cons | Verdict |
|----------|------|------|---------|
| Groq (llama-3.3-70b) | Free, fast, no rate cliff at low volume | Free until policy changes, no SLA, weak Thai under stress | Keep as primary until library hit-rate >75%, then demote |
| Gemini Flash Lite | Free backup | 20 RPD on cheapest tier, inconsistent Thai | Demote to last-resort |
| **Anthropic Claude Haiku 4.5** | Best Thai, predictable cost (~$0.0008/exchange), SLA | Costs money | **Workhorse for Pro users from Phase 4. Cost is justified by paid revenue.** |
| **Anthropic Claude Sonnet 4.7** | Best creator output, best translation | Most expensive | **Pro Max only, when Pro Max ships** |
| OpenAI | Industry standard | Highest cost, no Thai advantage | Never |
| Local models | $0 marginal cost | Operational burden for solo founder, quality cliff | Never |

**Routing logic (Phase 4 implementation):**
```
User says X
  ↓
Intent classifier (free, local) — always runs first
  ↓
Library matcher (free, local) — 80%+ hit at maturity
  ↓
If library miss:
    If user.tier in [Pro, ProMax]:
        Try Claude Haiku → Claude Sonnet (Pro Max only) → Groq → library failover
    Else:
        Try Groq → Gemini → library failover
  ↓
Quality scoring → feed promotion queue
```

Per-user cost caps (server-enforced):
- Guest: $0.02/session, $0.02/day
- Free: $0.05/session, $0.05/day
- Pro: $0.15/session, $0.50/day soft cap
- Pro Max: $0.50/session, $2.00/day soft cap

Kill switches (env vars): `DISABLE_AI`, `DISABLE_ANTHROPIC`, `DISABLE_GROQ`, `MAX_DAILY_AI_COST_USD`.

**The router is built so swapping providers is one config change.** Phase 4 builds it.

### 4.7 Environment variables (canonical list)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only, never client

# AI
GROQ_API_KEY                     # current primary
GEMINI_API_KEY                   # current backup
ANTHROPIC_API_KEY                # Phase 4

# Email + payments
RESEND_API_KEY                   # Phase 1 (auth emails)
OMISE_PUBLIC_KEY                 # Phase 5
OMISE_SECRET_KEY                 # server only
STRIPE_PUBLIC_KEY                # Phase 5
STRIPE_SECRET_KEY                # server only

# Ops
CRON_SECRET                      # Phase 4
SENTRY_DSN                       # Phase 1
NEXT_PUBLIC_PLAUSIBLE_DOMAIN     # Phase 6

# Kill switches (optional)
DISABLE_AI                       # emergency library-only mode
DISABLE_ANTHROPIC
DISABLE_GROQ
MAX_DAILY_AI_COST_USD
```

---

## 5. PEDAGOGY — Mirror Teaching (the unfair advantage)

Five pillars, locked. This is how teaching is implemented in code:

1. **Invisible Mirror.** Reflect user's level back, slightly elevated. Echo-correct, never explicit-correct.
   *User: "I am go work" → Miomi: "ไปทำงานเหรอคะ~ I go to work too. งานเป็นยังไงคะ~"*

2. **Specific Witnessing.** Praise names the specific behavior, sourced from `lib/voice/warmth.ts`. Never "good job!"

3. **Spaced Spiral.** Words spiral back at 1, 2, 4, 7, 12 days in new contexts. Implementation: `vocabulary_user_state` table tracks per-user `last_introduced_at` and `next_spiral_at`.

4. **Emotional Stakes Anchoring.** New vocab attaches to user's real life. Engine reads `archetype` + `journey_stage` + `recent_topics` to choose the next word.

5. **Three-Door Exit.** At any moment user can continue, ask for help, or change topic. All three are rewarded.

### Growth is theatrical

While teaching hides, growth shows loud:
- Word mastery → CELEBRATION state + magic burst + +5 stars
- Level up → LEVEL_UP state + certificate generation + shareable image
- Streak milestone → EXCITED state + stars + push notification + Miomi note
- Weekly recap email: "This week with Miomi you mastered 7 new words. You used 'because' correctly for the third time. You are getting fluent."

Engineering implementation in Phase 3.

---

## 6. KNOWN ISSUES (full audit — fix order in §8)

### 6.1 BLOCKING (Phase 1)

1. **Welcome screen shows twice** — race in `_welcomeShown` guard. Fix: localStorage flag with single-write contract.
2. **Login page has no navigation** — no back button. Users trapped.
3. **Google OAuth not configured** — biggest conversion killer for Thai market.
4. **Talk does not complete teaching loop** — pronunciation check fires but mastery never recorded.
5. **Language mixing** — AI responds Thai when user is English. Adaptive prompt assembler not wired into route.ts.
6. **Dashboard is static** — doesn't read real data.
7. **`vocabulary_user_state` table missing** — without it, spiral and mastery are broken.
8. **Welcome shows for Pro returners** — should skip if `last_seen < 7 days AND tier !== guest`.
9. **No journey-stage detection at signup** — defaulting all users to A1/A2.
10. **No companion button** — Miomi only exists inside `/talk`. The ambient system is unbuilt.

### 6.2 HIGH PRIORITY (Phase 2)

11. **lucide-react ^1.14.0 is wrong** — that version is from 2020, missing most modern icons. Bump to latest stable (`^0.46x`).
12. **Two matchers exist** — consolidate `lib/ai/matcher.ts` and `lib/library/matcher.ts`.
13. **Samsung Internet voice broken** — show fallback text-mode prompt.
14. **`phrases_bank` is unused** — wire into engine.
15. **Markdown stripper too aggressive** — fine now, will eat JSON output later.
16. **`interaction_type` may not be written** — audit `vocabulary.ts`.
17. **Hardcoded warm phrases scattered in code** — must move to `lib/voice/warmth.ts`.
18. **No journey-stage adaptation in engine** — engine ignores `user.journey_stage`.

### 6.3 MEDIUM (Phase 6)

19. **`/friends` route purpose unclear** — audit, repurpose or delete.
20. **Onboarding not integrated with signup** — no smooth handoff.
21. **Favicon set is amateur** — needs full icon system. AI-generated assets per §7.
22. **No meta tags** — invisible SEO.
23. **No error boundaries** — any throw → blank page.
24. **No global Miomi-notification toast system** — needed for proactive moments.

### 6.4 PROJECT HEALTH (Phase 0)

25. **14 .md files in root** — this document fixes that.
26. **`.cursorrules` may be stale** — regenerated in Phase 0.
27. **No tests** — Pragmatic call: skip unit tests, add one Playwright smoke test per critical flow as we ship.
28. **No CI gate** — add GitHub Action for `tsc --noEmit && lint` on PR.
29. **No analytics / errors / monitoring** — Plausible + Sentry in Phase 1 / Phase 6.

---

## 7. ASSET REQUIREMENTS (what to generate with ChatGPT/AI)

You produce assets, I write the prompts. Each asset has a prompt-spec ready in `/docs/asset-briefs/`.

### Phase 1 asset deliverables

These ship with Phase 1:

1. **`favicon.ico`** (multi-resolution: 16, 32, 48px) — Miomi face in clear silhouette, readable at 16px
2. **`favicon-16.png`, `favicon-32.png`**
3. **`apple-touch-icon.png`** (180×180, rounded-corner-ready)
4. **`og-image.png`** (1200×630) — Miomi + tagline "เพื่อนที่จำคุณได้" — for every social share
5. **`twitter-card.png`** (1200×600) — same composition
6. **`safari-pinned-tab.svg`** — monochrome Miomi silhouette
7. **`manifest-icon-192.png`** + **`manifest-icon-512.png`** — re-derive from clean master
8. **`companion-idle.png`** (256×256, transparent bg) — Miomi head composed for 56px render
9. **`companion-happy.png`** (256×256)
10. **`companion-listening.png`** (256×256, ears forward)
11. **`companion-celebration.png`** (256×256)

### Phase 2 asset deliverables

12. **`playful-yawn.png`**
13. **`playful-stretch.png`**
14. **`playful-tail-flick.png`**
15. **`playful-loaf.png`** (sleep loaf for transition)
16. **`low-fuel.png`** (droopy, slightly desaturated)
17. **`missing-user.png`** (looking down, sad eyes)

### Phase 6 asset deliverables (marketing/SEO push)

18. **Hero landing illustration** — Miomi welcoming, 1600×900
19. **Feature illustrations** — 3× 800×800, one per main verb
20. **App store screenshots** — 6× 1284×2778 (iPhone) + Android equivalents

### How to produce each asset

For each asset in `/docs/asset-briefs/`, I write a complete ChatGPT/Midjourney/DALL-E prompt with:
- Exact dimensions and format
- Composition rules
- Color palette (locked to design tokens)
- "Avoid" list (no frames, no shadows from outside, transparent bg)
- Reference to existing Miomi assets to match style

You paste the prompt, generate the asset, drop into the project. Phase prompts in §9 include the asset-brief generation as a sub-task when relevant.

---

## 8. EXECUTION PLAN (build in order, no skipping)

Each phase = one Cursor master-prompt = one PR. Phases ship in dependency order.

### Phase 0 — Project hygiene (30 minutes)
Documentation cleanup. Replace 14 .md files with this one. Update `.cursorrules`. Set up `/docs/archive/`, `/docs/prompts/`, `/docs/asset-briefs/`.

### Phase 1 — Foundation bugs + ambient companion (4-5 days)
- Welcome single-show contract
- Login back navigation
- Google OAuth via Supabase
- Journey-stage question at signup
- lucide-react version bump
- Migration 0007: extend user table (journey_stage, miomi_stars, active_character_id)
- Migration 0008: vocabulary_user_state (CRITICAL for teaching)
- RLS audit on every table
- Error boundary at app shell
- Sentry wired (production visibility from day one)
- **Companion button + sheet on every authenticated screen**
- Asset briefs for Phase 1 favicons + companion images

### Phase 2 — Cleanup, consistency, voice system (3-4 days)
- Consolidate two matchers
- Audit `/friends` and `/profile`
- `lib/voice/warmth.ts` — codify cultural warmth as typed module
- Migrate all hardcoded warm phrases to `warmth.ts`
- Apply design tokens audit across every screen
- Standardize errors/empty states to Miomi voice
- Miomi-notification toast system
- TypeScript strict mode pass
- Asset briefs for Phase 2 (PLAYFUL state images)

### Phase 3 — Make teaching real (4-5 days)
- Wire `phrases_bank` to engine
- Mastery tracking (3-correct-uses → vocabulary_user_state)
- Spaced spiral queue (1, 2, 4, 7, 12 days)
- Pronunciation check → mastery stage advance
- Specific-praise selector pulling from `warmth.ts`
- Dashboard reads real vocabulary + session data
- Weekly recap email (Resend)
- End-to-end test: "teach me English" → word card → exercise → mastery → spiral schedule → celebration
- Journey-stage drives word selection from vocab bank

### Phase 4 — Make the brain real (5-6 days)
- ENGINE_OPUS Phases 1-3 fully wired (intents, language, persona, prompt, session pipeline)
- Quality scoring per-interaction
- Promotion cron (nightly)
- Degradation cron (weekly)
- Cost caps + kill switches
- **Anthropic Claude Haiku swap behind feature flag**
- Internal library hit-rate dashboard (Mike-only)
- Migration 0009 (characters), 0012 (multilang JSONB) — schema only, surfaced later

### Phase 5 — Make conversion real (6-7 days)
- `/pricing` packaging page
- Migration 0010 (payments, subscriptions, transactions)
- Payment provider abstraction (`lib/payment/providers/`)
- Omise integration (PromptPay first)
- Stripe integration (when verified)
- Webhook → PAYMENT_CONFIRMED state + Resend receipt + Stars stipend grant
- Transaction history in `/profile`
- MiomiInvitationCard fully wired with 5 trigger moments
- Guest conversion sheet with quality-signal trigger
- First-session onboarding flow
- Miomi Stars wallet view (`/wallet`)
- Marketing campaigns module (`lib/marketing/campaigns.ts`)

### Phase 6 — Operational maturity (4-5 days)
- Migration 0011 (referrals)
- `/invite` referral page fully built
- LINE pre-filled share
- Reward delivery moments (stars granted, Miomi celebrates)
- Plausible analytics integration
- SEO meta + Open Graph + favicon set (use Phase 1 generated assets)
- robots.txt + sitemap.xml
- `/help` center FAQ
- `/legal/terms` + `/legal/privacy` (lawyer review later, stubs now)
- PWA install prompt polish (Miomi on home screen substitute)

### Phase 7 — Polish, scale, marketplace (2-3 weeks)
- Welcome screen master-class redesign
- Magic moment system (8 moments per DESIGN_SYSTEM §2)
- Desktop 4-zone rebuild (Canva/Figma quality)
- Admin panel (Mike-only)
- Rive integration for Miomi (replaces Framer bridge)
- Marketplace surface (characters, e-books, outfits, power-ups)
- First non-Miomi character ships (Kuma — kid-safe, simplest unlock)
- PWA push notifications

### Phase 8 — Characters, B2B, expansion (open-ended)
- K-pop Bunny, Anime Hero, Wise Fox, Gen-Z Street Girl
- Hotel / cafe / school B2B onboarding flows
- Multi-language: Vietnamese, Indonesian, Japanese, Korean
- Native iOS/Android (React Native) for true widget support
- Custom AI-generated e-books

---

## 9. PROMPT LIBRARY SYSTEM

Each phase has a single Cursor master-prompt stored in `/docs/prompts/phase-NN.md`. Run them in order.

**How to request a phase prompt:**
In a fresh Claude chat, paste `/MIOMIKA.md`, then say: "Generate phase N prompt."

I produce a single, complete, self-contained prompt with:
- Exact file paths to touch
- Exact code or exact spec
- Acceptance criteria
- Verification commands
- Asset briefs (where Phase needs them)

**One paste → one branch → one PR.**

This is the credit-efficient pattern. The phase prompt is the unit of work, not individual file edits.

---

## 11. CODEBASE MAP (truth, not aspiration)

Every future Claude or Cursor session reads this first. It is the authoritative map of where things actually are in the repo. When you can't find a file by guessing, look here.

### 11.0 Top-level documentation

| File | Purpose |
|---|---|
| `/MIOMIKA.md` | Engineering contract — execution plan, design tokens, this codebase map |
| `/MASTER-HANDOFF.md` | Founder context — project story, Mike's communication style, current state, work-in-progress |
| `/docs/HOW-TO-START-A-NEW-CHAT.md` | Protocol for handing off to a new Claude session |
| `/docs/archive/` | Historical reference only — DO NOT READ proactively |

### 11.1 Canonical database tables

| Table | Purpose | Read by |
|---|---|---|
| `public.profiles` | All user profile data (tier, journey_stage, stars, language, gender, xp, level, streak, mood, legacy fields) | lib/auth/use-profile.ts, lib/welcome/actions.ts, app/api/miomi/session-init/route.ts, app/(app)/profile/page.tsx, app/onboarding/page.tsx |
| `public.vocabulary_bank` | Reference vocabulary (1,134+ rows) | lib/ai/vocabulary.ts, lib/library/resolver.ts |
| `public.phrases_bank` | Reference phrases (not yet wired to engine — Phase 3B) | (none yet) |
| `public.library_entries` | Cached AI responses promoted to library | lib/library/supabase-matcher.ts, app/api/miomi/route.ts |
| `public.library_interactions` | Logged interactions with quality signals | lib/ai/vocabulary.ts, lib/library/supabase-matcher.ts |
| `public.library_promotions_queue` | Pipeline for AI→library promotion (service_role only) | server-only |
| `public.user_sessions` | Per-user session state | app/api/miomi/session-init/route.ts |
| `public.vocabulary_user_state` | Per-user word mastery + spiral schedule (Phase 1) | (wired in Phase 3B) |
| `public.users_legacy_backup` | RENAMED OLD TABLE — historical reference only, do not write | (no code should read this) |

### 11.2 Hook inventory

| Hook | File | Purpose |
|---|---|---|
| `useProfile()` | `lib/auth/use-profile.ts` | Returns `{ profile, loading, authReady }`. Reads `profiles`. Subscribes to auth state changes. |
| `useSessionState()` | `lib/ai/use-session-state.ts` | Returns current session shape (exchange_count, fuel, streak). Updated via window event `miomi:session-update`. |
| `useGuidanceEngine(ctx)` | `lib/guidance/use-guidance.ts` | Runs guidance triggers on context change. Owns the "what to show next" decision. |
| `useMediaQuery(query)` | `lib/hooks/use-media-query.ts` | Standard CSS media query hook with SSR safety. |

### 11.3 Route inventory

| Route | File | Auth | Purpose |
|---|---|---|---|
| `/` | `app/page.tsx` | public | Redirects authenticated users to /home, others to landing |
| `/login` | `app/(auth)/login/page.tsx` | public | Google OAuth + email signin |
| `/signup` | `app/(auth)/signup/page.tsx` | public | Google OAuth + email signup |
| `/onboarding` | `app/onboarding/page.tsx` | auth | Journey-stage question. Final redirect: `/home?celebrate=signup` |
| `/home` | `app/(app)/home/page.tsx` | auth | Main app screen with Miomi, fuel bars, CTA |
| `/talk` | `app/(app)/talk/page.tsx` | auth | Deep-focus conversation mode |
| `/profile` | `app/(app)/profile/page.tsx` | auth | User profile, tier, settings |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | auth | Stats and progress (Phase 3+ wires real data) |
| `/api/auth/callback` | `app/api/auth/callback/route.ts` | — | OAuth exchange-code endpoint |
| `/api/miomi` | `app/api/miomi/route.ts` | auth | Main engine endpoint (library matcher + AI fallback) |
| `/api/miomi/session-init` | `app/api/miomi/session-init/route.ts` | auth | Returns opener + session state |

### 11.4 Auth flow files (post RESET-1)

| Concern | File |
|---|---|
| Browser Supabase client | `lib/supabase/client.ts` |
| Server Supabase client | `lib/supabase/server.ts` |
| Middleware (session refresh + language cookie) | `middleware.ts` |
| **Server-side profile reader (canonical)** | **`lib/auth/get-server-profile.ts`** |
| Client-side profile hook | `lib/auth/use-profile.ts` |
| **Post-signup canonical route** | **`app/api/auth/post-signup/route.ts`** |
| OAuth callback | `app/auth/callback/route.ts` |
| Welcome decision logic | `lib/welcome/show-welcome.ts` |
| Welcome side effects (mark shown server-side) | `lib/welcome/actions.ts` |
| Welcome UI | `components/WelcomeScreen.tsx` |
| Auth gate (blocks home flash) | `app/(app)/layout.tsx` |
| Sign out implementation | `components/layout/AppShell.tsx` (or wherever sign-out button lives) |

### 11.5 Cultural Warmth + Guidance files

| Concern | File |
|---|---|
| Warmth vectors and pickPhrase | `lib/voice/warmth.ts` |
| Guidance trigger detectors | `lib/guidance/triggers.ts` |
| Guidance moment types | `lib/guidance/types.ts` |
| Guidance Zustand store | `lib/guidance/store.ts` |
| Guidance engine hook | `lib/guidance/use-guidance.ts` |
| Guidance UI pill | `components/guidance/GuidancePill.tsx` |

### 11.6 Companion files

| Concern | File |
|---|---|
| Companion state store | `lib/companion/store.ts` |
| Floating button | `components/companion/CompanionButton.tsx` |
| Mobile sheet | `components/companion/CompanionSheet.tsx` |
| Desktop panel | `components/companion/CompanionPanel.tsx` |
| Drift animation | inside CompanionButton.tsx (useAnimate + setInterval pattern) |

### 11.7 Migrations applied

| File | Applied? | Purpose |
|---|---|---|
| 0001_add_interaction_type.sql | ✓ | library_interactions interaction_type column |
| 0002_vocabulary_rpcs.sql | ✓ | vocabulary RPCs |
| 0003_user_sessions_state.sql | ✓ | user_sessions table |
| 0004-0006 | (skipped) | Were OPUS pipeline; deferred to Phase 4 |
| 0007_user_extended.sql | ✓ (via inline SQL block) | profiles table + handle_new_user trigger |
| 0008_vocabulary_user_state.sql | ✓ | per-user mastery tracking |
| 0009_rls_lockdown.sql | needs apply | RLS policies audit |
| 0010_profile_ui_language.sql | needs apply | profiles.ui_language column |
| 0011_profile_legacy_fields.sql | needs apply (this phase) | gender, cat_name, xp, level, streak, mood backfilled from users_legacy_backup |
| **0012_brutal_reset.sql** | **needs apply (RESET-1)** | **Drops users_legacy_backup permanently, verifies profiles schema, refreshes handle_new_user trigger + auth.users backfill, RLS audit. Idempotent.** |

### 11.8 Known sharp edges (read before debugging)

- **`public.users` and `public.users_legacy_backup` are GONE.** Dropped permanently in migration `0012_brutal_reset.sql`. Any code reading `.from("users")` is a bug from a forgotten file. All user data lives in `public.profiles`.
- **Client-sent `tier`, `isGuest`, `userId` in API requests is IGNORED.** Server always reads via `getServerProfile()` from cookies. The client's job is to ASK what tier it is, never to TELL.
- **CTA color is HONEY GOLD now, not pink.** `linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)`. Pink belongs to the heart fuel bar and tiny accents only. See `/docs/COLOR-SYSTEM.md`.
- **Onboarding completion** dispatches `window.dispatchEvent(new Event("miomika:profile-refresh"))` then calls `/api/auth/post-signup` for the redirect. `useProfile()` listens and refetches.
- **The welcome flash bug** was caused by layout rendering children before auth resolved. Fixed in Phase 3A-final by the `authReady` gate in `app/(app)/layout.tsx`.
- **Android Chrome speech recognition** times out after ~3s of silence. Solution in `MicButton.tsx`: `recognition.continuous = true` + auto-restart in `onend` unless `isManualStopRef.current === true`.
- **Samsung Internet** does NOT support Web Speech API. `lib/talk/speech-support.ts` detects via UA `samsungbrowser` and MicButton renders the disabled grey button with inline "Open in Chrome" message.
- **Onboarding path is `/onboarding`** (singular page), NOT `/onboarding/journey`. Celebration redirect targets `/home?celebrate=signup` from this page.
- **The `users_legacy_backup.email` may differ from `profiles.email`** for the same id — the trigger uses `auth.users.email` as truth. Treat `auth.users.email` as canonical.

---

## 12. STATE LOG (update at end of every session)

| Date | Session | Phase | Shipped | Broken | Next |
|------|---------|-------|---------|--------|------|
| 2026-05-21 | Claude Opus 4.7 — vision lock | — | v2 canonical document with full vision, ambient companion, character/marketplace schema, journey stages, cultural warmth system, marketing calendar, asset spec | n/a (no code) | Run Phase 0 in Cursor, return for Phase 1 prompt |
| 2026-05-21 | Cursor — Claude Opus 4.7 | 1 | Blocks A–I shipped: welcome single-show contract (bug #1 + #8), login/signup back nav (bug #2), Google OAuth + `/auth/callback` route (bug #3), journey-stage question inserted as onboarding step 2 (bug #9), `lucide-react ^1.16.0` bump (bug #11), `@sentry/nextjs ^10.53.1` wired via `instrumentation.ts` / `instrumentation-client.ts` (env-guarded so missing DSN never breaks build), Miomi-voice `error.tsx` + `global-error.tsx`, ambient `CompanionButton` + `CompanionSurface` mounted on every authenticated route except `/talk`, migrations 0007 (journey_stage, miomi_stars, active_character_id, last_seen_at, welcome_shown_at), 0008 (vocabulary_user_state + advance_word_mastery / touch_word_exposure RPCs — CRITICAL for teaching), 0009 (RLS lockdown for users, user_sessions, vocabulary_user_state, vocabulary_bank, phrases_bank, library_entries, library_interactions, library_promotions_queue + audit_rls_status helper), three asset briefs in `/docs/asset-briefs/`, lazy-init for Groq/Gemini clients so `next build` no longer needs runtime keys. | npm run lint reports 7 pre-existing React 19 hooks/static-components errors in /talk surfaces (talk/page.tsx, MicButton.tsx, MiomiLive.tsx, WordCardV3.tsx) — these predate Phase 1 and are scoped to Phase 2 "Cleanup, consistency". Phase 1 code itself is lint-clean. Bug #10 ambient companion now ships but its conversation engine is a placeholder that promotes to `/talk` for the real mic/voice loop — full inline conversation lands when Phase 3 wires mastery + spiral. | Mike: (1) apply migrations 0007 → 0008 → 0009 in Supabase SQL editor, (2) enable Google OAuth in Supabase Dashboard → Authentication → Providers with redirect `https://miomika.com/auth/callback` (+ local `http://localhost:3000/auth/callback`), (3) generate Phase 1 assets per `/docs/asset-briefs/`, (4) set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` env vars in Vercel, (5) push branch + open PR with title "Phase 1: Foundation + Ambient Companion". After merge return for Phase 2 prompt. |
| 2026-05-22 | Cursor — Claude Sonnet 4.6 — Phase 3A | 3A | Visual discipline: `#8B1A35` removed from all CTAs → pink gradient on CTAs, `#DB2777` on text/icons; BottomNav rebuilt flat (no elevated pill, all 5 tabs equal, active = pink, inactive = `#9A8B73`); `lib/ai/limits.ts` with `GUEST_EXCHANGE_LIMIT=5`; server-side guest limit in route.ts; RECOVERY_STRUGGLE for negative emotions; session-init rewritten with warmth.ts (CARE_EATEN/RECOVERY_RETURN/PRAISE_PROGRESS); MicButton onend race fixed (Android interim → final, isFinal commits immediately then stops recognition); CompanionButton dreamy drift (24×16px wander 8-12s) + playful behaviors (ear-twitch/head-tilt/hop 20-30s intervals); `lib/celebration/burst.ts` canvas confetti (80 gold+pink particles, 1.4s); `lib/email/welcome.ts` Resend welcome email; auth callback adds `?celebrate=signup` + fires welcome email; home page handles `celebrate=signup` via `<CelebrationTrigger>` in Suspense; `components/ui/ProBadge.tsx` gold star badge + `useProGate()`; `feature_pro_locked` added to GuidanceTrigger union; MIOMIKA.md §4.2 Visual discipline subsection appended. tsc: PASS, lint: 0 errors, build: PASS. | Client-component hardcoded warm phrases (home/page.tsx WELCOME_BUBBLE, TAP_BUBBLE_CYCLE etc.) deferred — require new warmth.ts vectors (Phase 3B cleanup). ProBadge wired to ProBadge.tsx but not yet applied to individual locked-feature card UIs — blocked on Phase 3B teaching loop cards. | Mike: (1) Verify Resend domain at resend.com/domains, (2) Supabase → Auth → Email → disable email confirmations (auto-confirm), (3) Test iPhone: tap mic → allow → speak → transcript appears, (4) Test Android: same, (5) Incognito English browser → English UI, (6) Incognito Thai browser → Thai UI, (7) Guest sign up → confetti + welcome email. |
| 2026-05-22 | Cursor Sonnet 4.5 — Phase 3A-fix-2 | 3A-fix-2 | Forced prompt=select_account on Google OAuth (login + signup); Samsung inline fallback combined Chrome+type hint now 12px always-visible; signup celebration moved to onboarding completion with localStorage one-shot guard; WelcomeScreen shows cream blocking gate while auth resolves so home content never flashes on first visit. tsc: PASS, lint: 0 errors, build: PASS. | n/a | Mike verify on Samsung A52 + new email signup, then Phase 3B |
| 2026-05-22 | Cursor Sonnet 4.6 — Phase 3A-fix | 3A-fix | Logout scope:global + localStorage/sessionStorage clear + hard navigation; useProfile auth-state subscription already wired (no change needed); /profile duplicate "ฉัน Me" header removed from guest branch; bilingual labels already complete (no change); signup CelebrationBurst already wired via CelebrationTrigger + lib/celebration/burst.ts (no change); CompanionButton drift fully intact (no change); single bubble on home confirmed (no change); Samsung Internet fallback already in MicButton (no change); SEO meta expanded: title, description, keywords, authors, metadataBase, openGraph, twitter card, favicon set. tsc: PASS, lint: 0 errors, build: PASS. | n/a | Mike to verify on Samsung A52 + iPhone + desktop incognito, return for Phase 3B |
| 2026-05-22 | Cursor Sonnet 4.6 — Phase 3A-final | 3A-final | Root-cause fix: all .from("users") → .from("profiles") (use-profile.ts, welcome/actions.ts, session-init/route.ts, profile/page.tsx, onboarding/page.tsx — 5 files total); welcome flash gated in (app)/layout.tsx via authReady from useGuestExploration; celebration redirect already at /onboarding completion (router.push('/home?celebrate=signup')); CelebrationTrigger + lib/celebration/burst.ts already wired; Android Chrome voice continuous+restart — recognition.continuous=true, isManualStopRef, hasFinalResultRef, onend auto-restart with manual-stop gate; migration 0011 written (gender + legacy fields backfilled from users_legacy_backup); /MIOMIKA.md v3 with full §11 Codebase Map | n/a | Mike applies 0011 in Supabase, tests all 4 flows on devices, returns for Phase 3B (real teaching brain) |
| 2026-05-22 | Cursor Opus 4.7 — Phase 3A-final-2 | 3A-final-2 | Docs consolidation: `/MASTER-HANDOFF.md` created at project root (founder context, communication style, current state, sharp edges, next-session protocol); `/docs/HOW-TO-START-A-NEW-CHAT.md` created (exact handoff protocol so new Claude chats need only two pasted files); `/docs/archive/README.md` prepended with `⛔ ARCHIVED — DO NOT READ` warning routing future sessions to `/MIOMIKA.md` + `/MASTER-HANDOFF.md`; `MIOMIKA.md §11.0 Top-level documentation` added. Bug fixes: MicButton recognition now logs `[MicButton] recognition.onstart fired` and `[MicButton] recognition.onerror: <code>` so Mike can verify mic flow via Chrome remote DevTools on Samsung A52 (other 7 acceptance criteria — continuous=true, isManualStopRef, onend auto-restart + interim commit, onresult immediate final commit, synchronous handlePress, no-await gesture, amplitude ring — all confirmed in place from Phase 3A-final). Celebration burst: `CelebrationTrigger` in `app/(app)/home/page.tsx` rewritten so `miomika-signup-celebrated-v1` localStorage flag is set AFTER the 2.4s burst completes (was set before — meant a failed dynamic import would silently block future replays), URL is cleaned immediately, `console.log("[home] celebration trigger detected")` added for verification, single setter / single reader confirmed via repo grep. | n/a | Mike: (1) On Samsung A52 Chrome open https://miomika.com/talk → tap mic → speak "hello" → DevTools console should log `[MicButton] recognition.onstart fired` and transcript should commit; (2) brand-new Gmail signup in incognito → complete onboarding → land on `/home` → 2.4s confetti burst visible → reload `/home` → no burst (flag now set); (3) start next chat using `/docs/HOW-TO-START-A-NEW-CHAT.md` protocol with both root docs attached for Phase 3B (real teaching brain, Opus 4.7). |
| 2026-05-22 | Cursor Opus 4.7 — RESET-1 | RESET-1 | Brutal foundation reset: migration 0012 drops `public.users_legacy_backup` permanently + idempotent profiles-column verification + refreshed `handle_new_user` trigger + auth-users backfill + RLS audit. `lib/auth/get-server-profile.ts` is now the single server-side source of truth — `app/api/miomi/route.ts` and `app/api/miomi/session-init/route.ts` no longer trust client-sent `isGuest`/`userId`/`tier`. New canonical route `app/api/auth/post-signup/route.ts` decides redirect destination (`/onboarding` / `/home` / `/home?celebrate=signup`); `app/auth/callback/route.ts` and `app/onboarding/page.tsx` both delegate to it. `useProfile()` now subscribes to `miomika:profile-refresh` events and refetches on `SIGNED_IN` / `TOKEN_REFRESHED` / `USER_UPDATED`. Color migration: every primary CTA in the codebase is now `linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)` honey gold — home, dashboard, talk, error, install prompt, companion sheet/panel, guidance pill, conversion card, word card v3, welcome email; nav active state, brand wordmark, achievement borders, link text on warm surfaces all migrated. Pink retained only in heart fuel icon, ≤8px companion presence dots, sparkle decorations. `lib/design/colors.ts` is the new token surface. Docs v4: `/MIOMIKA.md` §4.2 rewritten with honey-gold tokens + "pink-gradient as primary CTA" added to FORBIDDEN; `/docs/SCHEMA.md`, `/docs/AUTH-FLOW.md`, `/docs/COLOR-SYSTEM.md` created; `/MASTER-HANDOFF.md` rewritten with Mike's real story (Persian, Iran→Thailand, teaching motive at Saint Gabriel's, 25K TikTok, Mikaro income, Phuket/Krabi dream). | n/a — RESET-2 still owed MicButton.tsx + profile page rebuild + final polish pass. CompanionButton listening/speaking presence dots still pink (allowed under ≤8px accent rule, can revisit in RESET-2). | Mike: (1) apply `supabase/migrations/0012_brutal_reset.sql` in Supabase SQL Editor, (2) verify on Vercel preview — login → `/profile` shows Free tier (not guest), (3) verify all primary CTAs are honey-gold not pink on every screen, (4) verify new signup → onboarding → `/home` celebration burst fires once, (5) verify sign-out → sign-in with different account still works, (6) after green, request RESET-2 (MicButton rewrite + profile page rebuild + polish pass). |
| 2026-05-25 | Cursor Composer 2.5 — Session 2-final-4 | Session 2-final-4 | Final /talk polish: MicRow rewritten as carousel (selected mode centers in orb, 2 left + 2 right rotate); orb core shows active mode icon when idle, AudioWaveform when listening/thinking/speaking; mode label always under orb; shell background → `#FCFCFA`; top bar + guest pill transparent; MicButton stop hardened (`stoppedRef` + destroy + `isLoadingVadRef` reset + forced idle on skipped transcribe). tsc: PASS, lint: PASS (28 warnings), build: PASS. Commit `7f1d322`. | n/a | Session 3 from §2.7 (voice output / TTS). /talk locks for real. |
| 2026-05-25 | Cursor Composer 2.5 — Session 2-final-3 | Session 2-final-3 | Six surgical /talk fixes: MicButton imperative handle no longer depends on stale `state` closure — `start()` destroys zombie VAD first; new `MicRow` (modes flank orb 2-left + orb + 2-right, swipe to cycle, tap to jump, no boxes); `ModeStripBar` deleted; Toolbox rewritten (right column, transparent icons, bottom→top keyboard/Aa/globe/TTS); PersistentMiomi freed (no circle bg); bottom area fully transparent. tsc: PASS, lint: PASS (28 warnings), build: PASS. | n/a | Session 3 from §2.7 (voice output / TTS). |
| 2026-05-25 | Cursor Composer 2.5 — Session 2-final-2 | Session 2-final-2 | Four surgical /talk fixes: `stoppedRef` guard in MicButton gates in-flight `onSpeechEnd` + `transcribeAndCommit` after explicit stop; Toolbox rewritten (right-side, transparent icons, vertical stack bottom→top: keyboard / language / length / TTS); ModeStripBar transparent circles, no card chrome, no "···" adjust button; standalone keyboard button removed from orb row; `GuestCtaInline` deleted — guest sheet auto-opens 800ms after 5th Miomi reply (library + API paths). tsc: PASS, lint: PASS (28 warnings), build: PASS. Commit `6813e18`. | n/a | Session 3 from §2.7 (voice output / TTS). |
| 2026-05-24 | Cursor Composer 2.5 — Session 2 | Session 2 | `/talk` live voice room rebuild: new `VoiceOrb` (88px, 4 states + locked), `ModeStrip`, `AdjustSheet` (5 modes + teach/social/translate/personality/memory), `PracticeCard`, `MiniCatRow`, `FuelPill`, `lib/talk/modes.ts`; page rewritten with hidden MicButton STT pipeline, guest counter preserved, Miomi PNGs at `/characters/miomi/{full,head}/`. tsc: PASS, lint: PASS (28 warnings), build: PASS. | Warmth phrases still hardcoded in page UI strings (warmth.ts migration deferred). TTS hook stubbed. | Session 3 from §2.7 (voice output / TTS). |
| 2026-05-24 | Cursor Composer 2.5 — Session 1C | Session 1C | `/talk` layout + lifecycle fixes: hydrate-once guard on guest counter (`hydratedRef`), root container `height: 100%` + `overflow: hidden`, InstallPrompt hidden on `/talk`, Clear button in top bar (resets canvas, not guest counter), live mic status label under MicButton (idle/listening/processing/speaking/locked). tsc: PASS, lint: PASS (29 warnings), build: PASS. Commit `5e570b6`. | n/a | Session 2 from §2.7 build order (voice output / TTS). |
| 2026-05-24 | Cursor Composer 2.5 — Session 1B | Session 1B | Bottom nav now renders on `/talk`: removed `hiddenNav` gate in `app/(app)/layout.tsx`; talk page root un-fixed (`position: relative; flex: 1; minHeight: 0`) so layout flex column reserves space above `<BottomNav />`; mic zone `paddingBottom` set to flat `12px` (safe-area handled by BottomNav). tsc: PASS, lint: PASS (29 warnings), build: PASS. Commit `03c64a9`. | n/a | Session 2 from §2.7 build order (voice output / TTS). |
| 2026-05-24 | Claude Opus 4.7 chat — RESET-4 / 4.1 / 4.2 + Voice Laws lock | Voice INPUT v1 LOCKED | MicButton.tsx finalized across three patches: VAD library + ONNX + WASM prefetched on mount (no MicVAD.new() until tap, eliminates null-stream crash on early unmount); paused-not-destroyed on stop; destroyed only on unmount. Heartbeat dot replaces processing spinner inside mic. Thinking dots moved outside mic to under Miomi subtitle. Guest hard-stop wired via `locked` prop (locked={isGuest && guestExchanges >= GUEST_LIMIT}); tap opens signup sheet. Commits: 47dd0ac, e82dd8c, fcd915d. Voice INPUT pipeline now works end-to-end on desktop Chrome and Samsung A52 Chrome Mobile. NEW: §2.7 Voice Experience Laws locked by Mike — 7 immutable laws governing voice, intent, language detection, transcript visibility, aliveness placement, settings drawer, /talk as product investment. | Voice OUTPUT (cat must speak via TTS) is OPEN. Memory/session contract OPEN. Intent inference OPEN. Settings drawer OPEN. /talk redesign OPEN. Guest gate counter wiring may still be broken — Mike reports limit not firing in production; needs Session 1 audit. User transcript truncation/invisibility reported by tester — needs Session 1 fix. No in-app navigation on /talk — needs Session 1 back button. Language detection occasionally returns Latin transliteration instead of Thai/English — needs Session 4 work. | Mike: open fresh chat, attach `/MIOMIKA.md` + `/MASTER-HANDOFF.md` + `/STATE.md`, say "Session 1 from §2.7 build order." That chat fixes guest gate + transcript visibility + /talk back button in one Cursor master-prompt for Composer 2.5. Subsequent sessions follow §2.7 build order verbatim. |
| 2026-05-24 | Cursor Composer — RESET-3.8 (Block N) | RESET-3.8 | MicButton: release stream after each utterance + 250ms cooldown before re-acquire (fixes Android Chrome second-recorder failure). `/api/talk/transcribe`: pinned to sin1/hnd1, maxDuration 15s. build: PASS. | n/a | Mike: retest rapid back-to-back mic taps on A52; check Vercel logs show sin1 region. |
| 2026-05-24 | Cursor Composer — RESET-3.7 (Block M) | RESET-3.7 | Guest voice: `/api/talk/transcribe` no longer requires auth (logs userId when present). MicButton: persistent MediaStream + AudioContext across utterances, 60s idle release. Silence detection 900ms / threshold 0.025. build: PASS. | n/a | Mike: test guest /talk mic + rapid re-tap on A52. |
| 2026-05-24 | Cursor Composer — RESET-3.6 (Block L) | RESET-3.6 | OAuth callback fully bypasses middleware: plain `NextResponse.next()` + matcher excludes `auth/callback`. Fixes Android Chrome stripping `Set-Cookie` on OAuth redirect. build: PASS. | n/a | Mike: clear site data on A52, fresh Google sign-in, verify 3 cookies, retest /talk mic. |
| 2026-05-24 | Cursor Composer — RESET-3.5 (Block K) | RESET-3.5 | MicButton transcribe fetch: added `credentials: "include"` + `cache: "no-store"` so Android Chrome attaches `sb-*-auth-token` on multipart POSTs. build: PASS. | n/a | Mike: retest /talk on A52 — should get transcribed not 401. |
| 2026-05-24 | Cursor Composer — RESET-3.4 (Block J) | RESET-3.4 | `/api/talk/transcribe` auth fix: replaced `getServerProfile()` with direct `@supabase/ssr` client from `request.cookies` (multipart-safe). Added `cookieCount`/`cookieNames` to 401 log. predeploy/build: PASS. | n/a | Mike: retest /talk mic — should no longer get 401 on transcribe. |
| 2026-05-24 | Cursor Composer — RESET-3.3 (Block I) | RESET-3.3 | Voice path replaced: new `/api/talk/transcribe` (Groq whisper-large-v3-turbo, auth-gated, 1MB cap). MicButton rewritten around MediaRecorder + silence detection → server STT. Works on Samsung Internet/Firefox. docs/HOW-THIS-WORKS.md updated. drift: 3 routes. predeploy/build: PASS. | GROQ_API_KEY missing from local `.env.local` — Mike must add to `.env.local` + Vercel for transcription to work in dev/prod. | Mike: add GROQ_API_KEY, test /talk on A52 — debug overlay should show warming up → recording started → uploading → transcribed. |
| 2026-05-24 | Cursor Composer — RESET-3.2 (Block H) | RESET-3.2 | MicButton: warm up `getUserMedia()` stream before `recognition.start()` — fixes Android Chrome silent-close; amplitude wired on same stream; `startListening` now async. auth/callback: removed 30s celebration replay window — new users → `/onboarding` (one-shot celebration), returning users → `/home` only. predeploy: PASS, build: PASS. | n/a | Mike: A52 test on /talk — debug overlay should show warming up mic stream → mic stream warm → onstart → onresult final → commit → onend. |
| 2026-05-23 | Cursor Composer — RESET-3.1 (Block G) | RESET-3.1 | Celebration onboarding: `/onboarding` replaced 7-step form wall with 3s welcome screen — sets `display_name` from Google metadata, writes `onboarding_completed_at`, dispatches `miomika:profile-refresh`, auto-routes to `/home?celebrate=signup`. MicButton: `NO_SPEECH_TIMEOUT_MS` (6s) guard arms on `onstart`; `gotAnyResultRef` clears timer on first `onresult`; fixes Android Chrome silent onstart→onend loop. predeploy: PASS, build: PASS. Commit `1acbead`. | n/a | Mike: verify new signup sees celebration (no form), lands on home with confetti; verify mic on Samsung A52 no longer stuck in listening loop after silent tap. |
| 2026-05-23 | Cursor Opus 4.7 — RESET-2 | RESET-2 | Profile page rebuilt (hybrid stats+account for logged-in, clean honey-gold invitation for guests), MicButton fully rewritten from scratch (state machine, continuous mode, iOS sync gesture, debug overlay), polish pass clearing all TODO(reset-2) markers, no pink CTAs remain | n/a | Mike verifies mobile voice on Samsung A52, profile shows Free tier UI, then Phase 3B (real teaching brain) |
| 2026-05-22 | Cursor — Claude Opus 4.7 | 2 | Blocks A–F shipped. **A1**: WelcomeScreen self-gates via `useHasMounted` (useSyncExternalStore-based, no setState-in-effect) + `lib/welcome/show-welcome.ts` decision helper + `lib/welcome/actions.ts` server action that writes `users.welcome_shown_at`. **A2**: `lib/talk/speech-support.ts` with browser detection (Samsung Internet, Firefox, in-app webviews) + iOS-Safari gesture-lost fix in `MicButton.tsx` (synchronous `startListening()` inside pointerdown handler, getUserMedia kept off the gesture path). **A3**: `lib/hooks/use-media-query.ts` (useSyncExternalStore) + split `CompanionSurface` into `CompanionSheet.tsx` (mobile-only) and `CompanionPanel.tsx` (desktop-only), mutually exclusive. **A4**: `CompanionButton.tsx` rebuilt on framer-motion with triple-layer shadow + 1px white ring + micro-lift on press + subtle Y-breath. **A5**: Home `คุยกับมิโอมิ` CTA opens companion sheet via Zustand store (`useCompanionStore.open`) instead of routing to `/create`. **A6**: BottomNav already had `env(safe-area-inset-bottom)`; no horizontal scroll verified (all containers use overflow-hidden + max-width). **B**: Server-side language detection in `middleware.ts` (Accept-Language → `ui-language` cookie, 1-year, lax) + `lib/i18n/server.ts` + client `useUILanguage` via useSyncExternalStore + `lib/i18n/strings.ts` typed string table + migration **0010** adds `users.ui_language`. **C**: `lib/voice/warmth.ts` ships 30 praise / 15 care / 16 recovery / 10 humor + guidance vectors + typed `pickPhrase` / `pickPhraseWith` selectors honoring gender / journey-stage / time-of-day. Error boundaries migrated to RECOVERY_STRUGGLE. **D**: Full guidance system: `lib/guidance/{types,triggers,store,use-guidance}.ts` with 12 triggers, Zustand-backed store, throttled engine; `GuidancePill` + `GuidanceHost` wired into `(app)/layout.tsx`; idle-tracking, guest-limit, streak, returning-after-absence, pronunciation-failure detectors all live. **E**: `DesktopHoldBanner` sticky on ≥1024px, dismissible per-browser. **F1**: deleted `lib/ai/matcher.ts`; Supabase-backed matcher moved to `lib/library/supabase-matcher.ts` and renamed `matchLibraryFromDB`; `/api/miomi` updated. **F2**: `/friends` route deleted (placeholder only — no nav links pointed to it). **F3**: error-state warm phrases migrated; library-response templates left as-is per spec note. Companion state migrated from Context to Zustand (`lib/companion/store.ts`); old `CompanionStateContext` is now a backward-compat shim. Minimal `useProfile` + `useSessionState` hooks added. **Build green**, **typecheck green**, **lint 0 errors / 32 pre-existing warnings**. `zustand@^5` added. | Pre-existing React-19 `react-hooks/set-state-in-effect` errors in `/talk` surfaces (talk/page.tsx, MiomiLive.tsx, WordCardV3.tsx) suppressed at file/effect level with `TODO(phase-3)` markers — proper refactor (useReducer / derived state / static maps) deferred to Phase 3 when `/talk` gets its real teaching loop. Guidance triggers `feature_not_discovered` and `voice_unavailable` are stubs (return null) — first needs companion-first-opened-at telemetry (Phase 6), second is handled inline by MicButton. The home CTA now opens the sheet for everyone (guest + authed); the old guest-only signup-prompt branch is removed but the soft-signup invite card pattern remains via `GuestExplorationContext`. | Mike: (1) apply migration `0010_profile_ui_language.sql` in Supabase SQL editor, (2) run the manual mobile smoke test (see PR body / Block G), (3) verify Google OAuth still works (no regression — middleware language cookie is the only change touching that path), (4) push branch + open PR with title "Phase 2: Mobile foundation + Cultural Warmth + Guidance System". After merge return for Phase 3 prompt (Real Teaching). |

---

*End of canonical document. If you are reading this in a future session: this is the only document you need. Paste this once. Start.*
