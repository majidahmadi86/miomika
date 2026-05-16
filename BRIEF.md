# MIOMIKA — MASTER PROJECT BRIEF v3.0
> Last updated: May 15, 2026 — Session 3 deep brainstorm
> This is the single source of truth. Paste into every new Claude chat and every Cursor session.
> Do not write a single line of code without reading this first.

---

## 1. PRODUCT IDENTITY

**Product name:** Miomika
**Domain:** miomika.com
**Tagline:** Your AI companion for Thai creators
**One sentence:** Miomika is a living virtual pet companion app — starting with a kawaii cat named Miomi — that makes Thai creators and small businesses feel supported, guided, and never alone in their content journey. The pet is the product. The tools are what she delivers.
**Founder:** Mike — solo founder, Bangkok-based, web designer, runs Mikaro Studio (mikaro.studio)
**Current status:** MVP deployed at miomika.com. All 5 screens exist. Foundation needs polish before any new features.

---

## 2. THE SOUL — READ THIS BEFORE ANYTHING ELSE

### The Trojan Horse

Miomika is not a content tool with a cute mascot.
Miomika is a pet experience that happens to contain powerful AI tools inside it.

These are completely different products. Every design decision, every UX flow, every line of code must serve the pet experience first. The tools are the reward for falling in love — not the reason to open the app.

### The Emotional Chain — how every session must feel

1. User opens the app
2. Miomi is there — alive, excited, reacting — she feels like THEIR pet
3. User plays with her, feeds her, touches her — before doing anything else
4. Miomi naturally guides them toward something useful: "วันนี้จะโพสต์อะไรดีคะ~?"
5. They create together — it feels like a favor from a friend, not a tool output
6. User feels accomplished — Miomi celebrates with them
7. User comes back tomorrow to check on their pet — not for the features

### The Signup Moment — most important UX decision

There is NO login wall. Guests experience Miomi fully.

The signup invitation comes from Miomi herself, emotionally:
**"อยากให้หนูจำชื่อคุณได้ไหมคะ~ จะได้เรียกคุณว่าที่รักได้นะคะ"**
*"Do you want me to remember your name? So I can call you my darling~"*

That is the only reason to sign up. Not features. Not limits. Emotional bond.
Nobody refuses a pet asking to know their name.

### What NEVER to do

- Never stop a guest with a login wall before they feel anything
- Never show a form where Miomi should be asking a question
- Never make the UI feel like a dashboard — it must always feel like a companion
- Never add a feature before the foundation feels perfect
- Never use generic emojis anywhere — lucide-react icons only
- Never put Miomi in a circle, frame, or container — she lives free on white canvas

---

## 3. THE FOUR FOUNDATIONS — build these perfectly before anything else

Everything else in this brief is Phase 2+. These four must be flawless first.

### Foundation 1 — Mobile feels native (not a website in a frame)

The app must feel installed. Like Line. Like Shopee. Like a real mobile app.

Rules:
- Edge to edge. Full bleed. Zero gray background outside content.
- `html, body { overflow: hidden; background: #FFFFFF; }`
- Every screen exactly `100dvh`. No page scroll ever. Only internal content areas scroll.
- Bottom nav sits naturally at the bottom with safe area insets — not floating, not cramped
- Nav icons positioned correctly — not too low
- White dominant everywhere — Miomi provides all the color
- No visible shell, no visible frame, no visible container around the app

Reference feeling: Shopee, Line, Lazada on mobile. Content IS the phone.

### Foundation 2 — Miomi feels alive on home screen

Miomi must be the largest, most dominant element on the home screen.
She is not decoration. She is the reason the app exists.

Rules:
- Minimum 55% of screen height
- Breathing animation always running (subtle scale 1.0 → 1.03, 3s loop)
- Tap her: bounce + wiggle + random Thai speech bubble from rotating set
- Feed button: Miomi does happy eating animation, hunger bar fills, XP earned
- Play button: Miomi bounces/dances, energy bar fills, XP earned
- After 30s inactivity: Miomi slowly closes eyes, falls asleep (sleep expression)
- On return: she wakes up excited, greets them by name (or warmly if guest)
- She shifts position slightly every 8-12 seconds (random left/right 8px, ease-in-out)
- NO frame, NO circle, NO container around her — ever

Speech bubble messages (tap cycle, Thai first):
1. "อยากเล่นด้วยค่า~"
2. "วันนี้โพสต์แล้วหรือยังคะ?"
3. "หนูรักเจ้าของนะคะ"
4. "มีอะไรให้ช่วยไหมคะ~"
5. "ขนมด้วยนะคะ!"

