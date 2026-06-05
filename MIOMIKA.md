Current handoff: MIOMIKA-HANDOFF-3.md — supersedes HANDOFF #2.

# Miomika · The AI Companion Who Helps People Grow

> **Canonical project document v6** — Single source of truth. Replaces all other `.md` files in project root.
> Version: 6.0 — Architecture truth lock (five-nav, audience, subscription), May 25, 2026
> If you are a new Claude or Cursor session, **read this entire document before doing anything.**

---

## The truth (read this first)

Miomi is not a chatbot. She's not a language app. She's not a tutor. She is a **super-power AI companion** built to help people grow — and the reason she can help anyone grow is that she **builds an emotional bond first**.

**The bond is the product.** Everything else is how the bond delivers value.

She helps people learn (Teach brain). She helps people communicate across languages (Translate brain). She helps them create content (Social brain). She helps them write, read, remember, and just **be with them** on hard days. As they grow into new life stages — tourist visiting Thailand, student building a career, worker raising a family, resident running a business, entrepreneur scaling a company — new brains activate to help. **The cat is constant. The brains are specialized. The bond compounds.**

Because the bond is the product, every decision flows from emotional truth: warm voice, charming phrases, never cold, never robotic, never punitive. Lock icons feel like rejection. Honey-gold gradients feel like welcome (`linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)`). Pink is reserved for the heart fuel only — the deepest emotional signal (`#F9A8D4`). The cat is alive: she breathes, she listens, she remembers, she comes back tomorrow with what she learned about you yesterday.

Language learning is **one verb among many** — the acquisition wedge, not the product identity. We are not building a language app with extras. We are building a companion that masters every verb a Thai user needs daily.

**The one sentence:** "เพื่อนที่จำคุณได้ และโตไปพร้อมกับคุณ" — A friend who remembers you and grows with you.

This document describes how she works. Every section below is an expression of that companion-first truth.

---

## How to use this document

This is the only document you need.

- **§1–§3** are immutable. Who Miomi is, how she helps, her voice & warmth. Do not debate.
- **§4–§6** are the surfaces, memory, and business contract.
- **§7** is the build plan. Build in order, no skipping.
- **§8** is technical anchors — stack, paths, routes, tokens, codebase map, known issues, assets.
- **§9** is what's documented but not yet built.
- **§10** is the state log. Update at end of every session.

Every other `.md` file is in `/docs/archive/`. They contain deep specs we read on demand. They do not override this document. If they disagree, **this document wins.**

Also read on demand (never proactively): `/MASTER-HANDOFF.md` (founder context), `/docs/HOW-TO-START-A-NEW-CHAT.md` (handoff protocol).

---

## 1. Who Miomi Is

### 1.1 The emotional-companion truth

**Miomika is an AI companion operating system.** The product is the cat — **Miomi**. Everything else is a verb she performs for her user.

**Why the bond matters (vs. cold AI tools):** Duolingo punishes. ChatGPT forgets. Miomi witnesses, cares, and remembers. The Cultural Warmth System in `lib/voice/warmth.ts` is the moat — not the LLM.

**How she stays consistent:** One cat, one voice, one memory surface. Behind her are **specialized brains** (see §2). Users pick a verb; the right brain activates invisibly. Same character, same warmth, different intelligence per task.

### 1.2 Miomi's character (immutable)

White cat. Pink accents. Gold bell collar. Heart on forehead. Warm, playful, cheeky, wise, emotionally intelligent.

**Voice rules:**
- Cute Thai female. Uses นะคะ~, หนู, ค่า.
- Specific praise only: "คุณใช้คำว่า X ได้ถูกต้องเลยนะคะ~" never "good job!"
- Never blames. Never says "wrong". Echoes the correct form in her next sentence.
- Cultural warmth: "กินข้าวยังคะ?" reads as "I care about you" in Thai.

**Visual rules:**
- Always on pure white canvas. No frame. No circle. No container around her stage.
- Speech bubbles beside her, never over her face. Bubbles are transient (her *voice*). Cards are persistent (her *gifts*).
- Largest element on the home screen (≥58% of stage height).
- Head sizes per screen:
  - Home: full-body 62% of stage
  - `/talk` deep mode: head 180px; **PersistentMiomi** 96px head with mood-driven animation (idle / listening / thinking / speaking / happy)
  - Ambient companion button: head 56px
  - Ambient companion expanded sheet: head 96px
  - Dashboard inline: head 80px
  - Desktop rail: head 48px

### 1.3 The 14-state machine

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
 20  PLAYFUL                loop, fires after 30s zero input on any screen
 10  SLEEPING               loop, after 120s zero input AND no audio
```

PLAYFUL is what makes her feel like a pet, not a UI element. Specifications in §1.4 (Ambient Miomi).

### 1.4 Ambient Miomi (the master-class companion)

Miomi is not a screen you visit. She is a companion you carry.

**The companion button**
- **Location:** Bottom-right corner of every authenticated screen except `/talk`.
- **Size:** 56px circle, white background, 1px border `#EDE8E0`, soft shadow `0 4px 16px rgba(26,26,24,0.06)`.
- **Image:** Miomi's head for 56px (`companion-idle.png`, `companion-happy.png`, etc.).
- **Animation:** breath only (scale 1.0 ↔ 1.02, 3.2s sine).
- **Presence dot:** 6px at bottom-right:
  - No dot = IDLE
  - Pink `#F9A8D4` = HAPPY / EXCITED
  - Gold `#C9A96E` = CELEBRATION pending
  - Teal `#7DD3C0` = LOW_FUEL
  - Pulsing pink = unread proactive message
- **Position:** 16px from right, 88px from bottom (above bottom nav).
- **Hidden on:** `/talk`, focused modal sheets, auth flow.

**Tap behavior (mobile):** Sheet rises 320ms, 64svh, 96px Miomi head, conversation canvas, mic + text input. Backdrop at 0.4 opacity.

**Tap behavior (desktop):** Side panel 380px from right; same conversation state.

**`/talk` route:** Deep-focus voice-first open room. Fullscreen button in ambient sheet promotes to `/talk`.

**PLAYFUL state:** After 30s zero input — ear twitch, yawn, tail flick, head tilt, butterfly particle, sleep loaf at 90s. Visual only. Never blocks tap. Never auto-opens conversation. **Sound:** none unprompted.

**Miomi widget (Phase 7):** iOS/Android home-screen widgets. Phase 1–6: PWA install prompt as substitute.

### 1.5 Persona stages of the user (Tourist → Entrepreneur funnel)

The engine adapts to the user's journey stage. Per-user state from signup + observed behavior.

```typescript
type JourneyStage = 'tourist' | 'student' | 'worker' | 'resident' | 'entrepreneur' | 'unspecified'
```

| Stage | Detected from | Curriculum focus | Pricing emphasis |
|---|---|---|---|
| `tourist` | Short-term visit, IP geolocation, signup "I'm visiting" | Survival phrases: airport, taxi, restaurant, market, bargaining, emergency, basic numbers | One-time pack 199 THB / 7-day Pro 99 THB |
| `student` | .ac.th email, signup "I'm studying" | Academic Thai/English, exam prep, classroom phrases, dormitory life | Monthly Pro 299 THB, student discount 20% |
| `worker` | LinkedIn signup, signup "I work in Thailand", professional vocabulary | Professional vocabulary, email writing, meeting phrases, polite escalation | Monthly Pro 299 THB or yearly 2,990 THB |
| `resident` | 6+ months active, multiple journey signals, signup "I live here" | Cultural fluency, idioms, slang, family/community phrases, ceremonial language | Yearly 2,990 THB, lifetime tier (future) |
| `entrepreneur` | Business signals, creator/B2B usage, signup "I run a business" *(future stage)* | Business English, strategy, content ops, team communication, enterprise verbs | Pro Max 599 THB/mo when available |
| `unspecified` | Default | General A1-A2 mix | Default Pro 299 THB |

Stage promotes automatically as signals strengthen. User can override in profile.

**The flywheel (language is the wedge, bond is the product):**

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
   ↓ she starts a business → Entrepreneur brain activates
```

Each stage takes a year on average. Miomi grows with the user. The same character. The same memory. The same warmth.

### 1.6 Screen Architecture (locked May 25 2026)

The Miomika app has **five primary surfaces**, navigable via a bottom nav. The center surface (Talk) is the AI-powered hub. The four side surfaces are practical companions to it.
[ Home ]  [ Dashboard ]  [ TALK (center, big, AI brain) ]  [ Marketplace ]  [ Profile ]

**In Mike's own words (locked):**
- **Home** — a place users can play, feed, relax, take, track what they need to do
- **Dashboard** — a practical place where they can trace, practice, copy-paste whatever they generate
- **Talk (center, AI-powered)** — where they can order, deliver, receive, translate, learn, or achieve anything
- **Marketplace** — characters, teams, e-books, future features; also houses referral system + Star economy + pricing entry — all in one screen
- **Profile** — the personal/general screen; avatar, name, journey stage, subscription tier identity, memory editor, settings, help

**The audience truth:**
- **Primary audience:** Thai content creators + Thai students learning English (the wedge)
- **Secondary audience:** English speakers learning Thai (the Tourist → Student → Worker → Resident → Entrepreneur flywheel describes how secondary users evolve across years — NOT the primary audience)
- **Enterprise:** the rocket (schools, hotels, cafes, hospitals onboard users en masse)

**The subscription cross-cutting principle:**

Subscription tier is identity. It appears in three places by design:
1. **Profile** — tier identity (Pro badge), subscription management, billing history
2. **Marketplace** — Upgrade is one of three economy actions (alongside Refer & Earn, Characters & Items). This is the BUY surface.
3. **Talk** — Pro badges on gated features; tapping as Free user opens warm upgrade moment routing to Marketplace § Upgrade.

Same subscription truth, three contexts. Discovery, in-context conversion, identity + management.

**Marketplace layout (locked):** Scrollable landing with Stars balance at top and three section cards visible at once (Refer & Earn → Upgrade → Characters & Items). NOT a carousel. Reasoning: the three actions are fundamentally different contexts, not equivalent verbs like Talk's modes.

**Full screen-by-screen specification:** see `/docs/architecture/SCREENS.md`. This document is the locked source of truth for what each surface is for and what it must NOT become. All future screen rebuilds reference it. Any deviation must be explicitly approved by founder before shipping.

**Archive system:** Every major rewrite of MIOMIKA.md or SCREENS.md saves the previous version to `/docs/architecture/ARCHIVE/` with a timestamp BEFORE editing. Never delete. See `/docs/architecture/ARCHIVE/README.md` for index.

### 1.7 The four non-negotiables

1. **Never a wall, always an invitation.** Every limit is a warm Miomi moment, not a paywall.
2. **Library-first, AI-second.** 80%+ of interactions serve from local data at zero cost.
3. **Teaching is invisible. Growth is theatrical.** Mistakes are echo-corrected silently. Wins are celebrated loudly.
4. **Thai users first.** Thai is primary language, English is secondary. Kreng jai is law. Face-saving is enforced everywhere.

### 1.8 Founder + market

Mike — solo, Bangkok, Mikaro Studio. Domain: **miomika.com** (canonical host: **www.miomika.com**). Repo: **github.com/majidahmadi86/miomika**.

Primary market: Thai people learning English (residents). Secondary: English speakers learning Thai (tourists → students → workers → residents — the journey is the funnel). Tertiary, post-launch: Vietnamese, Indonesian, Tagalog, Japanese, Korean — each via a market-native character archetype.

### 1.9 The B2B flywheel + market ceiling

**B2B:** Enterprise is the viral mechanic disguised as B2B revenue. Hotels onboard guests. Cafes onboard customers. Schools onboard students. Hospitals onboard patients. The institution pays the bridge; the user continues paying personally once hooked. Net acquisition cost: negative.

**Market ceiling:** Marketplace of characters (Miomi free, K-pop Bunny, Anime Hero, Wise Fox paid), AI-generated personalized books, custom exams, outfits, accessories, special abilities. SEA runs on cute/character-driven economies. Mobile-game psychology applied to a learning companion is uncopyable.

### 1.10 Marketing calendar (Thai festival rhythm)

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

Campaigns: `lib/marketing/campaigns.ts` with start/end dates, target tiers, copy variants, max-usage caps. Cron enables/disables automatically.

---

## 2. How She Helps (The Brains)

### 2.1 The brains taxonomy

Multi-brain model is the architectural organizing principle. **One cat. Many specialized brains.**

| Brain | Verb | What it does | Phase |
|---|---|---|---|
| **Teach** | Teach me | Language learning, spiral vocabulary, mirror teaching | Phase 1 wedge |
| **Translate** | Translate this | Instant translator, survival phrases, live between two humans (future) | Phase 1 |
| **Social** | Write this for me | Captions, scripts, bios, posts (creator mode) | Phase 5 |
| **Write** | Write this for me | Long-form copy, emails, professional documents | Phase 5+ |
| **Read** | Read me a story | AI-generated personalized e-books | Phase 7+ |
| **Remember** | Remember this | Long-term memory, journaling, growth tracking | Phase 7+ |
| **Be-with-me** | Be with me | Ambient companionship, daily warmth, no agenda | Phase 1 |

**Future brains:** Business (entrepreneur stage), Enterprise (B2B hotel/school flows), Wellness (care vectors amplified).

### 2.2 The verb stack (acquisition order)

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

### 2.3 How brains activate

User picks a verb (mode on `/talk`, or surface like `/learn`). The right brain wakes up **invisibly**. Same cat, same voice, same memory — different engine instruction behind the scenes.

`/talk` modes today (`lib/talk/modes.ts`): Auto, Teach, Social, Translate, Just-chat. Mode stored in `localStorage` key `miomika.talk_config`.

**Intent is inferred, not selected** (Voice Law #3). Settings drawer (`AdjustSheet`) is the escape hatch: Auto (default) / Always teach Thai / Always teach English / Just chat / Help me write content.

### 2.4 Library-first principle

STATUS: MATCH + LOG are built. PROMOTE (cluster/score/cron/admin/talk_completions)
is NOT built. The 0.85 cosine/embedding step is NOT built — current matcher is
keyword/template. See SYSTEM-MAP.md section 3.

Every brain accumulates a library. **AI is the fallback, not the default.**

```
User says X
  ↓
