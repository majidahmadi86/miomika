// lib/ai/session.ts
// Session state engine. Lives in React state. Zero cost.
// Injected into every API call. Never stored in database (yet).

import {
    Level,
    LEVEL_SIGNALS,
    VOCABULARY,
    CELEBRATIONS,
    CONVERSION,
    FAILOVER_RESPONSES,
    SESSION_OPENINGS,
    VocabWord,
  } from "./library";
  
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
    currentTargetWord: VocabWord | null;
  };
  
  // ─── INITIAL STATE ────────────────────────────────────────────────────────────
  
  export function createSessionState(isGuest: boolean): SessionState {
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
    };
  }
  
  // ─── LEVEL DETECTION ──────────────────────────────────────────────────────────
  // Reads user message. Returns estimated level + confidence.
  // Never shown to user. Silent and continuous.
  
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
  
    // Word count is the fastest signal
    if (wordCount <= LEVEL_SIGNALS.beginner.maxWordsPerMessage) {
      detectedLevel = "beginner";
    } else if (wordCount <= LEVEL_SIGNALS.elementary.maxWordsPerMessage) {
      detectedLevel = "elementary";
    } else if (wordCount <= LEVEL_SIGNALS.intermediate.maxWordsPerMessage) {
      detectedLevel = "intermediate";
    } else {
      detectedLevel = "upper";
    }
  
    // Vocabulary indicators override word count
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
  
    // If message is mostly Thai — lean beginner/elementary
    const thaiChars = (message.match(/[\u0E00-\u0E7F]/g) ?? []).length;
    const totalChars = message.replace(/\s/g, "").length;
    if (totalChars > 0 && thaiChars / totalChars > 0.7) {
      if (detectedLevel === "intermediate" || detectedLevel === "upper") {
        detectedLevel = "elementary";
        confidenceBoost = 0.1;
      }
    }
  
    // Blend with existing confidence — don't flip level on one message
    const newConfidence = Math.min(1.0, currentConfidence + confidenceBoost);
  
    // Only update level if confidence crossed threshold
    if (currentConfidence < 0.3 || newConfidence > 0.6) {
      return { level: detectedLevel, confidence: newConfidence };
    }
  
    return { level: currentLevel, confidence: newConfidence };
  }
  
  // ─── WORD USED CORRECTLY DETECTION ───────────────────────────────────────────
  // Checks if user actually used the target word in their message.
  
  export function didUserUseTargetWord(
    message: string,
    targetWord: string | null
  ): boolean {
    if (!targetWord) return false;
    return message.toLowerCase().includes(targetWord.toLowerCase());
  }
  
  // ─── PICK TARGET WORD ─────────────────────────────────────────────────────────
  // Picks next word to teach based on level.
  // Never repeats a word already introduced this session.
  
  export function pickTargetWord(
    level: Level,
    alreadyIntroduced: string[]
  ): VocabWord | null {
    const pool = VOCABULARY[level];
    const available = pool.filter((w) => !alreadyIntroduced.includes(w.word));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)] ?? null;
  }
  
  // ─── SESSION ARC LOGIC ────────────────────────────────────────────────────────
  // Determines what Miomi should do this exchange based on state.
  
  export type ExchangeInstruction = {
    arc: SessionState["sessionArc"];
    shouldIntroduceWord: boolean;
    shouldCelebrate: boolean;
    celebrationText: string | null;
    shouldOpenConversionWindow: boolean;
    conversionMessage: { th: string; en: string } | null;
    wordToIntroduce: VocabWord | null;
    promptInstruction: string;
  };
  
  export function getExchangeInstruction(
    state: SessionState,
    userMessage: string
  ): ExchangeInstruction {
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
    } else if (exchange === 2 && userMessage.split(/\s+/).length > 5) {
      shouldCelebrate = true;
      celebrationText = CELEBRATIONS.longerThanBefore;
    }
  
    // Word introduction logic
    // Introduce word at exchange 3, then again at 6 if session continues
    const shouldIntroduceWord =
      (exchange === 3 || exchange === 6) &&
      state.levelConfidence >= 0.3;
  
    const wordToIntroduce = shouldIntroduceWord
      ? pickTargetWord(state.estimatedLevel, state.wordsIntroduced)
      : null;
  
    // Conversion window logic
    // Guest: open at exchange 4 if momentum is positive
    // Never open mid-struggle
    const shouldOpenConversionWindow =
      state.isGuest &&
      exchange === 4 &&
      state.emotionalMomentum === "positive" &&
      !state.conversionWindowOpen;
  
    const conversionMessage = shouldOpenConversionWindow
      ? CONVERSION.guestToFree
      : null;
  
    // Session arc progression
    let arc: SessionState["sessionArc"] = state.sessionArc;
    if (exchange <= 2) arc = "assessment";
    else if (exchange <= 5) arc = "teaching";
    else if (exchange <= 8) arc = "consolidation";
    else arc = "closing";
  
    // Build the dynamic prompt instruction
    // This gets injected into the AI prompt — tight, specific, cheap
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
  // Call this after every exchange. Updates state for next round.
  
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
  
    // Emotional momentum: positive if user wrote more than 6 words
    // or used the target word. Negative if very short / repeated errors.
    const wordCount = userMessage.trim().split(/\s+/).length;
    let emotionalMomentum: SessionState["emotionalMomentum"] = "neutral";
    if (usedTargetWord || wordCount >= 6) emotionalMomentum = "positive";
    else if (wordCount <= 2) emotionalMomentum = "negative";
    else emotionalMomentum = "neutral";
  
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
      topicContext: state.topicContext,
    };
  }
  
  // ─── PROMPT INSTRUCTION BUILDER ───────────────────────────────────────────────
  // Builds the tight dynamic instruction injected into every AI prompt.
  // This replaces the giant static system prompt for exchange-specific behavior.
  
  function buildPromptInstruction(params: {
    exchange: number;
    arc: SessionState["sessionArc"];
    level: Level;
    confidence: number;
    currentTargetWord: VocabWord | null;
    wordToIntroduce: VocabWord | null;
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
      lines.push(`INTRODUCE WORD: Use '${params.wordToIntroduce.word}' (${params.wordToIntroduce.thai}) naturally in your response. Use it exactly once. Do not explain it directly — let context show meaning.`);
    }
  
    if (params.currentTargetWord && !params.wordToIntroduce) {
      lines.push(`TARGET WORD: '${params.currentTargetWord.word}' — try to use it again naturally if it fits.`);
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
    return SESSION_OPENINGS[
      Math.floor(Math.random() * SESSION_OPENINGS.length)
    ] ?? SESSION_OPENINGS[0]!;
  }
  
  export function getFailoverResponse(): { th: string; en: string } {
    return FAILOVER_RESPONSES[
      Math.floor(Math.random() * FAILOVER_RESPONSES.length)
    ] ?? FAILOVER_RESPONSES[0]!;
  }