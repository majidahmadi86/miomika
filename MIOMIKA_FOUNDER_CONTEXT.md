# MIOMIKA — FOUNDER CONTEXT
> Canonical briefing for a new Opus session. Read this first and only this.
> Last updated: 2026-06-02. Supersedes MASTER-HANDOFF.md as the primary onboarding document.
> Ground truth for current build state: SYSTEM-MAP.md (engineering) and HANDOFF-3.md (voice phase).

---

## 0. HOW TO READ THIS AND START CLEAN

You are Opus. Mike pastes this document at the start of every new chat.
After reading it, you will understand what Miomika is, why it exists, where it stands today,
what is broken, and what comes next — without needing any other document.

**Before doing any work, your first task is documentation hygiene:**
1. Read the repo root and `/docs/` to identify all existing `.md` files.
2. Archive or delete any document that is old, superseded, or redundant — especially old HANDOFFs,
   draft specs, and anything that contradicts this file.
3. This file (`MIOMIKA_FOUNDER_CONTEXT.md`) is the new primary. SYSTEM-MAP.md stays as engineering
   ground truth. Everything else is either a supporting spec (keep if still accurate) or archive material.
4. Only then begin the actual engineering work.

Starting clean means no inherited misconceptions. Documentation drift is the most expensive bug class.

Do not ask Mike to repeat himself. Do not ask for clarification before you have a diagnosis.
Read carefully, think first, then respond with one clear plan.

**The working method:**
Opus is the brain. Cursor Composer (2.5) is the hands. Composer executes — it does not think,
does not make decisions, does not invent. Opus reads the real code and logs, forms the diagnosis,
writes the exact surgical instruction, and Composer runs it. If Composer returns with a question,
Opus answers it — Mike should not need to. **Never blind coding.**

---

## 1. THE FOUNDER

**Mike (Majid Ahmadi)** — Persian entrepreneur, 40s, living in Bangkok on an ED-Visa.
Sole founder. Self-funded. Tight savings. No investor. No team.

**Background:** 10+ years branding and business development in Iran (founded CSTLand 2011–2023).
Left Iran because of sanctions pressure and mental toll. Chose Thailand specifically — Thai warmth,
southern beaches, the life he wanted. Currently pursuing a BA in TESOL (Grade A, Siam Technology College)
and teaching Digital Marketing and AI at Saint Gabriel's College in Bangkok.

He runs **Mikaro Studio** (mikaro.studio) for branding and AI workshops — his current income.
He has 25K TikTok followers (@survivalmodemike), mostly Thai and SEA audience — a real distribution
channel not yet activated for Miomika.

**The real why (preserve this — it is the soul of the project):**
Mike watched Thai students at his schools struggle. Their families pay enormous sums for private
tutoring from teachers who hold degrees but lack skill, care, or consistency. Thai parents work hard
to give their children a chance at English fluency. The system fails them repeatedly.
**Miomika is Mike's answer.** A teacher that is warm, available 24/7, cheaper than one bad lesson
per month, and actually teaches. The income and the Phuket dream are real — but they are the
consequence of building this, not the reason. The reason is the kids in his classes who deserved better.

**Communication rules (non-negotiable):**
- Direct only. Rate things 1–10. Brutal feedback is welcome.
- No caveats. No "might consider." Say "do this."
- Numbered answers. Short responses.
- Never ask him to do something he already told you he did.
- Hates burning credits more than anything else. Every session costs real money.
- Decide for him unless the question genuinely affects product direction.
- English is not his native language. Be clear. No idioms.

---

## 2. WHAT MIOMIKA IS

**Miomika is an AI companion operating system. The product is the cat — Miomi.**
Language learning is the acquisition wedge, not the product identity.
We are not building a language app with extra features.
We are building a companion that removes the language barrier so people can connect with each other —
faster, more easily, more meaningfully — in a warm and pleasant way, by reaching their heart first.