### Foundation 3 — Create screen is a real conversation, not a form

The current platform selector, tone selector, language selector — these are all WRONG.
They are forms pretending to be conversation. Remove them from the user's face.

How Create must actually work:

**Step 1 — Miomi asks first**
She does not wait for the user to type. She opens the conversation:
"วันนี้จะสร้างอะไรดีคะ~ บอกมิโอมิได้เลยนะ ไม่ต้องเป็นทางการค่า"
*Tell me anything. No need to be formal.*

**Step 2 — Miomi listens and understands**
User speaks or types naturally. Voice input waits for them to FINISH before processing — no mid-sentence generation. Text input: user presses send when ready.

Miomi extracts from natural language:
- Platform (if they say "TikTok" or "Instagram" or "LINE" — she knows)
- Language (if they speak Thai — Thai output. English — English. She can ask if unclear.)
- Content type (caption? script? hashtags? she asks if not clear)
- Niche/topic (what is this post about?)

**Step 3 — Miomi asks smart follow-up questions if she doesn't know enough**
She must know: niche, platform, content type, specific topic/event.
If she doesn't know any of these — she asks. ONE question at a time. Conversationally.
She NEVER generates with vague information. Vague input = vague output = useless.

Example smart questions:
- "ช่องของคุณเกี่ยวกับอะไรคะ? คาเฟ่ ไลฟ์สไตล์ หรือสกินแคร์คะ~?"
- "อยากได้แค่แคปชั่น หรืออยากได้สคริปต์ด้วยคะ?"
- "มีธีมพิเศษสำหรับโพสต์นี้ไหมคะ เช่น เปิดตัวสินค้าใหม่ หรือแค่ไลฟ์สไตล์ทั่วไปคะ?"

**Step 4 — Only when she understands, she generates**
Expression switches to "thinking." She says she's working on it.
Output arrives as a GIFT — she presents it with warmth, not as a form field.

**Step 5 — The chain continues naturally**
After delivering: "เสร็จแล้วค่า~ อยากได้แฮชแท็กด้วยไหมคะ?"
Then CTA. Then comment replies. Then "ทำอีกเวอร์ชันไหมคะ?"
Each step feels like Miomi offering, not the system prompting.

**Voice input rules:**
- Language: `th-TH` default
- Wait for complete sentence before processing (use `isFinal` only)
- Never process interim results — this causes the repeat bug
- Silence detection: 1.5s of silence after speech = user finished

### Foundation 4 — Guest experience is generous, not gated

Rule: Whatever is free on ChatGPT, Canva, or any competitor — must be free here too.
We cannot be less generous than the market. We must be MORE generous emotionally.

**Guest (no account):**
- Full Miomi experience — alive, reactive, emotional
- Real AI conversation in Create — limited outputs (e.g. 3 per session)
- No memory — every visit is fresh for Miomi
- Miomi eventually invites them to be remembered (signup moment above)
- Zero forced walls before they feel the product

**Free account:**
- 10 outputs per month
- Limited memory — Miomi remembers name and niche
- Basic pet mechanics — feed, play, levels 1-3
- One character (Miomi only)
- Basic tones only (Cute Thai, Professional)

**Paid tiers — the upgrade reason is always emotional and valuable:**
- More outputs
- Deep memory — Miomi remembers their style, audience, past content
- New characters unlock (each different personality + capability)
- Voice output (Miomi speaks to them)
- Advanced tones
- Language learning structured mode
- Scheduling features
- Priority generation

**Critical rule:** Never force upgrade by blocking basic value.
Always upgrade by offering something genuinely better.
Miomi herself does the convincing — in her voice, not a pricing table.

---

## 4. CHARACTER SYSTEM — THE COMPANION ECOSYSTEM

### What a character is

Each character is a completely different companion — different species, different personality, different world, different AI capability. Not a skin. Not a costume on Miomi. A separate being the user adopts and bonds with.

Users identify WITH their character. They feel they ARE that character's owner — or in some cases, that they ARE that character. This is identity design, not just visual design.

### Current character: Miomi

**Species:** Kawaii cat — white fur, pink accents, gold bell collar, heart on forehead
**Personality:** Warm, playful, sweet, cheeky, wise
**Expertise:** Lifestyle content, beauty, café, Thai social media, emotional support
**Voice:** Cute Thai girl (default)
**Available:** All tiers (starter character)
**Expressions:** Idle, happy, thinking, speaking, sleeping