Intent classifier (free, local) — always runs first
  ↓
Library matcher (free, local) — target 80%+ hit at maturity
  ↓ embedding match before AI call
If library miss → AI (tier-routed) → log to library_interactions
  ↓
Quality scoring → promotion queue → admin approve → graduate to library
```

**Library-first AI cost reduction pipeline:**
1. AI replies log to `library_interactions` with quality signals.
2. Cluster similar high-quality replies.
3. Admin approves promotion to `library_entries`.
4. Next time: embedding match in `lib/library/matcher.ts` / `supabase-matcher.ts` serves at zero cost.

Kill switches: `DISABLE_AI`, `DISABLE_ANTHROPIC`, `DISABLE_GROQ`, `MAX_DAILY_AI_COST_USD`.

### 2.5 The compounding moat

As libraries grow, AI cost drops. The self-improvement flywheel:

```
More users → more logged interactions → more library entries
→ higher hit rate → lower marginal AI cost → more margin → more product investment
```

Per-user cost caps (server-enforced):
- Guest: $0.02/session, $0.02/day
- Free: $0.05/session, $0.05/day
- Pro: $0.15/session, $0.50/day soft cap
- Pro Max: $0.50/session, $2.00/day soft cap

### 2.6 Mirror Teaching (pedagogy — the Teach brain's unfair advantage)

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

Engineering implementation in Phase 3 / Phase 3B (Teach brain buildout).

### 2.7 Multi-language readiness in the schema

Tables with `_th` / `_en` columns refactor to JSONB (Phase 4 migration):

```sql
ALTER TABLE vocabulary_bank ADD COLUMN translations JSONB;
-- { "th": "...", "en": "...", "vi": "...", "id": "...", "ja": "...", "ko": "..." }

ALTER TABLE library_entries ADD COLUMN responses JSONB;
```

Until then, `th`/`en` columns are temporary.

---

## 3. Her Voice & Warmth

### 3.1 Voice Experience Laws (locked by Mike, May 24 2026 — immutable)

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

### 3.2 Language intelligence

- User speaks Thai → Miomi responds in Thai ONLY (warm, natural).
- User speaks English → Miomi responds in English ONLY. Do NOT add Thai unless they ask to learn Thai.
- **Auto-detect** from transcript: Thai unicode block vs Latin (`detectLang` in `lib/voice/tts.ts`).
- **Explicit switch commands** respected: "พูดไทย", "speak English", etc. (`detectLangSwitchCommand`).
- **Engine mirrors user language level** (Session 3.5): look at complexity, vocabulary, sentence length of LAST message; never speak above their level.
- **Toolbox globe toggle** + `conversationLangRef` on `/talk` for forced language.
- **No language mode chips** on `/talk` (Voice Law #2).

### 3.3 TTS provider roadmap

| Stage | Provider | Tier | Notes |
|---|---|---|---|
| **Now (shipped)** | Browser `speechSynthesis` | Free / all tiers | `lib/voice/tts.ts` — single `speak()` seam |
| **Pre-launch** | **Google Cloud Neural2** | Default for Pro | Best balance of Thai quality + cost; daily char budgets |
| **Post-launch add-on** | **ElevenLabs** / Wavenet | Premium Voice packs | Human-quality; essential for pronunciation practice |

**TTS provider comparison matrix:**

| Provider | Thai quality | English quality | Cost | Verdict |
|---|---|---|---|---|
| Browser speechSynthesis | Poor–OK | OK | $0 | Free tier now |
| **Google Cloud Neural2** | **Best balance** | Excellent | ~$16/1M chars | **Pre-launch default swap** |
| Google Cloud Wavenet | Good | Excellent | Similar | Alternate |
| ElevenLabs | Excellent | Excellent | $22/mo Creator+ | **Premium Voice tier** |
| Azure Neural | Good | Excellent | Enterprise pricing | Alternate |
| OpenAI TTS | OK Thai | Excellent | Higher | Not primary |
| PlayHT | Variable | Good | Mid | Alternate |

**Implementation seam:** `lib/voice/tts.ts` exposes single `speak()`. Premium Voice swaps provider behind feature flag on `profile.premium_voice_credits`. No talk-page rewrite.

**Four-pass voice picker (shipped in `lib/voice/tts.ts`):**
1. Priority list match (Google ภาษาไทย, Microsoft Premwadee Online, Google US English, Microsoft Aria Online, …)
2. Female voice hints in target language (aria, jenny, samantha, premwadee, …)
3. Any voice in target language
4. Per-language tuning: Thai rate 0.92 pitch 1.05; English rate 1.0 pitch 1.12

### 3.4 Voice cloning future (Premium Voice tier)

- **ElevenLabs Creator** tier (~$22/mo) for custom voice clone.
- **Consent form required** before recording anyone's voice (friend, actress, Mike).
- **English clones work best**; Thai acceptable but less consistent.
- Ships with Premium Voice add-on — not blocking launch.
- Same cat consistency concern: cloned voice must still feel like *Miomi*, not a random narrator.

### 3.5 The warmth library

Living in `lib/voice/warmth.ts`. **Hardcoded warm strings elsewhere are FORBIDDEN.**

**Shipped vectors:** Praise (intelligence, cuteness, appearance, effort, progress), Care (eaten, rest, hydrate, safe), Recovery (return, struggle), Soft humor, Guidance copy.

**Ice-breaker openers (Session 3.5 — 12 variants):** `ICE_BREAKERS` + `pickIceBreaker()` — never consecutive repeat (`localStorage`: `miomika.last_icebreaker`).

**Warmth library expansion plan (not yet built):** Apply ice-breaker pattern to **every moment** — 5–12 variants each, never robotic, never consecutive repeat:
- CTAs (signup, upgrade, continue)
- Errors (API fail, mic fail, network)
- Transitions (mode switch, clear canvas, leave /talk)
- Level-ups, word mastery, streak milestones
- Empty states (no words yet, no history)
- Payment moments, sign-up nudges
- Guest limit approach (4th exchange warm nudge, 5th auto-CTA)

**Forbidden phrases:** "Wrong", "incorrect", "ผิด", "ไม่ถูก", generic "good job", transactional toasts.

**Cultural Warmth vectors (preserved examples):**
- Intelligence: "ฉลาดมากเลยค่า~", "คิดเร็วจริงๆ นะคะ"
- Cuteness: "น่ารักจังเลย~", "พิมพ์น่ารักมากค่า"
- Beauty: "วันนี้คุณดูสดใสจังเลยค่า"
- Effort: "ตั้งใจมากเลยนะคะ", "พยายามดีมากค่า"
- Care: "กินข้าวยังคะ~?", "ถึงบ้านปลอดภัยไหมคะ"
- Recovery: "หนูคิดถึงค่า~ กลับมาแล้ว ดีใจมาก", "ไม่เป็นไรเลยนะคะ~ วันนี้เริ่มใหม่ด้วยกัน"
- Humor: "555 หนูก็ไม่เก่งภาษาไทยตอนแรกเหมือนกันค่า"

### 3.6 Cat sound effects (~30 phrases — documented, recorded later)

Short vocal SFX **in addition to TTS** — same cat consistency required. Not blocking launch. See §9 for full list.

### 3.7 Three-strike phrase caching (cost reduction)

**Architecture:** After the **3rd identical TTS request** for a phrase+lang combo, cache audio in Supabase `tts_cache` table. Garbage-collect entries unused for **30 days**.

```
speak(text, lang)
  → check tts_cache (hash of normalized text + lang + voice_id)
  → hit: play cached blob
  → miss: synthesize → play → increment counter → on 3rd hit: persist
```

Reduces repeat cost for common warmth phrases, ice-breakers, and library responses.

### 3.8 Voice INPUT architecture (locked — Session 2)

- **STT:** `/api/talk/transcribe` — Groq `whisper-large-v3-turbo`, pinned sin1/hnd1, max 15s, 1MB cap.
- **VAD:** `@ricky0123/vad-web` in `components/talk/MicButton.tsx`.
- **`userIntentRef`:** single source of truth for mic state — no auto-restart on re-render; `locked` prop kills active session.
- **Warm VAD lifecycle:** `pause()` on stop, `start()` on next tap; `killVAD()` only on guest lock + unmount.
- **Samsung Internet:** no Web Speech API — `lib/talk/speech-support.ts` detects UA `samsungbrowser`; disabled mic + "Open in Chrome".
- **Android Chrome:** MediaRecorder + silence detection 900ms / threshold 0.025; credentials include on transcribe fetch.

### 3.9 `/talk` UI architecture (sealed Session 3.5)

- **Carousel MicRow:** selected mode centers in orb; 2 left + 2 right rotate; swipe + tap (`components/talk/MicRow.tsx`).
- **VoiceOrb / MicRow:** AudioWaveform when listening/thinking/speaking; mode icon when idle.
- **PersistentMiomi:** 96px head, mood-driven (idle/listening/thinking/speaking/happy), no circle bg.
- **Transparent shell:** warm cream `#FDFAF2` gradient / `#FCFCFA` app shell — every UI element floats with soft shadow, no boxes.
- **Toolbox:** right column, transparent icons, keyboard / globe / length / TTS.
- **Guest gate:** **5 exchanges** (`GUEST_LIMIT=5`, `localStorage`: `miomika.guest_exchanges`); **auto-raise guest CTA the instant 5th exchange completes** (800ms sheet, library + AI paths); hard lock after.
- **TTS toggle:** defaults ON; persists `miomika.tts_on`.
- **Ice-breaker on session start:** `pickIceBreaker()` + auto-speak at 1.2s if TTS on.

**Session commit refs (Voice INPUT + OUTPUT v1):**
- S1 `78b4fd8` · S1B `03c64a9` · S1C `5e570b6` · S2 `7f252f5` · S2-close `a1c8607` · S2-final `0b94d12` · S2-final-4 `7f1d322` · S2-final-5 `92b7f51` · S2-final-7 warm VAD · S3 TTS · S3.5 `8d030b4` ice-breakers + level mirror · `/talk` **SEALED**

---

## 4. The Surfaces (Screens)

