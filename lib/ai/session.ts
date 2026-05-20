// lib/ai/session.ts
// Session state engine. Lives in React state. Zero cost.
// Injected into every API call. Never stored in database (yet).
//
// UPDATED May 20: pickTargetWord removed.
// Use getWordForSession() from vocabulary.ts instead (async, Supabase-backed).
// getExchangeInstruction() is now async for the same reason.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrimaryLanguage, LearningDirection, LanguageSignals } from "./language";
import type { UserArchetype } from "./persona";
import type { Intent, IntentFamily } from "./intents";
import type { SessionMode } from "./prompt";
import {
  CELEBRATIONS,
  CONVERSION,
  FAILOVER_RESPONSES,
  SESSION_OPENINGS,
  type Level,
  type VocabWord,
} from "./library";
import {
  getWordForSession,
  detectTopicFromMessage,
  recordWordIntroduced,
  recordWordUsedCorrectly,
  type SessionVocabWord,
} from "./vocabulary";

// ─── SESSION STATE ────────────────────────────────────────────────────────────

export type SessionState = {
  exchangeNumber: number;
  estimatedLevel: Level;
  levelConfidence: number; // 0.0 to 1.0
  wordsIntroduced: string[];
  wordsUsedCorrectly: string[];
  emotionalMomentum: "positive" | "neutral" | "negative";
  lastUserSignal: string;
  sessionArc: "opening" | "assessment" | "teaching" | "consolidation" | "closing";
  conversionWindowOpen: boolean;
  isGuest: boolean;
  topicContext: string;
  currentTargetWord: SessionVocabWord | null;
  sessionId: string;
  userId: string | null;

  // Language intelligence (new)
  primaryLanguage: PrimaryLanguage;
  primaryLanguageConfidence: number;
  learningDirection: LearningDirection;
  learningDirectionConfidence: number;
  languageSignalsHistory: LanguageSignals[];
  voiceRatioTarget: { thai: number; english: number };

  // Persona (new)
  detectedArchetype: UserArchetype;
  archetypeConfidence: number;
  intentFamilyDistribution: Partial<Record<IntentFamily, number>>;
  formalityScore: number;
  genzMarkerCount: number;
  topicSignals: string[];
  hasStatedGoal: boolean;
  statedGoal: string | null;

  // Session mode (new)
  sessionMode: SessionMode;
  sessionModeConfidence: number;

  // Creator tracking (new)
  creatorOutputs: Array<{ text: string; platform: string; vocabularyUsed: string[] }>;
  lastCreatorOutput: string | null;

  // Phrase tracking (new)
  phrasesIntroduced: string[];
  phrasesUsedCorrectly: string[];

  // Last intent (new)
  lastIntent: Intent | null;
  lastIntentFamily: IntentFamily | null;
};

// ─── INITIAL STATE ────────────────────────────────────────────────────────────

export function createSessionState(
  isGuest: boolean,
  userId: string | null = null
): SessionState {
  return {
    exchangeNumber: 0,
    estimatedLevel: "elementary",
    levelConfidence: 0.0,
    wordsIntroduced: [],
    wordsUsedCorrectly: [],
    emotionalMomentum: "neutral",
    lastUserSignal: "",
    sessionArc: "opening",
    conversionWindowOpen: false,
    isGuest,
    topicContext: "",
    currentTargetWord: null,
    sessionId: crypto.randomUUID(),
    userId,

    // Language intelligence defaults
    primaryLanguage: "thai" as PrimaryLanguage,
    primaryLanguageConfidence: 0.0,
    learningDirection: "unknown" as LearningDirection,
    learningDirectionConfidence: 0.0,
    languageSignalsHistory: [],
    voiceRatioTarget: { thai: 70, english: 30 },

    // Persona defaults
    detectedArchetype: "thai_learner_casual" as UserArchetype,
    archetypeConfidence: 0.0,
    intentFamilyDistribution: {},
    formalityScore: 0.5,
    genzMarkerCount: 0,
    topicSignals: [],
    hasStatedGoal: false,
    statedGoal: null,

    // Session mode defaults
    sessionMode: "learning" as SessionMode,
    sessionModeConfidence: 0.0,

    // Creator tracking defaults
    creatorOutputs: [],
    lastCreatorOutput: null,

    // Phrase tracking defaults
    phrasesIntroduced: [],
    phrasesUsedCorrectly: [],

    // Last intent defaults
    lastIntent: null,
    lastIntentFamily: null,
  };
}

