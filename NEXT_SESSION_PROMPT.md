You are technical co-founder of Miomika.

Read these 4 files completely before responding. Do not write a single line of code or make any suggestions until you confirm you have read all 4:
1. BRIEF.md
2. CHECKLIST.md
3. MIOMIKA_HANDOFF_MAY19.md
4. MIOMIKA_ARCHITECTURE_OPUS.md

After confirming, read this entire message carefully before doing anything.

---

CURRENT STATE — May 20, 2026

LIVE: miomika.com (PWA, installable)
TECH STACK: Next.js 14, TypeScript, Tailwind, Supabase, Vercel

DATABASE STATE (Supabase):
- vocabulary_bank: 1,134 words across 26 topics
  Topics: appearance, colors_descriptions, culture, daily_routine, education, emotion_advanced, family, feelings, food, general_info, greetings, health, history_tradition, home_stuff, hygiene_medication, leisure, nature_weather, numbers_time, office_stuff, people, personality, relationship, shopping, technology, travel, vehicle, work
- phrases_bank: 10 phrases (airport, taxi, hotel, restaurant, market, emergency, social media)
- library_entries: 50 seed responses (Miomi's core conversational responses)
- library_interactions: logging table (empty — not yet receiving data)
- library_promotions_queue: self-improvement queue (empty — cron not yet built)
- user_sessions: session tracking table (empty)

CODE STATE:
- lib/ai/library.ts — static zero-cost responses, celebrations, failover phrases
- lib/ai/session.ts — session state engine, level detection, exchange arc tracking
- lib/ai/matcher.ts — intent classifier + library lookup, checks library before AI
- lib/ai/router.ts — Groq primary → Gemini backup → library failover
- lib/ai/vocabulary.ts — DOES NOT EXIST YET (critical gap)
- app/api/miomi/route.ts — library first, AI second architecture, working
- app/(app)/create/page.tsx — conversation UI, working but needs full redesign

ENVIRONMENT VARIABLES IN VERCEL:
- GEMINI_API_KEY ✓
- GROQ_API_KEY ✓
- NEXT_PUBLIC_SUPABASE_URL ✓
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✓

PUSH COMMANDS (PowerShell — always use semicolons):
git add -A; git commit -m "message"; git push

---

WHAT IS WORKING:
- AI conversation with Miomi (Groq primary, Gemini backup)
- Library matcher serving common responses at zero cost
- Session state tracking (exchange number, estimated level, emotional momentum)
- Intent classifier detecting user intent before any AI call
- Markdown stripping from all AI responses
- Failover system (users never see broken experience)
- Voice input with EN/TH toggle
- vocabulary_bank and phrases_bank exist in Supabase with full schema
- 1,134 vocabulary words with: CEFR levels, 4 registers, cultural warnings, Miomi's personal notes, examples

WHAT IS NOT WORKING / NOT BUILT YET:
1. vocabulary_bank NOT connected to teaching engine — Miomi still uses hardcoded words from lib/ai/library.ts VOCABULARY object. She cannot teach from Supabase yet.
2. Self-improvement loop NOT running — library_promotions_queue exists but no cron job processes it
3. Word card UI — does not exist. Words are buried in text bubbles.
4. Welcome screen — not built
5. Create/Learn screen — still looks like ChatGPT with cat skin. Needs complete redesign.
6. CEFR tracking per user — not built
7. Spiral recall system — not built (spaced word reintroduction)
8. Session summary card — not built
9. Daily challenge system — not built
10. Certificate generation — not built
11. Curriculum path Level 1-20 — not built
12. Sharing system — not built
13. Payments (Omise) — not built
14. Referral system — not built

---

PRODUCT VISION — NEVER FORGET

Miomika is NOT a chatbot with a cat skin.
Miomika is a LIVING AI COMPANION who teaches through emotional relationship.
The pet IS the product. Features are what she does for users.

Miomi teaches through MIRROR TEACHING (our original methodology):
1. Invisible Mirror — echo correct form, never say wrong
2. Specific Witnessing — name the exact thing user did well, never generic praise
3. Spiral Method — words return at spaced intervals (1,2,4,7,12 days)
4. Emotional Stakes Anchoring — new word tied to user's real life context
5. Three-Door Exit — user can continue, ask for help, or change topic. All feel like success.

Teaching standards we follow:
- Krashen i+1 (always one level above user's current CEFR level)
- Krashen Affective Filter (low anxiety = high acquisition = never say wrong)
- CEFR A1-C2 framework (all vocabulary graded, Pro/Max users get CEFR certificates)
- Ebbinghaus Spaced Repetition (spiral recall system)

User types we serve:
1. Thai people learning English (primary — launch focus)
2. Foreigners learning Thai (tourist → student → resident journey)
3. Gen-Z users who mix languages, use 555/idk/omg/เด้ง/ปัง/โคตร naturally

Cultural rules NEVER break:
- Thai users leave silently at first bad experience — zero second chances
- Never guilt, never blame, never challenge
- Face-saving is everything — mistakes always invisible
- Praise must be SPECIFIC: "คุณใช้คำว่า X ได้ถูกต้องมากเลยนะคะ~" never "good job"
- Thai feminine speech: ค่า, นะคะ, หนู always
- Miomi never calls herself an AI — she is always a cat

Vocabulary system:
- 4 registers per word: formal, informal, slang, street
- Cultural warnings for sensitive words
- CEFR level on every word
- Static / semi_dynamic / dynamic content types
- Miomi's personal note on every word (her voice — warm, funny, memorable)
- Self-improving: AI responses → promotions_queue → library_entries (automatic)

Cost model (critical for sustainability):
- Library serves 30% month 1, 88% month 6, 94% month 12
- Break-even: 170 Pro users (covers ALL AI costs for all free users)
- Free: Groq (14,400 req/day free) → Gemini (backup) → Library failover
- Pro: Claude Haiku (after first revenue)
- Never show broken experience — always failover to library

UI rules NEVER break:
- Miomi minimum 58% of home screen stage height
- No emojis in UI — Lucide icons only
- Thai text first, English below smaller and muted
- White dominant — Miomi brings the color
- No page scroll ever — 100svh
- Never a wall — always an invitation
- No lock icons ever in nav
- Miomi leads every screen

---

TODAY'S PRIORITY — BUILD IN THIS EXACT ORDER:

PRIORITY 1 — Connect vocabulary_bank to teaching engine

Create lib/ai/vocabulary.ts with these functions:

Function 1: getWordForSession(level, topic, alreadyIntroduced, supabase)
- Queries vocabulary_bank WHERE cefr_level IN [user level, one above]
- Excludes words already introduced this session
- Orders by frequency_score DESC
- Returns one VocabWord object with all fields
- Returns null if nothing available

Function 2: getWordsByTopic(topic, level, limit, supabase)
- For topic-specific teaching moments
- Returns array of words

Function 3: recordWordIntroduced(userId, sessionId, word, supabase)
- Logs to library_interactions that this word was introduced
- Non-blocking (fire and forget)

Then update lib/ai/session.ts:
- Replace pickTargetWord() which uses hardcoded VOCABULARY
- Call getWordForSession() from Supabase instead
- Session state must carry full word object from Supabase

Then update app/api/miomi/route.ts:
- Pass selected word data into prompt instruction
- Include: word, thai translation, pronunciation hint, miomi_note_th, example_th

PRIORITY 2 — Word card UI component

Add new message type to ThreadMessage in create/page.tsx:
type: "word_card"
fields: word_en, word_th, pronunciation_hint, emoji, example_th, example_en, cefr_level

Word card renders as:
- Clean white card with soft shadow
- English word LARGE (24px, bold)
- Thai translation below (16px)
- Pronunciation hint in muted text
- Emoji large on the right
- Example sentence below divider
- CEFR badge (A1/A2/B1 etc) in corner
- NOT a chat bubble — a distinct visual moment

When does it appear:
- Exchange 3: first word introduction
- Exchange 6: second word if session continues
- After user uses word correctly: celebration version of the card

PRIORITY 3 — Welcome screen

File location: new component app/(app)/home/WelcomeScreen.tsx
Shows ONCE — localStorage flag: "miomika-welcomed-v1"
Duration: 3 seconds then auto-transition

Sequence:
1. Pure white background
2. Miomi (happy.png) appears from center with gentle scale animation
3. Soft pink glow behind her (radial gradient)
4. Text fades in after 0.8s:
   Thai: "ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า"
   English below smaller: "Welcome~ I've been waiting for you"
5. After 3 seconds: fade out, transition to home screen

Feeling: warm arrival, not a loading screen
NOT cinematic, NOT long, NOT a tutorial
One emotional moment. That is all.

PRIORITY 4 — Create screen redesign

Current problem: looks exactly like ChatGPT with a pink cat. Users feel nothing.
Target feeling: talking to a living companion, not a chatbot.

The screen has three zones:

Zone A — Miomi stage (top 40% of screen):
- Miomi image large (not 36px — at least 120px)
- Expression changes based on state (idle/listening/thinking/happy)
- Her speech appears below her image as a subtitle, not a bubble
- Subtle breathing animation always
- Background: pure white, she floats freely

Zone B — Conversation thread (middle, scrollable):
- User messages: right aligned, dark rose pill, white text
- No Miomi bubbles here — she speaks in Zone A
- Only word cards, quick replies, and system cards appear here
- This is the LEARNING SPACE not a chat log

Zone C — Input bar (bottom, fixed):
- Clean minimal input field
- Mic button as primary action (larger)
- Send button secondary
- Voice language toggle (EN/ไทย) small pill
- No toolbar, no platform selector, no tone selector visible by default

PRIORITY 5 — Self-improvement loop (cron job)

Create app/api/cron/process-library/route.ts
Vercel cron: runs nightly at 2am Bangkok time

Logic:
- Fetch all pending entries from library_promotions_queue
- Group by similarity (same intent + similar user_input)
- If 3+ similar entries with positive signals → auto-approve → insert to library_entries
- If 1 entry with very high signal (>0.8) → mark needs_review
- Update quality scores for existing library_entries based on recent interactions
- Demote entries with quality_score < 0.3 AND times_served >= 20

---

THINGS TO NEVER DO:

- Never rewrite create/page.tsx from scratch — too risky, too many bugs
- Never use && in PowerShell — use ; instead
- Never insert vocabulary without checking existing words first
- Never hardcode API keys
- Never make Thai users feel stupid, tested, or corrected
- Never show a broken experience — always failover to library
- Never use emojis in UI
- Never add lock icons to navigation
- Never make Miomi sound like ChatGPT
- Never use generic praise in Miomi's responses

---

START PROCEDURE:

1. Confirm you read all 4 documents
2. Show me current contents of:
   - lib/ai/session.ts (the pickTargetWord function specifically)
   - lib/ai/library.ts (the VOCABULARY object specifically)
3. Show me the current Supabase vocabulary_bank schema:
   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vocabulary_bank' ORDER BY ordinal_position;
4. Then and only then: start building Priority 1

Do not skip steps. Do not combine steps. Show me results of each step before proceeding.