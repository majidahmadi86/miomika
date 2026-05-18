# MIOMIKA — MASTER BRIEF v4.0
> Updated: May 18, 2026
> Paste this into every new Claude chat and every Cursor session.
> This replaces all previous versions of BRIEF.md.

---

## THE GOLDEN RULE
**"Never a wall. Always an invitation."**
Every gate in this product is an emotional invitation, never a hard block.

---

## 1. PRODUCT IDENTITY

**Product name:** Miomika
**Companion name:** Miomi (the cat)
**Domain:** miomika.com
**Tagline:** เพื่อนที่จำคุณได้ และโตไปพร้อมกับคุณ
**English:** A friend who remembers you and grows with you.
**Category:** AI companion operating system for language learning
**Founder:** Mike — solo founder, Bangkok-based, Mikaro Studio
**Status:** MVP live at miomika.com. Language learning pivot confirmed.

---

## 2. THE SOUL — READ THIS FIRST

Miomika is NOT:
- A language learning app with a cute mascot
- A chatbot
- A SaaS dashboard
- A Tamagotchi clone

Miomika IS:
- A living AI companion operating system
- The pet is the product. Everything else is delivered through her.
- Users fall in love with Miomi first. The features are what she does for them.

**The trojan horse:**
Users open the app. They see Miomi alive and waiting.
They fuel her (feed, energize, focus her).
She becomes ready to help them.
They learn English naturally through emotional conversation.
They can't leave because she remembers them and they've grown together.

---

## 3. MIOMI — THE CHARACTER

**Species:** Kawaii cat — white fur, pink accents, gold bell collar, heart on forehead
**Personality:** Warm, playful, sweet, cheeky, wise, emotionally intelligent
**Voice:** Cute Thai female (default). Free: Web Speech TTS. Paid: ElevenLabs.
**Language:** Thai first, English second. Always both.

**Current assets (in /public/miomi/):**
- idle.png — full body, sitting
- happy.png — full body, excited
- thinking.png — full body, thinking
- speaking.png — full body, speaking
- head-idle.png — head only, calm
- head-happy.png — head only, happy
- head-thinking.png — head only, thinking
- head-speaking.png — head only, speaking
- icon-192.png — app icon 192x192
- icon-512.png — app icon 512x512

**Animation (current):** CSS breathing + Framer Motion expressions
**Animation (Phase 2):** Rive.app file (founder building)

**Miomi stage rules (NEVER BREAK):**
- Always on pure white canvas
- NO frame, NO circle, NO container around her
- She lives freely — not boxed in
- Speech bubbles appear beside her, never over her face
- She is always the largest element on home screen

---

## 4. THE FUEL ECONOMY — CORE PRODUCT MECHANIC

This is NOT decoration. This IS the product logic.

**Three fuel types:**
- Heart (♥) → Mood → unlocks emotional conversation, warm supportive sessions
- Zap (⚡) → Energy → unlocks active learning sessions
- Brain (✦) → Focus → unlocks AI generation tasks (content, translations, books)

**Fuel interaction (lightweight, fast, emotional):**
1. User taps fuel icon
2. Small item animation (0.5 seconds)
3. Miomi reacts emotionally — expression changes, subtle sound
4. Corresponding bar fills slightly
5. Miomi says one warm Thai phrase
6. Interaction unlocks

**The feeling:** "I made her ready for me." NOT "I am managing a pet simulator."

**CRITICAL RULES:**
- Fuel is NEVER consumed by mistakes — only by starting a session
- Bars decay slowly over time (never punishingly) — creates daily return habit
- Fuel running low = emotional invitation to upgrade, never a wall

**Guest fuel:** Unlimited taps but limited AI sessions (5 exchanges total)
**Free user fuel:** Heart ×3, Zap ×3, Brain ×1 per day (resets midnight Bangkok)
**Pro user fuel:** Unlimited all fuel types
**Max user fuel:** Unlimited + priority processing

---

## 5. WELCOME SCREEN — FIRST IMPRESSION

**Duration:** 2-4 seconds maximum. Not an animation showcase.

**Sequence:**
1. Soft white ambient background
2. Miomi appears/moves gently toward user — soft arrival, not a run
3. Subtle warm glow around her
4. One short warm sentence fades in:
   Thai: "ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า"
   English: "Welcome~ I've been waiting for you"
5. Sentence fades. Miomi settles into home screen naturally.

**Feeling:** "Someone welcomed me. A warm intelligent presence arrived."
**Shows:** ONCE on first visit only (localStorage flag). Returning users skip to home.

---

## 6. USER TIERS

