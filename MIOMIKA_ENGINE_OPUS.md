# MIOMIKA ENGINE — OPUS ARCHITECTURE

> The complete brain design for Miomi. A self-improving, adaptive, multilingual intelligence that unifies learning and creation into a single seamless experience.
>
> **Stack:** Next.js 14, TypeScript, Supabase, Groq (primary), Gemini (backup)
> **Philosophy:** Library-first. AI-second. Self-improving always. Invisible complexity.

---

## TABLE OF CONTENTS

1. [Unified Intent Classification System](#section-1--unified-intent-classification-system)
2. [Language Direction Intelligence](#section-2--language-direction-intelligence)
3. [Adaptive Persona System](#section-3--adaptive-persona-system)
4. [Unified Creator + Learner Engine](#section-4--unified-creator--learner-engine)
5. [Self-Improving Library System](#section-5--self-improving-library-system)
6. [Session Architecture Upgrade](#section-6--session-architecture-upgrade)
7. [Cost Model and Performance](#section-7--cost-model-and-performance)
8. [Implementation Order](#implementation-order)
9. [Cursor Prompts](#cursor-prompts)
10. [Database Migrations](#database-migrations)
11. [Bugs to Fix Immediately](#bugs-to-fix-immediately)

---

## SECTION 1 — UNIFIED INTENT CLASSIFICATION SYSTEM

### 1.1 The New Intent Taxonomy

The current 12 intents are teaching-only. Replace with **5 intent families × sub-intents = 28 total**, organized so the library schema can serve any intent without restructuring.

```typescript
// lib/ai/intents.ts

export type IntentFamily =
  | "learning"
  | "creating"
  | "translating"
  | "social"
  | "meta";

export type Intent =
  // LEARNING FAMILY
  | "learning_ask_word"          // "what does X mean"
  | "learning_ask_phrase"         // "how do you say X"
  | "learning_request_topic"      // "teach me business English"
  | "learning_request_practice"   // "quiz me", "let me try"
  | "learning_use_target_word"    // user attempted a target word
  | "learning_confusion"          // "I don't understand"
  | "learning_correction_request" // "is this right?"

  // CREATING FAMILY
  | "creator_caption"             // TikTok / IG caption
  | "creator_script"              // video script, hook
  | "creator_bio"                 // profile bio
  | "creator_comment_reply"       // reply to a comment
  | "creator_translate_for_post"  // bilingual caption
  | "creator_idea"                // brainstorm content

  // TRANSLATING FAMILY
  | "translate_word"              // single word
  | "translate_phrase"            // multi-word
  | "translate_sentence"          // full sentence
  | "translate_explain"           // "what does this mean culturally"

  // SOCIAL FAMILY
  | "social_greeting"
  | "social_emotion_positive"     // excited, proud, happy
  | "social_emotion_negative"     // tired, sad, frustrated
  | "social_smalltalk"            // "what's up", random chat
  | "social_gratitude"            // "thank you"
  | "social_farewell"

  // META FAMILY
  | "meta_set_goal"               // "I want to learn business English"
  | "meta_set_level"              // "I'm a beginner"
  | "meta_set_mode"               // "switch to creator mode" (rare — system should auto-detect)
  | "meta_clarification_needed"   // genuinely too vague
  | "meta_off_topic"              // out of scope
  | "meta_unclear";               // garbled / fragmentary
```

### 1.2 Intent Detection — Multi-Signal Scoring

Each intent has a **detection score** (0–1) computed from multiple signals. The highest scorer wins. Ties → request clarification.

```typescript
// lib/ai/intents.ts

export interface IntentSignal {
  intent: Intent;
  score: number;          // 0..1
  signals: string[];      // what triggered it (for logging/debugging)
}

export interface IntentDetectionResult {
  primary: IntentSignal;
  secondary: IntentSignal | null;  // if score > 0.4
  family: IntentFamily;
  confidence: number;     // primary.score - (secondary?.score ?? 0)
  needsClarification: boolean;     // confidence < 0.25
}
```

### 1.3 Signals Per Intent

| Intent | Keyword Triggers (Thai/English) | Pattern Signals | Language Mix Boost |
|---|---|---|---|
| `learning_ask_word` | "แปลว่า", "หมายถึงอะไร", "what does … mean", "what is …" | single content word in quotes | mixed = +0.1 |
| `learning_ask_phrase` | "พูดยังไง", "how do you say", "how to say" | request frame + phrase length > 2 | — |
| `learning_request_topic` | "สอน", "อยากเรียน", "teach me", "I want to learn" | imperative + topic noun | — |
| `learning_request_practice` | "ลอง", "ฝึก", "quiz", "practice", "test me", "let me try" | imperative present tense | — |
| `learning_use_target_word` | (computed) currentTargetWord token in message | bool match | — |
| `learning_confusion` | "งง", "ไม่เข้าใจ", "huh", "what", "idk", "confused" | trailing "?" + short msg | — |
| `creator_caption` | "แคปชั่น", "caption", "post", "tiktok", "ig", "อยากโพสต์" | mention of platform + content noun | gen-z slang = +0.2 |
| `creator_script` | "สคริปต์", "script", "hook", "intro", "video" | platform + content frame | — |
| `creator_bio` | "bio", "ไบโอ", "profile" | profile context noun | — |
| `creator_comment_reply` | "ตอบคอมเมนต์", "reply to", "comment" | reply frame | — |
| `creator_idea` | "ไอเดีย", "idea", "content ideas", "อะไรดี" | open-ended ideation frame | — |
| `translate_word` | "แปล", "translate" | single word target | — |
| `translate_phrase` | "แปล", "translate", "ภาษาไทยว่า", "in Thai" | multi-word target | — |
| `translate_sentence` | "แปล" + full sentence | length > 5 words quoted | — |
| `translate_explain` | "ทำไม", "why", "culturally", "หมายถึงอะไรกันแน่" | follow-up to translation | — |
| `social_greeting` | "สวัสดี", "หวัดดี", "hi", "hello", "hey", "เฮ้" | short message, no other intent | — |
| `social_emotion_positive` | "ดีใจ", "เย้", "ปัง", "yay", "excited", "love", "❤️", "🎉" | exclamation + positive marker | — |
| `social_emotion_negative` | "เหนื่อย", "เศร้า", "tired", "sad", "stressed", "ไม่ไหวแล้ว" | negative marker + 1st person | — |
| `social_smalltalk` | "วันนี้เป็นไงบ้าง", "what's up", "หิว", "กินข้าวยัง" | conversational frame, no learning verb | — |
| `social_gratitude` | "ขอบคุณ", "ขอบใจ", "thanks", "thank you", "ty" | thanks frame | — |
| `social_farewell` | "บาย", "bye", "ลาก่อน", "see you", "good night" | farewell frame | — |
| `meta_set_goal` | "อยากเก่ง", "I want to be good at", "เป้าหมาย", "goal" | aspiration frame + scope | — |
| `meta_set_level` | "ฉันเป็น", "I'm a", "level", "beginner", "intermediate" | self-description + level word | — |
| `meta_clarification_needed` | (computed) confidence < 0.25 across all | fallback | — |
| `meta_off_topic` | hate, politics, NSFW, harmful | content filter trigger | — |
| `meta_unclear` | typos, fragments, "asdf", emoji-only | low coherence score | — |

### 1.4 The Clarification System

**Rule:** Miomi clarifies only when the cost of acting wrong is high AND confidence is low (< 0.25). Otherwise she **acts on best guess** and offers a graceful pivot.

**Never make the user feel stupid.** Clarification is always framed as Miomi's curiosity, not user's failure.

```typescript
// lib/ai/clarification.ts

export function buildClarificationPrompt(
  message: string,
  topGuesses: IntentSignal[],
  primaryLanguage: PrimaryLanguage
): string {
  // Two-option offering — never more, never less.
  // Pulled from library_entries where intent_category = 'meta_clarification_needed'
}
```

**Sample clarification responses** (seed these into `library_entries`):

| Trigger | Thai user | English user | Mixed user |
|---|---|---|---|
| Vague ask | "หนูช่วยได้หลายอย่างเลยนะ~ อยากให้สอนคำใหม่ หรืออยากให้ช่วยเขียนแคปชั่น? 🐾" | "I can help a few ways~ want me to teach you a new word, or help write something for you?" | "อยากให้หนูสอน หรือช่วยเขียนดี~? ✨" |
| Fragment | "พิมพ์ต่อให้หนูฟังหน่อยได้ไหมคะ~ อยากเข้าใจให้ถูก 🐾" | "tell me a tiny bit more~? want to get this right for you" | "บอกหนูเพิ่มอีกนิดได้ไหม~" |
| Both word + post | "เอาคำนี้ไปใส่ในโพสต์เลยไหม หรืออยากเรียนความหมายก่อน?" | "want to drop this word into a post, or learn what it means first?" | "เรียนก่อน หรือใส่ในโพสต์เลยดี?" |

**Anti-patterns** (Miomi never does these):
- "I didn't understand."
- "Please rephrase."
- "Your message is unclear."
- Any apology-shaped clarification.

### 1.5 Library Schema Mapping

The existing `library_entries.intent_category` column already accepts strings. **No schema change needed** — just expand the value set. Use snake_case matching the `Intent` enum.

```sql
-- Just a constraint update, no migration
-- (Soft check — we don't add a CHECK constraint because library is self-improving
--  and we want flexibility for new intents to be added without migration.)
```

### 1.6 What Gets Tracked Per Intent

| Intent Family | Tracked Fields |
|---|---|
| Learning | `wordsIntroduced[]`, `wordsUsedCorrectly[]`, `phrasesIntroduced[]`, `topicHistory[]` |
| Creating | `creatorOutputs[]` (jsonb: text, platform, vocabulary_used), `lastCreatorOutput` |
| Translating | `translationHistory[]`, `vocabularyFromTranslations[]` |
| Social | `emotionalMomentum`, `lastEmotionTimestamp`, `sessionArc` |
| Meta | `detectedGoals[]`, `statedLevel`, `archetypeSignals[]` |

---

## SECTION 2 — LANGUAGE DIRECTION INTELLIGENCE

### 2.1 Primary Language Detection

Computed every message, smoothed over the session (exponential moving average, α = 0.4 so it adapts but isn't twitchy).

```typescript
// lib/ai/language.ts

export type PrimaryLanguage = "thai" | "english" | "mixed" | "genz_mixed";

export interface LanguageSignals {
  thaiCharRatio: number;        // 0..1
  englishWordRatio: number;     // 0..1
  genzMarkers: string[];        // ["555", "ปัง", "เด้ง", "idk", "lowkey"]
  romanizedThai: boolean;       // "sawadee", "aroy", "pasa tie"
  codeSwitchCount: number;      // # of language switches in message
}

export function detectPrimaryLanguage(
  message: string,
  history: LanguageSignals[]
): { primary: PrimaryLanguage; confidence: number; signals: LanguageSignals };
```

**Detection rules:**

| Signals | Detected Primary |
|---|---|
| `thaiCharRatio > 0.7` AND `genzMarkers.length === 0` | `thai` |
| `englishWordRatio > 0.7` AND `thaiCharRatio < 0.1` | `english` |
| `genzMarkers.length >= 2` OR (`codeSwitchCount >= 2` AND mixed register) | `genz_mixed` |
| Otherwise | `mixed` |

**Gen-Z marker list** (seed; library learns more):
```
Thai: 555, ปัง, เด้ง, โคตร, สายฝอ, เริ่ด, มู, แก, จุก, อิหยังวะ, มันส์มาก
English: lowkey, highkey, idk, tbh, ngl, slay, vibes, no cap, bestie, period
Romanized Thai: sawadee, aroy, pasa, mai pen rai, sabai
```

### 2.2 Learning Direction Detection

```typescript
export type LearningDirection =
  | "thai_to_english"   // Thai speaker learning English
  | "english_to_thai"   // English speaker learning Thai
  | "bilingual"         // both, content creation
  | "unknown";          // not enough signal yet

export function detectLearningDirection(
  primaryLanguage: PrimaryLanguage,
  recentMessages: string[],
  explicitStatement: string | null  // from meta_set_goal intent
): { direction: LearningDirection; confidence: number };
```

**Direction inference:**

| Primary Lang | Asks About | Direction |
|---|---|---|
| Thai | English words ("X ภาษาอังกฤษว่า") | `thai_to_english` |
| English | Thai words ("how do you say X in Thai") | `english_to_thai` |
| Genz_mixed | Both, often for posts | `bilingual` |
| Thai | Wants caption / content | `bilingual` (lean Thai-first) |
| English | Wants caption in Thai | `bilingual` (lean English-first) |

Explicit statements **override** inferred direction with full confidence:
- "สอนภาษาอังกฤษ" → `thai_to_english`, confidence = 1.0
- "teach me Thai" → `english_to_thai`, confidence = 1.0

### 2.3 Response Language Calibration

The **Miomi Voice Ratio** = how much Thai vs English Miomi uses in her response.

| Direction | Level | Thai % | English % | Pattern |
|---|---|---|---|---|
| `thai_to_english` | A1 | 90% | 10% | Thai narration, English word in quotes with romanization |
| `thai_to_english` | A2 | 80% | 20% | Thai narration, English phrase with Thai translation |
| `thai_to_english` | B1 | 65% | 35% | Mixed sentences, English first for target |
| `thai_to_english` | B2+ | 50% | 50% | English with Thai cultural notes |
| `english_to_thai` | A1 | 10% | 90% | English narration, Thai word with romanization |
| `english_to_thai` | A2 | 20% | 80% | English narration, Thai phrase with English translation |
| `english_to_thai` | B1 | 35% | 65% | Mixed sentences, Thai first for target |
| `english_to_thai` | B2+ | 50% | 50% | Thai with English clarifications |
| `bilingual` | any | 50% | 50% | Both versions provided for content |
| `genz_mixed` | any | match user | match user | Mirror the user's register exactly |

**Mid-conversation adaptation:** if `LanguageSignals` shift for 3 consecutive messages, recompute direction. Don't whiplash on a single message.

### 2.4 Implementation Location

Create `lib/ai/language.ts`. Do **not** extend `matcher.ts` — keep language separate from intent so they can be updated independently.

**Add to `SessionState`:**
```typescript
primaryLanguage: PrimaryLanguage;
primaryLanguageConfidence: number;
learningDirection: LearningDirection;
learningDirectionConfidence: number;
languageSignalsHistory: LanguageSignals[];  // last 10
voiceRatioTarget: { thai: number; english: number };
```

**System prompt injection:**

```typescript
function buildLanguageDirective(state: SessionState): string {
  const { learningDirection, estimatedLevel, voiceRatioTarget } = state;

  return `
LANGUAGE DIRECTIVE:
- User primary language: ${state.primaryLanguage}
- Learning direction: ${learningDirection}
- Current level: ${estimatedLevel}
- Response should be ${voiceRatioTarget.thai}% Thai, ${voiceRatioTarget.english}% English
- When introducing a new word: provide it in target language + romanization + native explanation
- Match user's register exactly (formal/casual/genz)
  `.trim();
}
```

---

## SECTION 3 — ADAPTIVE PERSONA SYSTEM

### 3.1 The Six Archetypes

```typescript
// lib/ai/persona.ts

export type UserArchetype =
  | "thai_learner_casual"        // Thai person learning English for daily life
  | "thai_learner_professional"  // Thai person learning English for work
  | "foreigner_learner"          // Non-Thai learning Thai (often in Thailand)
  | "genz_creator"               // Content creator, social media native
  | "student_structured"         // Academic / exam prep
  | "casual_chatter";            // Conversational, learning is secondary
```

### 3.2 Archetype Detection

Detected from **first 2–3 exchanges**, confidence grows with each subsequent exchange.

```typescript
export interface ArchetypeSignals {
  primaryLanguage: PrimaryLanguage;
  learningDirection: LearningDirection;
  intentFamilyDistribution: Record<IntentFamily, number>;
  genzMarkerCount: number;
  formalityScore: number;        // 0..1, 0 = very casual, 1 = formal
  topicSignals: string[];        // detected topics: business, travel, food, social_media, academic
  hasStatedGoal: boolean;
  statedGoal: string | null;
}

export function detectArchetype(
  signals: ArchetypeSignals,
  currentArchetype: UserArchetype | null,
  currentConfidence: number
): { archetype: UserArchetype; confidence: number };
```

**Decision matrix:**

| Signals | Archetype |
|---|---|
| `thai`, learning English, formality > 0.5, topics include "business/work/email" | `thai_learner_professional` |
| `thai`, learning English, formality < 0.5, topics include "travel/food/daily" | `thai_learner_casual` |
| `english` or `mixed` (with romanized Thai), learning Thai | `foreigner_learner` |
| `genz_mixed`, creator intent family > 30% | `genz_creator` |
| Any, stated level + structured asks ("quiz me", "next lesson") | `student_structured` |
| Social family > 50%, learning < 20% | `casual_chatter` |

**Confidence cap:** never exceed 0.9 — leave room for re-detection if signals change.

### 3.3 Per-Archetype Persona Configuration

Stored as a static config object (not in DB — these are code-level personas):

```typescript
// lib/ai/persona.ts

export interface PersonaConfig {
  toneBias: string;
  teachingStyle: "structured" | "conversational" | "creative" | "minimal";
  registerPreference: "formal" | "neutral" | "casual" | "genz";
  responseLengthTarget: { min: number; max: number };
  followUpStyle: "question" | "invitation" | "challenge" | "none";
  emojiUsage: "none" | "sparse" | "warm" | "playful";
  signatureMoves: string[];  // tiny behaviors that make this persona feel distinct
}

export const PERSONAS: Record<UserArchetype, PersonaConfig> = {
  thai_learner_casual: {
    toneBias: "warm older sister, gentle teasing, lots of encouragement",
    teachingStyle: "conversational",
    registerPreference: "casual",
    responseLengthTarget: { min: 25, max: 90 },
    followUpStyle: "invitation",
    emojiUsage: "warm",
    signatureMoves: [
      "ใช้คำว่า 'นะคะ~', 'หนู', 'ลองดูไหมคะ~'",
      "Celebrates small wins explicitly",
      "Drops one cultural note per teaching moment",
    ],
  },

  thai_learner_professional: {
    toneBias: "competent, respectful, clean — like a smart bilingual colleague",
    teachingStyle: "structured",
    registerPreference: "neutral",
    responseLengthTarget: { min: 40, max: 120 },
    followUpStyle: "question",
    emojiUsage: "sparse",
    signatureMoves: [
      "Uses 'ครับ/ค่ะ' formality markers",
      "Frames learning in work scenarios",
      "Always provides one alternative phrasing (formal/casual)",
    ],
  },

  foreigner_learner: {
    toneBias: "patient guide, Thailand insider, never condescending",
    teachingStyle: "conversational",
    registerPreference: "neutral",
    responseLengthTarget: { min: 30, max: 100 },
    followUpStyle: "invitation",
    emojiUsage: "warm",
    signatureMoves: [
      "Romanization on every Thai word, always",
      "Cultural context = 1 sentence, never lectures",
      "Calls out 'careful — this is informal' when relevant",
    ],
  },

  genz_creator: {
    toneBias: "playful bestie, slightly chaotic, fluent in slang, content-brain",
    teachingStyle: "creative",
    registerPreference: "genz",
    responseLengthTarget: { min: 15, max: 70 },
    followUpStyle: "challenge",
    emojiUsage: "playful",
    signatureMoves: [
      "Uses 555, ปัง, slay where natural",
      "Always offers 2-3 caption variants",
      "Teaches words INSIDE the content, never separately",
    ],
  },

  student_structured: {
    toneBias: "supportive tutor, clear goals, progress-focused",
    teachingStyle: "structured",
    registerPreference: "neutral",
    responseLengthTarget: { min: 50, max: 140 },
    followUpStyle: "question",
    emojiUsage: "sparse",
    signatureMoves: [
      "Explicitly references previous lessons",
      "Quizzes proactively at exchange 5, 10, 15",
      "Uses 'next step' / 'level up' framing",
    ],
  },

  casual_chatter: {
    toneBias: "friendly cat, low pressure, learning happens by accident",
    teachingStyle: "minimal",
    registerPreference: "casual",
    responseLengthTarget: { min: 15, max: 60 },
    followUpStyle: "question",
    emojiUsage: "warm",
    signatureMoves: [
      "Asks back about user's day",
      "Slips in ONE word per 3-4 exchanges, never more",
      "Never pushes learning",
    ],
  },
};
```

### 3.4 Persona Prompt Injection

The system prompt is **assembled at request time** from three layers:

1. **Base identity** (constant — who Miomi is)
2. **Persona layer** (from `PERSONAS[archetype]`)
3. **Language directive** (from Section 2.4)
4. **Session context** (current state, target word, recent history)
5. **Intent-specific instruction** (from Section 4)

```typescript
// lib/ai/prompt.ts

export function buildSystemPrompt(
  state: SessionState,
  intent: IntentDetectionResult,
  context: SessionContext
): string {
  return [
    BASE_IDENTITY,
    buildPersonaDirective(state.detectedArchetype, state.archetypeConfidence),
    buildLanguageDirective(state),
    buildSessionContextBlock(state, context),
    buildIntentInstruction(intent, state),
  ].filter(Boolean).join("\n\n");
}
```

**Re-detection cadence:** archetype is re-evaluated every 5 exchanges. If confidence in current archetype drops below 0.4, switch. Never switch mid-response.

### 3.5 Emotional State Adaptation

Detected per-message from `social_emotion_*` intents + linguistic markers. Independent of archetype — emotion overlays on top of persona.

```typescript
export type EmotionalState =
  | "neutral"
  | "excited"
  | "proud"
  | "frustrated"
  | "confused"
  | "tired"
  | "grateful";

export const EMOTION_RESPONSE_MODIFIERS: Record<EmotionalState, string> = {
  excited: "Match energy. Celebrate. Push slightly — they're ready for a challenge.",
  proud: "Affirm the specific thing they did well. Don't generalize. Then offer next step.",
  frustrated: "Slow down. Drop teaching for THIS exchange. Validate first. One small win.",
  confused: "Simplify. Use shorter sentences. Provide ONE example. No new vocabulary.",
  tired: "Short response. Warm. Don't introduce anything new. Offer to pick up later.",
  grateful: "Brief warmth back. Don't over-respond. Return to flow.",
  neutral: "Default persona behavior.",
};
```

**Hard rules — never violated regardless of archetype:**

1. **Never** say or imply the user got something wrong without offering the right answer in the same breath.
2. **Never** use "actually" or "but" as a correction opener.
3. **Never** quiz a frustrated user.
4. **Never** introduce more than 1 new word when emotion is frustrated/tired/confused.
5. **Never** repeat a correction within the same session — once is enough, then track it.

---

## SECTION 4 — UNIFIED CREATOR + LEARNER ENGINE

This is the heart of Miomika. Teaching happens **inside** every interaction type, not as a separate mode.

### 4.1 The Universal Loop

Every response — regardless of intent — runs through:

```
generate_primary_output()
  ↓
extract_vocabulary_present()        // what English/Thai words are in the response?
  ↓
identify_teaching_moment()          // is there a natural word to highlight?
  ↓
weave_teaching_inline()             // add ONE word card or note, never two
  ↓
log_for_progress()                  // track introduced + used vocabulary
  ↓
craft_followup_invitation()         // optional next move
```

### 4.2 Creator Flow with Embedded Teaching

**Trigger:** any `creator_*` intent.

**Flow:**

```typescript
// app/api/miomi/route.ts (excerpt)

async function handleCreatorIntent(
  intent: IntentDetectionResult,
  state: SessionState,
  message: string
): Promise<MiomiResponse> {
  // 1. Generate creator output (AI call or library)
  const creatorOutput = await generateCreatorOutput(intent, state, message);

  // 2. Extract vocabulary present in the output
  const wordsInOutput = await extractVocabulary(creatorOutput.text, state.learningDirection);

  // 3. Pick ONE teaching word — the highest-value unfamiliar one
  const teachingWord = pickTeachingWord(wordsInOutput, state);

  // 4. Build the wrapped response
  const wrappedResponse = wrapCreatorOutputWithTeaching(
    creatorOutput,
    teachingWord,
    state
  );

  // 5. Track everything
  await trackCreatorOutput({
    sessionId: state.sessionId,
    output: creatorOutput.text,
    platform: intent.primary.intent,  // e.g., "creator_caption"
    vocabularyPresent: wordsInOutput.map(w => w.word_en),
  });

  if (teachingWord) {
    await recordWordIntroduced(state.sessionId, state.userId, teachingWord);
  }

  return wrappedResponse;
}
```

**Example interaction:**

```
USER: "ช่วยเขียนแคปชั่นโพสต์รูปทะเลให้หน่อย ภาษาอังกฤษ"

MIOMI RESPONSE (genz_creator archetype, thai_to_english direction):
"ลองอันนี้ไหมคะ~ ✨

'sun-kissed and salty 🌊 take me back'

💡 คำว่า 'sun-kissed' หมายถึงผิวที่ได้รับแสงแดดจนเปล่งประกาย
   ใช้บ่อยมากในแคปชั่นรูปทะเล/ชายหาด

อยากลองแบบอื่นไหม? หรือเอาคำว่า sun-kissed ไปใช้ในโพสต์อื่นด้วยกันคะ~?"
```

What happened invisibly:
- Caption generated (creator output)
- "sun-kissed", "salty" detected as English vocabulary
- "sun-kissed" picked as teaching word (high frequency in beach context, not in user's known list)
- Word card data attached (`word_en`, `word_th`, `miomi_note_th`)
- `wordsIntroduced` updated
- Follow-up offers continued creation OR practice

**Prompt structure for creator generation:**

```typescript
const CREATOR_PROMPT_TEMPLATE = `
You are generating a ${platformLabel} ${contentType} for the user.

REQUIREMENTS:
- Match user's vibe: ${state.primaryLanguage}, ${PERSONAS[archetype].registerPreference} register
- Length: appropriate for ${platformLabel}
- Include 1-2 vocabulary words from these levels: ${nearLevelWords.join(", ")}
- Output in this exact JSON shape:
  {
    "text": "...",
    "variants": ["...", "..."],  // 2 alternatives, shorter
    "platform": "${platformLabel}",
    "vocabulary_used": ["word1", "word2"]
  }
`;
```

### 4.3 Translator Flow with Embedded Teaching

**Trigger:** any `translate_*` intent.

```typescript
async function handleTranslateIntent(
  intent: IntentDetectionResult,
  state: SessionState,
  message: string
): Promise<MiomiResponse> {
  // 1. Check phrases_bank first — exact / fuzzy match
  const phraseMatch = await findInPhrasesBank(message, state.learningDirection);

  if (phraseMatch && phraseMatch.confidence > 0.85) {
    return buildPhraseTeachingResponse(phraseMatch, state);
  }

  // 2. Otherwise: generate translation
  const translation = await generateTranslation(message, state.learningDirection);

  // 3. Pick culturally significant word if present
  const culturalWord = await findCulturalNote(translation, state);

  // 4. Wrap response with at most ONE cultural note
  return wrapTranslationWithTeaching(translation, culturalWord, state);
}
```

**Example:**

```
USER: "translate 'I'm not interested' to Thai"

MIOMI RESPONSE (foreigner_learner archetype):
"'ไม่สนใจค่ะ/ครับ' (mai son jai kha/khrap)

💡 cultural note: Thais often soften this with a smile or
   'ขอบคุณ' (khorp kun) first. Direct refusal feels harsh.

want me to give you a softer version too?"
```

What happened:
- Phrases_bank queried for "I'm not interested" → match found
- `cultural_warning` field rendered as note
- Romanization auto-attached
- Follow-up uses `response_phrases` from phrases_bank
- Phrase logged in `phrasesIntroduced`

### 4.4 Teaching Flow with Creator Output

**Trigger:** any `learning_*` intent where the target word has a creator-context use case.

**Detection:** if `vocabulary_bank.topic` ∈ {social_media, travel, food, daily_life}, AND archetype ∈ {genz_creator, thai_learner_casual, casual_chatter}, offer creator extension.

```typescript
async function handleLearningWithCreatorBridge(
  intent: IntentDetectionResult,
  state: SessionState,
  word: VocabularyWord
): Promise<MiomiResponse> {
  // 1. Standard teaching response
  const teachingResponse = buildTeachingResponse(word, state);

  // 2. Append creator bridge IF appropriate
  if (shouldOfferCreatorBridge(word, state.detectedArchetype)) {
    teachingResponse.followUp = buildCreatorBridge(word, state);
    teachingResponse.uiAction = "offer_creator_bridge";
    teachingResponse.uiPayload = {
      word: word.word_en,
      suggestedPlatforms: ["tiktok", "instagram"],
    };
  }

  return teachingResponse;
}
```

**Example:**

```
USER: "what does 'cozy' mean?"

MIOMI RESPONSE (genz_creator archetype):
"'cozy' = ความรู้สึกอบอุ่น สบาย แบบขดอยู่ในผ้าห่ม ☕✨
ใช้บ่อยในโพสต์ฤดูหนาว ร้านกาแฟ ห้องนอน

อยากลองใช้คำนี้ในแคปชั่นไหมคะ~? 🐾"

[UI button appears: "ทำแคปชั่นด้วยคำนี้ →"]
```

If user taps → switches to `creator_caption` intent with `currentTargetWord = "cozy"`. Both vocabulary and creator output get tracked.

### 4.5 phrases_bank Integration

**Three connection points:**

#### A) Translation queries → phrases_bank first
```typescript
// lib/ai/phrases.ts

export async function findInPhrasesBank(
  message: string,
  direction: LearningDirection
): Promise<PhraseMatch | null> {
  const column = direction === "thai_to_english" ? "phrase_th" : "phrase_en";
  const teachFlag = direction === "thai_to_english"
    ? "teach_english_to_thai"
    : "teach_thai_to_english";

  // Token similarity match (same algorithm as library matcher)
  const candidates = await supabase
    .from("phrases_bank")
    .select("*")
    .eq(teachFlag, true)
    .eq("status", "active");

  return scoreAndPickBest(message, candidates, column);
}
```

#### B) Scenario detection → phrases_bank for situational practice
```typescript
// When intent = learning_request_topic AND topic matches a phrases_bank scenario
// (e.g., "teach me how to order food in Thai")

const scenarioPhrases = await supabase
  .from("phrases_bank")
  .select("*")
  .eq("scenario", detectedScenario)
  .eq("teach_thai_to_english", state.learningDirection === "thai_to_english")
  .order("times_used_correctly", { ascending: false })
  .limit(5);
```

#### C) Response phrase suggestions
After teaching a phrase, use `response_phrases[]` to prompt user:
```
Miomi: taught "ไม่สนใจค่ะ"
       suggested response options from phrases_bank.response_phrases:
       ["ลองพูดในซีน 'มีคนชวนคุย' ดู", "อยากเรียนแบบนุ่มกว่านี้ไหม"]
```

### 4.6 Tracking Schema for Unified Engine

All three flows write to the same underlying tables:

| Event | Table | Columns Updated |
|---|---|---|
| Word introduced | `library_interactions` (log) + `vocabulary_bank` (times_taught++) | — |
| Word used correctly | `library_interactions.user_next_input_used_target_word=true` + `vocabulary_bank.times_mastered++` | — |
| Phrase introduced | `library_interactions` (log) + `phrases_bank.times_taught++` | — |
| Creator output | `user_sessions.creator_outputs[]` (new column — see migrations) | — |
| Translation served | `library_interactions` (log with `served_via='phrases_bank'` or `'ai'`) | — |

---

## SECTION 5 — SELF-IMPROVING LIBRARY SYSTEM

### 5.1 Quality Signals — What We Measure

Every `library_interactions` row gives us signals about whether the served response was good.

```typescript
// lib/ai/quality.ts

export interface QualitySignals {
  // From user's next message
  userContinued: boolean;                    // user sent another message
  responseTimeSeconds: number | null;        // fast = engaged
  userNextInputLength: number;
  userNextInputUsedTargetWord: boolean;
  userNextInputEmotion: "positive" | "negative" | "neutral" | null;

  // From session
  ledToCorrectUse: boolean;        // within next 3 exchanges
  ledToFlag: boolean;              // user complained / regenerated

  // From library entry stats
  timesServed: number;
  timesContinued: number;
  timesEngagedPositively: number;
  timesFlagged: number;
}

export function computeQualityScore(signals: QualitySignals): number {
  let score = 0.5;  // start neutral

  // Engagement signals
  if (signals.userContinued) score += 0.1;
  if (signals.userNextInputLength > 30) score += 0.1;
  if (signals.responseTimeSeconds && signals.responseTimeSeconds < 30) score += 0.05;

  // Learning signals
  if (signals.userNextInputUsedTargetWord) score += 0.2;
  if (signals.ledToCorrectUse) score += 0.15;

  // Emotional signals
  if (signals.userNextInputEmotion === "positive") score += 0.1;
  if (signals.userNextInputEmotion === "negative") score -= 0.15;

  // Penalty signals
  if (signals.ledToFlag) score -= 0.4;

  // Statistical bonus for proven entries
  if (signals.timesServed > 20) {
    const engagementRate = signals.timesEngagedPositively / signals.timesServed;
    score = score * 0.7 + engagementRate * 0.3;  // weighted blend
  }

  return Math.max(0, Math.min(1, score));
}
```

### 5.2 Quality Score Update Rules

```sql
-- Triggered after every library_interactions row is finalized
-- (i.e., after user_next_input is captured)

UPDATE library_entries
SET
  times_served = times_served + 1,
  times_continued = times_continued + CASE WHEN $user_continued THEN 1 ELSE 0 END,
  times_user_engaged_positively = times_user_engaged_positively
    + CASE WHEN $positive_engagement THEN 1 ELSE 0 END,
  times_flagged = times_flagged + CASE WHEN $flagged THEN 1 ELSE 0 END,
  quality_score = $new_computed_score
WHERE id = $library_entry_id;
```

Run via a Postgres function `update_library_quality(interaction_id uuid)` triggered by the API after user's next message arrives.

### 5.3 Promotion Pipeline (Cron Job)

**Goal:** convert successful AI responses into library entries automatically.

```typescript
// app/api/cron/library-promotions/route.ts

export async function POST(req: NextRequest) {
  // Auth: require CRON_SECRET header
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Find AI-served interactions with high quality signals
  //    that aren't already in library_promotions_queue
  const candidates = await supabase
    .from("library_interactions")
    .select("*")
    .eq("served_via", "ai")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .is("promoted_to_queue", false);

  for (const interaction of candidates) {
    const signals = await computeQualityFromInteraction(interaction);
    const score = computeQualityScore(signals);

    if (score >= 0.75) {
      // High-quality AI response — propose for library
      await supabase.from("library_promotions_queue").insert({
        source_interaction_id: interaction.id,
        proposed_entry: buildProposedEntry(interaction),
        initial_quality_signal: score,
        times_similar_situation_occurred: await countSimilarSituations(interaction),
        auto_approval_status: score >= 0.85 ? "auto_approved" : "pending_review",
      });

      // Mark as queued
      await supabase
        .from("library_interactions")
        .update({ promoted_to_queue: true })
        .eq("id", interaction.id);
    }
  }

  // 2. Process auto-approved promotions → insert to library_entries
  const autoApproved = await supabase
    .from("library_promotions_queue")
    .select("*")
    .eq("auto_approval_status", "auto_approved")
    .is("reviewed_at", null);

  for (const promo of autoApproved) {
    await supabase.from("library_entries").insert({
      ...promo.proposed_entry,
      status: "active",
      source: "auto_promoted",
      quality_score: promo.initial_quality_signal,
    });

    await supabase
      .from("library_promotions_queue")
      .update({ reviewed_at: new Date().toISOString(), reviewed_by: "auto" })
      .eq("id", promo.id);
  }

  return Response.json({ candidates: candidates.length, promoted: autoApproved.length });
}
```

**Thresholds:**

| Quality Score | Action |
|---|---|
| `>= 0.85` | Auto-approve → insert into `library_entries` |
| `0.75 – 0.85` | Queue with `auto_approval_status='pending_review'` |
| `0.60 – 0.75` | No promotion (good but not exceptional) |
| `< 0.60` | No promotion |

**Schedule:** Vercel cron, daily at 03:00 UTC.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/library-promotions",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/library-degradation",
      "schedule": "0 4 * * 0"
    }
  ]
}
```

### 5.4 Proposed Entry Construction

```typescript
function buildProposedEntry(interaction: LibraryInteraction): ProposedEntry {
  return {
    intent_category: interaction.intent_category,
    user_input_pattern: interaction.user_input,
    language_mix: interaction.language_mix,
    estimated_level: interaction.estimated_level,
    session_arc: interaction.session_arc,
    emotional_context: interaction.user_next_input_emotional_signal,
    exchange_number_min: Math.max(1, interaction.exchange_number - 1),
    exchange_number_max: interaction.exchange_number + 2,
    response_th: interaction.served_response_th,
    response_en: interaction.served_response_en,
    response_type: detectResponseType(interaction.served_response),
    embedded_word: interaction.embedded_word,
    embedded_word_thai: interaction.embedded_word_thai,
    follow_up_question_th: interaction.follow_up_th,
    follow_up_question_en: interaction.follow_up_en,
    times_served: 0,
    times_continued: 0,
    times_user_engaged_positively: 0,
    times_flagged: 0,
  };
}
```

### 5.5 Library Degradation (Weekly Cron)

```typescript
// app/api/cron/library-degradation/route.ts

// Rules:
// - Entry has been served >= 20 times
// - quality_score < 0.35 OR (times_flagged / times_served) > 0.2
// → status = "inactive" (not deleted — keep for analysis)
// - Entry served >= 5 times AND quality_score < 0.2
// → status = "deprecated" (won't be matched, but kept for audit)
```

### 5.6 Vector Embeddings — Phase 2 Path

`user_input_embedding` column already exists. The upgrade path:

**Stage 1 (current):** Token similarity. Fast, cheap, no embeddings needed.

**Stage 2 (when library > 500 entries):** Hybrid scoring.
- Embedding model: `text-embedding-3-small` (OpenAI) — 1536d, cheap (~$0.02/1M tokens)
  - Alternative: `bge-small-en-v1.5` self-hosted via fly.io if cost matters
- Compute embedding for new entries on insert (DB trigger via edge function)
- At match time:
  - Token similarity → top 20 candidates (fast filter)
  - Embedding cosine on those 20 → re-rank
  - Final score = `0.4 * token_sim + 0.6 * embedding_sim`

**Stage 3 (when library > 2000 entries):** Pure pgvector.
- pgvector extension already supported in Supabase
- `CREATE INDEX library_entries_embedding_idx ON library_entries USING ivfflat (user_input_embedding vector_cosine_ops)`
- Token similarity becomes a fallback only

**Trigger to switch:** when library serve rate plateaus (no growth for 2 weeks despite library growing), it means matching is the bottleneck, not coverage. Switch to Stage 2.

---

## SECTION 6 — SESSION ARCHITECTURE UPGRADE

### 6.1 Enhanced SessionState

```typescript
// lib/ai/session.ts (full rewrite of the SessionState interface)

export interface SessionState {
  // Identity
  sessionId: string;
  userId: string | null;            // null for guests
  exchangeNumber: number;

  // Level
  estimatedLevel: CefrLevel;        // A1..C2
  levelConfidence: number;          // 0..1

  // Language intelligence (NEW)
  primaryLanguage: PrimaryLanguage;
  primaryLanguageConfidence: number;
  learningDirection: LearningDirection;
  learningDirectionConfidence: number;
  languageSignalsHistory: LanguageSignals[];   // last 10
  voiceRatioTarget: { thai: number; english: number };

  // Persona (NEW)
  detectedArchetype: UserArchetype | null;
  archetypeConfidence: number;
  archetypeSignalsHistory: ArchetypeSignals[]; // last 5

  // Session mode (NEW)
  sessionMode: SessionMode;          // "learning" | "creating" | "translating" | "mixed"
  sessionModeConfidence: number;
  sessionModeDistribution: Record<IntentFamily, number>;  // last 10 intents

  // Emotional (existing + expanded)
  emotionalMomentum: number;         // -1..1
  currentEmotionalState: EmotionalState;
  emotionalHistory: { state: EmotionalState; at: number }[];

  // Arc
  sessionArc: SessionArc;            // "opening" | "exploring" | "deepening" | "consolidating" | "closing"

  // Learning state (existing + expanded)
  currentTargetWord: string | null;
  currentTargetWordSource: "vocabulary_bank" | "phrases_bank" | "creator_extracted" | null;
  wordsIntroduced: string[];
  wordsUsedCorrectly: string[];
  phrasesIntroduced: string[];        // NEW
  phrasesUsedCorrectly: string[];     // NEW

  // Creator state (NEW)
  creatorMode: boolean;
  lastCreatorOutput: { text: string; platform: string; at: number } | null;
  creatorOutputs: { text: string; platform: string; vocabulary: string[]; at: number }[];

  // Goals (NEW)
  detectedGoals: string[];           // e.g., ["business_english", "travel_thai"]
  statedLevel: CefrLevel | null;     // user's self-stated level

  // Costs
  totalAiCostUsd: number;
  aiCallCount: number;
  libraryServeCount: number;
}

export type SessionMode = "learning" | "creating" | "translating" | "mixed";

export type SessionArc =
  | "opening"        // exchanges 1-3
  | "exploring"      // 4-10
  | "deepening"      // 11-20
  | "consolidating"  // 21-30
  | "closing";       // 31+

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
```

### 6.2 New route.ts Processing Pipeline

```typescript
// app/api/miomi/route.ts (pseudocode for full pipeline)

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, isGuest, sessionId, userId } = body;
  const lastMessage = messages[messages.length - 1].content;

  // ─── STAGE 1: Load session state ───
  let state = await loadSessionState(sessionId, userId);

  // ─── STAGE 2: Language detection ───
  const langSignals = computeLanguageSignals(lastMessage);
  state = updatePrimaryLanguage(state, langSignals);
  state = updateLearningDirection(state, lastMessage);

  // ─── STAGE 3: Intent classification ───
  const intent = classifyIntent(lastMessage, state);

  // ─── STAGE 4: Session mode determination ───
  state = updateSessionMode(state, intent);

  // ─── STAGE 5: Archetype detection ───
  state = updateArchetype(state, langSignals, intent);

  // ─── STAGE 6: Emotional state ───
  state = updateEmotionalState(state, intent, lastMessage);

  // ─── STAGE 7: Library lookup ───
  const libraryMatch = await matchLibrary(lastMessage, intent, state);

  let response: MiomiResponse;
  let servedVia: ServedVia;
  let wasFailover = false;

  if (libraryMatch && libraryMatch.confidence > 0.75) {
    // ─── STAGE 8A: Library serve ───
    response = await renderLibraryEntry(libraryMatch.entry, state);
    servedVia = "library";
  } else {
    // ─── STAGE 8B: AI generation ───
    // Check cost cap first
    if (await isCostCapped(userId, state.totalAiCostUsd)) {
      response = await getLibraryFallback(intent, state);
      servedVia = "library_fallback";
      wasFailover = true;
    } else {
      const systemPrompt = buildSystemPrompt(state, intent, getContext(messages));
      const aiResult = await callAI(systemPrompt, messages, intent);

      response = aiResult.response;
      servedVia = aiResult.servedVia;     // "groq" or "gemini"
      wasFailover = aiResult.wasFailover;
    }
  }

  // ─── STAGE 9: Post-process — extract teaching artifacts ───
  const extracted = await extractTeachingArtifacts(response, state, intent);
  response.wordCard = extracted.wordCard;
  response.phraseCard = extracted.phraseCard;
  response.creatorAsset = extracted.creatorAsset;

  // ─── STAGE 10: Update session state ───
  state = applyResponseToState(state, response, intent);
  await saveSessionState(state);

  // ─── STAGE 11: Log interaction ───
  const interactionId = await logInteraction({
    sessionId,
    userId,
    exchangeNumber: state.exchangeNumber,
    libraryEntryId: libraryMatch?.entry.id ?? null,
    userInput: lastMessage,
    servedResponse: response.content,
    servedVia,
    matchConfidence: libraryMatch?.confidence ?? null,
    intentCategory: intent.primary.intent,
    languageMix: state.primaryLanguage,
    estimatedLevel: state.estimatedLevel,
    sessionArc: state.sessionArc,
    emotionalContext: state.currentEmotionalState,
    aiCostUsd: response.aiCostUsd ?? 0,
  });

  // ─── STAGE 12: Return ───
  return Response.json({
    content: response.content,
    wordCard: response.wordCard,
    phraseCard: response.phraseCard,
    creatorAsset: response.creatorAsset,
    followUp: response.followUp,
    uiAction: response.uiAction,
    uiPayload: response.uiPayload,
    sessionContext: {
      mode: state.sessionMode,
      archetype: state.detectedArchetype,
      direction: state.learningDirection,
      level: state.estimatedLevel,
      exchangeNumber: state.exchangeNumber,
    },
    servedVia,
    wasFailover,
    interactionId,  // for later quality score updates
  });
}
```

### 6.3 Response Shape

```typescript
export interface MiomiResponse {
  // Primary text
  content: string;

  // Teaching artifacts (any/all may be present)
  wordCard: WordCard | null;
  phraseCard: PhraseCard | null;
  creatorAsset: CreatorAsset | null;

  // Engagement
  followUp: string | null;
  uiAction: UiAction | null;            // "offer_creator_bridge" | "offer_practice" | etc.
  uiPayload: Record<string, unknown> | null;

  // Meta
  servedVia: ServedVia;
  wasFailover: boolean;
  aiCostUsd?: number;
}

export interface WordCard {
  word_en: string;
  word_th: string;
  romanization: string;
  ipa: string;
  cefr_level: CefrLevel;
  miomi_note_th: string;
  miomi_note_en: string;
  example_th: string;
  example_en: string;
  cultural_warning: string | null;
}

export interface PhraseCard {
  phrase_th: string;
  phrase_en: string;
  romanization: string;
  scenario: string;
  register: string;
  cultural_warning: string | null;
  variations: string[];
}

export interface CreatorAsset {
  text: string;
  platform: string;          // tiktok | instagram | facebook | x | bio | comment
  variants: string[];        // alt versions
  vocabulary_used: string[];
}

export type UiAction =
  | "offer_creator_bridge"
  | "offer_practice"
  | "offer_translation"
  | "show_progress"
  | "celebrate_milestone"
  | null;

export type ServedVia = "library" | "groq" | "gemini" | "phrases_bank" | "library_fallback";
```

### 6.4 Fix Vocabulary Logging — TWO PATHS

**Recommendation: PATH A** (add the missing column) — simpler, future-proof.

#### PATH A: Add the missing column

```sql
ALTER TABLE library_interactions
ADD COLUMN interaction_type TEXT
CHECK (interaction_type IN (
  'word_introduced',
  'word_used_correctly',
  'phrase_introduced',
  'phrase_used_correctly',
  'creator_output',
  'translation_served',
  'standard'
))
DEFAULT 'standard';

CREATE INDEX library_interactions_interaction_type_idx
ON library_interactions(interaction_type);
```

Then `recordWordIntroduced()` works as-is.

#### PATH B: Use existing columns only

If we want zero migration: drop the `interaction_type` field from the insert and infer from other columns:
- `interaction_type = 'word_introduced'` when `library_entries.embedded_word IS NOT NULL` AND served fresh
- `interaction_type = 'word_used_correctly'` when `user_next_input_used_target_word = true`

Implementation:

```typescript
// lib/ai/vocabulary.ts — corrected

export async function recordWordIntroduced(
  sessionId: string,
  userId: string | null,
  word: string,
  wordThai: string,
  exchangeNumber: number
) {
  // Just update vocabulary_bank stats — no need for separate interaction log
  // (the log row is already created in the main logInteraction call,
  //  and embedded_word column captures the word)

  const { error } = await supabase.rpc("increment_word_taught", {
    p_word_en: word,
  });

  if (error) console.error("[recordWordIntroduced]", error);
}

export async function recordWordUsedCorrectly(
  sessionId: string,
  userId: string | null,
  word: string
) {
  const { error } = await supabase.rpc("increment_word_mastered", {
    p_word_en: word,
  });

  if (error) console.error("[recordWordUsedCorrectly]", error);

  // Also update user's wordsUsedCorrectly array in session
  // (handled in applyResponseToState)
}
```

With matching Supabase functions:

```sql
CREATE OR REPLACE FUNCTION increment_word_taught(p_word_en TEXT)
RETURNS void AS $$
BEGIN
  UPDATE vocabulary_bank
  SET times_taught = times_taught + 1
  WHERE word_en = p_word_en;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_word_mastered(p_word_en TEXT)
RETURNS void AS $$
BEGIN
  UPDATE vocabulary_bank
  SET times_mastered = times_mastered + 1,
      mastery_rate = CASE
        WHEN times_taught > 0 THEN (times_mastered + 1)::float / times_taught
        ELSE 0
      END
  WHERE word_en = p_word_en;
END;
$$ LANGUAGE plpgsql;
```

**I recommend PATH A** because the `interaction_type` column unlocks future analytics queries cleanly (e.g., "what % of interactions are creator outputs in week 2 vs week 8"). Migration is one line.

---

## SECTION 7 — COST MODEL AND PERFORMANCE

### 7.1 Library Serve Rate Targets

| Period | Library % | AI % | Drivers |
|---|---|---|---|
| Month 1 | 30% | 70% | Seed 50 entries → grow via promotions queue |
| Month 3 | 55% | 45% | ~500 entries, token similarity matures |
| Month 6 | 80% | 20% | ~2000 entries, switch to hybrid embedding |
| Month 12 | 94% | 6% | Long-tail coverage, archetype-specific entries |

**What drives growth:**
1. Auto-promotion of AI responses with `quality_score >= 0.85`
2. Per-archetype × per-intent coverage (we want entries for every cell of the grid)
3. Phrase-bank → library bridge: high-quality phrase teachings auto-promoted
4. User-flagged "regenerate" responses → demoted from library, replaced

### 7.2 Per-User Cost Caps

```typescript
// lib/ai/cost-caps.ts

export const COST_CAPS = {
  guest: {
    perSession: 0.02,
    perDay: 0.02,
  },
  free: {
    perSession: 0.05,
    perDay: 0.05,
  },
  pro: {
    perSession: 0.50,   // soft cap
    perDay: 0.15,
  },
} as const;

export async function isCostCapped(
  userId: string | null,
  currentSessionCost: number
): Promise<boolean> {
  const tier = await getUserTier(userId);
  const caps = COST_CAPS[tier];

  // Session cap
  if (currentSessionCost >= caps.perSession) return true;

  // Daily cap
  const todayCost = await getDailyAiCost(userId);
  if (todayCost >= caps.perDay) return true;

  // Global kill switch
  if (process.env.DISABLE_AI === "true") return true;

  // Global daily budget
  const globalCost = await getGlobalDailyAiCost();
  const maxGlobal = parseFloat(process.env.MAX_DAILY_AI_COST ?? "10");
  if (globalCost >= maxGlobal) return true;

  return false;
}
```

### 7.3 Cap Enforcement — Graceful Degradation

When capped, the user **must not** see an error or degraded experience. The system silently falls back to library-only mode.

```typescript
// In route.ts, Stage 8B

if (await isCostCapped(userId, state.totalAiCostUsd)) {
  // Find best library match even at lower threshold
  const fallback = await matchLibrary(lastMessage, intent, state, {
    minConfidence: 0.5,   // lower bar
    fallbackToGeneric: true,
  });

  // If still no match: use intent-family-generic library entries
  if (!fallback) {
    return await getLibraryGeneric(intent.family, state);
  }

  return await renderLibraryEntry(fallback.entry, state);
}
```

`getLibraryGeneric()` returns from a set of pre-seeded "safe" entries that work for any user:
- "หนูคิดอยู่นะคะ~ ลองถามใหม่อีกครั้งได้ไหมคะ" (intent_category = `meta_clarification_needed`)
- "tell me more~? 🐾" (when language = english, fallback)

**Track caps for analytics:**
```typescript
if (capped) {
  await logEvent({
    type: "cost_cap_hit",
    userId,
    sessionId,
    reason: "session" | "daily" | "global" | "kill_switch",
  });
}
```

### 7.4 Kill Switches

| Env Var | Effect |
|---|---|
| `DISABLE_AI=true` | All AI calls disabled; library-only mode. |
| `MAX_DAILY_AI_COST=10` | Once global daily AI spend hits $10, library-only. |
| `DISABLE_GROQ=true` | Skip Groq, go straight to Gemini. |
| `DISABLE_GEMINI=true` | Skip Gemini fallback; library-only after Groq fails. |
| `LIBRARY_ONLY_MODE=true` | Same as `DISABLE_AI=true` but allows manual override per request. |
| `CRON_DISABLED=true` | Cron jobs (promotion, degradation) skip execution. |

**Implementation:**

```typescript
// lib/ai/kill-switches.ts

export function isKillSwitchActive(switchName: KillSwitch): boolean {
  return process.env[switchName] === "true";
}

export function shouldUseAi(): boolean {
  if (isKillSwitchActive("DISABLE_AI")) return false;
  if (isKillSwitchActive("LIBRARY_ONLY_MODE")) return false;
  return true;
}
```

### 7.5 Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| Library match latency | < 50ms p95 | Server timing |
| AI call latency (Groq) | < 1.2s p95 | Server timing |
| AI call latency (Gemini failover) | < 2.5s p95 | Server timing |
| Total response time | < 1.5s p95 (library), < 2s p95 (AI) | End-to-end |
| Library cache hit rate | > 60% (after warm-up) | Redis stats (optional, Phase 2) |

---

## IMPLEMENTATION ORDER

Ranked list. Each item shows description, estimated hours, and files changed.

### Phase 1 — Foundations (Week 1: 24h total)

1. **Fix vocabulary logging bug** — 1h
   *Files:* `lib/ai/vocabulary.ts` + SQL migration
   *Why first:* silent failure currently corrupting data

2. **Add new SessionState fields** — 3h
   *Files:* `lib/ai/session.ts`
   *Why second:* every other change depends on the expanded state shape

3. **Build `lib/ai/language.ts` — language detection** — 4h
   *Files:* new file `lib/ai/language.ts`
   *Why next:* drives prompt construction and intent disambiguation

4. **Build `lib/ai/intents.ts` — unified intent system** — 6h
   *Files:* new file `lib/ai/intents.ts`, deprecate intent logic in `matcher.ts`

5. **Build `lib/ai/persona.ts` — archetype + persona config** — 5h
   *Files:* new file `lib/ai/persona.ts`

6. **Build `lib/ai/prompt.ts` — adaptive prompt assembly** — 5h
   *Files:* new file `lib/ai/prompt.ts`

### Phase 2 — Wire It Together (Week 2: 20h)

7. **Rewrite route.ts processing pipeline** — 8h
   *Files:* `app/api/miomi/route.ts`
   *Stages 1–12 from Section 6.2*

8. **Build `lib/ai/phrases.ts` — phrases_bank integration** — 4h
   *Files:* new file `lib/ai/phrases.ts`

9. **Build creator flow** — 4h
   *Files:* `lib/ai/creator.ts` (new), wire into route.ts

10. **Build translator flow** — 4h
    *Files:* `lib/ai/translator.ts` (new), wire into route.ts

### Phase 3 — Self-Improvement (Week 3: 16h)

11. **Quality signals computation** — 3h
    *Files:* new file `lib/ai/quality.ts`

12. **Library quality score update mechanism** — 3h
    *Files:* `app/api/miomi/feedback/route.ts` (new endpoint for follow-up signal capture) + SQL function

13. **Promotion cron job** — 5h
    *Files:* `app/api/cron/library-promotions/route.ts` (new)

14. **Degradation cron job** — 2h
    *Files:* `app/api/cron/library-degradation/route.ts` (new)

15. **Cost caps + kill switches** — 3h
    *Files:* new file `lib/ai/cost-caps.ts`, `lib/ai/kill-switches.ts`

### Phase 4 — Polish & Scale (Week 4: 12h)

16. **user_sessions write-through** — 3h
    *Files:* `lib/ai/session.ts`

17. **Seed library entries for new intents** — 4h
    *Files:* SQL seed script for ~80 new entries covering creator/translator/social intents

18. **Cost & quality dashboard endpoint** — 3h
    *Files:* `app/api/admin/metrics/route.ts` (new)

19. **End-to-end test scenarios** — 2h
    *Files:* `__tests__/scenarios.test.ts` (5 archetype journeys)

**Total: ~72 hours over 4 weeks for a solo founder.**

---

## CURSOR PROMPTS

Each prompt is self-contained. Run in sequence. After each, verify by running `npm run build` before moving on.

### Prompt 1 — Fix vocabulary logging + add interaction_type

```
GOAL: Fix the broken vocabulary logging in lib/ai/vocabulary.ts.

CONTEXT:
- recordWordIntroduced() and recordWordUsedCorrectly() try to insert into
  library_interactions.interaction_type, which doesn't exist.
- The fix: add the column via SQL migration, then keep the existing code working.

DO:
1. Create file `supabase/migrations/0001_add_interaction_type.sql` with:
   ALTER TABLE library_interactions
   ADD COLUMN IF NOT EXISTS interaction_type TEXT
   CHECK (interaction_type IN (
     'word_introduced', 'word_used_correctly', 'phrase_introduced',
     'phrase_used_correctly', 'creator_output', 'translation_served', 'standard'
   ))
   DEFAULT 'standard';

   CREATE INDEX IF NOT EXISTS library_interactions_interaction_type_idx
   ON library_interactions(interaction_type);

2. In lib/ai/vocabulary.ts:
   - Wrap all .insert() calls in try/catch with console.error logging
   - Add JSDoc comments above recordWordIntroduced and recordWordUsedCorrectly
   - Ensure both functions return Promise<{ success: boolean; error?: string }>

3. Add two Supabase RPC functions in a new file
   `supabase/migrations/0002_vocabulary_rpcs.sql`:
   - increment_word_taught(p_word_en TEXT)
   - increment_word_mastered(p_word_en TEXT)
   (see MIOMIKA_ENGINE_OPUS.md Section 6.4 for exact SQL)

DO NOT touch route.ts or matcher.ts in this prompt.

VERIFY:
- npm run build passes
- Manual test: call recordWordIntroduced('hello', 'สวัสดี', 1) → no error logged
```

### Prompt 2 — Expand SessionState

```
GOAL: Expand SessionState in lib/ai/session.ts to support the new architecture.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 6.1

DO:
1. In lib/ai/session.ts, REPLACE the existing SessionState interface with
   the full interface from Section 6.1 (all fields including primaryLanguage,
   learningDirection, detectedArchetype, sessionMode, creatorMode, etc.)

2. Add the supporting type exports at the top of the file:
   - export type PrimaryLanguage = "thai" | "english" | "mixed" | "genz_mixed"
   - export type LearningDirection = ...
   - export type UserArchetype = ...
   - export type SessionMode = ...
   - export type SessionArc = ...
   - export type CefrLevel = ...
   - export type EmotionalState = ...
   - export interface LanguageSignals { ... }
   - export interface ArchetypeSignals { ... }

3. Create a function `createInitialSessionState(sessionId: string, userId: string | null): SessionState`
   that returns a fully-populated SessionState with sensible defaults:
   - exchangeNumber: 0
   - estimatedLevel: "A2"
   - levelConfidence: 0
   - primaryLanguage: "mixed"
   - learningDirection: "unknown"
   - detectedArchetype: null
   - sessionMode: "mixed"
   - sessionArc: "opening"
   - currentEmotionalState: "neutral"
   - all arrays: []
   - all costs: 0

4. Keep existing session.ts functions (detectLevel, etc.) working —
   add to the file, don't remove.

DO NOT break any existing imports of SessionState elsewhere.

VERIFY:
- npm run build passes
- Existing tests still pass (if any)
- grep for "SessionState" — every usage still compiles
```

### Prompt 3 — Language detection module

```
GOAL: Create lib/ai/language.ts implementing language detection per Section 2.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 2

DO:
1. Create new file lib/ai/language.ts

2. Export:
   - function computeLanguageSignals(message: string): LanguageSignals
   - function detectPrimaryLanguage(message: string, history: LanguageSignals[]):
       { primary: PrimaryLanguage; confidence: number; signals: LanguageSignals }
   - function detectLearningDirection(primaryLanguage, recentMessages, explicitStatement):
       { direction: LearningDirection; confidence: number }
   - function computeVoiceRatioTarget(direction, level): { thai: number; english: number }
   - const GENZ_MARKERS_THAI = [...]
   - const GENZ_MARKERS_ENGLISH = [...]
   - const ROMANIZED_THAI_WORDS = [...]

3. Implementation rules:
   - thaiCharRatio: count Thai Unicode characters (0x0E00–0x0E7F) ÷ total chars
   - englishWordRatio: english word tokens ÷ total tokens
   - codeSwitchCount: number of language transitions in the message
   - Use the detection rules table from Section 2.1
   - Smooth with EMA α=0.4 against history

4. Add JSDoc comments. Each exported function should have a 1-2 line description.

5. Add a small unit test file lib/ai/__tests__/language.test.ts with 6 test cases:
   - "สวัสดีค่ะ" → thai
   - "hello hello" → english
   - "555 ปังมาก slay" → genz_mixed
   - "สอนภาษาอังกฤษให้หน่อย" → primary=thai, direction=thai_to_english
   - "teach me Thai" → primary=english, direction=english_to_thai
   - "boom boom pasa tie dye makeup" → genz_mixed

DO NOT modify session.ts in this prompt.

VERIFY:
- npm run build passes
- npm test (or vitest run) passes language tests
```

### Prompt 4 — Unified intent classification

```
GOAL: Create lib/ai/intents.ts replacing matcher.ts intent logic.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 1

DO:
1. Create new file lib/ai/intents.ts

2. Export the Intent and IntentFamily enums exactly per Section 1.1.

3. Export:
   - interface IntentSignal { intent: Intent; score: number; signals: string[] }
   - interface IntentDetectionResult {
       primary: IntentSignal;
       secondary: IntentSignal | null;
       family: IntentFamily;
       confidence: number;
       needsClarification: boolean;
     }
   - function classifyIntent(message: string, state: SessionState): IntentDetectionResult
   - function getIntentFamily(intent: Intent): IntentFamily

4. Implementation:
   - Build per-intent scorers using the keyword/pattern table from Section 1.3
   - Each scorer returns a score 0..1 with the matched signals listed
   - Run all scorers, sort by score, take top 2
   - confidence = primary.score - (secondary?.score ?? 0)
   - needsClarification = primary.score < 0.25 OR confidence < 0.15

5. Add lib/ai/__tests__/intents.test.ts with 12 test cases covering at least one
   intent from each family.

6. In lib/ai/matcher.ts: keep the LIBRARY MATCHER logic (token similarity etc.)
   but REMOVE the old 12-intent classifier code (it will be replaced by classifyIntent).
   Update any internal references.

DO NOT yet wire classifyIntent into route.ts — that's a later prompt.

VERIFY:
- npm run build passes
- Tests pass
- grep for the old 12 intent names ("greeting", "asking_help", etc.) —
  only library_entries seed data should still reference them
```

### Prompt 5 — Persona system

```
GOAL: Create lib/ai/persona.ts with archetype detection and persona configs.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 3

DO:
1. Create new file lib/ai/persona.ts

2. Export:
   - All UserArchetype types (already in session.ts — re-export if needed)
   - interface PersonaConfig { ... } per Section 3.3
   - const PERSONAS: Record<UserArchetype, PersonaConfig> with all 6 archetypes filled
   - function detectArchetype(signals, currentArchetype, currentConfidence):
       { archetype: UserArchetype; confidence: number }
   - function buildPersonaDirective(archetype, confidence): string
   - const EMOTION_RESPONSE_MODIFIERS: Record<EmotionalState, string>

3. The detectArchetype function uses the decision matrix from Section 3.2.
   Confidence builds up:
   - First detection: confidence = 0.5
   - Same archetype detected again: confidence += 0.15 (max 0.9)
   - Different archetype detected: confidence -= 0.2; switch if drops below 0.4

4. Add unit tests lib/ai/__tests__/persona.test.ts:
   - Detect genz_creator from gen-z mixed language signals
   - Detect thai_learner_casual from casual Thai user asking about food
   - Detect foreigner_learner from English user asking how to say things in Thai
   - Verify PERSONAS[archetype] is fully populated for all 6 archetypes

VERIFY:
- npm run build passes
- Tests pass
- Every PersonaConfig has all required fields
```

### Prompt 6 — Adaptive prompt assembly

```
GOAL: Create lib/ai/prompt.ts that assembles the system prompt from layers.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Sections 2.4, 3.4, and 4

DO:
1. Create new file lib/ai/prompt.ts

2. Export:
   - const BASE_IDENTITY: string  — Miomi's core identity (~150 words)
   - function buildSystemPrompt(state, intent, context): string
   - function buildLanguageDirective(state): string
   - function buildSessionContextBlock(state, context): string
   - function buildIntentInstruction(intent, state): string

3. BASE_IDENTITY should describe:
   - Miomi is a warm, wise cat with emotional intelligence
   - Teacher, translator, creative partner — adapts to need
   - Never makes users feel stupid
   - Uses Thai cultural nuance naturally
   - Speaks like a person, not a textbook

4. buildSystemPrompt assembles in order:
   BASE_IDENTITY
   + buildPersonaDirective(state.detectedArchetype, state.archetypeConfidence)
   + buildLanguageDirective(state)
   + buildSessionContextBlock(state, context)
   + buildIntentInstruction(intent, state)
   + EMOTION_RESPONSE_MODIFIERS[state.currentEmotionalState]

   Join with "\n\n".

5. buildIntentInstruction handles each IntentFamily differently:
   - learning: instruct to teach the target word, offer practice
   - creating: instruct to generate the creator output with embedded vocabulary
   - translating: instruct to translate, add ONE cultural note, suggest practice
   - social: instruct to match emotional energy, light teaching
   - meta: instruct to clarify warmly or set goals

6. Keep total assembled prompt under 800 tokens (roughly 3200 chars).

DO NOT yet wire into route.ts.

VERIFY:
- npm run build passes
- Manually log a sample assembled prompt and inspect — should be coherent
```

### Prompt 7 — phrases_bank integration

```
GOAL: Create lib/ai/phrases.ts that queries and renders phrases_bank entries.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 4.5

DO:
1. Create new file lib/ai/phrases.ts

2. Export:
   - interface PhraseMatch {
       phrase: PhraseRow;
       confidence: number;
       matchedColumn: "phrase_th" | "phrase_en";
     }
   - function findInPhrasesBank(message, direction): Promise<PhraseMatch | null>
   - function findPhrasesByScenario(scenario, direction, limit): Promise<PhraseRow[]>
   - function buildPhraseCard(phrase: PhraseRow, direction): PhraseCard
   - function buildPhraseTeachingResponse(match, state): MiomiResponse

3. Use token similarity scoring (same algorithm as matcher.ts library matcher).
   - Tokenize both query and candidate
   - Jaccard similarity OR character n-gram overlap
   - Threshold for confident match: 0.6

4. The teach flag filter is direction-dependent:
   - thai_to_english → teach_english_to_thai = true (we're teaching English to Thai speakers)
     [verify column naming matches your schema; based on the brief, the flags exist as named]

5. Add lib/ai/__tests__/phrases.test.ts with 3 tests (mock Supabase):
   - Find exact phrase match
   - Find fuzzy phrase match
   - Return null when no candidates above threshold

VERIFY:
- npm run build passes
- Tests pass with mocked Supabase client
```

### Prompt 8 — Rewire route.ts to new pipeline

```
GOAL: Replace app/api/miomi/route.ts with the new 12-stage pipeline.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 6.2 and 6.3

DO:
1. In app/api/miomi/route.ts:
   - Import: language, intents, persona, prompt, phrases, session
   - Import existing: router (AI calls), matcher (library matcher), vocabulary

2. Implement the 12-stage pipeline exactly per Section 6.2:
   Stage 1: loadSessionState
   Stage 2: language detection → updatePrimaryLanguage, updateLearningDirection
   Stage 3: classifyIntent
   Stage 4: updateSessionMode
   Stage 5: updateArchetype
   Stage 6: updateEmotionalState
   Stage 7: matchLibrary (use new intent taxonomy)
   Stage 8: serve from library OR call AI (with cost cap check)
   Stage 9: extractTeachingArtifacts
   Stage 10: applyResponseToState + saveSessionState
   Stage 11: logInteraction
   Stage 12: return MiomiResponse

3. Create supporting helpers in lib/ai/session.ts:
   - loadSessionState(sessionId, userId): Promise<SessionState>
   - saveSessionState(state): Promise<void>
   - updatePrimaryLanguage(state, signals): SessionState
   - updateLearningDirection(state, message): SessionState
   - updateSessionMode(state, intent): SessionState
   - updateArchetype(state, langSignals, intent): SessionState
   - updateEmotionalState(state, intent, message): SessionState
   - applyResponseToState(state, response, intent): SessionState

4. Create lib/ai/extract.ts:
   - function extractTeachingArtifacts(response, state, intent): {
       wordCard, phraseCard, creatorAsset
     }

5. The Response shape from Section 6.3 — return exactly that.
   Frontend may need updates but that's a separate concern; do not touch frontend in this prompt.

6. For session persistence: use the user_sessions table.
   Store the JSON-serialized SessionState in a new column `state_jsonb`
   (this requires migration — include in this prompt).

DO:
- Add SQL migration `supabase/migrations/0003_user_sessions_state.sql`:
  ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS state_jsonb JSONB;
  CREATE INDEX IF NOT EXISTS user_sessions_session_id_idx ON user_sessions(session_id);
  -- If session_id column doesn't exist on user_sessions, also:
  -- ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_id TEXT UNIQUE;

VERIFY:
- npm run build passes
- Manual test: POST a Thai message → response has wordCard, sessionContext populated
- Manual test: POST an English creator request → response has creatorAsset
- No errors in logs about missing columns
```

### Prompt 9 — Quality scoring and feedback endpoint

```
GOAL: Capture quality signals and update library_entries.quality_score over time.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 5

DO:
1. Create lib/ai/quality.ts:
   - export interface QualitySignals { ... } per Section 5.1
   - export function computeQualityScore(signals): number per Section 5.1
   - export async function captureUserNextSignals(interactionId, nextMessage, state):
       returns QualitySignals

2. Modify app/api/miomi/route.ts:
   - On each request, if state.exchangeNumber > 1:
     fetch the previous library_interactions row (where user_next_input is null)
     compute QualitySignals from the current message
     update that row with:
       user_next_input, user_next_input_length,
       user_next_input_used_target_word, user_next_input_emotional_signal
     Then call updateLibraryQuality(prevInteractionId)

3. Create SQL function in `supabase/migrations/0004_quality_update.sql`:
   CREATE OR REPLACE FUNCTION update_library_quality(p_interaction_id UUID)
   RETURNS void AS $$
   DECLARE
     v_entry_id UUID;
     v_new_score FLOAT;
     v_continued BOOLEAN;
     v_positive BOOLEAN;
   BEGIN
     SELECT library_entry_id INTO v_entry_id
     FROM library_interactions WHERE id = p_interaction_id;

     IF v_entry_id IS NULL THEN RETURN; END IF;

     -- compute via aggregate signals
     UPDATE library_entries
     SET
       times_served = times_served + 1,
       times_continued = times_continued + (
         SELECT CASE WHEN user_next_input IS NOT NULL THEN 1 ELSE 0 END
         FROM library_interactions WHERE id = p_interaction_id
       ),
       times_user_engaged_positively = times_user_engaged_positively + (
         SELECT CASE
           WHEN user_next_input_emotional_signal = 'positive' OR
                user_next_input_used_target_word = true
           THEN 1 ELSE 0
         END FROM library_interactions WHERE id = p_interaction_id
       ),
       quality_score = LEAST(1.0, GREATEST(0.0,
         (times_user_engaged_positively::float + 1) /
         GREATEST(times_served + 1, 1)
       ))
     WHERE id = v_entry_id;
   END;
   $$ LANGUAGE plpgsql;

4. In route.ts after capturing prev signals, call:
   await supabase.rpc('update_library_quality', { p_interaction_id: prevId });

DO NOT yet build the cron job — that's the next prompt.

VERIFY:
- npm run build passes
- Manual test: two consecutive messages → first interaction row gets updated
  with user_next_input fields; library_entries.quality_score moves
```

### Prompt 10 — Promotion + degradation cron jobs

```
GOAL: Build the self-improvement cron jobs.

REFERENCE: MIOMIKA_ENGINE_OPUS.md Section 5.3 and 5.5

DO:
1. SQL migration `supabase/migrations/0005_promotion_pipeline.sql`:
   ALTER TABLE library_interactions
     ADD COLUMN IF NOT EXISTS promoted_to_queue BOOLEAN DEFAULT FALSE;
   ALTER TABLE library_interactions
     ADD COLUMN IF NOT EXISTS embedded_word TEXT,
     ADD COLUMN IF NOT EXISTS embedded_word_thai TEXT,
     ADD COLUMN IF NOT EXISTS follow_up_th TEXT,
     ADD COLUMN IF NOT EXISTS follow_up_en TEXT,
     ADD COLUMN IF NOT EXISTS served_response_th TEXT,
     ADD COLUMN IF NOT EXISTS served_response_en TEXT,
     ADD COLUMN IF NOT EXISTS intent_category TEXT,
     ADD COLUMN IF NOT EXISTS language_mix TEXT,
     ADD COLUMN IF NOT EXISTS estimated_level TEXT,
     ADD COLUMN IF NOT EXISTS session_arc TEXT,
     ADD COLUMN IF NOT EXISTS emotional_context TEXT;
   -- Skip ALTER for any column that already exists.

2. Create app/api/cron/library-promotions/route.ts:
   - Verify Bearer auth against process.env.CRON_SECRET
   - Implement per Section 5.3 pseudocode
   - Return JSON { candidates, promoted, skipped }

3. Create app/api/cron/library-degradation/route.ts:
   - Same auth pattern
   - Per Section 5.5 rules
   - Mark entries inactive/deprecated based on thresholds

4. Add vercel.json (or merge with existing):
   {
     "crons": [
       { "path": "/api/cron/library-promotions", "schedule": "0 3 * * *" },
       { "path": "/api/cron/library-degradation", "schedule": "0 4 * * 0" }
     ]
   }

5. Add CRON_SECRET to .env.example.

6. Add a simple manual-run script: scripts/run-promotions-now.ts
   that hits the endpoint with the secret for local testing.

VERIFY:
- npm run build passes
- Call /api/cron/library-promotions with the correct bearer locally — runs without errors
- Insert a fake high-quality interaction → it gets promoted to library_promotions_queue
```

---

## DATABASE MIGRATIONS

Copy each block into the Supabase SQL editor and run in order. All migrations are idempotent (`IF NOT EXISTS`).

### Migration 0001 — Fix interaction_type column

```sql
-- supabase/migrations/0001_add_interaction_type.sql

ALTER TABLE library_interactions
ADD COLUMN IF NOT EXISTS interaction_type TEXT
DEFAULT 'standard';

-- Add the CHECK constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'library_interactions_interaction_type_check'
  ) THEN
    ALTER TABLE library_interactions
    ADD CONSTRAINT library_interactions_interaction_type_check
    CHECK (interaction_type IN (
      'word_introduced',
      'word_used_correctly',
      'phrase_introduced',
      'phrase_used_correctly',
      'creator_output',
      'translation_served',
      'standard'
    ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS library_interactions_interaction_type_idx
ON library_interactions(interaction_type);
```

### Migration 0002 — Vocabulary RPCs

```sql
-- supabase/migrations/0002_vocabulary_rpcs.sql

CREATE OR REPLACE FUNCTION increment_word_taught(p_word_en TEXT)
RETURNS void AS $$
BEGIN
  UPDATE vocabulary_bank
  SET times_taught = times_taught + 1
  WHERE word_en = p_word_en;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_word_mastered(p_word_en TEXT)
RETURNS void AS $$
BEGIN
  UPDATE vocabulary_bank
  SET times_mastered = times_mastered + 1,
      mastery_rate = CASE
        WHEN times_taught > 0 THEN (times_mastered + 1)::float / times_taught
        ELSE 0
      END
  WHERE word_en = p_word_en;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_phrase_taught(p_phrase_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE phrases_bank
  SET times_taught = times_taught + 1
  WHERE id = p_phrase_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_phrase_used_correctly(p_phrase_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE phrases_bank
  SET times_used_correctly = times_used_correctly + 1
  WHERE id = p_phrase_id;
END;
$$ LANGUAGE plpgsql;
```

### Migration 0003 — Session state JSON column

```sql
-- supabase/migrations/0003_user_sessions_state.sql

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS state_jsonb JSONB;

-- Unique index on session_id if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'user_sessions_session_id_uniq_idx'
  ) THEN
    CREATE UNIQUE INDEX user_sessions_session_id_uniq_idx
    ON user_sessions(session_id) WHERE session_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
ON user_sessions(user_id);
```

### Migration 0004 — Quality update function

```sql
-- supabase/migrations/0004_quality_update.sql

CREATE OR REPLACE FUNCTION update_library_quality(p_interaction_id UUID)
RETURNS void AS $$
DECLARE
  v_entry_id UUID;
  v_continued INT;
  v_positive INT;
  v_flagged INT;
BEGIN
  SELECT library_entry_id INTO v_entry_id
  FROM library_interactions WHERE id = p_interaction_id;

  IF v_entry_id IS NULL THEN RETURN; END IF;

  SELECT
    CASE WHEN user_next_input IS NOT NULL THEN 1 ELSE 0 END,
    CASE
      WHEN user_next_input_emotional_signal = 'positive' OR
           user_next_input_used_target_word = true
      THEN 1 ELSE 0
    END,
    CASE WHEN user_next_input_emotional_signal = 'negative' THEN 1 ELSE 0 END
  INTO v_continued, v_positive, v_flagged
  FROM library_interactions WHERE id = p_interaction_id;

  UPDATE library_entries
  SET
    times_served = times_served + 1,
    times_continued = times_continued + v_continued,
    times_user_engaged_positively = times_user_engaged_positively + v_positive,
    times_flagged = times_flagged + v_flagged,
    quality_score = LEAST(1.0, GREATEST(0.0,
      (times_user_engaged_positively + v_positive + 1.0) /
      GREATEST(times_served + 1, 1)
    ))
  WHERE id = v_entry_id;
END;
$$ LANGUAGE plpgsql;
```

### Migration 0005 — Promotion pipeline columns

```sql
-- supabase/migrations/0005_promotion_pipeline.sql

ALTER TABLE library_interactions
  ADD COLUMN IF NOT EXISTS promoted_to_queue BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS embedded_word TEXT,
  ADD COLUMN IF NOT EXISTS embedded_word_thai TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_th TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_en TEXT,
  ADD COLUMN IF NOT EXISTS served_response_th TEXT,
  ADD COLUMN IF NOT EXISTS served_response_en TEXT,
  ADD COLUMN IF NOT EXISTS intent_category TEXT,
  ADD COLUMN IF NOT EXISTS language_mix TEXT,
  ADD COLUMN IF NOT EXISTS estimated_level TEXT,
  ADD COLUMN IF NOT EXISTS session_arc TEXT,
  ADD COLUMN IF NOT EXISTS emotional_context TEXT;

CREATE INDEX IF NOT EXISTS library_interactions_promoted_idx
ON library_interactions(promoted_to_queue) WHERE promoted_to_queue = FALSE;

CREATE INDEX IF NOT EXISTS library_interactions_served_via_idx
ON library_interactions(served_via);
```

### Migration 0006 — Creator outputs on user_sessions

```sql
-- supabase/migrations/0006_creator_outputs.sql

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS creator_outputs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS phrases_introduced TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS phrases_used_correctly TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS detected_archetype TEXT,
ADD COLUMN IF NOT EXISTS archetype_confidence FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS primary_language TEXT,
ADD COLUMN IF NOT EXISTS learning_direction TEXT;
```

### Migration 0007 — Vector embedding index (Phase 2 — run when ready)

```sql
-- supabase/migrations/0007_pgvector_index.sql
-- ONLY run this when library_entries has >500 rows with embeddings populated.

CREATE EXTENSION IF NOT EXISTS vector;

-- If user_input_embedding column doesn't have vector type, alter first:
-- ALTER TABLE library_entries ALTER COLUMN user_input_embedding TYPE vector(1536);

CREATE INDEX IF NOT EXISTS library_entries_embedding_idx
ON library_entries
USING ivfflat (user_input_embedding vector_cosine_ops)
WITH (lists = 50);
```

---

## BUGS TO FIX IMMEDIATELY

Run these regardless of the larger refactor — they're causing silent data corruption now.

### Bug 1 — vocabulary.ts inserts into nonexistent column

**Symptom:** Every `recordWordIntroduced()` and `recordWordUsedCorrectly()` call silently fails because `library_interactions.interaction_type` doesn't exist.

**Fix:** Apply Migration 0001 (above) to add the column.

**Verify:** After migration, manually call `recordWordIntroduced('hello', 'สวัสดี', 1)` — check that a row appears in `library_interactions` with `interaction_type='word_introduced'`.

### Bug 2 — Markdown stripper applies to wordCard content

**Symptom (suspected):** The markdown stripper in `lib/ai/router.ts` likely strips formatting from word card examples that *should* preserve emphasis (e.g., bold target words).

**Fix:** In `lib/ai/router.ts`, apply markdown stripping ONLY to the main response text, not to structured fields. If wordCard is constructed post-AI, this is fine — verify by inspecting the data flow.

### Bug 3 — Single system prompt causes wrong-register responses

**Symptom:** A formal Thai professional asking about a work email gets a Gen-Z toned response with 555 sprinkled in.

**Fix:** Implement Sections 3 & 6 (adaptive prompt assembly). Until then, **mitigation**: in current system prompt, add this directive at the top:

```
CRITICAL: Match the user's register exactly.
- If they're formal: use ครับ/ค่ะ, no slang, professional tone.
- If they're casual: warm everyday tone.
- If they use slang (555, ปัง, slay): mirror it.
- NEVER use slang the user hasn't used first.
```

### Bug 4 — phrases_bank queried by nothing

**Symptom:** Rich phrase data (scenarios, cultural context, response_phrases) sits unused. Users asking "how do you say I'm not interested in Thai" get a generic AI translation instead of the curated phrases_bank entry.

**Fix:** Implement Prompt 7 (phrases.ts). Until then, **mitigation**: add a quick check in `app/api/miomi/route.ts` before the AI call — if message contains "how do you say" or "translate" + a phrase, query phrases_bank with simple LIKE matching as a stopgap.

### Bug 5 — quality_score never updates

**Symptom:** `library_entries.quality_score` stays at the initial seed value forever. The library never learns.

**Fix:** Implement Prompt 9 + Migration 0004. Until then, the library is static.

### Bug 6 — library_promotions_queue ignored

**Symptom:** Even if entries were inserted (they aren't), nothing processes them. Library never grows from AI responses.

**Fix:** Implement Prompt 10 + cron config.

### Bug 7 — Cost caps unenforced

**Symptom:** A single guest user could theoretically spam expensive AI calls. No protection.

**Fix:** Implement Section 7 cost-caps.ts. Until then, **mitigation**: add a per-IP rate limit at the route handler (max 30 requests per 5 minutes per IP).

### Bug 8 — user_sessions table never written to

**Symptom:** Per the brief, user_sessions exists but isn't populated. All session analytics are blind.

**Fix:** Implement Prompt 8's session persistence. Sessions should be created on first message and updated on every exchange.

### Bug 9 — Vocabulary intro logging doesn't capture word_thai

**Symptom (suspected):** When tracking introduced words, we only store `word_en` — losing the Thai equivalent that was actually shown to a Thai-to-English learner.

**Fix:** Update `recordWordIntroduced` signature to `(sessionId, userId, word_en, word_th, exchangeNumber)` and store both. Update calling code accordingly.

### Bug 10 — Topic detection uses naive keyword mapping

**Symptom:** `detectTopicFromMessage` in vocabulary.ts likely maps words 1:1 to topics, missing context. "I want to talk about apple" → topic = "food", but user may mean Apple the company.

**Fix:** Multi-signal topic detection — combine keyword presence with archetype signals. Low-priority; flag for Phase 4.

---

## CLOSING NOTES

This document is the implementation contract. Every decision in it is meant to be buildable in the existing stack — Next.js 14, TypeScript, Supabase, Groq, Gemini. No new infrastructure. No new databases. No new services.

The architecture is layered so that each phase produces a system that **works on its own** even if the next phase never ships:

- After **Phase 1**, the engine has fixed bugs, expanded state, and language intelligence — but still uses the old prompt.
- After **Phase 2**, the engine adapts persona, language, and intent — using existing library.
- After **Phase 3**, the engine self-improves — the library grows from AI responses.
- After **Phase 4**, the engine is observable and scalable — dashboards + tests.

**The single most important design principle:**
> Library-first. AI-second. The user never knows the difference.
> Teaching happens inside every interaction. The user never sees a mode switch.

Build it in this order, ship after each phase, and Miomika becomes a genuinely magical thing.

🐾