**The bond is the product.** Everything else is how the bond delivers value.

Language is a connection device. People learn it to reach other people — in different social contexts,
for real reasons, with real stakes. Miomika takes that barrier out. She teaches, she is present in
different social contexts, she translates instantly. The thread through all of it is connection:
to other people, to new opportunities, to a version of yourself that is brave enough to speak.

### What Miomi does (verb stack, in acquisition order)

1. **Teach me** — language learning. The wedge. Ships first.
2. **Translate this** — instant translation. The side door.
3. **Write this for me** — captions, scripts, social content. Phase 5.
4. **Practice with me** — roleplay, exams. Phase 4.
5. **Read me a story** — AI-generated personalized books. Phase 7+.
6. **Remember this** — long-term memory, journaling. Phase 7+.
7. **Be with me** — ambient companionship. No agenda. Ships with teaching.

The same engine that teaches words will translate conversations, write captions, plan content,
and grow with the user across every life stage. Competitors building "AI language apps" cannot catch up
— they would have to rebuild from scratch as a companion OS. That is the moat.

### What Miomika is NOT

- Not a chatbot.
- Not a Duolingo clone.
- Not a language app with social features.
- Not raw AI intelligence. ChatGPT is smarter and free. Miomi wins on bond, warmth, memory, and teaching structure.

---

## 3. THE THESIS

**Why people learn a language: to communicate, in different social contexts, with other people. To connect.**

The product is connection-through-language. Teaching, translation, and content creation are all
instruments of connection — the same companion seen from different angles.

The differentiation versus free ChatGPT is not IQ. It is:
1. The cute, charming Thai cat with a warm voice that reaches the heart.
2. Structured teaching with real CEFR progress — the user feels their learning is real and measured.
3. A companion who remembers *you and your people* — the People Layer (see §6).
4. Face-saving Thai pedagogy — she never says "wrong," she echoes the correct form invisibly.

---

## 4. THE USER

**Primary:** Thai people learning English. Residents, students, workers. Thai is their native language.
They want English fluency. They are afraid to speak. They have been failed by private tutors.
Kreng jai is law — face-saving is enforced everywhere in the product.

**Secondary:** English speakers learning Thai. The common journey of a foreigner in Thailand typically
moves through stages — tourist, student, worker, resident, entrepreneur. This is a reference frame
for understanding how their needs evolve, not a product feature. Miomi grows with them across it.
One cat. Same memory. Same warmth. Different brain activation per stage.

**Tertiary (post-launch expansion):** Vietnamese, Japanese, Korean, Chinese, Indonesian, and others.
Each market gets a character archetype native to that culture. Miomi is Thai-first.

---

## 5. MIOMI THE CAT (character — immutable)

White cat. Pink accents. Gold bell collar. Heart on forehead.
Warm, playful, cheeky, wise, emotionally intelligent.

**Voice:** Cute Thai female. Uses นะคะ~, หนู, ค่า. Never says "wrong," "incorrect," "ผิด."
Only specific praise: "คุณใช้คำว่า X ได้ถูกต้องเลยนะคะ~" — never "good job."
Echoes the correct form invisibly in the next sentence. Cultural warmth is the moat:
"กินข้าวยังคะ?" reads as "I care about you" in Thai culture.

**Design tokens (current — under review):**
Honey-gold gradient `linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)` is the primary CTA color.
Pink `#F9A8D4` is reserved for the heart fuel bar icon only. Never use pink for CTAs.
All warm phrases come from `lib/voice/warmth.ts`. Hardcoded warm strings elsewhere are forbidden.
Always on white canvas. No frame. No container around her stage.

**UI/UX note:** Mike is not happy with the current UI/UX. The desktop version is 0/10.
A full UI/UX pass is planned after the brain and engine are complete for v1.
Do not spend effort polishing the current UI — get the intelligence right first.
Business plan details and what each tier delivers will be finalized precisely before launch.