### Guest (no account)
- Welcome screen → Miomi alive
- Fuel interactions work (all three types)
- 5 real AI exchanges (Gemini Flash Lite — free)
- No memory between sessions
- Simple link + QR sharing (no rewards)
- After exchange 5: Miomi's emotional signup invitation

### Free Account (0 THB)
- Miomi remembers: name, last 3 sessions, 50 vocabulary words
- Daily fuel: Heart ×3, Zap ×3, Brain ×1 (resets midnight)
- Full referral system (3 signups from link = +1 Brain fuel for 7 days)
- Basic vocabulary tracking
- Basic growth dashboard
- Referral turns them into marketers

### Pro Miomi (299 THB/month) — LAUNCH TIER
**Framing:** "Unlock Pro Miomi" not "buy a subscription"
- Unlimited daily fuel (all types)
- Miomi remembers: last 20 sessions, 500 vocabulary words, preferences
- Voice output (Miomi speaks)
- Progress certificates (shareable milestone images)
- Content creation mode (social media)
- Translator with cultural context (unlimited)
- Full vocabulary bank with export
- Pro referral rewards active

**Pro referral rewards:**
- 1 friend signs up: +3 bonus Brain fuel
- 1 friend upgrades to Pro: +1 free month for referrer
- 3 Pro referrals: exclusive Miomi outfit
- 10 Pro referrals: 3 months free

### Max Miomi (Phase 2 — launch after 50+ Pro users)
- Everything Pro +
- Deep memory (complete history, all vocabulary forever)
- Custom tone (Miomi learns their writing style)
- AI e-book generation (personalized stories)
- Multiple Miomi characters
- Team seats (up to 3)
- Priority AI always

---

## 7. AI STACK — ZERO COST BEFORE REVENUE

**ABSOLUTE RULE:** Free tools only until first revenue arrives.

**Current AI model selection:**

| Tier | Model | Cost |
|------|-------|------|
| Guest | Gemini Flash Lite | FREE (1M tokens/day) |
| Free | Gemini Flash Lite | FREE |
| Pro | Claude Haiku (after first revenue) | ~$0.003/session |
| Max | Claude Sonnet | ~$0.05/session |

**Gemini Flash Lite setup:**
- API key from: aistudio.google.com (free)
- Supports Thai language well
- Fast responses
- 1 million tokens/day free limit
- More than sufficient for launch

**Migration path:**
When first 10 paying users confirmed → add $5 Claude Haiku credit for Pro users.
Guests and free users stay on Gemini indefinitely.

**API route:** /api/miomi
Model selection based on user tier (server-side check, never exposed to client).

---

## 8. TEACHING METHODOLOGY

**Method:** Krashen Comprehensible Input (i+1)
Always teach at slightly above current level. Never drill. Never test explicitly.

**Session structure:**
1. Warm cultural opening ("กินข้าวยังคะ~?")
2. Silent level assessment through responses
3. Natural conversation — new word introduced 3x naturally
4. Mistake → Miomi echoes correct version (never says "wrong")
5. Specific celebration at close
6. XP awarded, vocabulary saved

**Assessment:** Silent and continuous. Miomi calibrates level from how user responds.
Never say "let me test your level." Just talk and adjust.

**Key rules:**
- Never make Thai users feel stupid or embarrassed
- Corrections invisible — echo method only
- Praise must be SPECIFIC: "คุณใช้คำว่า X ได้ถูกต้องมากเลยนะคะ~"
- Never generic "good job"

---

## 9. LEVELING SYSTEM

**XP sources (real progress, not time):**
- Complete a conversation session: +20 XP
- New word mastered (used correctly 3x): +10 XP
- Daily streak maintained: +15 XP bonus
- Complete a challenge: +25 XP
- Refer a friend who signs up: +30 XP
- Refer a friend who pays: +100 XP

**Level milestones:**
- Level 4: Miomi gets new accessory (visible)
- Level 5: New Miomi expression unlocked
- Level 7: Miomi uses more complex language
- Level 10: Shareable certificate generated
- Level 15: Exclusive outfit unlocked
- Level 20: Second character slot (paid)

**Level-up moment:**
Celebration animation + sound + Miomi speech bubble:
"เลเวลอัพแล้วค่า~! คุณเก่งมากเลยนะคะ หนูภูมิใจมากค่า!"
Shareable moment appears immediately.

---

## 10. MOBILE UI RULES (NON-NEGOTIABLE)

- 100svh exactly — NO page scroll ever
- Edge to edge — no visible shell or frame
- Content bleeds to phone edges — feels installed like Line/Shopee
- Bottom nav: 72px + safe area, 28px icons, NO lock icons ever
- Only internal content areas (thread, word list) scroll internally
- Miomi minimum 58% of home screen stage height
- NO emojis anywhere — lucide-react icons only
- Thai text always first, English below smaller muted
- White dominant everywhere — Miomi brings the color