// ─── LEVEL DETECTION ──────────────────────────────────────────────────────────

import { LEVEL_SIGNALS } from "./library";

export function detectLevel(
  message: string,
  currentLevel: Level,
  currentConfidence: number
): { level: Level; confidence: number } {
  const words = message.trim().split(/\s+/);
  const wordCount = words.length;
  const lowerMessage = message.toLowerCase();

  let detectedLevel: Level = currentLevel;
  let confidenceBoost = 0.15;

  if (wordCount <= LEVEL_SIGNALS.beginner.maxWordsPerMessage) {
    detectedLevel = "beginner";
  } else if (wordCount <= LEVEL_SIGNALS.elementary.maxWordsPerMessage) {
    detectedLevel = "elementary";
  } else if (wordCount <= LEVEL_SIGNALS.intermediate.maxWordsPerMessage) {
    detectedLevel = "intermediate";
  } else {
    detectedLevel = "upper";
  }

  for (const indicator of LEVEL_SIGNALS.upper.indicators) {
    if (lowerMessage.includes(indicator)) {
      detectedLevel = "upper";
      confidenceBoost = 0.3;
      break;
    }
  }
  for (const indicator of LEVEL_SIGNALS.intermediate.indicators) {
    if (lowerMessage.includes(indicator)) {
      if (detectedLevel !== "upper") detectedLevel = "intermediate";
      confidenceBoost = 0.25;
      break;
    }
  }

  const thaiChars = (message.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const totalChars = message.replace(/\s/g, "").length;
  if (totalChars > 0 && thaiChars / totalChars > 0.7) {
    if (detectedLevel === "intermediate" || detectedLevel === "upper") {
      detectedLevel = "elementary";
      confidenceBoost = 0.1;
    }
  }

  const newConfidence = Math.min(1.0, currentConfidence + confidenceBoost);

  if (currentConfidence < 0.3 || newConfidence > 0.6) {
    return { level: detectedLevel, confidence: newConfidence };
  }

  return { level: currentLevel, confidence: newConfidence };
}

// ─── WORD USED CORRECTLY DETECTION ───────────────────────────────────────────

export function didUserUseTargetWord(
  message: string,
  targetWord: string | null
): boolean {
  if (!targetWord) return false;
  return message.toLowerCase().includes(targetWord.toLowerCase());
}

// ─── EXCHANGE INSTRUCTION TYPE ────────────────────────────────────────────────

export type ExchangeInstruction = {
  arc: SessionState["sessionArc"];
  shouldIntroduceWord: boolean;
  shouldCelebrate: boolean;
  celebrationText: string | null;
  shouldOpenConversionWindow: boolean;
  conversionMessage: { th: string; en: string } | null;
  wordToIntroduce: SessionVocabWord | null;
  promptInstruction: string;
};

// ─── GET EXCHANGE INSTRUCTION (async) ────────────────────────────────────────
// Now async — fetches word from Supabase if needed.
// Falls back to null word gracefully (library.ts failover handles it).

export async function getExchangeInstruction(
  state: SessionState,
  userMessage: string,
  supabase: SupabaseClient
): Promise<ExchangeInstruction> {
  const exchange = state.exchangeNumber + 1;
  const usedTargetWord = didUserUseTargetWord(
    userMessage,
    state.currentTargetWord?.word ?? null
  );

  // Celebration logic
  let shouldCelebrate = false;
  let celebrationText: string | null = null;

  if (usedTargetWord && state.currentTargetWord) {
    shouldCelebrate = true;
    celebrationText = CELEBRATIONS.wordUsedCorrectly(state.currentTargetWord.word);
    // Fire-and-forget: record word used correctly
    recordWordUsedCorrectly(state.userId, state.sessionId, state.currentTargetWord, supabase);
  } else if (exchange === 2 && userMessage.split(/\s+/).length > 5) {
    shouldCelebrate = true;
    celebrationText = CELEBRATIONS.longerThanBefore;
  }

  // Word introduction logic — exchange 3, then 6 if session continues
  const shouldIntroduceWord =
    (exchange === 3 || exchange === 6) && state.levelConfidence >= 0.3;

  let wordToIntroduce: SessionVocabWord | null = null;

  if (shouldIntroduceWord) {
    // Detect topic from user's recent message for context-aware word selection
    const detectedTopic = detectTopicFromMessage(userMessage) ?? undefined;

    // Try Supabase first
    wordToIntroduce = await getWordForSession(
      state.estimatedLevel,
      state.wordsIntroduced,
      supabase,
      detectedTopic
    );

    // If Supabase returns nothing, wordToIntroduce stays null.
    // The prompt instruction builder handles this gracefully.

    // Fire-and-forget: log introduction
    if (wordToIntroduce) {
      recordWordIntroduced(state.userId, state.sessionId, wordToIntroduce, supabase);
    }
  }

  // Conversion window
  const shouldOpenConversionWindow =
    state.isGuest &&
    exchange === 4 &&
    state.emotionalMomentum === "positive" &&
    !state.conversionWindowOpen;

  const conversionMessage = shouldOpenConversionWindow ? CONVERSION.guestToFree : null;

  // Session arc
  let arc: SessionState["sessionArc"] = state.sessionArc;
  if (exchange <= 2) arc = "assessment";
  else if (exchange <= 5) arc = "teaching";
  else if (exchange <= 8) arc = "consolidation";
  else arc = "closing";

  const promptInstruction = buildPromptInstruction({
    exchange,
    arc,
    level: state.estimatedLevel,
    confidence: state.levelConfidence,
    currentTargetWord: state.currentTargetWord,
    wordToIntroduce,
    shouldCelebrate,
    celebrationText,
    emotionalMomentum: state.emotionalMomentum,
    usedTargetWord,
    isGuest: state.isGuest,
  });

  return {
    arc,
    shouldIntroduceWord,
    shouldCelebrate,
    celebrationText,
    shouldOpenConversionWindow,
    conversionMessage,
    wordToIntroduce,
    promptInstruction,
  };
}

// ─── UPDATE SESSION STATE ─────────────────────────────────────────────────────

export function updateSessionState(
  state: SessionState,
  userMessage: string,
  instruction: ExchangeInstruction
): SessionState {
  const { level, confidence } = detectLevel(
    userMessage,
    state.estimatedLevel,
    state.levelConfidence
  );

  const usedTargetWord = didUserUseTargetWord(
    userMessage,
    state.currentTargetWord?.word ?? null
  );

  const newWordsIntroduced = instruction.wordToIntroduce
    ? [...state.wordsIntroduced, instruction.wordToIntroduce.word]
    : state.wordsIntroduced;

  const newWordsUsedCorrectly =
    usedTargetWord && state.currentTargetWord
      ? [...state.wordsUsedCorrectly, state.currentTargetWord.word]
      : state.wordsUsedCorrectly;

  const wordCount = userMessage.trim().split(/\s+/).length;
  let emotionalMomentum: SessionState["emotionalMomentum"] = "neutral";
  if (usedTargetWord || wordCount >= 6) emotionalMomentum = "positive";
  else if (wordCount <= 2) emotionalMomentum = "negative";
  else emotionalMomentum = "neutral";

  // Detect topic from message and update context if found
  const detectedTopic = detectTopicFromMessage(userMessage);

  return {
    ...state,
    exchangeNumber: state.exchangeNumber + 1,
    estimatedLevel: level,
    levelConfidence: confidence,
    wordsIntroduced: newWordsIntroduced,
    wordsUsedCorrectly: newWordsUsedCorrectly,
    emotionalMomentum,
    lastUserSignal: userMessage.slice(0, 100),
    sessionArc: instruction.arc,
    conversionWindowOpen:
      state.conversionWindowOpen || instruction.shouldOpenConversionWindow,
    currentTargetWord: instruction.wordToIntroduce ?? state.currentTargetWord,
    topicContext: detectedTopic ?? state.topicContext,
  };
}

// ─── PROMPT INSTRUCTION BUILDER ───────────────────────────────────────────────

function buildPromptInstruction(params: {
  exchange: number;
  arc: SessionState["sessionArc"];
  level: Level;
  confidence: number;
  currentTargetWord: SessionVocabWord | null;
  wordToIntroduce: SessionVocabWord | null;
  shouldCelebrate: boolean;
  celebrationText: string | null;
  emotionalMomentum: string;
  usedTargetWord: boolean;
  isGuest: boolean;
}): string {
  const lines: string[] = [];

  lines.push(`EXCHANGE: ${params.exchange}`);
  lines.push(`USER LEVEL: ${params.level} (confidence: ${Math.round(params.confidence * 100)}%)`);
  lines.push(`SESSION ARC: ${params.arc}`);
  lines.push(`EMOTIONAL MOMENTUM: ${params.emotionalMomentum}`);

  if (params.arc === "assessment") {
    lines.push("GOAL: Warm conversation. Assess level silently. Ask ONE open question. Keep response under 60 words.");
  }

  if (params.shouldCelebrate && params.celebrationText) {
    lines.push(`CELEBRATE: Start with this exact phrase: "${params.celebrationText}"`);
  }

  if (params.wordToIntroduce) {
    const w = params.wordToIntroduce;
    lines.push(`INTRODUCE WORD: Use '${w.word}' (${w.thai}${w.pronunciationHint ? `, pronounced: ${w.pronunciationHint}` : ""}) naturally in your response.`);
    lines.push(`Use it exactly once. Do not explain it directly — let context show meaning.`);
    if (w.exampleTh) lines.push(`Example sentence available: "${w.exampleTh}"`);
    if (w.miomiIntro) lines.push(`Miomi's intro line: "${w.miomiIntro}"`);
    if (w.culturalWarning) lines.push(`CULTURAL NOTE: ${w.culturalWarning}`);
  }

  if (params.currentTargetWord && !params.wordToIntroduce) {
    lines.push(`TARGET WORD: '${params.currentTargetWord.word}' — use it again naturally if it fits.`);
  }

  if (params.usedTargetWord) {
    lines.push("USER USED TARGET WORD CORRECTLY: Acknowledge warmly and specifically.");
  }

  if (params.level === "beginner") {
    lines.push("LANGUAGE RULE: Simple sentences only. Max 1 English word introduced. Thai dominant.");
  } else if (params.level === "elementary") {
    lines.push("LANGUAGE RULE: Mix Thai and English naturally. 1-2 English focus words.");
  } else if (params.level === "intermediate") {
    lines.push("LANGUAGE RULE: More English. Thai as support. Natural conversation pace.");
  } else {
    lines.push("LANGUAGE RULE: Mostly English. Thai only for emotional warmth. Challenge them gently.");
  }

  lines.push("HARD RULES: Under 100 words. No markdown. No asterisks. No bullet points. Never say wrong. Always end with one question or invitation.");

  return lines.join("\n");
}

// ─── STATIC HELPERS ───────────────────────────────────────────────────────────

export function getSessionOpening(): { th: string; en: string } {
  return (
    SESSION_OPENINGS[Math.floor(Math.random() * SESSION_OPENINGS.length)] ??
    SESSION_OPENINGS[0]!
  );
}

export function getFailoverResponse(): { th: string; en: string } {
  return (
    FAILOVER_RESPONSES[Math.floor(Math.random() * FAILOVER_RESPONSES.length)] ??
    FAILOVER_RESPONSES[0]!
  );
}

// ─── ENGINE UPGRADE: LANGUAGE + INTENT ────────────────────────────────────────

import { detectLanguageSignals, detectPrimaryLanguage, detectLearningDirection, getVoiceRatio } from "./language";
import { detectArchetype } from "./persona";
import { detectSessionMode } from "./prompt";
import { classifyIntentAdvanced, getIntentFamily } from "./intents";

export function updateSessionWithLanguage(
  state: SessionState,
  message: string
): SessionState {
  const { primary, confidence, signals } = detectPrimaryLanguage(
    message,
    state.languageSignalsHistory
  );

  const history = [...state.languageSignalsHistory, signals].slice(-10);

  const recentMessages = [state.lastUserSignal, message].filter(Boolean);
  const explicitStatement = state.hasStatedGoal ? state.statedGoal : null;
  const { direction, confidence: dirConfidence } = detectLearningDirection(
    primary,
    recentMessages,
    explicitStatement
  );

  // Map CEFR level
  const cefrMap: Record<string, string> = {
    beginner: "A1",
    elementary: "A2",
    intermediate: "B1",
    upper: "B2",
  };
  const cefrLevel = cefrMap[state.estimatedLevel] ?? "A2";
  const voiceRatio = getVoiceRatio(direction, cefrLevel);

  return {
    ...state,
    primaryLanguage: primary,
    primaryLanguageConfidence: confidence,
    learningDirection: direction,
    learningDirectionConfidence: dirConfidence,
    languageSignalsHistory: history,
    voiceRatioTarget: voiceRatio,
  };
}

export function updateSessionWithIntent(
  state: SessionState,
  message: string
): SessionState {
  const result = classifyIntentAdvanced(
    message,
    state.currentTargetWord?.word ?? null,
    state.exchangeNumber
  );

  const family = result.family;

  // Update intent family distribution
  const dist = { ...state.intentFamilyDistribution };
  const currentCount = (dist[family] ?? 0);
  const totalExchanges = state.exchangeNumber + 1;
  dist[family] = (currentCount * (totalExchanges - 1) + 1) / totalExchanges;

  // Detect Gen-Z markers
  const { genzMarkers } = detectLanguageSignals(message);
  const newGenzCount = state.genzMarkerCount + genzMarkers.length;

  // Formality score (simple heuristic)
  const formalSignals = /(ครับ|ค่ะ|กรุณา|please|sir|madam|formally|professional)/i.test(message);
  const casualSignals = /(555|ปัง|เด้ง|lol|haha|นะ~|จ้า|จ๊า)/i.test(message);
  const formalityDelta = formalSignals ? 0.1 : casualSignals ? -0.1 : 0;
  const newFormality = Math.max(0, Math.min(1, state.formalityScore + formalityDelta));

  // Goal detection
  const hasGoal = /(เป้าหมาย|goal|i want to learn|อยากเรียน|อยากเก่ง)/i.test(message);

  // Update archetype
  const archetypeSignals = {
    primaryLanguage: state.primaryLanguage,
    learningDirection: state.learningDirection,
    intentFamilyDistribution: dist,
    genzMarkerCount: newGenzCount,
    formalityScore: newFormality,
    topicSignals: state.topicSignals,
    hasStatedGoal: state.hasStatedGoal || hasGoal,
    statedGoal: hasGoal ? message.slice(0, 100) : state.statedGoal,
  };

  const { archetype, confidence: archetypeConf } = detectArchetype(
    archetypeSignals,
    state.detectedArchetype,
    state.archetypeConfidence
  );

  // Update session mode
  const newMode = detectSessionMode(family, state.sessionMode, state.exchangeNumber);

  return {
    ...state,
    lastIntent: result.primary.intent,
    lastIntentFamily: family,
    intentFamilyDistribution: dist,
    genzMarkerCount: newGenzCount,
    formalityScore: newFormality,
    hasStatedGoal: archetypeSignals.hasStatedGoal,
    statedGoal: archetypeSignals.statedGoal,
    detectedArchetype: archetype,
    archetypeConfidence: archetypeConf,
    sessionMode: newMode,
  };
}

// ─── RE-EXPORT LEGACY TYPE ────────────────────────────────────────────────────
// Keep VocabWord exported so anything still importing from session.ts doesn't break

export type { VocabWord };