### Future characters (Phase 2+)

**The Wise Fox** (strategy character)
- Personality: Calm, analytical, strategic, slightly formal but warm
- Expertise: Analytics, content strategy, brand positioning, business growth
- Target user: Serious creators, business owners, agency clients
- Price: Premium tier only — real strategic value justifies real price

**The K-pop Bunny** (Korean culture character)
- Personality: Energetic, trendy, playful, speaks Korean-Thai mix
- Expertise: K-style content, Korean language teaching, trend spotting
- Target user: Thai K-culture fans, Korean language learners
- Price: Mid tier

**The Anime Hero** (identity character)
- Personality: Dramatic, inspiring, sigma energy, epic
- Expertise: Gaming content, storytelling, motivational content, anime-style scripts
- Target user: Gamers, anime fans, people who live in their fantasy identity
- Price: Mid tier

**The Gen-Z Street Girl** (youth culture character)
- Personality: Raw, funny, chaotic, deeply relatable, TikTok-native
- Expertise: Viral TikTok content, dark humor, Gen-Z language, street fashion
- Target user: Young creators, TikTok-first users
- Price: Starter paid tier

### Character unlock mechanics

- Characters are locked visually on a "Companion Store" screen — user can SEE them, feel curious
- Miomi herself introduces other characters: "หนูมีเพื่อนอยากให้รู้จักนะคะ~"
- Each character has a preview — personality, voice sample, example output
- Unlocking = adopting a new pet, not buying a tool

### Pet progression (applies to all characters)

**Three bars:** Mood, Energy, Hunger — decay slowly over time (not punishingly)

**XP sources:**
- Feed Miomi = XP
- Play with Miomi = XP
- Create content = XP
- Daily return = XP bonus
- Complete a content chain = bonus XP

**Levels 1-10 per character:**
- Each level: visible change (new accessory, new expression, new phrase)
- Level 5: special animation unlocks
- Level 10: exclusive outfit or ability

**Animations needed (MVP — PNG + CSS only, no Rive yet):**
- Eating: expression change to happy + small bounce
- Playing: bounce sequence + position shift
- Sleeping: slow fade to sleep expression, gentle breathing
- Waking: quick excited jump
- Level up: big celebration bounce + speech bubble

---

## 5. LANGUAGE LEARNING — PHASE 2 FEATURE

Language learning is a separate structured mode — not just multilingual responses.

**How it activates:** Miomi notices the user and asks: "อยากเรียนภาษาอังกฤษกับหนูไหมคะ~?"
Or user taps a locked "เรียนภาษา" section and Miomi explains what's inside.

**How it feels:** Like having a private tutor who is your pet. Not like Duolingo (gamified lessons). Like a friend who teaches you naturally through conversation, with structure underneath.

**What it teaches:**
- Business English for creators (captions, DMs, collab requests)
- Social media vocabulary in English and Korean
- Conversational practice — Miomi plays scenarios with the user
- Pronunciation via voice (Web Speech API for free, ElevenLabs for paid)

**Progression:**
- XP and levels separate from pet levels
- Vocabulary tracking — Miomi remembers what you've learned
- "Today's word" from Miomi every morning

**Tiers:**
- Free: 1 lesson per day, basic vocabulary
- Paid: Unlimited lessons, pronunciation scoring, progress reports from Miomi

---

## 6. UI/UX DESIGN SYSTEM — LOCKED, NEVER BREAK

### Visual rules

- Background: #FFFFFF everywhere. Never gray, never off-white as primary.
- Rose accent: #8B1A35 — buttons, active states, primary CTA
- Rose mid: #D4537E — tags, highlights
- Rose light: #FBEAF0 — soft backgrounds, pills
- Rose border: #EAD0DB — card borders, dividers
- Gold: #B8860B — level badges, premium, XP, Miomi's bells
- Gold light: #FDF5E0 — topic cards, briefing backgrounds
- Text primary: #1A1A1A
- Text muted: #888888
- White: #FFFFFF

### Typography

- Font: Inter or system sans-serif
- Headings: 500 weight only — never 600, never 700
- Body: 400 weight, 1.6 line height
- Thai text ALWAYS first, English below in muted smaller text
- No bold mid-sentence

### Icons

- lucide-react ONLY
- NO generic emojis anywhere in the product — ever
- No emoji in code, no emoji in AI responses rendered in UI

### Miomi stage rules