Most non-`/talk` screens were designed **before** `/talk` reached its quality bar. They need a **screen alignment pass** (see §9). `/talk` is the reference implementation.

| Surface | Route | Purpose | Brain(s) | Status |
|---|---|---|---|---|
| **Home** | `/(app)/home` | Launcher — any verb, fuel bars, companion CTA | All | 90% — needs realignment to `/talk` quality |
| **Talk** | `/(app)/talk` | Open room — voice-first, any verb | All (mode picker) | **SEALED** — reference quality |
| **Learn** | `/(app)/learn` *(planned)* | Teach brain focused study | Teach | Designed pre-/talk; alignment needed |
| **Me** | `/(app)/me` | Identity + memory + settings (UI label: "Profile") | Remember | Audit needed |
| **Growth** | `/(app)/dashboard` | Progress, streaks, mastery | Teach + Remember | 40% — static data |
| **Invite** | `/(app)/invite` | Referral | — | 0% |
| **Welcome** | `components/WelcomeScreen.tsx` + onboarding | First-time user journey | Be-with-me | Exists; celebration at `/home?celebrate=signup` |
| **Signup / Login** | `/(auth)/signup`, `/(auth)/login` | Auth + journey stage | — | Google OAuth; back nav |
| **Onboarding** | `/onboarding` | 3s welcome → journey stage | — | Redirect via `/api/auth/post-signup` |
| **Create** | `/(app)/create` | Legacy → redirects to `/talk` | — | Redirect only |
| **Marketplace** | `/(app)/marketplace` | Characters, e-books | — | Phase 7 |
| **Wallet** | `/(app)/wallet` | Stars, transactions | — | Phase 5 |
| **Admin** | `/(app)/admin` | Mike-only | — | Phase 7 |
| **Pricing** | `/pricing` | Packaging | — | Phase 5 |
| **Help / Legal** | `/help`, `/legal/*` | Support | — | Phase 6 |

**Public routes:** `/` marketing (redirects), `/pricing`, `/help`, `/legal/terms`, `/legal/privacy`.

**Auth routes:** `/login`, `/signup`, `/onboarding`, `/auth/callback`.

**API routes:** `/api/auth`, `/api/auth/post-signup`, `/api/miomi`, `/api/miomi/session-init`, `/api/talk/transcribe`, `/api/payment/webhook` (Phase 5), `/api/cron/library-promote`, `/api/cron/library-degrade`, `/api/cron/campaigns`.

---

## 5. How She Remembers

### 5.1 Memory layers

| Layer | What | Where |
|---|---|---|
| **Session** | Current exchange count, fuel, mode, words introduced this session | Client state + `user_sessions` |
| **Profile** | Name, tier, journey_stage, stars, gender, xp, level, streak, mood, preferences | `public.profiles` |
| **Long-term** | Word mastery, spiral schedule, library entries, promoted AI replies | `vocabulary_user_state`, `library_entries` |
| **Future** | Last 10 exchanges as engine context (Session 4 from Voice Laws build order) | `conversations` table *(not yet built)* |

### 5.2 Identity enforcement

**`getServerProfile()`** (`lib/auth/get-server-profile.ts`) is the single server-side source of truth.

- Client-sent `tier`, `isGuest`, `userId` in API requests is **IGNORED**.
- Server always reads via cookies. Client ASKs tier; never TELLS.

### 5.3 Session init

`/api/miomi/session-init` returns opener + session state. `/talk` now uses `pickIceBreaker()` from `warmth.ts` for session openers (Session 3.5).

### 5.4 Completion logging (foundation — not yet built)

`talk_completions` table will log finished exchanges for library promotion pipeline. See §9.

---

## 6. How She Sustains Herself (Business)

Why a kind product can charge: she earns trust first. Limits are warm invitations, not walls.

## 6.1 Subscription tiers, Premium Voice, Stars, fuel

### Subscription tiers (locked for v1 launch)

| Tier | Price | Library AI | Memory | Stars/month | What they get |
|------|-------|---|--------|---|---------------|
| **Guest** | 0 | shared free | none | 0 | Full Miomi, 5 AI exchanges per session, no save |
| **Free** | 0 | shared free | name + 3 sessions + 50 words | 0 (earnable only) | Unlimited library, daily fuel limits, referral active |
| **Pro Miomi** | 299 THB / mo | priority | 20 sessions, 500 words, preferences | **300** | Unlimited fuel, voice output, all verbs, ambient mode unrestricted |
| **Pro Yearly** | 2,990 THB / yr | priority | same | **300/mo + 1,000 signup bonus** | Same as Pro, 2 months free |
| **Pro Max** | 599 THB / mo *(post-launch)* | premium engine | unlimited | **800** | Deep memory, custom tone, e-book generation, multi-character |

### Premium Voice add-on (post-launch, tokenized)

Premium Voice is an add-on **on top of any tier** (Free, Pro, Pro Max). Free TTS uses browser `speechSynthesis` which sounds robotic in Thai. Premium Voice uses Google Cloud Wavenet or ElevenLabs — human-quality voice, essential for users practicing real pronunciation.

| Pack | Tokens (characters) | Price (THB) | Best for |
|------|---------------------|-------------|----------|
| Starter | 1M chars (~3 hours of speech) | 299 | Try it out |
| Practice | 5M chars (~15 hours) | 599 | Monthly practice |
| Unlimited month | unlimited for 30 days | 899 | Active learner |
| Annual | unlimited for 1 year | 7,990 | Power user |

**Implementation seam:** `lib/voice/tts.ts` already exposes a single `speak()` function. When Premium Voice ships, it swaps the provider behind a feature flag based on `profile.premium_voice_credits`. No talk-page rewrite needed.

**When to build:** after first 10 Pro users, OR when a paid user explicitly asks for better voice. Real demand signal first.

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

### 6.2 Characters & marketplace

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

## 7. The Build Plan

### 7.1 Voice Experience Laws build order (locked May 24 2026)

From §3.1 — execute in fresh sessions, one commit each:

- **Session 1** — Guest gate fix + user transcript visibility + back button on /talk
- **Session 2** — Cat speaks (TTS both languages; browser API free tier; premium voice for Pro later) ✅ **DONE / SEALED**
- **Session 3** — Memory + session contract (conversations table, replay last 10 as engine context)
- **Session 4** — Intent inference + settings drawer
- **Session 5** — `/talk` full redesign *(largely absorbed into S2 sessions; polish continues via screen alignment)*

### 7.2 Where we are now

- **Phase 3 voice track:** Sessions 1–3.5 **complete**. `/talk` sealed at commit `92b7f51` + S3.5 polish `8d030b4`.
- **Voice INPUT v1:** LOCKED (commits `47dd0ac`, `e82dd8c`, `fcd915d`).
- **Voice OUTPUT v1:** LOCKED (Session 3 + 3.5).
- **Next:** Session 4 from §3.1 (memory / session contract), then **Phase 3B** — build the **Teach brain** properly as one specific brain among many.

### 7.3 Phase execution plan (preserve order — no skipping)

Each phase = one Cursor master-prompt = one PR.

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

### 7.4 Prompt library system

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

## 8. Technical Anchors (Reference)

### 8.1 Engineering contract

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
  /(app)/me                  → relationship surface (UI label: "Profile")
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

STATUS: TARGET DESIGN, NOT BUILT. Today the router is Groq -> Gemini -> failover
(free only). No Anthropic, no tier routing, no cost caps, no kill switches. See
SYSTEM-MAP.md sections 2-3.

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

### 8.2 localStorage keys (canonical)

| Key | Purpose |
|---|---|
| `miomika.guest_exchanges` | Guest AI exchange counter (limit 5) |
| `miomika.tts_on` | TTS toggle (`"1"` / `"0"`) |
| `miomika.last_icebreaker` | Last ice-breaker index (no consecutive repeat) |
| `miomika.talk_config` | Talk mode config JSON (`lib/talk/modes.ts`) |
| `miomika-signup-celebrated-v1` | One-shot signup confetti guard |
| `miomika.welcome_shown` | Welcome screen single-show (`lib/welcome/show-welcome.ts`) |
| `miomika_debug` | Debug logging (`lib/debug/log.ts`) |
| `miomika.install_prompt_dismissed` | PWA install prompt dismiss |
| `miomika.desktop_hold_banner_dismissed` | DesktopHoldBanner dismiss |

### 8.3 Sentry

