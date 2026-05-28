# MIOMIKA — PRODUCT DECISIONS (locked 2026-05-28)
> Read after SYSTEM-MAP.md. This is WHAT we are building and WHY.
> Soul rule above all: Miomi touches the Thai user's HEART first, then the brain.
> Warm, beside them — never in front of them, never scaring them. Praise, respect,
> soft words. Anything that scares the user is wrong, no matter how correct.

## 1. THE LEAD (positioning)
Miomika = the warm companion who makes you BRAVE ENOUGH TO SPEAK.
Confident speaking is the lead feature. The bond lowers fear; lowered fear lets
them speak; speaking is the learning. Every other feature SUPPORTS this.

## 2. TEACHING — full method
- Four skills: SPEAKING leads, but WRITING, LISTENING, READING are essential.
  We never pretend to teach English while ignoring three of four skills.
- CEFR-graded (A1-C2), aligned to recognized standards (Cambridge-style). The user
  must feel their learning is REAL and MEASURED, never mindless.
- Teaching is invisible (echo-correction, never "wrong"); growth is theatrical
  (celebration, stars, "you used X correctly!").
- Activities, not a boring farm: roleplay, real-world missions, say-it-back,
  fill-the-gap. Flashcards ALLOWED and KEPT — but must be beautiful (vibrant color,
  engaging images, well-designed in-chat cards). No flashcards-only, no boring cards.
- Emotional-state awareness: when user flows, chat light; when stuck, help gently;
  when sad, just listen. Teaching hides; warmth leads.
- Free tastes the depth; Pro lives in it (advanced activities + high-level AI
  conversation are Pro/package features — fair, since they cost more to run).

## 3. REVENUE — three streams (no predatory weekly traps)
1. Pro subscription (monthly) = the RELATIONSHIP. Daily companion, memory, voice
   choice, all verbs. Recurring base income.
2. Confident-speaking PACKAGES (one-time) = the MISSION with a deadline. Topic
   chosen by user: Job Interview, Travel, Hospitality, Business, Talk-to-in-laws,
   Slang, and ALSO Writing packages (maybe Listening/Reading later). Flexible
   5/10/20 sessions. Mirrors the 4,000-baht tutor market — cheaper, kinder, 24/7.
   Highest margin. Pro users are the BEST package buyers (relationship vs mission =
   different wallets; no cannibalization).
3. Stars / packs (microtransactions) = premium voices, skins. Whale income. Later.
NOTE: Future money areas to revisit ~1 month post-launch (B2B social, etc).

## 4. VOICE STRATEGY
- DROP browser TTS (cause of female/male flip + robotic sound).
- Launch: TWO fixed Google Cloud Neural2 voices (warm Thai female default; optional
  male). Consistent every time. Set a Google Cloud budget alert (~$5).
- Cost: ~$16 / 1M chars (~$0.0024/reply); 1M free chars/month. At launch ~ $0.
- Three-strike TTS cache (Supabase tts_cache): repeated phrases cached after 3rd
  play -> $0 forever. Each warmth VARIANT cached separately, so caching never causes
  repetition — Miomi still rotates variants, never consecutive repeat.
- Premium voice = Pro CHOICE (pick your teacher's voice). Recorded tutor voices =
  premium packs later. Voice CLONING (ElevenLabs/Inworld) = Pro Max / premium,
  AFTER revenue. NOT a launch blocker.

## 5. LIBRARY (the moat) — cost truth
- Library serves ~80% of replies. Library hit = BRAIN cost $0 immediately.
- VOICE cost of a library phrase = $0 after it is cached (3-strike).
- Only the ~20% unique AI replies cost brain money, and only for Pro tiers.
- The masterpiece guest + free first-impression library is written by Opus (in
  Claude chat, by the architect) = $0 to build. Served free forever.

## 6. SUPPORT, FEEDBACK, NOTIFICATIONS (launch essentials)
- Feedback: in-app "Something's broken or confusing" writes to a Supabase feedback
  table (exportable to file). Architect reads it via Composer, triages serious vs
  noise. Later surfaces in admin panel.
- Help center: explains every step like to a 2-year-old, zero language assumption.
  Plus live AI chat support for any issue (payment, follow-up, confusion). Never a
  dead end — never a wall, always an invitation.
- Email + notifications MUST work at every level (welcome, signup, receipts).
  CURRENTLY BROKEN: signup sends no email. Launch blocker.

## 7. LAUNCH STAGING (safe + fast)
- SOFT LAUNCH NOW (free) to trusted friends -> collect feedback.
- Turn ON paid the moment Stripe + Omise (PromptPay) verify. Do NOT rush payment
  or legal — broken payments / missing privacy policy = bans/lawsuits.
- Launch experience first (voice + Opus library + teaching loop), payments within
  days of verification.

## 8. SOCIAL-MEDIA B2B (parked, post-launch growth engine)
A paid AI that helps Thai businesses manage/translate/triage their social comments.
Growth via LEGAL permission-based advertising in their channels (NOT data theft).
Real viral door. Built AFTER the confident-speaking lead works. Not launch.