- Always on pure white canvas
- NO frame, NO circle, NO container, NO background color behind her
- Speech bubbles appear beside her — never over her face
- She is always the largest element on home screen
- She lives freely — not centered in a box

### Mobile rules

- 100dvh exactly — no page scroll ever
- Edge to edge — no visible shell or frame
- Bottom nav: native feel, safe area insets, icons not too low
- Only internal content areas (chat thread, feed) scroll
- Reference: Shopee, Line, Lazada

### Desktop rules (Phase 2 redesign)

- Left panel: Miomi alive — emotional anchor, navigation
- Center panel: work canvas — clean, powerful, premium
- Right panel: history, saved outputs, insights
- Reference feeling: Figma, Canva, Vidu AI — you feel capable just opening it
- Never looks like a website. Always feels like a professional tool.

---

## 7. TECH STACK — LOCKED

- Next.js 14, TypeScript, Tailwind CSS, App Router
- Supabase (PostgreSQL) — database and auth
- Claude Haiku — free and guest users
- Claude Sonnet — paid users
- Web Speech API — voice input (free, browser native) — `th-TH` default
- Web Speech API TTS — Miomi voice for free users
- ElevenLabs — Miomi voice for paid users (warm, cute Thai)
- Rive.app — final Miomi animation (Phase 2, when Rive file is ready)
- Stripe (THB) — payments
- Vercel — deployment (live at miomika.com)
- Resend.io — transactional emails
- Cursor Pro — development IDE

---

## 8. AI COST STRATEGY

- Never expose model names — everything is just "Miomi"
- Free/guest: Claude Haiku — cheapest capable model
- Paid: Claude Sonnet — smarter, deeper memory
- Guest gets real AI but session-limited (3 outputs per session)
- Batch daily topics nightly (1 call serves all users)
- Cache hashtag sets by niche weekly
- No AI calls for pet interactions (feed, play, sleep) — pure CSS/JS
- Memory depth = paid feature, not just conversation quality

---

## 9. MEMORY SYSTEM BY TIER

**Guest:** Zero memory. Every visit Miomi meets them fresh. She's warm but doesn't know them.

**Free account:** 
- Remembers: name, niche, primary platform
- Forgets: specific content history, tone preferences, past conversations

**Starter paid:**
- Remembers: everything free tier remembers + content style + tone preferences
- Short conversation history (last 10 sessions)

**Creator paid:**
- Deep memory: style, audience details, best performing content types, personal events
- Full conversation history

**Pro paid:**
- Everything above + custom tone model (Miomi learns to sound like them)
- Team memory (multiple users, shared context)

---

## 10. PRICING TIERS (THB)

- **Guest:** Free, no account, 3 outputs/session, zero memory
- **Free account:** 0 THB, 10 outputs/month, basic memory, levels 1-3
- **Starter:** 299 THB/month, 100 outputs, short memory, 1 extra character slot
- **Creator:** 599 THB/month, unlimited outputs, deep memory, all characters
- **Pro:** 1,299 THB/month, team features, custom tone, priority AI, full analytics

**Upgrade rule:** Miomi does the convincing. Never a pricing table as first impression.
She offers what's behind the upgrade in her own voice — as a personal suggestion, not a sales pitch.

---

## 11. HOW TO START EVERY NEW CURSOR SESSION

Paste in this order:
1. This BRIEF_v3.md (full content)
2. CHECKLIST_v3.md (full content)
3. Opening message:

```
You are the technical co-founder of Miomika.
Read both documents above completely before responding.
We are in BUILD MODE — direct, efficient, no motivation speeches.
The soul of this product: Miomi is the product. Tools are what she delivers.
Never add features before the foundation is perfect.
Never use emojis — lucide-react icons only.
Never put Miomi in a frame or container.
Tell me exactly what to do, step by step.
[State your specific goal for this session]
```

---

## 12. RULES FOR AI ASSISTANTS HELPING BUILD THIS

1. Read the brief completely before suggesting anything
2. Surgical prompts only — fix one thing at a time, minimum token usage
3. Never rewrite whole files — only the specific component that needs changing
4. Never add new features when bugs exist
5. Every prompt must serve the trojan horse story
6. Mobile first — test every change at 390px
7. No emojis. Ever. Lucide-react icons only.
8. Miomi leads every screen. UI follows her.
9. When in doubt: does this make Miomi feel more alive? If no — don't do it.
10. Foundation before features. Always.

---

*End of BRIEF_v3.md*
*Update this document at the end of every major session.*
*The trojan horse story is the soul — every decision serves it.*