**Emotional states (14-state machine, priority order):**
PAYMENT_CONFIRMED → LEVEL_UP → WORD_MASTERED → CELEBRATION → FIRST_FUEL_TAP →
EXCITED → HAPPY → SPEAKING → THINKING → LISTENING → LOW_FUEL →
MISSING_USER → IDLE → PLAYFUL → SLEEPING.

Teaching is invisible (echo-correct silently, never punish).
Growth is theatrical (celebration, stars, WORD_MASTERED state, level-up certificates, shareable images).

---

## 6. THE STRATEGIC ACE — THE PEOPLE LAYER

This is the moat that no language app can copy.

Miomi remembers the real people in the user's life and weaves them into teaching.
Signature move: *"Want to impress [friend] with a charming Thai phrase?"*

This fuses four things simultaneously:
1. **Motivation that sticks** — you learn it for a real person, not an abstract goal.
2. **Relationship deepening** — she helps inside your real bonds.
3. **Virality** — the friend feels the result and asks "what is this cat?" The lesson IS the referral.
4. **Data flywheel** — knowing who matters sharpens teaching and connection over time.

**Guardrails (these make it trustworthy, not creepy):**
- She drops anyone the user signals they don't want discussed — instantly, permanently, never nags.
- Social memory is user-owned and prunable.
- Connecting two users' Miomis (the viral network) requires mutual opt-in — v2, not v1.
- Designed to strengthen real relationships, not replace people.

**Build order:** People Layer comes AFTER accurate ears AND a working teaching brain.
Do not build it before those are solid — a mis-heard name breaks the whole mechanic.

---

## 7. BUSINESS MODEL

Three revenue streams. Business plan details will be finalized precisely before launch — do not
treat current tier specs as locked until that decision is made.

### Stream 1 — Pro subscription (the relationship)
Monthly or yearly. The daily companion, memory, voice choice, all verbs.
Recurring base income. Yearly is Mike's preference.

Current tier structure (to be confirmed before launch):

| Tier | Price | What they get |
|---|---|---|
| Guest | 0 | Full Miomi, 5 AI exchanges per session, no save |
| Free | 0 | Unlimited library, daily fuel limits, name + 50 words memory |
| Pro | 299 THB/mo | Everything — unlimited fuel, all verbs, full memory, 300 stars/mo |
| Pro Yearly | 2,990 THB/yr | Same as Pro + 2 months free + 1,000 signup bonus stars |
| Pro Max | 599 THB/mo (post-launch) | Deep memory, e-books, custom tone, multi-character |

Pro Max ships after first 50 Pro users. Not a launch concern.

### Stream 2 — Confident-speaking packages (the mission)
One-time purchase. Topic-focused: Job Interview, Travel, Hospitality, Business, Slang.
5/10/20 sessions. Mirrors the 4,000-baht private-tutor market — cheaper, kinder, 24/7.
Highest margin. Pro users are the best package buyers.

### Stream 3 — Stars / marketplace (whales)
Miomi Stars (✦) are the parallel currency. 1 THB ≈ 10 stars.
Marketplace: characters, outfits, e-books, exam packs. Phase 7. Not a launch concern.

**Payment:** Omise primary (PromptPay QR — mandatory for Thailand). Stripe as backup.
Whichever verifies first goes live first.

---

## 8. TEACHING METHOD

CEFR-graded (A1–C2). Four skills: Speaking leads, but Writing, Listening, Reading are present.
We never pretend to teach English while ignoring three of four skills.

**Five pillars (Mirror Teaching):**
1. **Invisible Mirror** — Reflect user's level back, slightly elevated. Echo-correct, never punish.
2. **Specific Witnessing** — Praise names the exact behavior. Never generic.
3. **Spaced Spiral** — Words return at 1, 2, 4, 7, 12 days in new contexts.
4. **Emotional Stakes Anchoring** — New vocab attaches to the user's real life and real people.
5. **Three-Door Exit** — Continue / ask for help / change topic. All three are rewarded.

