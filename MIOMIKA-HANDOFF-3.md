# MIOMIKA — HANDOFF #3
## The conversation layer is closed. The thesis is locked. Next: ears → teaching brain → the People Layer.

*Continuation of HANDOFF #2. That handoff took the live voice loop from chaos to a working, flexible conversation on cheap models. This one records the polish that closed that layer, the strategic reframe of what Miomika actually is, and the dependency-ordered plan for everything ahead.*

---

## 0. TL;DR

- **The conversation layer is done.** Single warm voice (Leda), holds its language, switches cleanly, latency you can live with. The remaining "delay" is acceptable; do not keep tinkering with it.
- **The big reframe (Mike's, and it's right):** Miomika is not a learning app with social features. It is a **connection engine that teaches as a means to connection.** People learn a language to reach other people. Learning, social-expert, and translation are all *instruments of connection*.
- **The strategic Ace — the People Layer.** Miomi remembers the real people in a user's life and weaves them into teaching ("want to impress [friend] with a charming Thai phrase?"). This single mechanic fuses motivation + relationship + virality + the data flywheel. It is the moat and the reason someone shares the app. Spec in §5.3.
- **The bottleneck is the ears.** If Miomi mishears (especially Thai), no teaching intelligence can save the reply. ASR accuracy is the foundation everything else rides on. Decision made: **move transcription off Groq Whisper to Google Speech-to-Text V2 / Chirp 3**, on the existing Google credentials/credits. In progress.
- **Build order (do not reorder):** ears → teaching brain → People Layer → funnel/monetization → games. Each depends on the one before.

---

## 1. WHO YOU'RE TALKING TO

**Mike (Majid Ahmadi)** — Persian solo founder in Bangkok, building Miomika alone. He calls you "Opus." Composer (Cursor) is the hands; you are the brain. He pastes your prompts, Composer reports + console logs + screenshots, you diagnose from the actual output.

What to internalize:
- **Brutal directness.** Hates fluff, hates patches that don't hold, hates being re-asked what he already told you, hates back-and-forth chaos. Wants a "masterclass clean job," one concern per commit.
- **Verify with logs/test output — never trust Composer's "yes."** (This session that rule paid off twice: the Gemini key was never set, and the "noise" fix was a voice swap that didn't address the actual clipping.)
- **Cost is existential.** Cheap models only in the per-user serving path. Using a strong model *offline* to craft/evaluate prompts is fine; serving every user on a frontier model is the money trap. (ASR is the exception worth spending on — but at conversation scale even premium ASR is cents/chat, and he has ~9,700 Google Cloud credits untouched, so the ears cost effectively nothing.)
- **He wants speed.** "We have a lot to do, we shouldn't miss time." Be decisive; diagnose, then ship.
- **Unit economics:** ~1,000 baht to acquire a user → needs >20% conversion → the guest first impression must be exceptional, not just functional.

Working method that works: diagnose from the real log → one surgical Composer prompt ending in `tsc --noEmit`, `npm run lint`, Puppeteer VAD churn (`creates === 1`), commit, push.

---

## 2. THE THESIS (read this before designing anything)

**Why people learn a language: to communicate, in different social contexts, with other people. To connect.**

So the product is **connection-through-language.** The four surfaces are one companion seen from four angles:
- **Learn** — acquire the language.
- **Social-expert** — perform/express it (captions, hooks, posts).
- **Translate** — bridge it in the live moment (talking to a friend, a meeting).
- **Relational memory (People Layer)** — carry the *relationship* forward across time.

The differentiation vs free ChatGPT is **not** raw IQ. It's the cute charming Thai cat, the sweet voice, structured teaching with progress, and a companion who remembers *you and your people*. That is the moat. Make the plumbing reliable, then pour the effort into persona + voice + teaching + relationship.

---

## 3. WHAT'S DONE — THE CONVERSATION LAYER

Shipped and verified this session (all on `main`, 2026-05-31 onward). Current state:

- **Language correctness.** Spoken voice now follows the language Miomi actually replied in, not the user's setting (`e6d47d3`) — this fixed both "Thai sounds wrong" (wrong voice reading the text) and laggy/broken switching. The brain prompt now separates **MEDIUM** (the language you talk in) from **TARGET** (the language they're learning) and infers intent — an English speaker who says "teach me Thai" gets English medium + Thai target; a Thai speaker who wants English gets Thai medium + English target (`ec42a20`).
- **No spoken meta.** `stripForTts` now removes the *content* of stage directions, glosses, and transliterations (not just the brackets), and strips quote characters (`e8dddca`). The prompt also forbids written stage directions — no "(giggles softly)", no "*purrs*" — and tells her everything she writes is spoken aloud (`ec42a20`).
- **Engine order = Groq primary.** `d986099` put Groq before Gemini, cutting per-turn latency ~5s → ~2.7s. **Critical finding:** `GEMINI_API_KEY` was never set, so the "Gemini for clean Thai" work (`ed3ad8d`) never ran — **Groq has served 100% of turns, Thai included.** The clean-Thai upgrade is therefore unrealized (see §6).
- **Voice = Leda** (`c0186fd`), softer/sweeter than Despina. Mike is happy with the tone.
- **TTS gain 10 → 4 dB** (`180ed5d`) — the "noise" was clipping at +10 dB, not the voice.
- **Cold-open + repeat latency.** Short phrases (≤60 chars: openers, greetings) now cache on first synthesis; long unique replies keep the 3-strike rule for cost (`82dc167`). Second open speaks the opener ~instantly.
- **Whisper language hint** wired from `profile.ui_language` (`66e5408`) — but it shows `auto` for accounts without `ui_language` set, and a static profile hint can't serve a code-switcher anyway. This becomes moot once the ears move to Google Chirp 3 with bilingual `languageCodes` (see §5.1).

---

## 4. THE ROADMAP (dependency order — do not reorder)

1. **Ears (ASR accuracy)** — the basement. In progress. §5.1.
2. **Teaching brain** — memory, anti-repetition, a plan, CEFR leveling, pedagogy, the four modes. §5.2.
3. **The People Layer (the Ace)** — relational memory. Needs accurate ears + a good brain first. §5.3.
4. **Funnel & monetization** — guest 1+5 → sign-up → celebration → free → Pro. Rides on a genius brain. §5.4.
5. **Ambient tracking moat** — vocab/topic extraction surfaced as the user's own progress. §5.5.
6. **Engagement / games** — Kahoot-style activities at the right moments. Last. §5.6.

The order is the point: a funnel can't convert if the first six exchanges are mis-heard or repetitive; the People Layer can't weave in "[friend]" if she mishears his name.

---

## 5. PILLAR SPECS

### 5.1 Ears (ASR) — DECISION: Google Speech-to-Text V2 / Chirp 3

