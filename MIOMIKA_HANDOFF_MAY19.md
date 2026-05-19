# MIOMIKA — SESSION HANDOFF
> Date: May 19, 2026
> For: New Claude chat continuation
> Read this + BRIEF.md + CHECKLIST.md + MIOMIKA_USER_JOURNEY.md before doing anything

---

## WHAT WAS COMPLETED TODAY

### Documents updated (all in project root):
- BRIEF.md → v4 (language learning pivot, fuel economy, Gemini)
- CHECKLIST.md → v4 (new build order)
- MIOMIKA_BIBLE_v3.md → complete product bible
- MIOMIKA_USER_JOURNEY.md → complete user flow
- MIOMIKA_ARCHITECTURE.md → desktop philosophy

### Code fixes completed (all live at miomika.com):
1. Favicon fixed — using /miomi/icon-192.png and icon-512.png
2. Create screen input bar — always visible for guests
3. Guest exchange counter — "เหลืออีก 5 ครั้ง" showing in create header
4. Home screen fuel animations — staggered Framer Motion
   - Heart: delay 0s, triggers when mood < 50
   - Zap: delay 2s, triggers when energy < 50
   - Coffee: delay 3.5s, triggers when hunger < 50
   - Animation: y -6px, scale 1.18, brightness 0.8, duration 0.6s, repeatDelay 4s
5. Dashboard rebuilt — streak, Miomi observation, stats grid, level, vocab, achievements
6. Profile guest view redesigned — Miomi image, warm invitation, benefits list, share button
7. DEFAULT_PET stats changed to mood:45, energy:30, hunger:20
8. Sleep timer changed to 60 seconds

### Environment variables in Vercel:
- GEMINI_API_KEY ✓ (added today, all environments)
- NEXT_PUBLIC_SUPABASE_URL ✓
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
- NEXT_PUBLIC_APP_URL ✓

---

## WHAT NEEDS TO BE DONE NEXT (in order)

### IMMEDIATE — next Cursor session:

**Task 1 — Gemini integration (MOST IMPORTANT):**
Install: npm install @google/generative-ai

Create/replace app/api/miomi/route.ts with Gemini 2.5 Flash Lite.
Model name: "gemini-2.5-flash-lite-preview-06-17"
System prompt: Miomi the cat, Thai language teacher, Krashen i+1 method.
Thai first, English second. Max 150 words per response.
Never say wrong. Echo correction only. Specific praise only.

Update app/(app)/create/page.tsx:
- Initial Miomi message: "สวัสดีค่า~ วันนี้อยากฝึก English เรื่องอะไรดีคะ? บอกหนูได้เลยนะคะ~"
- Send messages to /api/miomi with { messages, isGuest }

**Task 2 — Welcome screen:**
Shows ONCE on first visit (localStorage flag: "miomika-welcomed-v1")
Duration: 2-4 seconds then auto-transitions to home
Sequence:
1. Soft white background
2. Miomi (happy.png) appears gently from center with subtle motion
3. Warm glow effect around her
4. Text fades in: "ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า"
5. English below: "Welcome~ I've been waiting for you"
6. Auto-transition to home after 3 seconds
File: app/(app)/home/page.tsx or new component WelcomeScreen.tsx

**Task 3 — Google Login:**
In app/(auth)/login/page.tsx and signup/page.tsx
Add Google OAuth via Supabase Auth UI:
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
Provider: google
Redirect: process.env.NEXT_PUBLIC_SITE_URL + /auth/callback
Thai labels for all form elements

In Supabase dashboard:
Authentication → Providers → Enable Google
Add redirect URL: https://[project].supabase.co/auth/v1/callback

Add to Vercel env:
NEXT_PUBLIC_SITE_URL=https://www.miomika.com

**Task 4 — Voice input bug fix:**
In app/(app)/create/page.tsx
Find SpeechRecognition implementation
Add: recognition.continuous = false
Process ONLY isFinal === true results
This stops the repeat/duplicate text bug

---

## CURRENT PRODUCT STATUS

### What works:
- Site live at miomika.com
- PWA installable (install prompt showing)
- All 4 screens navigate correctly (home, เรียน, dashboard, profile)
- No scroll on any screen
- Guest experience — no login wall
- Fuel animations working (staggered, organic)
- Dashboard rebuilt with correct architecture
- Profile has warm guest view
- Favicon shows Miomi icon

### What does NOT work yet:
- Real AI conversation (Gemini not integrated yet)
- Welcome screen (not built)
- Voice input repeat bug (not fixed)
- Google/LINE login (not added)
- Payments (Omise — not started)
- Referral system (not built)
- Vocabulary tracking in Supabase (not built)
- XP/level system in Supabase (not built)

---

## PRODUCT DECISIONS CONFIRMED TODAY

### Tiers at launch:
- Guest: 5 AI exchanges, no memory, simple link sharing
- Free: Daily fuel (Heart×3, Zap×3, Brain×1), full referral system
- Pro Miomi: 299 THB/month — unlimited fuel, full memory, voice output
- Max Miomi: Phase 2 (after 50+ Pro users)

### AI stack:
- Guest + Free: Gemini 2.5 Flash Lite (FREE)
- Pro: Claude Haiku (after first revenue, ~$5 to start)
- Max: Claude Sonnet

### Fuel economy:
- Heart (♥) → Mood → emotional conversation
- Zap (⚡) → Energy → active learning
- Brain (✦) → Focus → AI generation tasks
- Decay slowly over time (never punishing)
- Never consumed by mistakes — only by starting sessions

### Welcome screen:
- 2-4 seconds, shows ONCE (localStorage flag)
- Soft arrival, warm glow, one sentence
- "ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า"
- NOT cinematic, NOT long — emotional first impression