- Package: `@sentry/nextjs ^10.53.1`
- Config: `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Env: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (env-guarded — missing DSN never breaks build)
- Wired in: `app/(app)/error.tsx`, `app/global-error.tsx`, `app/auth/callback/route.ts`, `components/talk/MicButton.tsx`
- Safe no-op when DSN unset

### 8.4 Stack summary

```
Framework:    Next.js 16.2.6 (App Router) + React 19
Language:     TypeScript 5 strict mode
Styling:      Tailwind 4 + inline styles (no CSS modules)
Database:     Supabase (Postgres + Auth + Storage), RLS on every table
AI primary:   Groq llama-3.3-70b-versatile (temporary)
AI backup:    Gemini gemini-2.5-flash-lite (temporary)
AI future:    Anthropic Claude Haiku 4.5 (Pro), Sonnet 4.7 (Pro Max)
STT:          Groq whisper-large-v3-turbo via /api/talk/transcribe
VAD:          @ricky0123/vad-web
Animations:   Framer Motion 12
Icons:        lucide-react strokeWidth 1.75
Fonts:        Kanit 500 (Thai UI), Quicksand 600 (English UI), Sarabun 500 (learning content)
Email:        Resend.io
Payment:      Omise (PromptPay primary) + Stripe backup
Analytics:    Plausible (Phase 6)
Errors:       Sentry
Hosting:      Vercel (sin1 region for transcribe)
Canonical:    www.miomika.com
```

### 8.5 Known issues (full audit)

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
12. **Two matchers exist** — consolidate `lib/ai/matcher.ts` and `lib/library/matcher.ts`. STILL OPEN as of 2026-05-28: /talk uses template matchLibrary, /api/miomi uses matchLibraryFromDB. Not consolidated. See SYSTEM-MAP.md section 4.
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

### 8.6 Asset requirements

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

### 8.7 Codebase map

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
| `public.profiles` | All user profile data (tier, journey_stage, stars, language, gender, xp, level, streak, mood, legacy fields) | lib/auth/use-profile.ts, lib/welcome/actions.ts, app/api/miomi/session-init/route.ts, app/(app)/me/page.tsx, app/onboarding/page.tsx |
| `public.vocabulary_bank` | Reference vocabulary (1,134+ rows) | lib/ai/vocabulary.ts, lib/library/resolver.ts |
| `public.phrases_bank` | Reference phrases (not yet wired to engine — Phase 3B) | (none yet) |
| `public.library_entries` | Cached AI responses promoted to library | lib/library/supabase-matcher.ts, app/api/miomi/route.ts |
| `public.library_interactions` | Logged interactions with quality signals | lib/ai/vocabulary.ts, lib/library/supabase-matcher.ts |
| `public.library_promotions_queue` | Pipeline for AI→library promotion (service_role only) | server-only |
| `public.user_sessions` | Per-user session state | app/api/miomi/session-init/route.ts |
| `public.vocabulary_user_state` | Per-user word mastery + spiral schedule (Phase 1) | (wired in Phase 3B) |

The repo contains no CREATE TABLE for these (except vocabulary_user_state in
0008). Live Supabase is the schema source of truth. See SYSTEM-MAP.md section 5.

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
| `/me` | `app/(app)/me/page.tsx` | auth | Relationship surface — identity, subscription, memory editor, settings (UI label: "Profile") |
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
| 0007_user_extended.sql | ✓ (via inline SQL block) | profiles table + handle_new_user trigger. NOTE: 0007 contains a public.users block that conflicts with section 11.8 (users is GONE). Treat public.profiles as the only user table. The users block is dead — annotate or remove in a future code pass (tracked in SYSTEM-MAP.md section 5). |
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

## 9. What's Documented But Not Yet Built

### 9.0 /me v2.1 stub destinations (Phase 3B–7 wiring)

/me shipped May 26 2026 (v2.1) with full DESIGN-RULES compliance and 7-card anatomy. Every row is real visually; most destinations are stubbed. Wire these in the phases noted.

**Card 1: Progress (Phase 3B — Real teaching brain)**
- [ ] `profile.cefr_level` + `profile.cefr_progress_pct` — wire from teaching brain output
- [ ] `profile.words_mastered_count` — read from `vocabulary_user_state` mastery rows
- [ ] `profile.streak_days` — wire from session-end logic
- [ ] `profile.conversation_count` — wire from conversations table when shipped (Voice Law build order Session 3)
- [ ] "See all progress" → /dashboard (route exists, dashboard rebuild is later screen)

**Card 2: Plan & credits (Phase 5 — Payment + Phase 7 — Marketplace)**
- [ ] "Top up" pill (Stars) → /marketplace § Stars wallet — needs /marketplace built first
- [ ] "Add more" pill (Voice) → /marketplace § Premium Voice — needs /marketplace built first
- [ ] "Go Pro together" (Free) → /marketplace § Upgrade — needs /marketplace built first
- [ ] "Manage plan" (Pro) → /me/billing — page doesn't exist yet (Phase 5)
- [ ] Real `profile.miomi_stars` reading (column may not exist yet — verify in Phase 4 migration 0007)
- [ ] Real `profile.premium_voice_credits` reading (column may not exist yet — verify in Phase 5 migration 0010)

**Card 3: Who Miomi is to you (Phase 7 — Polish/marketplace)**
- [ ] "Her name" row — opens rename sheet, persists to `profile.miomi_display_name`
- [ ] "How she sounds" row — voice provider picker, ties to Premium Voice tokens
- [ ] "How she talks to you" row — opens AdjustSheet (component already exists at /talk, surface here)
- [ ] "Her warmth" row — picker with Soft / Balanced / Playful, persists to `profile.miomi_warmth`
- [ ] "What she calls you" row — opens display_name edit sheet

**Card 4: App preferences (Phase 6 — Operational)**
- [ ] Theme row — opens Light / Auto / Dark picker; Auto + Dark are post-launch stubs
- [ ] Sound effects toggle — persists to `miomika.sounds_on` localStorage + ties to cat SFX library (§9.1)
- [ ] Alerts toggle — push notification opt-in (Phase 6 PWA, Phase 8 native)
- [ ] App language row — uiLang switcher, already has cookie infra from RESET-1

**Card 5: Privacy with me (Phase 3B — Memory + Phase 6 — Compliance)**
- [ ] "Things I've learned from us — N" — wire from memory layer (Phase 3B `conversations` table + Phase 4 derivation)
- [ ] "Download my data" — Thai PDPA + GDPR export (Phase 6)
- [ ] "Forget everything and start over" — destructive account reset with warm confirm modal (Phase 6)

**Card 6: Help & feedback (Phase 6)**
- [ ] "Something's broken or confusing" — currently mailto stub, replace with in-app feedback form
- [ ] "Help center" → /help (Phase 6 page)
- [ ] "Chat with a human" — currently mailto stub, replace with Crisp/Intercom or LINE OA when available
- [ ] "What's new in Miomika" → /changelog (Phase 6 page)

**Card 7: About & legal (Phase 6)**
- [ ] Privacy → /legal/privacy (Phase 6 page)
- [ ] Terms → /legal/terms (Phase 6 page)
- [ ] About Miomika → /legal/about (Phase 6 page)

**Logout — already wired, no debt.**

**Hero — already wired, no debt** (avatar fallback + display_name + tier chip all read from profile).

**Visual layer LOCKED. Content wiring debt only.** No future /me work should touch the visual structure without explicit founder approval.

Priority order. Each item: what, why, when, trigger.

### 9.1 Cat sound effects library (~30 phrases)

**What:** Short recorded vocal SFX — meows, chirps, purrs — layered with TTS for emotional moments. **Same cat consistency** as voice clone concern.

**When:** After Mike says "I'm ready to record." Not blocking launch.

**Phrase list (exact inventory for recording session):**

**Greeting moments:**
- "ม้าวว~" (meow hello)
- "เย่~ คุณมาแล้ว!" (yay you're here)
- "ฮัลโหล~" (playful hello)
- sleepy yawn sound
- "หนูคิดถึงคุณ" (I missed you)

**Reaction moments:**
- happy chirp
- surprised gasp "อ้าว!"
- curious "หืม?"
- thinking purr
- soft giggle "ฮิๆๆ"

**Encouragement moments:**
- "เก่งมาก!" (so good!)
- "เย่!" (yay!)
- proud meow
- clap-like "ตบมือ" sound
- "สู้ๆ!" (fight fight!)

**Sad/empathy moments:**
- soft "อืม..." (mmm)
- gentle "ไม่เป็นไรค่า" (it's okay) breath
- comforting purr

**Notification moments:**
- ding-meow (you got a message)
- tiny "ติ๊ง!" (level up!)
- gentle wake-up purr (daily reminder)

**Idle/ambient:**
- soft breathing loop
- occasional tail-flick sound
- distant content purr

**Listening/thinking:**
- "อืมม..." (let me think)
- small "อ๋อ!" (oh I see!)
- "หนูฟังอยู่ค่า" (I'm listening)

**Goodbye:**
- "บายค่า~" (bye~)
- "เจอกันใหม่นะคะ" (see you again)
- sleepy goodnight purr

### 9.2 Voice cloning (Premium Voice tier)

ElevenLabs Creator ($22/mo). Consent form draft needed. English works best; Thai OK. Trigger: first paid user asks for better voice OR 10 Pro users.

### 9.3 Google Cloud Neural2 TTS swap

Replace browser TTS for Pro users pre-launch. Cost-controlled with daily char budgets. Trigger: pre-launch checklist.

### 9.4 Three-strike phrase caching

Supabase `tts_cache` table. Cache after 3rd hit; GC after 30 days unused. Trigger: Premium Voice or TTS cost > $X/day.

### 9.5 Completion logging — `talk_completions`

Foundation for library promotion. Log finished exchanges with quality signals. Trigger: Phase 3B Teach brain.

### 9.6 Brain taxonomy buildout

One brain at a time, starting with **Teach**. Each brain gets: library slice, engine instruction template, dedicated surface optional. Trigger: Phase 3B.

### 9.7 Screen alignment pass

Bring `/home`, `/learn`, `/me` (`/profile`), `/welcome`, `/growth` (`/dashboard`), `/invite`, signup pages to `/talk` quality bar. Transparent shell, warmth library, honey-gold CTAs. Trigger: after Teach brain ships.

### 9.8 Warmth library expansion

Per-moment phrase libraries (5–12 variants each): CTAs, errors, transitions, level-ups, empty states, payment moments, sign-up nudges. Never consecutive repeat. Trigger: screen alignment pass.

### 9.9 Library promotion cron + admin approval interface

Nightly promotion cron, weekly degradation cron, Mike-only admin UI. Trigger: Phase 4.

---

## 10. State Log (update at end of every session)

| Date | Session | Phase | Shipped | Broken | Next |
|------|---------|-------|---------|--------|------|
| 2026-06-06 | Cursor Composer — PWA update delivery | Infra | **PWA update delivery** — replaced root-layout SW unregister with versioned `public/sw.js` (`skipWaiting` + `clients.claim`, network-first navigations, versioned cache purge). Build step `scripts/generate-build-version.mjs` writes `version.json` + regenerates `sw.js` per deploy. `PwaUpdateManager` registers SW in prod, polls `version.json` on focus/visibility, auto-reloads off `/talk`; on `/talk` shows reload banner. `Cache-Control: no-store` on `/sw.js` + `/version.json`. LOCKED 2026-06-05 contracts untouched. tsc + lint + check:talk PASS. | — | Mike: deploy → reopen homescreen install → picks up change without cache clear. |
| 2026-06-05 | Cursor Composer — TEACHING MODE v1 | Voice / 3B | **TEACHING MODE v1** — isolated contract `lib/talk/teaching-mode.ts`: lesson arc (review→focus→use→recap), NEW/REVIEW alternation, context+USE prompts. Tool 3 `get_word_to_review` → `/api/review-word` → `pickWordToReview`/`selectDueReviewCandidate`. Tool 1 `/api/teach-word` NEW-only. Live config + system instruction append teaching contract; `MiomiLiveClient` + `/talk` wire Tool 3 cards + phase nudges. Harness 100 assertions. LOCKED 2026-06-05 contracts untouched. tsc + lint + check:talk PASS. | — | Mike: feel-test teaching quality — review resurfaces, context+use not parrot, lesson arc not word stream. |
| 2026-06-05 | Cursor Composer — card gloss + UI anchor + handoff cap | Voice | **Three /talk fixes** — (1) card meaning/replay: `isVocabularySlug` rejects bank topic ids (`home_stuff_22`); `cardMeaningForWord` + `replayTextForWord` always show/speak human gloss + target surface. (2) UI language anchored to profile — `resolveUiLanguage` switches only on explicit request; target-language practice never flips UI. (3) guest 5th-turn stall: `waitForHandoffReplyDrain` capped 2.5s; spurious `turn_complete` auto-nudges via `sendHiddenTurn`. Harness 81 assertions. LOCKED 2026-06-05 contracts untouched. tsc + lint + check:talk PASS. Pushed → main. | — | Mike: teach-word card — meaning "fridge" + replay ตู้เย็น; speak target word → UI stays EN; guest 5th — reply without mic nudge. |
| 2026-06-05 | Cursor Composer — replay ghost + 5th voice | Voice | **Audio bugs (2)** — (1) card replay: discard entire Gemini turn while `isMicSendSuspended` (text + audio + tool_call + turn_complete); purge ghost bubble on suspend start/complete. (2) guest 5th reply: `handoffReplyStartedRef` ignores spurious `turn_complete`; `waitForHandoffReplyDrain()` (10s + settle) before invitation cue. Harness +68 assertions. LOCKED 2026-06-05 contracts untouched. tsc + lint + check:talk PASS. Pushed → main. | — | Mike: replay word during live mic — no ghost text on next reply; guest 5th — voiced open-loop then invite + sheet. |
| 2026-06-05 | Cursor Composer — stabilization + self-check | Voice | **`npm run check:talk`** harness (51 assertions): language resolution, guest 5-turn sequencer, vocab exclude, card payloads, transcript routing, token policy. **Fixes:** `sanitizeTargetLanguage` + `resolveTargetLanguage` intent ("teach me Thai"); guest/member teach-word gets `learning_target` + `session_introduced`; transcript chunks route to UI lang (voice/text match); target adapts mid-session; handoff turn suppresses extra word card; `itemsRef` sync on card append. LOCKED 2026-06-05 contracts untouched. tsc + lint + check:talk PASS. | — | Mike: manual guest 5-turn + member cards E2E on A52; deferred: card images/size/spacing. |
| 2026-06-05 | Cursor Composer — stabilization pass | Voice | **Stabilization** — (P1) member `/talk` race: `entryStartedRef` set on guest `authReady` before `useProfile` finished → live session never started; fixed `canUseLive` to require `profileAuthReady` + profile for members, entry effect gated on `canUseLive`, reset `entryStartedRef` on connect failure. Save & Practice kept. (P2) guest 5th-turn silent reply: `turn_complete` beat PCM scheduling — `waitForTurnAudioThenIdle()` waits for playback start then drain before invitation cue + sheet. (P3) card replay mic bleed: `setInputMuted()` ducks live uplink during `/api/talk/speak` replay. LOCKED 2026-06-05 contracts intact. tsc + lint + drift PASS. Pushed → main. | Member path broken since word-cards/S&P shipped (auth timing race, not teach-word). Guest 5th voice race since `waitForPlaybackIdle` only. | Mike: member /talk — greeting + cards + save; guest 5th — voiced open-loop then invite; replay word during live mic — mic still hears you after. |
| 2026-06-05 | Cursor Composer — Save & Practice | Voice | **Save & Practice** — `WordCardV3` save row: members see confirmed "Saved~"; guests get "Sign up to save your words" → signup sheet (`guestSheetReason: save`). Growth tab (`/dashboard`) Practice & review: saved words from `vocabulary_user_state` via enriched `/api/profile/progress` (phonetics, emoji, `learningTargetLanguage`, limit 100) as `WordCardV3` cards with cached `/api/talk/speak` replay (`lib/talk/word-replay.ts`). Empty state: "Words you learn with Miomi show up here". LOCKED 2026-06-05 contracts untouched. tsc + lint PASS. | — | Mike: member /talk teach-word → Saved on card; Growth tab lists word + replay; guest save tap → signup sheet; empty member → gentle CTA to /talk. |
| 2026-06-05 | Cursor Composer — word cards in /talk thread | Voice | Tool 1 `get_word_to_teach` → persistent `WordCardV3` in `/talk` canvas (target script, phonetics, UI-lang meaning, example+emoji, replay via `/api/talk/speak` Leda cache). `/api/teach-word` enriches response: `vocabulary_bank.th_romanization`/`en_ipa` when present else `lib/brain/phonetics.ts` Groq→Gemini generation (`phonetics_source: bank\|generated`). Additive only — LOCKED 2026-06-05 contracts untouched. tsc + lint PASS. Pushed → main. | — | Mike: /talk guest+member — Miomi teaches a word → card appears in thread; tap Volume replays Thai word (cached 2nd tap); scroll back + replay still works. |
| 2026-06-05 | Cursor Composer — DOCUMENT + FREEZE `/talk` Live | Voice | **LOCKED 2026-06-05** — docs + code markers for confirmed-working `/talk` stack: (1) audio-native Gemini Live via `/api/live-token` ephemeral mint (legacy ASR→LLM→TTS removed from `/talk`); (2) persona Leda + PERSONA_CORE; (3) icebreaker voice on entry, mic orb separate; (4) guest 5-exchange hook — open-loop 5th reply, `waitForPlaybackIdle`, spoken `GUEST_INVITATION_CUE` + signup sheet only; (5) `/api/teach-word` no guest 401, tool handler always `sendToolResponse`; (6) `get_word_to_teach` → `lib/brain/teaching.ts`. Updated `ROADMAP.md` frozen contracts table. Search `LOCKED 2026-06-05` before edits. | — | Mike: spot-check guest 5th turn + mid-convo teach-word after any future `/talk` touch. |
| 2026-06-05 | Cursor Composer — live language adaptation | Voice | Live session UI/TARGET language: `lib/brain/language.ts` (extract from `state.ts`, behavior-preserving); `buildSystemInstruction(ui,target)` + English-first kickoff; guest default UI=en/TARGET=th; per-turn `resolveUiLanguage` with `isPracticeAttempt` guard (practice repeats do NOT flip UI). `use-profile` adds `learning_target_language`. tsc PASS. Pushed → main. | — | Mike: EN guest /talk — English greeting + explanations; repeat taught Thai word → stays English; sustained Thai conversation → adapts UI. |
| 2026-06-05 | Cursor Composer — live brain tool get_word_to_teach | Voice | Live wired to brain vocabulary picker: `get_word_to_teach` tool in `live-config.ts` + system instruction (must call before teaching NEW words). `/api/teach-word` calls `pickWordToIntroduce` + `introduceWord` (members) / A1 pick only (guests); returns `word_en`, `word_th`, `emoji`, `cefr_level`, optional examples. `MiomiLiveClient` handles tool + always `sendToolResponse`. spike-live untouched. tsc PASS. | — | Mike: logged-in /talk — Miomi teaches bank words, row in `vocabulary_user_state` + `next_spiral_at`; guest gets A1 word, nothing saved. |
| 2026-06-05 | Cursor Composer — guest final turn fix + open loop | Voice | Guest 5th turn sequencing: `waitForPlaybackIdle()` before invitation cue; removed `invitationPendingRef` gemini filter (was hiding late 5th-reply transcript); sheet rises after invitation audio drains. `LAST_TURN_HANDOFF` upgraded to warm answer + curiosity-gap open loop (no signup in bubble). `GUEST_INVITATION_CUE` continuity-framed (remember + pick up where we left off). `/api/miomi` prompt synced. spike-live untouched. tsc + lint PASS. | — | Mike: guest 5th turn — full open-loop reply plays/shows, then spoken invite + sheet; no signup text in bubble. |
| 2026-06-05 | Cursor Composer — live guest UX round 3 | Voice | `/talk`: first canvas tap (not mic) unlocks AudioContext + connects + voiced kickoff; mic orb is separate — starts listening only after greeting `turn_complete` (`awaitingMic` invite). `pcm-playback-processor.js` gapless 24 kHz AudioWorklet playback (replaces per-chunk BufferSource + fades that caused pup-pup clicks); mic gain muted during playback. `lib/live/transcript.ts`: strip mis-detected CJK from user ASR display (`inputAudioTranscription.languageCodes` unsupported on Gemini consumer API). tsc + lint PASS. Pushed → main (Vercel redeploy). | — | Mike: guest /talk — tap canvas → hear greeting before mic; no chunk ticks while Miomi speaks; Thai user bubble shows Thai/EN not CJK gibberish. |
| 2026-06-05 | Cursor Composer — live guest UX round 2 | Voice | `/talk`: `MediaHandler.unlockPlayback()` + `primeAudioContext()` on first gesture (orb tap / pointerdown) before connect+kickoff; mic deferred until kickoff `turn_complete` so greeting audio plays on one tap. Opener `mini_cat` row reused for live kickoff (no empty canvas flash); thread scroll top-aligned when content fits. `media-handler`: 40ms schedule-ahead, 64-sample chunk fades, uplink gated during playback, `echoCancellation` on mic. tsc + lint PASS. Pushed → main (Vercel redeploy). | — | Mike: guest /talk — one orb tap → voiced greeting; first user bubble flows under greeting; no chunk clicks while Miomi speaks. |
| 2026-06-05 | Cursor Composer — guest live tool-call fix | Voice | `/api/teach-word`: removed auth gate — guests get `{ ok: true }` (log-only, no cost). `MiomiLiveClient`: `handleToolCall` try/catch + always `sendToolResponse` on failure; `onmessage` wrapped; `connect()` awaits `onOpen` before kickoff so greeting speaks on orb tap. Pushed `2f46601` → main (Vercel redeploy). tsc + lint PASS. | — | Mike: live guest /talk — greeting speaks first; teach_word mid-convo no longer breaks audio; 5th turn invitation cue + signup sheet. |
| 2026-06-04 | Opus brain + Composer — invitation decouple | Voice | Guest signup invitation decoupled: last-turn reply = warm answer only (no signup text in chatbox); CTA plays as its own speak() cue when the sheet rises (handoff turn only, respects ttsOn). Verified in production, Thai + English. tsc + lint PASS. LOCKED — do not change without re-verifying. | — | Ears: mixed-language ASR. |
| 2026-06-02 | Cursor Composer — guest handoff turn | Voice | `/api/miomi`: `LAST-TURN HAND-OFF` prompt on `exchangeNumber === GUEST_EXCHANGE_LIMIT - 1`; returns `guestHandoff: true`. `/talk`: sheet rises after TTS on `guestHandoff` (same path as `guest_limit`); removed blind 800ms timer. Verified API: handoff flag on turn 5 (`exchangeNumber` 4), `guest_limit` on turn 6. tsc + lint + drift + VAD churn PASS. | Library/clarification early-returns skip handoff prompt (AI path only). | Mike: guest ear verify — 5th turn answers + warm sign-up invite in same reply, sheet after voice; clear `miomika.guest_exchanges` first. |
| 2026-06-02 | Cursor Composer — revert Chirp 2 th-TH | Voice | `/api/talk/transcribe`: `CHIRP2_LANGUAGE_CODES` `["auto"]` → `["th-TH"]` (reverts 6df6b95); same `chirp_2` / `asia-southeast1` / singleton / Groq fallback. Verified: TTS→transcribe round-trip → Thai script (`servedBy: google_chirp2`, ~1.9s). tsc + lint + drift + VAD churn PASS. | `["auto"]` broke Thai script accuracy on live speech. | Mike: live /talk — speak Thai, confirm accurate script; EN may fall through to Groq. |
| 2026-06-02 | Cursor Composer — guest limit race fix | Voice | `/talk`: removed `useEffect` that called `recoverFromTurn` on `guestExchanges >= GUEST_LIMIT` (aborted in-flight `/api/miomi` before `guest_limit` reply). `guest_limit` path now plays goodbye TTS fully, then `mic stop` + sheet via `completeGuestLimitTurn` on same `onEnd`/`finishTurn` signal. tsc + lint + drift + VAD churn PASS. | Client-side guest-limit abort caused AbortError + silence on 5th exchange. | Mike: guest 5th turn — full goodbye spoken, mic stops, sheet rises; no AbortError. |
| 2026-06-02 | Cursor Composer — remove thinking TTS cue | Voice | Removed pre-reply thinking audio: deleted `scheduleVoiceTurnAck` / `enqueueReplyTts` / `preloadThinkingCues` / `playThinkingCue` / `playWarmClip` / `fetchTtsClip`. VAD speech-end → transcribe → engine → speak with one voice only. `cueListening` / `cueSorry` unchanged. tsc + lint + drift + VAD churn PASS. | — | Mike: ear verify /talk — stop talking → one voice (reply only), no filler before it; still fast. |
| 2026-06-01 | Cursor Composer — thinking TTS cues | Voice | `/talk`: 6 rotating server-TTS thinking fillers pre-cached in `lib/voice/cues.ts`; 250ms gate after VAD speech-end then `playWarmClip` (echo guard); reply queued gapless after cue; skip cue if reply ready in window. `playWarmClip` + `fetchTtsClip` in `tts.ts`. Removed synth `cueThinking` on processing. tsc + lint + drift + VAD churn PASS. | — | Mike: ear verify /talk — short warm cue after you stop, then full reply; no double-speak on fast paths; cues rotate. |
| 2026-06-01 | Cursor Composer — VAD redemptionMs 1500 | Voice | `MicButton.tsx`: `redemptionMs` 800 → **1500** (more silence before speech-end; threshold unchanged). tsc + lint + drift + VAD churn PASS. | — | Mike: ear verify /talk — pauses mid-thought no longer cut off; if laggy dial back toward 1300. |
| 2026-06-01 | Cursor Composer — turn self-recovery | Voice | `/talk`: single in-flight guard (VAD speech-end dropped while `processing`/`speaking`); `recoverFromTurn` / `finishTurn` wrap transcribe→miomi→speak — any failure or 12s watchdog resets to `listening` (session) or `idle`, clears in-flight + aborts engine; `cueSorry()` on timeout; removed erroneous transcript drop on `processing`. tsc + lint + drift + VAD churn PASS. | — | Mike: DevTools offline one turn → back to listening, next turn works; no double-turns under load. |
| 2026-06-01 | Cursor Composer — serialize voice turns | Voice | `/talk`: one turn in flight — `turnInFlightRef` + `handleVadSpeechEnd` returns false to skip transcribe; VAD paused during `processing` via `speakingActive`; transcript drop guard for `processing`; `idle` reset after no-TTS reply. MicButton honors `onVadSpeechEnd` false (no VAD threshold changes). tsc + lint + drift + VAD churn PASS. | — | Mike: live /talk — speak through processing/TTS; logs show no overlapping transcribe; no double-turns. |
| 2026-06-01 | Cursor Composer — TTFS + ASR split logs | Voice | `/talk` `[turn-timing]` adds `TTFS=` (VAD speech-end → first Miomi audio `started`, includes redemption/debounce); `/api/talk/transcribe` logs `asr-split` `{uploadReadMs, recognizeMs}`. Logging only. tsc + lint + drift + VAD churn PASS. | — | Mike: one /talk voice turn — console shows `TTFS=`; Vercel shows `asr-split` to see upload vs recognize. |
| 2026-06-01 | Cursor Composer — Chirp 2 auto language | Voice | `/api/talk/transcribe`: `CHIRP2_LANGUAGE_CODES` `["th-TH"]` → `["auto"]` (Chirp 2 language-agnostic mode); same `chirp_2` / `asia-southeast1` / recognizer / singleton / Groq fallback. Verified: EN TTS WAV → English (`servedBy: google_chirp2`); TH TTS WAV → Thai script. tsc + lint + drift + VAD churn PASS. | — | Mike: live /talk EN UI — speak English, confirm no Thai gibberish; Thai accuracy unchanged. |
| 2026-06-01 | Cursor Composer — ASR client singleton | Voice | `/api/talk/transcribe`: lazy module-level singletons for Google STT V2 (`getGoogleSpeechClient`, `GOOGLE_TTS_CREDENTIALS` parsed once, `asia-southeast1` endpoint) and Groq (`getGroq`); no per-request `new SpeechClient` / OAuth churn. tsc + lint + drift + VAD churn PASS. | — | Mike: /talk — after 2+ turns `[turn-timing]` ASR should drop to ~1.5–2s warm; `servedBy: google_chirp2` unchanged. |
| 2026-06-01 | Cursor Composer — revert chunked TTS + debounce | Voice | `/talk` `processInput` back to single `speak(stripForTts(...))` on full reply (reverts addcf29); transcript debounce 250ms → 600ms (reverts 6f6c096). `speakReply` helpers remain in `tts.ts` unused. tsc + lint + drift + VAD churn PASS. | Chunked TTS gave no latency win (~6ms TTS); 250ms debounce chopped user sentences into separate turns. | Mike: /talk — one continuous Miomi voice per reply; pauses in speech no longer split turns. |
| 2026-06-01 | Cursor Composer — chunked reply TTS | Voice | `lib/voice/tts.ts`: `splitReplyIntoTtsChunks` + `speakReply()` — sentence/particle split when clean, else single `speak()`; chunk 1 synth+play immediately, rest parallel; one `Audio` element + compressor chain for gapless order; `killAllAudio` stops whole queue; `/talk` `processInput` uses `speakReply` (bubble unchanged). tsc + lint + drift + VAD churn PASS. | — | Mike: ear verify phone+laptop TH+EN — sooner start, smooth multi-sentence, orb stops whole queue, unsplittable Thai unchanged. |
| 2026-06-01 | Cursor Composer — per-turn latency log | Voice | `/talk` one `[turn-timing]` line per voice turn: ASR (VAD speech-end→transcribe), LLM (transcribe→`/api/miomi`), TTS (miomi→first audio), TOTAL; `servedBy` on transcribe JSON (`google_chirp2`/`groq_whisper`). Logging only. tsc + lint + drift + VAD churn PASS. | — | Mike: one /talk utterance — read console `[turn-timing]` to see which stage dominates. |
| 2026-06-01 | Cursor Composer — TTS Web Audio playback boost | Voice | `lib/voice/tts.ts`: server TTS routed through shared `AudioContext` → `MediaElementSource` → `DynamicsCompressor` (threshold −20 dB, ratio 8:1) → makeup gain 1.7× → destination; `unlockTtsPlayback()` + first-gesture unlock; `killAllAudio`/supersede disconnect source; server `VOLUME_GAIN_DB` unchanged at 4.0. tsc + lint + drift + VAD churn PASS. | — | Mike: live /talk — clearly louder Miomi, no clipping/distortion on phone speaker. |
| 2026-06-01 | Cursor Composer — Chirp 2 Singapore transcribe | Voice | `/api/talk/transcribe`: primary Google STT V2 `chirp_2` in `asia-southeast1` (~1.1s vs ~2.3s Chirp 3 `us`); endpoint `asia-southeast1-speech.googleapis.com`; `languageCodes: ["th-TH"]` (Chirp 2 has language-agnostic `["auto"]` but NOT Chirp 3 constrained `["th-TH","en-US"]` auto-detect); Groq Whisper fallback only; `servedBy: google_chirp2`; Chirp 3/`us` path removed. tsc + lint + drift + VAD churn PASS. | — | Mike: live /talk — confirm `servedBy: google_chirp2`, ~1s transcribe; EN speech falls through to Groq if Chirp 2 th-TH misses. |
| 2026-06-01 | Cursor Composer — drop chirp_2 transcribe fallback | Voice | `/api/talk/transcribe`: removed invalid `chirp_2` in `us` (prod Sentry INVALID_ARGUMENT); chain now chirp_3 bilingual → chirp_3 single-code → Groq; each chirp_3 failure logs status+message (console + `log()`) before fallback. tsc + lint + drift + VAD churn PASS. | — | Mike: confirm no more `chirp_2 does not exist` in Sentry; chirp_3→Groq fallbacks show real reason in Vercel logs. |
| 2026-06-01 | Cursor Composer — Chirp 3 always bilingual | Voice | `/api/talk/transcribe`: Chirp 3 primary attempt always `languageCodes: ["th-TH","en-US"]` regardless of UI `language` hint (learning mode: spoken lang ≠ UI lang); fallback chain unchanged (single-code chirp_3 → chirp_2 → Groq). Verified: `language: en` + Thai WAV → Thai script; EN WAV → clean English; `servedBy: google_chirp3`. tsc + lint + drift + VAD churn PASS. | — | Mike: live /talk EN UI speaking Thai — no romanization garble. |
| 2026-06-01 | Cursor Composer — Google Chirp 3 transcribe | Voice | `/api/talk/transcribe`: Google STT V2 `recognize` primary (`@google-cloud/speech` v2, `GOOGLE_TTS_CREDENTIALS`, `us` + `chirp_3`, bilingual `th-TH`/`en-US`); Groq Whisper fallback; `{ text }` unchanged. Verified: TH+EN+auto WAV → `servedBy: google_chirp3`. Puppeteer VAD: PASS (1 create); tsc + lint + drift: PASS. | — | Mike + Thai friend: live /talk — Thai clean; EN UI “teach me Thai” no garble. Enable Speech API + `roles/speech.client` on SA if prod 403s. |
| 2026-05-31 | Cursor Composer 2.5 — Whisper ui_language hint | Voice | MicButton sends `profile.ui_language` (`th`/`en`) on POST `/api/talk/transcribe`; route already maps hint → Whisper `language` (auto only when missing). Puppeteer VAD: PASS (1 create); tsc + lint + drift: PASS. | — | Mike: TH UI — debug overlay `[network] POST /transcribe` shows `language: th`; spoken Thai transcribes cleanly. |
| 2026-05-31 | Cursor Composer 2.5 — softer female TTS voice | Voice | `mapVoice()` female default Despina → Leda for `th-TH` + `en-US`; new cache keys re-synth cleanly. API verify: EN+TH POST `/api/talk/speak` 200 OK (fresh synth). Puppeteer VAD: PASS (1 create); tsc + lint + drift: PASS. | Ear verify pending on device — swap Leda → Achernar → Aoede if still too sharp. | Mike: /talk — confirm voice feels softer/younger; same voice on opener + replies. |
| 2026-05-31 | Cursor Composer 2.5 — AI router latency | Brain | `getAIResponse` order: Groq first, Gemini fallback; Gemini errors logged at `console.error("[router] Gemini failed:", …)` for later revival decision. API verify: `servedVia: ai_groq__auto` in ~2.7s (no Gemini fail delay). Puppeteer VAD: PASS (1 create); tsc + lint + drift: PASS. | Gemini still 100% fail — kept as fallback only. | Mike: /talk — confirm replies feel snappier; debug overlay still shows `ai_groq__auto`. |
| 2026-05-31 | Cursor Composer 2.5 — TTS short-phrase cache | Voice | `CACHE_IMMEDIATELY_MAX_CHARS = 60` in `/api/talk/speak`: openers/greetings cache on 1st synthesis; long unique replies keep 3-strike. API verify: short repeat ~210ms cached vs ~1.3s synth; long 2nd hit still uncached. Puppeteer VAD: PASS (1 create); tsc + lint + drift: PASS. | — | Mike: open /talk twice — same returning opener should be near-instant on 2nd hear; long replies unchanged. |
| 2026-05-31 | Cursor Composer 2.5 — persona language | Brain | `buildBrainPrompt` MEDIUM/TARGET language contract (intent inference, one-language lines, gloss in parens); no written stage directions; garbled-transcript guard extended. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: EN UI — "teach me Thai" stays English medium; TH learner gets explanations in Thai; confirm no *(giggles)* in replies/TTS. |
| 2026-05-31 | Cursor Composer 2.5 — TTS meta strip | Talk polish | `stripForTts()` removes bracketed meta, `*italic*`, `_underline_`, and curly/smart quotes before delimiter strip (TTS-only). Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: /talk — reply with glosses `(hello)` or *stage* cues; confirm TTS skips them, bubble text unchanged. |
| 2026-05-31 | Cursor Composer 2.5 — TTS strip polish | Talk polish | `stripForTts()` extended (TTS-only): collapse 3+ spaced 1–3-letter Latin fillers, Latin letter stretch (`soooo`→`so`, Thai untouched), ellipsis/dash/space gap normalization, edge punctuation trim. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. Commit `4f365f0`. | — | Mike: /talk — reply with "oh oh oh" or elongated English; confirm smoother TTS, on-screen text unchanged. |
| 2026-05-31 | Cursor Composer 2.5 — voice drop fix | Voice | `/api/talk/speak` TTS synth timeout 9s → 18s; brevity rule already in `lib/brain/prompt.ts` HOW YOU TALK (1–2 sentences). No browser fallback. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: /talk — long reply should still play audio. |
| 2026-05-31 | Cursor Composer 2.5 — model-owned brain | Brain | `buildBrainPrompt` single flexible prompt (no `chooseMove`/`moveInstruction`); `/api/miomi` builds prompt from state+input+mode only; `replyLanguage` from model output script (`detectReplyLanguageFromContent`). Groq+Gemini unchanged. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: EN UI + TH target — ask Miomi to switch languages; confirm TTS follows reply script not transcript. |
| 2026-05-31 | Cursor Composer 2.5 — reply lang decoupled from transcribe | Voice | `/talk` replyLang + TTS from `profile.ui_language` only; removed `data.replyLanguage` → `updateConversationLang` coupling in `processInput`; Toolbox globe wired to `updateUiLanguage`. Transcription stays `language: auto`. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: EN UI — speak English, confirm replies stay English after Thai mis-transcribe. |
| 2026-05-31 | Cursor Composer 2.5 — Thai speech plumbing | Voice | MicButton always sends `language: auto` to `/api/talk/transcribe` (Whisper auto-bilingual path); removed `thaiRatio > 0.7` drop rule for EN-interface users in `isLikelyHallucination`. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. Commit `d0ade17`. | — | Mike: A52 EN UI — speak Thai, confirm transcript kept and not garbled. |
| 2026-05-31 | Cursor Composer 2.5 — one voice TTS cache | Voice | `tts_cache` key now includes `voiceName|speakingRate|volumeGainDb` (sha256); stale Aoede-era entries bypassed; `volumeGainDb` 6.0 → 10.0. POST `/api/talk/speak` 200 OK. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: A52 — opener + reply should sound like same Leda voice; volume noticeably louder. |
| 2026-05-31 | Cursor Composer 2.5 — reply language invariant | Brain | `replyLanguage` always `brainState.uiLanguage` on every `/api/miomi` return (guest after brain read, pronunciation, recovery, clarification, main, failover default `en`); library serves ui-lang slice only; `buildBrainPrompt` language contract one-liner; `moveInstruction` uses `uiLanguage` not target. Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | — | Mike: EN UI + TH target — confirm Miomi replies English with inline Thai quotes only. |
| 2026-05-30 | Cursor Composer 2.5 — polish pass | Talk polish | Content-based hallucination guard (profile-sticky, not Whisper lang); `lib/voice/cues.ts` listening/thinking tones; Toolbox icon press states (active-only motion); opener TTS without `audioUnlocked` gate (800ms delay). Puppeteer VAD: PASS (1 create); tsc + lint: PASS. | Browser may block opener on cold session until first orb tap. | Mike: A52 — confirm English transcripts kept, opener autoplays after nav tap, toolbox icons don't all bounce. |
| 2026-05-30 | Cursor Composer 2.5 — foundation fix (4 root causes) | Foundation | VAD singleton on mount (no threshold destroy/recreate); `speakingActive` pauses VAD (echo fix); sticky `uiLanguage` + `targetLanguage` in brain/prompt; `/api/talk/speak` 9s race → 503 + client retry/backoff. Puppeteer /talk: PASS (1 VAD create); tsc + lint: PASS. Commit `bdd4ae5`. | Interrupt-while-speaking deferred. | Mike: A52 /talk mic session — confirm no echo, stable lang, TTS recovers after slow synth. |
| 2026-05-30 | Cursor Composer 2.5 — observability commit | Observability | Debug event bus + Sentry breadcrumbs, `/talk` DebugOverlay (3-tap header), TalkErrorBoundary, `/debug` viewer, structured logs on `/api/talk/transcribe` + `/api/miomi`, MicButton + TalkPage instrumentation. Puppeteer /talk: PASS; tsc + lint (changed files): PASS. Commit `ff71652`. | — | Mike: 3-tap overlay on A52, watch VAD/transcribe/engine timeline during real mic session. |
| 2026-05-30 | Cursor Composer 2.5 — master conversation system | Talk | Single-voice (`killAllAudio` gen counter), interrupt-while-speaking VAD, 600ms transcript buffer, hallucination guard, 8s/12s fetch timeouts, tap-to-begin audio unlock, hand-crafted ice-breakers, `stripForTts`, retention + mode prompts in `/api/miomi`, mic state labels. Puppeteer /talk: PASS; tsc + lint: PASS. | — | Mike: A52 smoke interrupt + fragmented speech + mode switches. |
| 2026-05-30 | Cursor Composer 2.5 — /talk revert to cf46124 | Revert | Rolled `/talk/page.tsx`, `MicButton.tsx`, `lib/voice/tts.ts` back to `cf46124`; deleted `lib/conversation/*`. Brain (`lib/brain/*`), `app/api/miomi/route.ts`, dashboard, `/me`, migrations untouched. Commit `6048e92` pushed. HTTP 200 on `/talk`. | Orchestrator conversation path removed — `/talk` no longer uses pronunciation card UI from post-cf46124 talk page (PronunciationCardV1 file remains; route/brain pronunciation still in engine). | Mike: A52 smoke /talk mic+TTS; decide when to re-land conversation 1/3 on a branch. |
| 2026-05-29 | Cursor Composer 2.5 — Conversation commit 1B | Conversation 1B/3 | Re-landed orchestrator (reverted 5f05fbe) with loop fix: `transition()` side-effect-free; VAD via imperative `micRef.setVadThresholds` (no React state); idempotent mic start/stop; `onConversationLangChange` separate channel; shallow-equal guards in `updateOptions` + VAD apply. Files: `lib/conversation/*`, `/talk/page.tsx`, `MicButton.tsx`, `tts.ts`, `CONVERSATION-ARCHITECTURE.md`. tsc: PASS, lint: PASS (13 warnings). Commit `6518386`. | Full interactive freeze smoke on A52 not run in this session (HTTP 200 + compile OK). | Mike: tap /talk orb, confirm no freeze; then commit 2/3. |
| 2026-05-26 | Cursor Composer 2.5 — /home ambient v2 | /home ambient v2 | Miomi anchor repositioned to upper 36% of stage (clear of fuel bars + CTA). Autonomous wander via `useMotionValue` + `animate()` every 6–12s, ±25%/±15% bounds, 3–4s easeInOut drift. Grab-and-place: drag end keeps position (spring-back removed); wander resumes after 5s stillness + 2s post-reaction pause. Tap/drag reactions, breath, fuel, bubbles untouched. tsc: PASS, lint: PASS (23 warnings), build: PASS. | — | Mike rates; if ≥9 → /home locked, system brain. |
| 2026-05-26 | Cursor Sonnet 4.5 — /home polish (bubble + ambient + fuel caption) | /home polish | Double-bubble fix: greeting gated on `!isGuest`, guest-CTA pill from `warmth.home.guest.pill()` at stage top; speech bubble repositioned beside Miomi head with 8px tail + glass styling + 4s/3.2s auto-fade. Ambient interactivity: tap → `home.react.tap()` + happy PNG + 280ms scale bounce + 3 heart particles + TTS; long-press 300ms + 8px move → thinking PNG + FM drag (±30%/±15%) + spring return + `home.react.drag()`. Fuel bars preserved; warm caption from new `home.fuel.caption()`. PNGs: full-body `/miomi/idle.png`, `happy.png`, `thinking.png`. tsc: PASS, lint: PASS (23 warnings), build: PASS. | — | Mike A52 smoke: guest pill only / logged-in greeting beside head + tap + drag. |
| 2026-05-26 | Cursor Sonnet 4.5 — /home polish v1 + /me verify | /home polish | Surgical `/home` on restored 7/10 page: guest greeting suppressed (`!isGuest` + 4s fade for logged-in); guest-CTA pill from `warmth.home.guest.pill()`; tap Miomi → `home.react.tap()` + happy PNG + scale bounce + 3 heart particles + TTS if `miomika.tts_on`; long-press 300ms + 8px drag → thinking PNG + FM drag within stage ±30%/±15% + spring back + `home.react.drag()`; fake local Lv/XP bar removed from fuel strip (localStorage pet stats only). `/me` identity sheets already wired (avatar + name row). warmth `home.react.*` already present — no duplicate. PNGs: `/miomi/idle.png`, `happy.png`, `thinking.png`. tsc: PASS, lint: PASS (26 warnings), build: PASS. | Pet level-up logic still runs internally but Lv UI removed. | Mike A52 smoke: guest pill only / logged-in greeting + tap + drag. |
| 2026-05-26 | Cursor Opus 4.7 — /home v3 alive | /home v3 | Rolled back disaster commit `8d4e750` MiomiStage approach. Rebuilt with `MiomiAlive.tsx` single-PNG architecture (`companion-idle.png` only — zero 404s). Breath + drift + blink overlay + head-tilt + tap-bounce + drag + sparkles + floor shadow all CSS/Framer. Glass fuel chips + streak chip. Greeting bubble 800ms delay (logged-in only). Guest pill only for guests (no double bubble). Whisper via `useHomeWhisper`. Mic hint from `warmth.home.mic.hint()` with pulse. `/me` untouched. tsc: PASS, lint: PASS (22 warnings), build: PASS. | Other companion PNGs exist on disk but are NOT referenced on /home. | Mike A52 smoke test; rate /home 1–10. |
| 2026-05-26 | Cursor Opus 4.7 — /home alive + /me identity | /home + /me | `/home` full rewrite: alive MiomiStage (drift, mood PNG swap, tap bounce + heart particles, long-press drag + spring return), MiomiBubble greeting/reactive bubbles, fuel triplet + streak sky bar, whisper card from guidance, mic hint, guest-CTA pill only for guests (no double bubble). `/me` identity edits: AvatarEditSheet (upload/Use Miomi) + NameEditSheet wired to profile. `home.*` + `me.avatar.*` + `me.name.*` warmth vectors. Companion hidden on `/home` + `/me`. GuidancePill hidden on `/home`. PNG variants: idle/happy/celebration/listening present; yawn/tail-flick/head-tilt gracefully skipped (404). tsc: PASS, lint: PASS (22 warnings), build: PASS. | Avatar storage bucket may need Supabase setup if not yet provisioned. Bond pickers still stubbed. | Mike rates /home 1–10; if ≥9 → /dashboard rebuild. |
| 2026-05-26 | Claude UI/UX architect chat — /me v2.1 LOCKED | /me v2.1 | Relationship surface shipped: 7-card anatomy (Progress / Plan & credits / Who Miomi is to you / App preferences / Privacy / Help & feedback / About & legal) + warm Logout link. Full DESIGN-RULES.md v1.0 compliance verified. Empty stat columns show motivating lucide icons (BookOpen / Flame / MessageCircle) instead of dashes. Visual layer LOCKED — content wiring debt tracked in §9.0. DESIGN-RULES.md and SCREENS.md §Surface 5 reflect shipped reality. Marketplace § Upgrade psychology pinned as first job of /marketplace build. | Stubs: theme/voice/warmth/name pickers, billing page, memory editor backend, help/legal pages, data export, account reset. All tracked §9.0. | /home rebuild (companion surface) next. |
| 2026-05-26 | Cursor Opus 4.7 — /me v2 | /me v2 | `/me` full rewrite: 7-card relationship anatomy (Progress → Plan → Bond → App prefs → Privacy → Help → Legal); hero avatar + display name + ONE tier chip only; `me.*` warmth vectors extended in `lib/voice/warmth.ts`; scroll fix (`overflow-y: auto` on page root); post-login `redirect_to` via `lib/auth/redirect-to.ts` + login/OAuth/post-signup/onboarding; companion hidden on `/me`. Doc-debt: SCREENS.md §Surface 5 not updated (separate doc-pass). tsc: PASS, lint: PASS (27 warnings), build: PASS. | Progress stats show "—" until Phase 3B wires `cefr_level`, `words_mastered_count`, `streak_days`, `conversation_count`, `premium_voice_credits`, `avatar_url`, `miomi_warmth`. Bond/theme/warmth pickers stubbed. | Mike: smoke-test `/me` scroll on 375×812 + post-login return to `/me`; doc-pass SCREENS.md §Surface 5. |
| 2026-05-25 | Cursor Composer 2.5 — Session 4 | Session 4 | `/me` rebuild per SCREENS.md §Surface 5: route renamed `/profile` → `/me` (redirects preserved for `/profile`, `/profile/journey`, `/profile/language`); BottomNav + layout SCREENS + GuidancePill updated; relationship surface with hero (avatar + Pro badge + journey/lang chips), subscription identity, premium voice tokens placeholder, memory editor warm empty state, settings toggles, growth story link, help/legal/logout; `ME_SCREEN_PHRASES` + `pickMePhrase()` in `lib/voice/warmth.ts`. tsc: PASS, lint: PASS (27 warnings), build: PASS. | Memory editor, billing history, voice token top-up, growth stats — placeholder warm states until backend ships. Guest /me view from old profile page not ported (logged-out users see empty hero). | Mike: smoke-test `/me` on A52; wire real memory + growth data in Session 5. |
| 2026-05-21 | Cursor — Claude Opus 4.7 | 1 | Blocks A–I shipped: welcome single-show contract (bug #1 + #8), login/signup back nav (bug #2), Google OAuth + `/auth/callback` route (bug #3), journey-stage question inserted as onboarding step 2 (bug #9), `lucide-react ^1.16.0` bump (bug #11), `@sentry/nextjs ^10.53.1` wired via `instrumentation.ts` / `instrumentation-client.ts` (env-guarded so missing DSN never breaks build), Miomi-voice `error.tsx` + `global-error.tsx`, ambient `CompanionButton` + `CompanionSurface` mounted on every authenticated route except `/talk`, migrations 0007 (journey_stage, miomi_stars, active_character_id, last_seen_at, welcome_shown_at), 0008 (vocabulary_user_state + advance_word_mastery / touch_word_exposure RPCs — CRITICAL for teaching), 0009 (RLS lockdown for users, user_sessions, vocabulary_user_state, vocabulary_bank, phrases_bank, library_entries, library_interactions, library_promotions_queue + audit_rls_status helper), three asset briefs in `/docs/asset-briefs/`, lazy-init for Groq/Gemini clients so `next build` no longer needs runtime keys. | npm run lint reports 7 pre-existing React 19 hooks/static-components errors in /talk surfaces (talk/page.tsx, MicButton.tsx, MiomiLive.tsx, WordCardV3.tsx) — these predate Phase 1 and are scoped to Phase 2 "Cleanup, consistency". Phase 1 code itself is lint-clean. Bug #10 ambient companion now ships but its conversation engine is a placeholder that promotes to `/talk` for the real mic/voice loop — full inline conversation lands when Phase 3 wires mastery + spiral. | Mike: (1) apply migrations 0007 → 0008 → 0009 in Supabase SQL editor, (2) enable Google OAuth in Supabase Dashboard → Authentication → Providers with redirect `https://miomika.com/auth/callback` (+ local `http://localhost:3000/auth/callback`), (3) generate Phase 1 assets per `/docs/asset-briefs/`, (4) set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` env vars in Vercel, (5) push branch + open PR with title "Phase 1: Foundation + Ambient Companion". After merge return for Phase 2 prompt. |
| 2026-05-22 | Cursor — Claude Sonnet 4.6 — Phase 3A | 3A | Visual discipline: `#8B1A35` removed from all CTAs → pink gradient on CTAs, `#DB2777` on text/icons; BottomNav rebuilt flat (no elevated pill, all 5 tabs equal, active = pink, inactive = `#9A8B73`); `lib/ai/limits.ts` with `GUEST_EXCHANGE_LIMIT=5`; server-side guest limit in route.ts; RECOVERY_STRUGGLE for negative emotions; session-init rewritten with warmth.ts (CARE_EATEN/RECOVERY_RETURN/PRAISE_PROGRESS); MicButton onend race fixed (Android interim → final, isFinal commits immediately then stops recognition); CompanionButton dreamy drift (24×16px wander 8-12s) + playful behaviors (ear-twitch/head-tilt/hop 20-30s intervals); `lib/celebration/burst.ts` canvas confetti (80 gold+pink particles, 1.4s); `lib/email/welcome.ts` Resend welcome email; auth callback adds `?celebrate=signup` + fires welcome email; home page handles `celebrate=signup` via `<CelebrationTrigger>` in Suspense; `components/ui/ProBadge.tsx` gold star badge + `useProGate()`; `feature_pro_locked` added to GuidanceTrigger union; MIOMIKA.md §4.2 Visual discipline subsection appended. tsc: PASS, lint: 0 errors, build: PASS. | Client-component hardcoded warm phrases (home/page.tsx WELCOME_BUBBLE, TAP_BUBBLE_CYCLE etc.) deferred — require new warmth.ts vectors (Phase 3B cleanup). ProBadge wired to ProBadge.tsx but not yet applied to individual locked-feature card UIs — blocked on Phase 3B teaching loop cards. | Mike: (1) Verify Resend domain at resend.com/domains, (2) Supabase → Auth → Email → disable email confirmations (auto-confirm), (3) Test iPhone: tap mic → allow → speak → transcript appears, (4) Test Android: same, (5) Incognito English browser → English UI, (6) Incognito Thai browser → Thai UI, (7) Guest sign up → confetti + welcome email. |
| 2026-05-22 | Cursor Sonnet 4.5 — Phase 3A-fix-2 | 3A-fix-2 | Forced prompt=select_account on Google OAuth (login + signup); Samsung inline fallback combined Chrome+type hint now 12px always-visible; signup celebration moved to onboarding completion with localStorage one-shot guard; WelcomeScreen shows cream blocking gate while auth resolves so home content never flashes on first visit. tsc: PASS, lint: 0 errors, build: PASS. | n/a | Mike verify on Samsung A52 + new email signup, then Phase 3B |
| 2026-05-22 | Cursor Sonnet 4.6 — Phase 3A-fix | 3A-fix | Logout scope:global + localStorage/sessionStorage clear + hard navigation; useProfile auth-state subscription already wired (no change needed); /profile duplicate "ฉัน Me" header removed from guest branch; bilingual labels already complete (no change); signup CelebrationBurst already wired via CelebrationTrigger + lib/celebration/burst.ts (no change); CompanionButton drift fully intact (no change); single bubble on home confirmed (no change); Samsung Internet fallback already in MicButton (no change); SEO meta expanded: title, description, keywords, authors, metadataBase, openGraph, twitter card, favicon set. tsc: PASS, lint: 0 errors, build: PASS. | n/a | Mike to verify on Samsung A52 + iPhone + desktop incognito, return for Phase 3B |
| 2026-05-22 | Cursor Sonnet 4.6 — Phase 3A-final | 3A-final | Root-cause fix: all .from("users") → .from("profiles") (use-profile.ts, welcome/actions.ts, session-init/route.ts, profile/page.tsx, onboarding/page.tsx — 5 files total); welcome flash gated in (app)/layout.tsx via authReady from useGuestExploration; celebration redirect already at /onboarding completion (router.push('/home?celebrate=signup')); CelebrationTrigger + lib/celebration/burst.ts already wired; Android Chrome voice continuous+restart — recognition.continuous=true, isManualStopRef, hasFinalResultRef, onend auto-restart with manual-stop gate; migration 0011 written (gender + legacy fields backfilled from users_legacy_backup); /MIOMIKA.md v3 with full §11 Codebase Map | n/a | Mike applies 0011 in Supabase, tests all 4 flows on devices, returns for Phase 3B (real teaching brain) |
| 2026-05-22 | Cursor Opus 4.7 — Phase 3A-final-2 | 3A-final-2 | Docs consolidation: `/MASTER-HANDOFF.md` created at project root (founder context, communication style, current state, sharp edges, next-session protocol); `/docs/HOW-TO-START-A-NEW-CHAT.md` created (exact handoff protocol so new Claude chats need only two pasted files); `/docs/archive/README.md` prepended with `⛔ ARCHIVED — DO NOT READ` warning routing future sessions to `/MIOMIKA.md` + `/MASTER-HANDOFF.md`; `MIOMIKA.md §11.0 Top-level documentation` added. Bug fixes: MicButton recognition now logs `[MicButton] recognition.onstart fired` and `[MicButton] recognition.onerror: <code>` so Mike can verify mic flow via Chrome remote DevTools on Samsung A52 (other 7 acceptance criteria — continuous=true, isManualStopRef, onend auto-restart + interim commit, onresult immediate final commit, synchronous handlePress, no-await gesture, amplitude ring — all confirmed in place from Phase 3A-final). Celebration burst: `CelebrationTrigger` in `app/(app)/home/page.tsx` rewritten so `miomika-signup-celebrated-v1` localStorage flag is set AFTER the 2.4s burst completes (was set before — meant a failed dynamic import would silently block future replays), URL is cleaned immediately, `console.log("[home] celebration trigger detected")` added for verification, single setter / single reader confirmed via repo grep. | n/a | Mike: (1) On Samsung A52 Chrome open https://miomika.com/talk → tap mic → speak "hello" → DevTools console should log `[MicButton] recognition.onstart fired` and transcript should commit; (2) brand-new Gmail signup in incognito → complete onboarding → land on `/home` → 2.4s confetti burst visible → reload `/home` → no burst (flag now set); (3) start next chat using `/docs/HOW-TO-START-A-NEW-CHAT.md` protocol with both root docs attached for Phase 3B (real teaching brain, Opus 4.7). |
| 2026-05-22 | Cursor Opus 4.7 — RESET-1 | RESET-1 | Brutal foundation reset: migration 0012 drops `public.users_legacy_backup` permanently + idempotent profiles-column verification + refreshed `handle_new_user` trigger + auth-users backfill + RLS audit. `lib/auth/get-server-profile.ts` is now the single server-side source of truth — `app/api/miomi/route.ts` and `app/api/miomi/session-init/route.ts` no longer trust client-sent `isGuest`/`userId`/`tier`. New canonical route `app/api/auth/post-signup/route.ts` decides redirect destination (`/onboarding` / `/home` / `/home?celebrate=signup`); `app/auth/callback/route.ts` and `app/onboarding/page.tsx` both delegate to it. `useProfile()` now subscribes to `miomika:profile-refresh` events and refetches on `SIGNED_IN` / `TOKEN_REFRESHED` / `USER_UPDATED`. Color migration: every primary CTA in the codebase is now `linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)` honey gold — home, dashboard, talk, error, install prompt, companion sheet/panel, guidance pill, conversion card, word card v3, welcome email; nav active state, brand wordmark, achievement borders, link text on warm surfaces all migrated. Pink retained only in heart fuel icon, ≤8px companion presence dots, sparkle decorations. `lib/design/colors.ts` is the new token surface. Docs v4: `/MIOMIKA.md` §4.2 rewritten with honey-gold tokens + "pink-gradient as primary CTA" added to FORBIDDEN; `/docs/SCHEMA.md`, `/docs/AUTH-FLOW.md`, `/docs/COLOR-SYSTEM.md` created; `/MASTER-HANDOFF.md` rewritten with Mike's real story (Persian, Iran→Thailand, teaching motive at Saint Gabriel's, 25K TikTok, Mikaro income, Phuket/Krabi dream). | n/a — RESET-2 still owed MicButton.tsx + profile page rebuild + final polish pass. CompanionButton listening/speaking presence dots still pink (allowed under ≤8px accent rule, can revisit in RESET-2). | Mike: (1) apply `supabase/migrations/0012_brutal_reset.sql` in Supabase SQL Editor, (2) verify on Vercel preview — login → `/profile` shows Free tier (not guest), (3) verify all primary CTAs are honey-gold not pink on every screen, (4) verify new signup → onboarding → `/home` celebration burst fires once, (5) verify sign-out → sign-in with different account still works, (6) after green, request RESET-2 (MicButton rewrite + profile page rebuild + polish pass). |
| 2026-05-25 | Cursor Composer 2.5 — Session 3.5 | Session 3.5 | Ice-breaker library (12 variants, no consecutive repeats via localStorage) in `lib/voice/warmth.ts`; smarter voice picker in `lib/voice/tts.ts` (Google/Microsoft Online priority, female fallback, per-lang rate/pitch); `/talk` opens with random ice-breaker + auto-TTS at 1.2s; engine prompt mirrors user language level; Premium Voice add-on tier documented in §3. tsc: PASS, lint: PASS, build: PASS. /talk SEALED — Voice INPUT + OUTPUT v1 complete. | n/a | Session 4 from §2.7 (memory / session contract). |
| 2026-05-25 | Cursor Composer 2.5 — Session 3 | Session 3 | Cat speaks: new `lib/voice/tts.ts` (browser TTS, Thai/English female voice priority, `detectLang` + `detectLangSwitchCommand`); `/talk` wired — replies spoken when TTS on, `micState=speaking` during playback (orb AudioWaveform), mic suppressed, tap orb stops mid-sentence; language auto-detected from user transcript (Thai unicode vs Latin) with explicit switch via voice command or Toolbox globe toggle; engine prompt uses `conversationLangRef` for single-language replies; TTS toggle defaults ON, persists `miomika.tts_on` in localStorage. tsc: PASS, lint: PASS (27 warnings), build: PASS. | n/a | Session 4 from §2.7 (memory / session contract). |
| 2026-05-25 | Cursor Composer 2.5 — Session 2-final-7 | Session 2-final-7 | Warm VAD lifecycle in `MicButton.tsx`: stop/tap-off now `pause()` instead of `destroy()`; next tap `start()` on warm instance (instant resume); `killVAD()` retained only for guest lock + unmount. tsc: PASS, lint: PASS (27 warnings), build: PASS. | n/a | Session 3 from §2.7 (voice output / TTS). |
| 2026-05-25 | Cursor Composer 2.5 — Session 2-final-5 | Session 2-final-5 | Clean slate /talk rewrite: MicButton rebuilt with `userIntentRef` as sole VAD gate (no auto-start on re-render; `locked` prop kills active session); MicRow native touch listeners with `passive: false` swipe + always visible in keyboard mode; talk page clean slate (hidden MicButton drives VAD, orb in MicRow, guest hard-lock at 5 exchanges + 800ms sheet on library/AI paths); app layout shell `bg-[#FCFCFA]` for seamless bottom nav blend. tsc: PASS, lint: PASS (27 warnings), build: PASS. | n/a | Session 3 from §2.7 (voice output / TTS). /talk locks for real. |
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

| 2026-05-25 | Cursor Composer 2.5 — MIOMIKA v5 rewrite | Docs v5 | Reframed canonical doc around emotional-companion truth + multi-brain model; preserved all facts, tiers, Voice Laws, build order, commit refs, codebase map, state log; added voice/warmth roadmap, cat SFX list, three-strike caching, screen alignment awareness, §9 not-yet-built priority list. | n/a | Session 4 from §3.1 (memory / session contract). |
| 2026-05-25 | Claude — v6 architecture truth lock | — | Locked five-nav architecture (Home/Dashboard/Talk/Marketplace/Profile) per Mike's spec; locked audience truth (Thai content creators + students primary; English speakers learning Thai secondary); locked subscription cross-cutting principle (Profile = identity + manage, Marketplace = buy, Talk = in-context gating); locked Marketplace scrollable card layout (not carousel); created /docs/architecture/SCREENS.md as anti-drift weapon; created /docs/architecture/ARCHIVE/ system; archived v5 as MIOMIKA-v5-2026-05-25.md | n/a (docs only) | Next: pick first screen rebuild per locked SCREENS.md spec |

---

*End of canonical document v6. If you are a new session: paste this once. Start.*