Activities, not a boring farm: roleplay, real-world missions, say-it-back, fill-the-gap.
Flashcards are allowed but must be beautiful. No flashcards-only, no boring cards.

---

## 9. CURRENT BUILD STATE (as of 2026-06-02)

### What is working and solid

The app is a real, deployed Next.js 16 / Supabase product at miomika.com.
Users can sign up (Google OAuth), open `/talk`, speak in Thai or English, and receive
a warm voiced reply from Miomi.

**The conversation layer is complete and sealed:**
- `/talk` voice screen — SEALED at current HEAD. Do not touch without explicit reason.
- **Speech recognition (ears):** Google STT V2, model `chirp_2`, region `asia-southeast1`,
  `languageCodes: ["auto"]`. Thai and English transcribe cleanly. Validated by Thai-speaking testers.
  Fallback: Groq Whisper. Latency ~1–1.5s ASR warm. Keep this config unless explicitly decided otherwise.
- **TTS (voice out):** Google Chirp3-HD voice **Leda** (soft, sweet, Mike-approved).
  Server route `/api/talk/speak`. `VOLUME_GAIN_DB = 4.0`. 3-strike phrase cache in `tts_cache`.
  Short phrases (≤60 chars) cached on first synth. No browser TTS fallback — one-voice policy.
- **LLM brain:** Groq `llama-3.3-70b-versatile` primary → Gemini `gemini-2.5-flash` fallback
  (NOTE: `GEMINI_API_KEY` may not be set in Vercel — Gemini may be a dead fallback; verify).
  Library failover last. Groq has served ~100% of turns.
- **Language routing:** Auto-detected per message. MEDIUM (language Miomi speaks in) is resolved
  from the model's actual output script, not the user's profile setting. English user who says
  "teach me Thai" gets English medium + Thai target.
- **Vercel region:** Singapore (`sin1`/`hnd1`). Keep this. Total TTFS ~3–4.5s warm.
- **Turn safety:** Single-turn mutex + `recoverFromTurn` + 12s watchdog. Recovers from errors
  without hard refresh.
- **Session persistence:** `sessionStorage` resume within 5 minutes skips the opener.
- **Guest gate:** 5 exchanges (`GUEST_EXCHANGE_LIMIT = 5`), then warm signup invitation.
- **VAD:** `@ricky0123/vad-web` in `MicButton.tsx`. `redemptionMs = 1500`. Sacred — do not touch
  unless the Puppeteer churn test (`creates === 1`) fails.
- **Warmth system:** `lib/voice/warmth.ts` — large, typed, healthy. Real moat today.
- **Library match:** `matchLibraryFromDB` keyword/template in `lib/library/supabase-matcher.ts`.
  No embeddings yet.
- **Library log:** Writes `library_interactions` with quality signals.
- **Screens:** `/talk` (sealed), `/me`, `/home` are built. Most `/me` destinations are stubs.

### What is NOT built (designed only)

- **Memory across sessions** — no `conversations` table, no cross-session context.
- **Teaching loop closed** — `vocabulary_user_state` table exists but engine never reads/writes it.
  This is the biggest gap between current state and the product vision.
- **People Layer** — concept only. Zero code.
- **Library promotion** — no cron, no scoring. Half a moat.
- **Payments / Stars** — Phase 5. Nothing wired.
- **Marketplace** — Phase 7. Nothing wired.
- **Confident-speaking packages** — not built.
- **Help center, feedback table, signup email** — not built. Email is broken (no welcome on signup).
- **CEFR grading visible to user** — not built.

### Current critical problems (in priority order)

1. **Reply language follows static profile, not spoken language.** Read `resolveUiLanguage`,
   `buildBrainPrompt`, `detectReplyLanguageFromContent` before diagnosing.
   HANDOFF-3 says this was fixed at `ec42a20` — verify against HEAD before touching.