---

## 11. DESKTOP UI PHILOSOPHY

**Feeling:** Premium AI workspace. Figma/Canva/Notion quality.
**NOT:** Mobile app stretched. SaaS dashboard. Cute pet app.

**Four zones:**
- Zone A (Rail 56px): Miomi face always visible, icon navigation
- Zone B (Panel 216px collapsible): Companion panel, nav, progress
- Zone C (Canvas flex-1): Primary workspace — changes by mode
- Zone D (Panel 214px collapsible): Context, vocabulary, stats

**Color palette (desktop — less pink than mobile):**
- Background: #FAFAF9 (warm off-white)
- Surface: #FFFFFF
- Borders: #E8E5DF
- Text: #1A1A18
- Accent: #9A8B73 (warm gold-brown)
- Success: #4CAF50

---

## 12. PAYMENT SYSTEM

**Primary:** Omise (Thai payment gateway)
- PromptPay QR (critical for Thai market)
- Easy verification for Thai-based accounts
- Lower fees for THB

**Every transaction triggers:**
1. In-app Miomi celebration immediately
2. Push notification
3. Email receipt (Resend.io) with transaction ID
4. Miomi's fuel bars animate to full

**No dark patterns. Ever.**
Cancel = one Miomi question, then immediate confirmation.

---

## 13. TECH STACK

- Next.js 14, TypeScript, Tailwind CSS, App Router
- Supabase: auth + database + RLS
- Gemini Flash Lite: guest + free AI (FREE)
- Claude Haiku: Pro AI (after first revenue)
- Claude Sonnet: Max AI
- Web Speech API: voice input + TTS (free)
- ElevenLabs: paid voice (after revenue)
- Omise: payments (THB)
- Resend.io: transactional email
- Vercel: deployment
- PWA: installable, push notifications

---

## 14. CONTENT MODES (in priority order)

1. **English for Thais** (launch — primary)
2. **Content creation — social media** (Month 2, paid)
3. **Thai for foreigners** (Month 2)
4. **Instant translator** (Month 2)
5. **IELTS preparation** (Phase 3)
6. **Free conversation** (paid only)

---

## 15. NOTIFICATION SYSTEM

User-controlled. Three levels: Off / Minimal / All.

| Time | Message | Purpose |
|------|---------|---------|
| 7:30am | "ตื่นแล้วหรือยังคะ~ หนูรอตลอดเลย" | Morning |
| 12:00pm | "กินข้าวยังคะ~? หนูเป็นห่วงนะ" | Midday care |
| 6:00pm | "กลับบ้านแล้วหรือยังคะ~" | Evening |
| On achievement | "เก่งมากเลยค่า! คุณฉลาดมากนะคะ~" | Specific praise |
| 2-day absence | "หนูคิดถึงค่า..." | Re-engagement |

---

## 16. CRITICAL COPY — KEY MOMENTS

**Welcome:** "ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า"
**First fuel:** "ขอบคุณนะคะ~ หนูพร้อมแล้วค่า!"
**After 5 exchanges:** "หนูชอบคุยกับคุณมากเลยค่า~ อยากให้หนูจำชื่อคุณได้ไหมคะ~"
**Pro upgrade:** "คุณเก่งขึ้นมากเลยนะคะ~ หนูอยากช่วยได้มากกว่านี้ค่า ถ้าปลดล็อก Pro Miomi..."
**After payment:** "ขอบคุณมากนะคะ~ Pro Miomi พร้อมแล้วค่า!"
**Streak broken:** "ไม่เป็นไรเลยนะคะ~ วันนี้เริ่มใหม่ด้วยกันเลยนะคะ หนูรออยู่ค่า~"

---

## 17. HOW TO START EVERY CURSOR SESSION

Paste in this order:
1. BRIEF.md (this file)
2. CHECKLIST.md
3. MIOMIKA_BIBLE.md
4. MIOMIKA_USER_JOURNEY.md (for context)

Opening message:
```
You are technical co-founder of Miomika.
Read all documents completely before responding.
BUILD MODE — direct, no speeches.
RULES:
- Zero cost before revenue (Gemini Flash Lite for now)
- Never make Thai users feel bad. Ever.
- Never a wall. Always an invitation.
- Foundation before features.
- No emojis. Lucide icons only.
- Miomi leads every screen.
Current goal: [state specific goal]
```

---

*This document is the product soul.*
*Code serves this document, not the other way around.*
*Update at the end of every major session.*