- **Why the ears first:** garbage in → garbage out. The console log showed Thai input garbled ("Ginkau Yang Nakap", romanized Thai, mangled strings) on cheap Groq Whisper `auto`. No downstream intelligence fixes a mis-heard input. Thai is the hard case.
- **Why Google (not a new vendor):** already in the stack (TTS uses `GOOGLE_TTS_CREDENTIALS`, project `miomika`), ~9,700 untouched credits, Chirp 3 supports Thai in streaming + batch, and it avoids adding a vendor (faster). At conversation scale ASR is cents/chat, so cost is a non-issue. (Soniox edges Google on pure mid-sentence code-switch UX and price; revisit only if Google's Thai proves insufficient in testing.)
- **Phase 1 (low risk, in progress):** drop-in batch swap — keep the VAD-record-then-send shell exactly as is; replace the Groq Whisper call in `/api/talk/transcribe` with Google STT V2 `recognize` (`@google-cloud/speech` `.v2`), default recognizer `projects/miomika/locations/{loc}/recognizers/_`, `model: "chirp_3"` (fall back `chirp_2`), bilingual `languageCodes: ["th-TH","en-US"]`. Keep Groq Whisper as a fallback so the user never gets nothing. Reuse the existing service-account JSON.
  - **Prereq:** enable Cloud Speech-to-Text API + grant the SA `roles/speech.client` on project `miomika`, or it 403s.
- **Phase 2 (optional, careful):** streaming ASR for the latency + endpointing win. Touches the audio shell — do it deliberately, never blind.
- The bilingual `languageCodes` is what kills code-switch garbling, making the old `ui_language` Whisper hint moot.

### 5.2 Teaching brain — make her consistently genius

- **Problem today:** "smart then stupid / repeated sentences." Root cause: the brain prompt has no real teaching state behind it — each turn starts blind, so she repeats and drifts.
- **Fix:** a per-user teaching state feeding the prompt — what's been taught, what stuck, current CEFR level, recent turns — plus clean Thai output (finish the Gemini-for-Thai thread, see §6).
- **Pedagogy:** Miomika's own method/philosophy on a **CEFR (Cambridge A1–C2) spine** — placement from the first minute, teach to the next rung, track mastery. CEFR makes "intelligent" measurable instead of a vibe.
- **Flexibility:** she has a teaching plan but adapts to the user's preferred method, including old-school repetition or grammar drills if that's what they want.
- **Modes:** teach / social-expert / translate / chat already plumbed (`mode` + `modeHint` in `lib/brain/prompt.ts`). Deepen behavior here, never with FSM/regex scaffolding (red line).
- **Measuring genius:** grade her offline against a native + a CEFR rubric. Using a strong model offline for grading is fine; never in the per-user serving path.

### 5.3 The People Layer — THE ACE (relational memory)

The strategic moat. Spec:

- **Core mechanic:** Miomi remembers the real people in a user's life and weaves them into teaching. Signature move: *"Want to impress [friend] with a charming Thai phrase?"* This fuses (1) motivation that sticks — you learn it for a real person; (2) relationship deepening — she helps inside your real bonds; (3) virality — the friend feels the result and asks "what is this cat?" (the lesson *is* the referral); (4) a data flywheel — knowing who matters sharpens teaching + connection.
- **Data spine:** people are first-class memory (name, who they are to the user, last mentioned, sentiment), not buried in chat history. Every mode can reach for them.
- **Guardrails (these make it trustworthy, not creepy):**
  - She drops anyone the user signals they don't want to discuss — instantly, permanently, and **never nags**. A pushy companion-memory is worse than none.
  - The social memory is **user-owned and prunable**.
  - Connecting two users' Miomis (the viral network feature) is **mutual opt-in only** — person B consents before Miomi discusses them with person A. This is a **v2** feature, not v1.
  - Designed to **strengthen real relationships, not replace people** — she points users toward their real circle, and toward a real person/professional for serious distress. This is both the safer design and the more viral one.
- **Build order:** after the ears and the teaching brain.

### 5.4 Funnel & monetization

- **Guest = 1 ice-breaker + 5 replies.** This is the **highest-stakes surface in the app** — the conversion moment — so it needs the best brain *and* the best ears (a Thai user mis-heard in exchange 2 is lost). Do not build the funnel before the brain is reliable.
- **Sign-up hook:** "I wanna remember you" is good (emotional, companion-fit). Make it stronger by making it concrete + loss-framed + personal to what just happened: *"Sign up so I never forget you — your words, your progress, our talks."*
- **Sign-up → free user with celebration:** the cat is genuinely happy, expresses it human-like, then a short tour. **Continuity is a hard requirement** — the words/conversation from guest mode must follow the user into the account ("without missing anything").
- **Free tier:** limited usage but delightful — they feel they're using a super-intelligent AI for free.
- **Pro:** monthly/yearly, **yearly is Mike's preference**. **Pro Max** is a future tier (more advanced features) — do **not** design it now. One paid tier until it converts.

### 5.5 Ambient tracking moat — "not a cage"

- Every mode feeds learning: translator pulls 3–5 useful words + the topic; social-expert does the same; all of it builds the user's plan/dashboard.
- **The "not a cage" principle:** surface the data back to the user as *their own progress* ("here's what you've learned this week"). Same data, opposite feeling — it becomes the retention + conversion hook instead of surveillance.

### 5.6 Engagement / games

- Varied engaging activities and Kahoot-style language games, offered at the right moment mid-learning. Real, but **last** — build-cost, not what makes her smart.

---

## 6. OPEN ISSUES / KNOWN LIMITS

- **Thai output quality is still Groq's.** `GEMINI_API_KEY` is not set (locally absent; likely set-but-rate-limited in prod historically). Action: **add `GEMINI_API_KEY` in Vercel** so (a) the LLM fallback is real and (b) we can A/B Gemini's Thai vs Groq's with a native reader in the teaching-brain phase. Not a conversation-layer blocker.
- **ASR ceiling** — being addressed by the Google Chirp 3 swap (§5.1). Long Thai utterances are the hard case.
- **Latency residuals:** VAD `redemptionMs` is 1200 (a ~1.2s wait before each turn starts) — an optional, reversible trim to ~800 was offered but not yet shipped. Deeper cut = streaming TTS/ASR (careful, shell-touching).
- **Minor:** VAD can fire during the `processing` state (no in-flight serialization beyond the speaking-echo drop) — caused a harmless self-recovering misfire in the log. Hardening item, not urgent.
- **Friend's "text only, no voice" on Oppo/Vivo** — pending morning triage. Server synth is confirmed healthy (Leda 200s, valid audio). So it's device-side: most likely an in-app browser (LINE/Facebook) blocking audio, audio not unlocking without a tap, or +4 dB too quiet on her speaker. Triage tree: tap 🔊 (loud = unlock issue / faint = gain / nothing = browser); open in Chrome; check media volume.
- **Desktop/laptop volume variance is NOT a bug** — gain is one fixed number tuned for phones (the target device). Leave it.

---

## 7. ARCHITECTURE & KEY FILES (current)

- `app/(app)/talk/page.tsx` — `/talk` UI; transcript handler (drops echo while speaking); `processInput` (POST `/api/miomi`); `stripForTts`; reply-language via the model's output script; opener; orb one-tap stop.
- `components/talk/MicButton.tsx` — VAD lifecycle (mount-once; paused via `speakingActive`). **SACRED** unless the Puppeteer churn test (`creates === 1`) fails. `redemptionMs` 1200.
- `lib/voice/tts.ts` — `speak` / `killAllAudio` / `setSpeaking` / supersede resolver; single `__activeAudio`; **NO browser fallback** (one-voice policy).
- `lib/brain/prompt.ts` — **the single flexible persona prompt.** MEDIUM/TARGET language logic, brevity, no-stage-directions, never-say-input-is-scrambled. Tune here.
- `app/api/miomi/route.ts` — builds prompt from state + userInput + mode; routes via `lib/ai/router.ts`; servedVia branches (incl. `clarification` canned line). Do NOT change the response shape.
- `lib/ai/router.ts` — **Groq `llama-3.3-70b-versatile` primary, Gemini `gemini-2.5-flash` fallback** (Gemini currently dead — no key). Library failover last.
- `app/api/talk/transcribe/route.ts` — **Google STT V2 Chirp 3** primary (`us`, `chirp_3`, bilingual `th-TH`/`en-US`); Groq Whisper fallback. Multipart `audio` + `language`; returns `{ text }`.
- `app/api/talk/speak/route.ts` — Google Chirp3-HD **Leda**; `VOLUME_GAIN_DB = 4.0`; `tts_cache` keyed by voice+rate+gain; short-phrase first-synth cache (≤60 chars); 18s synth timeout.

Stack: Next.js 15 on Vercel (pinned sin1/hnd1), Supabase, Groq, Google Cloud (TTS now, STT incoming), VAD via `@ricky0123/vad-web`. Repo `github.com/majidahmadi86/miomika`, domain `miomika.com`, GCP project `miomika`.

---

## 8. RED LINES & RULES OF ENGAGEMENT

- **DO NOT** re-add the move FSM, language-switch regex, or intent/practice/emotion detectors to the brain. Quality comes from the single prompt + state, not scaffolding.
- **DO NOT** wire a frontier model into per-user serving (cost trap). Offline for prompt-crafting/eval is fine.
- **DO NOT** touch MicButton VAD internals unless the Puppeteer churn test fails.
- **DO NOT** bring back the browser `speechSynthesis` TTS fallback (the two-voice bug).
- **DO NOT** change the `/api/miomi` response shape.
- **Surgical, one concern per commit.** Don't bundle. Every Composer prompt ends with `tsc --noEmit`, `npm run lint`, churn (`creates === 1`), commit, push; sanity before lint; delete scratch files first.
- **Verify with logs/test output, never Composer's self-report.**
- **People Layer / companion principles:** design for *healthy* connection — back off gracefully, never foster over-reliance, point users to real people, get consent before involving third parties, keep the companion warmth wholesome and age-appropriate (the app may reach minors).

---

## 9. HOW TO START THE NEXT CHAT

1. Acknowledge state in one line (no recap).
2. Confirm HEAD and that the **Google Chirp 3 ears swap** landed and verified (Thai transcribes clean live; `servedBy: "google_chirp3"`).
3. If the ears are clean, begin the **teaching brain** (§5.2): per-user teaching state + CEFR leveling + finishing the Gemini-for-Thai thread (set the key in Vercel, A/B vs Groq with a native).
4. Hold the build order. The People Layer and funnel come after the brain is genius — not before.

— End of handoff #3 —