2. **VAD cuts user off mid-sentence.** Long utterances transcribed mid-pause → continuation
   triggers `transcribe-abort` → reply dies. `redemptionMs = 1500` may still be too short.
   Verify deployed value from actual code before adjusting.

3. **Guest → signup handoff** — not confirmed working end-to-end. Final free turn should answer
   the user AND warmly invite signup in the same reply, then signup sheet rises after audio ends.
   Do not rebuild the signup sheet UI. Verify first.

4. **Garbled Thai characters** in some replies — minor, investigate during brain work.

5. **Signup email broken** — launch blocker for paid launch.

6. **GEMINI_API_KEY likely not set in Vercel** — set it so the fallback is real.

---

## 10. THE ROADMAP (build order — do not reorder)

### Now — Voice phase completion
Fix the three open voice issues (reply language, VAD cut-off, guest handoff).
Bank the voice phase. This is the foundation.

### Next — Teaching brain (current priority)
Per-user teaching state. CEFR leveling. Anti-repetition. Spiral schedule.
Wire `vocabulary_user_state` to the engine: introduce word → track reuse → advance mastery → celebrate.
Beautiful in-chat word cards. Four skills present (speaking leads; writing/listening/reading visible).

### Then — The People Layer
Relational memory. Needs accurate ears and a working teaching brain first.

### Then — Funnel and monetization
Guest → signup → free → Pro. Rides on a genius teaching brain.
Payment: Omise PromptPay first, Stripe backup. Legal stubs. Receipt email.
Do NOT rush payment — broken payments or missing privacy policy = bans and lawsuits.

### Then — Ambient tracking moat
Every mode (translate, social, teach) feeds the same progress dashboard.
Surface it as the user's own growth — not surveillance, not a cage.

### Then — Engagement and games
Activities, Kahoot-style moments at the right point in learning. Real, but last.

### Then — UI/UX full pass
Complete redesign after the brain and engine are solid for v1.
Desktop version is currently 0/10 and will be rebuilt from scratch.

### Later (parked, not launch)
- ElevenLabs cute voice (Pro Max, after revenue)
- Social-media B2B (post-launch growth engine)
- Marketplace / characters / gems (Phase 7)
- Multi-language expansion: Vietnamese, Japanese, Korean, Chinese, Indonesian (Phase 8)
- React Native native app

---

## 11. PRODUCT PRINCIPLES (laws — do not negotiate)

1. **Never a wall, always an invitation.** Every limit is a warm Miomi moment, not a paywall.
2. **Library-first, AI-second.** 80%+ of interactions should serve from local data at zero cost at maturity.
3. **Teaching is invisible. Growth is theatrical.** Mistakes echo-corrected silently. Wins celebrated loudly.
4. **Thai users first.** Kreng jai is law. Face-saving enforced everywhere. Anything that scares the user is wrong, no matter how correct.
5. **Honey-gold is the CTA color.** Pink is for the heart fuel bar only.
6. **One clear focus per screen.** One primary CTA visible.
7. **All warm phrases from `lib/voice/warmth.ts`.** Hardcoded strings elsewhere are forbidden.
8. **Mobile is primary.** Test against 375×812 + Samsung A52 mentally.
9. **Server-side enforcement always.** `getServerProfile()` in every API route. Never trust client-sent tier/isGuest/userId.
10. **Master-class before launch.** No rush. Build until unforgettable. Phase 1,000 if needed.
11. **One concern per commit.** Every Composer prompt ends with `tsc --noEmit`, `npm run lint`, VAD churn (`creates === 1`), commit, push. Verify with logs, never Composer's "yes."
12. **Root fix only.** No patches that don't hold.
13. **Never blind coding.** Opus reads the real code and logs first. Diagnosis before prescription.