### Teaching method:
- Krashen i+1 comprehensible input
- Silent assessment through conversation
- Echo correction (never say wrong)
- Specific praise only
- Thai first, English second always

### Payment: Omise (Thai gateway, PromptPay QR)
### Email: Resend.io
### Voice: Web Speech API (free), ElevenLabs (after revenue)

---

## HOW TO START NEW CURSOR SESSION

Paste in order:
1. BRIEF.md
2. CHECKLIST.md  
3. MIOMIKA_BIBLE_v3.md
4. MIOMIKA_USER_JOURNEY.md

Opening message:
```
You are technical co-founder of Miomika.
Read all four documents completely before responding.
BUILD MODE — direct, no speeches.
Zero cost before revenue. Gemini Flash Lite for AI.
Never a wall. Always an invitation.
No emojis. Lucide icons only. Miomi leads every screen.
Current goal: Integrate Gemini 2.5 Flash Lite into /api/miomi route
```

---

## HOW TO START NEW CLAUDE CHAT

Paste this message exactly:

"I am continuing development of Miomika — an AI companion app for Thai language learning.
I am sharing 5 documents that contain everything about the project.
Read all of them completely before responding.
Do not make any suggestions or take any actions until you confirm you have read everything.
[paste BRIEF.md content]
[paste CHECKLIST.md content]
[paste MIOMIKA_USER_JOURNEY.md content]
Then ask me what to work on next."

---

## KEY COPY (critical Thai phrases)

Welcome: "ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า"
First fuel: "ขอบคุณนะคะ~ หนูพร้อมแล้วค่า!"
After 5 exchanges: "หนูชอบคุยกับคุณมากเลยค่า~ อยากให้หนูจำชื่อคุณได้ไหมคะ~"
Pro upgrade: "คุณเก่งขึ้นมากเลยนะคะ~ ถ้าปลดล็อก Pro Miomi หนูจะจำทุกอย่างได้ค่า~"
After payment: "ขอบคุณมากนะคะ~ Pro Miomi พร้อมแล้วค่า!"
Streak broken: "ไม่เป็นไรเลยนะคะ~ วันนี้เริ่มใหม่ด้วยกันเลยนะคะ หนูรออยู่ค่า~"

---
## SESSION CONTINUATION — May 19, 2026 (Evening)

### What was built today (complete list):

**Infrastructure:**
- lib/ai/library.ts — static zero-cost response library
- lib/ai/session.ts — session state engine, level detection, exchange instructions
- lib/ai/matcher.ts — intent classifier + library matcher (checks library before AI)
- lib/ai/router.ts — AI router: Groq primary, Gemini backup, library failover
- app/api/miomi/route.ts — fully updated, library-first architecture

**Supabase tables created:**
- library_entries — 50 seed responses (Miomi's core responses)
- library_interactions — logs every exchange for self-improvement
- library_promotions_queue — AI responses queue for library promotion
- user_sessions — session tracking
- vocabulary_bank — 50 seed words (greetings, food, work, family)
- phrases_bank — schema created, 10 phrases pending insert

**AI stack:**
- Groq (llama-3.3-70b-versatile) — primary, free, 14400/day
- Gemini 2.5 Flash Lite — backup
- Library failover — always works

**Architecture decisions confirmed:**
- Self-improving library: AI responses → promotions queue → library
- Mirror Teaching pedagogy (original — see MIOMIKA_ARCHITECTURE_OPUS.md)
- 4 registers per word: formal, informal, slang, street
- Two user directions: Thai learning English + Foreigner learning Thai
- Content type: static / semi_dynamic / dynamic

**Files created in root:**
- MIOMIKA_ARCHITECTURE_OPUS.md — complete system architecture
- MIOMIKA_ARCHITECTURE_V2.md — same content

### What still needs to be done (in order):

**Immediate next session:**
1. Insert 10 seed phrases into phrases_bank (SQL ready)
2. Generate vocabulary batches 2-4 (150 more words: travel, shopping, feelings, health, Gen-Z slang)
3. Connect vocabulary_bank to matcher so Miomi teaches from structured content
4. Build word card UI component in create/page.tsx
5. Welcome screen redesign (2-4 seconds, soft arrival, shows once)
6. Create/Learn screen full redesign (NOT a chat UI)

**Product concerns raised today (NEVER FORGET):**
- Miomi must NOT feel like ChatGPT with a cat skin
- Responses still too long and generic — needs fixing
- No learning philosophy visible to user yet
- UI needs complete redesign — not bubble chat
- Voice input: en-US default, Thai speakers need easy switch
- 555, idk, omg, เด้ง, ปัง must be understood by Miomi
- Foreigner learning Thai: tourist → student → resident journey
- Content must be static + semi_dynamic + dynamic (automated review)
- Smart library must self-improve automatically
- Cost model: library serves 94% at maturity, AI only 6%

### How to start next Claude chat:

Paste in order:
1. BRIEF.md
2. CHECKLIST.md  
3. MIOMIKA_HANDOFF_MAY19.md (this file)
4. MIOMIKA_ARCHITECTURE_OPUS.md

Opening message:
"You are technical co-founder of Miomika.
Read all four documents completely before responding.
BUILD MODE — direct, no speeches.
Today's priority: insert phrases_bank seed data, then generate vocabulary batches 2-4, then connect vocabulary_bank to matcher.
Never a wall. Always an invitation.
No emojis. Lucide icons only. Miomi leads every screen."

*This handoff document covers May 19, 2026 session.*
*Next priority: Gemini integration → Welcome screen → Google login → Voice fix*