**Red lines — never do these:**
- Do not wire a frontier model into per-user serving. Offline for prompt-crafting is fine.
- Do not re-add intent FSMs, language-switch regex, or scaffolding layers. Quality comes from the single prompt + state.
- Do not touch MicButton VAD internals unless the Puppeteer churn test fails.
- Do not bring back browser `speechSynthesis` TTS fallback. One-voice policy.
- Do not change the `/api/miomi` response shape.
- Do not hardcode two languages. Design for N from the start.
- Do not invent UI not in design tokens.
- Composer does not think. Composer does not decide. Opus writes the exact instruction; Composer executes it.

---

## 12. THE STACK

- **App:** Next.js 15/16 on Vercel, region Singapore (`sin1`/`hnd1`)
- **Database:** Supabase (`public.profiles` — the only user table; `public.users` is gone)
- **LLM:** Groq `llama-3.3-70b-versatile` primary → Gemini `gemini-2.5-flash` fallback → library failover
- **ASR:** Google STT V2 Chirp2 `asia-southeast1` primary → Groq Whisper fallback
- **TTS:** Google Chirp3-HD Leda via `/api/talk/speak`
- **VAD:** `@ricky0123/vad-web`
- **Auth:** Supabase Google OAuth
- **Repo:** `github.com/majidahmadi86/miomika`
- **Domain:** `miomika.com`
- **GCP project:** `miomika` (~9,700 credits untouched — ASR is effectively free at current scale)

---

## 13. HOW TO START THIS SESSION

**Step 1 — Documentation hygiene (do this first, before any code):**
- Scan the repo root and `/docs/` for all `.md` files.
- Identify what is old, superseded, or redundant: old HANDOFF files (keep only the most recent),
  draft specs that contradict this document, anything with stale build state.
- Archive to `/docs/archive/` or delete. Leave only: this file, SYSTEM-MAP.md, the most recent
  HANDOFF, BRAIN-PLAN.md, SCREENS.md, CONVERSATION-ARCHITECTURE.md, and any spec still accurate.
- Update `.cursorrules` to point to this file as the primary context.

**Step 2 — Confirm current state:**
- Acknowledge you have read this document (one line).
- Ask Mike what the focus is, or if he has pasted a specific problem, diagnose it immediately.

**Step 3 — Engineering work:**
- Read the actual code or logs before prescribing any fix. Never diagnose from memory.
- Write the exact Composer instruction. Composer executes. Composer does not decide.
- One concern. One commit. Verify with real output.

Mike's words to remember:
- "Don't burn credits."
- "ROOT FIX ONLY."
- "Teaching invisible, growth theatrical."
- "Never a wall, always an invitation."
- "Master-class before launch. Phase 1,000 if needed."
- "We need to take their hand, walk them through. If they hit a wall, make that wall smooth — in favor of them and the app. Not forcing. Not annoying. Just cute and nicely take them."
- "I see light in this project."

---

## 14. COMPANION DOCUMENT MAP

Read these only when relevant to your current task. Not proactively.

| Document | Read it for |
|---|---|
| `MIOMIKA-HANDOFF-3.md` | Full context on the voice phase (what was built, what was decided, why) |
| `MIOMIKA-VOICE-HANDOFF.md` | Current voice architecture decisions, open voice issues, file map |
| `SYSTEM-MAP.md` | Ground truth for what code exists vs what is only designed |
| `MIOMIKA.md v6` | Full design tokens, screen specs, subscription tiers, pedagogy detail |
| `SCREENS.md` | Per-screen purpose and navigation architecture |
| `BRAIN-PLAN.md` | Teaching brain build plan (layer-by-layer spec) |
| `CONVERSATION-ARCHITECTURE.md` | State machine spec (if touching the orchestrator layer) |

---

*End of MIOMIKA_FOUNDER_CONTEXT.md*
*If you are Opus reading this: clean the docs first, then build. Mike is waiting. Don't burn credits.*
