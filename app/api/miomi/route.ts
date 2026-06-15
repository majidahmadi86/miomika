export const preferredRegion = ["sin1", "hnd1"];

import { NextRequest, NextResponse } from "next/server";
import { getAIResponse } from "@/lib/ai/router";
import {
  matchLibraryFromDB,
  logInteraction,
  type MatchContext,
} from "@/lib/library/supabase-matcher";
import {
  createSessionState,
  updateSessionWithIntent,
  getFailoverResponse,
  type SessionState,
} from "@/lib/ai/session";
import { classifyIntentAdvanced } from "@/lib/ai/intents";
import { cefrToLevel } from "@/lib/ai/vocabulary";
import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";
import {
  pickPhrase,
  GUIDANCE_GUEST_LIMIT_HIT,
} from "@/lib/voice/warmth";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";
import { saveExchange } from "@/lib/brain/memory";
import { readBrainState, type BrainState } from "@/lib/brain/state";
import { buildBrainPrompt } from "@/lib/brain/prompt";
import { detectExplicitUiLanguageRequest } from "@/lib/brain/language";
import {
  detectReuseAndAdvance,
  introduceWord,
  pickWordToIntroduce,
  type IntroducedWord,
  type MasteryEvent,
} from "@/lib/brain/teaching";
import type { PronunciationLesson } from "@/lib/brain/pronunciation";
import { log } from "@/lib/debug/log";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MiomiResponse = {
  content: string;
  wordCard: IntroducedWord | null;
  phraseCard: unknown | null;
  creatorAsset: unknown | null;
  sessionContext: Partial<SessionState>;
  servedVia: string;
  wasFailover: boolean;
  intent: string | null;
  sessionMode: string;
  needsClarification: boolean;
  masteryEvent: MasteryEvent | null;
  pronunciationLesson: PronunciationLesson | null;
  replyLanguage: "th" | "en";
  userSpeaksLanguage: "th" | "en";
  guestHandoff?: boolean;
};

const BRAIN_PROMPT_FALLBACK =
  "You are Miomi, a warm Thai cat companion. Reply with one warm sentence in the user's language.";

// ─── MAIN ROUTE ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let brainState: BrainState | null = null;
  try {
    // SERVER reads user identity from cookies. Client cannot lie about tier.
    const profile = await getServerProfile();
    const serverUserId = profile?.id ?? null;
    const serverIsGuest = !profile;
    // Phase 4 will read profile.tier here for cost-cap enforcement.

    const body = await req.json();
    const {
      messages,
      sessionId,
      sessionContext: clientSessionContext,
    } = body;
    const mode = body?.mode as "auto" | "teach" | "social" | "translate" | "chat" | undefined;
    const clientUiLanguage = body?.uiLanguage === "en" || body?.uiLanguage === "th" ? body.uiLanguage : null;
    const clientTargetLanguage = body?.targetLanguage === "en" || body?.targetLanguage === "th" ? body.targetLanguage : null;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userInput: string = lastMessage?.content ?? "";

    if (!userInput.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    if (serverUserId) {
      void touchLastSeen(serverUserId);
    }

    // ── STAGE 1: Reconstruct session state (server-resolved identity) ────────
    let state: SessionState = createSessionState(serverIsGuest, serverUserId);
    if (sessionId) state.sessionId = sessionId;
    if (clientSessionContext) {
      state = {
        ...state,
        ...clientSessionContext,
        // Always trust client for these accumulated arrays
        wordsIntroduced: clientSessionContext.wordsIntroduced ?? state.wordsIntroduced,
        wordsUsedCorrectly: clientSessionContext.wordsUsedCorrectly ?? state.wordsUsedCorrectly,
        phrasesIntroduced: clientSessionContext.phrasesIntroduced ?? state.phrasesIntroduced,
        languageSignalsHistory: clientSessionContext.languageSignalsHistory ?? [],
        intentFamilyDistribution: clientSessionContext.intentFamilyDistribution ?? {},
        creatorOutputs: clientSessionContext.creatorOutputs ?? [],
      };
    }

    log("miomi", "start", { userInput: userInput.slice(0, 80), exchange: state.exchangeNumber });

    // ── BRAIN: read state → build model-owned prompt ─────────────────────────
    let adaptivePrompt: string;

    try {
      brainState = await readBrainState({
        userInput,
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
        overrideUiLanguage: clientUiLanguage,
        overrideTargetLanguage: clientTargetLanguage,
      });

      adaptivePrompt = buildBrainPrompt({ state: brainState, userInput, mode });
      adaptivePrompt += `\n\nNAME: Your name is Miomi. Never spell it out, never count its syllables, never write it in Thai script when speaking English. Just say "Miomi" naturally.`;
      if (!adaptivePrompt.trim()) {
        adaptivePrompt = BRAIN_PROMPT_FALLBACK;
      }
      log("miomi", "state", {
        lang: brainState.nowLanguage,
        mood: brainState.emotionalSignal,
        mode: mode ?? "auto",
        memoryCount: brainState.memory.length,
      });
    } catch (err) {
      console.error("[brain] readBrainState failed:", err);
      brainState = createDefaultBrainState({
        exchangeNumber: state.exchangeNumber,
        isGuest: serverIsGuest,
        userId: serverUserId,
      });
      adaptivePrompt = BRAIN_PROMPT_FALLBACK;
    }

    // True on the guest's final free turn. Flag the handoff on EVERY served reply path
    // (recovery, clarification, main) so the signup sheet fires regardless of how the
    // turn was answered — not only the main AI return.
    const isLastFreeGuestTurn =
      serverIsGuest && state.exchangeNumber === GUEST_EXCHANGE_LIMIT - 1;

    // ── SERVER-SIDE GUEST LIMIT (never trust client) ──────────────────────────
    if (serverIsGuest && state.exchangeNumber >= GUEST_EXCHANGE_LIMIT) {
      const guestLimitContent = pickPhrase(GUIDANCE_GUEST_LIMIT_HIT, {
        lang: brainState.uiLanguage,
      });
      const guestReplyLang = detectReplyLanguageFromContent(
        guestLimitContent,
        brainState.uiLanguage,
      );
      persistExchangePair({
        userId: serverUserId,
        state,
        userInput,
        miomiContent: guestLimitContent,
      });
      return NextResponse.json({
        content: guestLimitContent,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: buildSessionContext(state),
        servedVia: "guest_limit",
        wasFailover: false,
        intent: null,
        sessionMode: state.sessionMode,
        needsClarification: false,
        masteryEvent: null,
        pronunciationLesson: null,
        replyLanguage: guestReplyLang,
        userSpeaksLanguage: brainState.uiLanguage,
      } satisfies MiomiResponse);
    }

    // ── Sticky speaking language for memory + session ───────────────────────
    state = {
      ...state,
      primaryLanguage: brainLanguageToSession(brainState),
    };

    // ── STAGE 3: Intent classification (recovery / clarification safety nets) ─
    const intentResult = classifyIntentAdvanced(
      userInput,
      state.currentTargetWord?.word ?? null,
      state.exchangeNumber
    );

    // ── STAGE 4: Update session mode ─────────────────────────────────────────
    state = updateSessionWithIntent(state, userInput);

    // ── STAGE 4b: Recovery — disabled; model comforts via prompt ─────────────
    if (false && intentResult.family === "social" && intentResult.primary.intent === "social_emotion_negative") {
      /* template hijack removed — brain prompt owns recovery */
    }

    // ── STAGE 5: Clarification — disabled; model infers garbled speech ───────
    if (false && intentResult.needsClarification) {
      /* template hijack removed — brain prompt owns unclear input */
    }

    // ── BRAIN STEP 4: mastery detect + optional word introduce ───────────────
    const introducedWordKeys = [
      ...new Set([...brainState.introducedWords, ...state.wordsIntroduced]),
    ];
    const masteredWordKeys = [
      ...new Set([...brainState.masteredWords, ...state.wordsUsedCorrectly]),
    ];

    let masteryEvent: MasteryEvent = { type: "none" };
    let wordToIntroduce: IntroducedWord | null = null;

    try {
      masteryEvent = await detectReuseAndAdvance({
        userId: serverUserId,
        userText: userInput,
        introducedWords: brainState.introducedWords,
      });
    } catch (err) {
      console.error("[brain] detectReuseAndAdvance failed:", err);
      masteryEvent = { type: "none" };
    }

    // LANGUAGE SINGLE-OWNER: only an explicit request switches the medium; practising the
    // target language never flips it. The medium owns the reply voice (no content-detection).
    const explicitUiSwitch = detectExplicitUiLanguageRequest(userInput);
    if (explicitUiSwitch && explicitUiSwitch !== brainState.uiLanguage) {
      adaptivePrompt += `\n\nLANGUAGE SWITCH: The user explicitly asked you to speak ${explicitUiSwitch === "th" ? "Thai" : "English"}. Switch to ${explicitUiSwitch === "th" ? "Thai" : "English"} now and stay in it.`;
    }

    // CARDS: show a word card ONLY when the user actually asks to learn one, and
    // NEVER in chat mode (chat = relaxed practice). No more automatic every-4th cards.
    const userAskedForWord =
      brainState.intent === "want_to_learn" ||
      /\b(teach me|a new word|new word|word for|how (do|to) (you )?say|another word|thai word|english word|a card|word card|สอนคำ|คำใหม่|คำศัพท์|ขอคำ|ขอศัพท์)\b/i.test(userInput);
    const shouldPickWord =
      mode !== "chat" &&
      (mode === "teach" || mode === "auto" || mode === undefined) &&
      userAskedForWord &&
      masteryEvent.type === "none" &&
      brainState.emotionalSignal !== "stuck" &&
      brainState.emotionalSignal !== "sad";

    if (shouldPickWord) {
      try {
        wordToIntroduce = await pickWordToIntroduce({
          userId: serverUserId,
          cefrLevel: brainState.profile.cefrLevel,
          learningTarget: brainState.profile.learningTarget,
          alreadyIntroducedWords: introducedWordKeys,
          alreadyMasteredWords: masteredWordKeys,
          tier: brainState.profile.tier,
        });
      } catch (err) {
        console.error("[brain] pickWordToIntroduce failed:", err);
        wordToIntroduce = null;
      }
    }

    if (wordToIntroduce) {
      adaptivePrompt += `\n\nTEACHING HINT: Naturally weave the word "${wordToIntroduce.word_en}" (${wordToIntroduce.word_th}) into your reply ONE time. Use it in context, don't define it formally — like a friend dropping it into conversation. The system will show the user a card after your reply.`;
    }

    if (isLastFreeGuestTurn) {
      // LOCKED 2026-06-04 — paired with completeGuestLimitTurn (talk/page.tsx), verified in prod.
      // Reply must NOT mention signup; the invitation is a separate spoken cue. Do not re-add invite text.
      adaptivePrompt += `\n\nLAST-TURN HAND-OFF: This is the guest's final free turn. DO NOT mention signing up, accounts, remembering, limits, quota, trial, or goodbye anywhere in your reply. Your job in one or two short sentences: (a) warmly and fully answer what they just asked, and (b) open a small curiosity gap — tease one exciting thing just ahead (a next word, a little trick, a surprise) and stop right at the edge, as if you're about to share it next. Make continuing feel natural. The sign-up invitation is handled elsewhere.`;
    }

    // ── STAGE 7: Check library with brain-enriched context ───────────────────
    const matchContext: MatchContext = {
      estimatedLevel: brainState.profile.cefrLevel
        ? cefrToLevel(brainState.profile.cefrLevel)
        : state.estimatedLevel,
      sessionArc: state.sessionArc,
      exchangeNumber: state.exchangeNumber,
      currentTargetWord: state.currentTargetWord?.word ?? null,
      emotionalMomentum: brainState.emotionalSignal,
    };

    const matchResult = await matchLibraryFromDB(userInput, matchContext);

    // ── STAGE 10: Serve from library or AI ───────────────────────────────────
    let content: string;
    let servedVia: string;
    let wasFailover = false;

    let aiCostUsd = 0;

    if (matchResult.type === "library") {
      const { match } = matchResult;
      const thPart = match.follow_up_question_th
        ? `${match.response_th}\n${match.follow_up_question_th}`
        : match.response_th;
      const enPart = match.follow_up_question_en
        ? `${match.response_en}\n${match.follow_up_question_en}`
        : match.response_en;
      content = brainState.uiLanguage === "th" ? thPart : enPart;
      servedVia = `library_${match.matched_via}`;
      log("miomi", "ai-result", {
        servedVia,
        replyLen: content.length,
        wordCardSet: !!wordToIntroduce,
        masteryEvent: masteryEvent.type,
      });

      void updateTimesServed(match.id);
      void logInteraction({
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
        userId: serverUserId,
        userInput,
        servedResponse: content,
        servedVia,
        libraryEntryId: match.id,
        matchConfidence: match.match_confidence,
        aiCostUsd: 0,
      });
    } else {
      // AI call with adaptive prompt
      const formattedMessages = messages.map(
        (m: { role: string; content: string }) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: m.content,
        })
      );

      log("miomi", "ai-call", { engine: "router", promptLen: adaptivePrompt.length });
      const result = await getAIResponse(formattedMessages, adaptivePrompt);
      content = result.content;
      servedVia = `ai_${result.engine}__${mode ?? "auto"}`;
      wasFailover = result.wasFailover;
      aiCostUsd = result.engine === "groq" ? 0 : 0.0008;
      log("miomi", "ai-result", {
        servedVia,
        replyLen: content.length,
        wordCardSet: !!wordToIntroduce,
        masteryEvent: masteryEvent.type,
      });

      void logInteraction({
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
        userId: serverUserId,
        userInput,
        servedResponse: content,
        servedVia,
        libraryEntryId: null,
        matchConfidence: null,
        aiCostUsd,
      });
    }

    persistExchangePair({
      userId: serverUserId,
      state,
      userInput,
      miomiContent: content,
      aiCostUsd,
      intent: intentResult.primary.intent,
    });

    if (wordToIntroduce) {
      void introduceWord({ userId: serverUserId, word: wordToIntroduce });
    }

    if (wordToIntroduce) {
      servedVia += "__taught";
    }
    if (masteryEvent.type === "mastered") {
      servedVia += "__mastered";
    } else if (masteryEvent.type === "advanced") {
      servedVia += "__advanced";
    }

    // ── STAGE 11: Extract teaching artifacts ─────────────────────────────────
    const wordCard = wordToIntroduce ?? null;
    const responseMasteryEvent =
      masteryEvent.type === "none" ? null : masteryEvent;

    // Creator asset — if intent is creator family, save the output
    const creatorAsset = intentResult.family === "creating"
      ? {
          text: content,
          platform: detectPlatform(userInput),
          vocabularyUsed: wordToIntroduce ? [wordToIntroduce.word] : [],
          createdAt: new Date().toISOString(),
        }
      : null;

    // ── STAGE 12: Update state and return ────────────────────────────────────
    if (wordToIntroduce) {
      state = {
        ...state,
        wordsIntroduced: [...state.wordsIntroduced, wordToIntroduce.word_en],
      };
    }

    if (creatorAsset) {
      state = {
        ...state,
        creatorOutputs: [...state.creatorOutputs, creatorAsset],
        lastCreatorOutput: content,
      };
    }

    state = {
      ...state,
      exchangeNumber: state.exchangeNumber + 1,
      lastUserSignal: userInput.slice(0, 100),
    };

    const replyLanguage = explicitUiSwitch ?? brainState.uiLanguage;
    return NextResponse.json({
      content,
      wordCard,
      phraseCard: null,
      creatorAsset,
      sessionContext: buildSessionContext(state),
      servedVia,
      wasFailover,
      intent: intentResult.primary.intent,
      sessionMode: state.sessionMode,
      needsClarification: false,
      masteryEvent: responseMasteryEvent,
      pronunciationLesson: null,
      replyLanguage,
      userSpeaksLanguage: brainState.userSpeaksLanguage,
      guestHandoff: isLastFreeGuestTurn,
    } satisfies MiomiResponse);

  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    log("miomi", "error", { error: err.message, stack: err.stack?.slice(0, 300) });
    console.error("Route error:", err?.message);
    const failover = getFailoverResponse();
    const failoverContent = `${failover.th}\n\n${failover.en}`;
    const failoverReplyLang = detectReplyLanguageFromContent(
      failoverContent,
      brainState?.uiLanguage ?? "en",
    );
    return NextResponse.json(
      {
        content: failoverContent,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: {},
        servedVia: "failover",
        wasFailover: true,
        intent: null,
        sessionMode: "learning",
        needsClarification: false,
        masteryEvent: null,
        pronunciationLesson: null,
        replyLanguage: failoverReplyLang,
        userSpeaksLanguage: failoverReplyLang,
      } satisfies MiomiResponse,
      { status: 200 }
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function detectReplyLanguageFromContent(
  text: string,
  fallback: "th" | "en",
): "th" | "en" {
  if (!text.trim()) return fallback;
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latinLetters = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (thaiChars > latinLetters) return "th";
  if (latinLetters > thaiChars) return "en";
  return fallback;
}

function brainLanguageToSession(brainState: BrainState): SessionState["primaryLanguage"] {
  return brainState.userSpeaksLanguage === "en" ? "english" : "thai";
}

function createDefaultBrainState(args: {
  exchangeNumber: number;
  isGuest: boolean;
  userId: string | null;
}): BrainState {
  return {
    profile: {
      id: args.userId,
      displayName: null,
      uiLanguage: "th",
      learningTarget: null,
      journeyStage: null,
      tier: args.isGuest ? "guest" : "free",
      cefrLevel: null,
      catName: null,
    },
    memory: [],
    masteredWords: [],
    introducedWords: [],
    nowLanguage: "th",
    uiLanguage: "th",
    targetLanguage: null,
    userSpeaksLanguage: "th",
    learningTargetLanguage: null,
    isPracticeAttempt: false,
    emotionalSignal: "neutral",
    frustrationSignal: false,
    repetitionDetected: false,
    intent: "chat",
    isFirstExchange: args.exchangeNumber <= 1,
    exchangeNumber: args.exchangeNumber,
    isGuest: args.isGuest,
  };
}

function buildSessionContext(state: SessionState): Partial<SessionState> {
  return {
    exchangeNumber: state.exchangeNumber,
    estimatedLevel: state.estimatedLevel,
    levelConfidence: state.levelConfidence,
    sessionArc: state.sessionArc,
    currentTargetWord: state.currentTargetWord,
    emotionalMomentum: state.emotionalMomentum,
    wordsIntroduced: state.wordsIntroduced,
    wordsUsedCorrectly: state.wordsUsedCorrectly,
    sessionId: state.sessionId,
    primaryLanguage: state.primaryLanguage,
    learningDirection: state.learningDirection,
    voiceRatioTarget: state.voiceRatioTarget,
    detectedArchetype: state.detectedArchetype,
    archetypeConfidence: state.archetypeConfidence,
    sessionMode: state.sessionMode,
    intentFamilyDistribution: state.intentFamilyDistribution,
    languageSignalsHistory: state.languageSignalsHistory.slice(-5),
    phrasesIntroduced: state.phrasesIntroduced,
    creatorOutputs: state.creatorOutputs.slice(-3),
    lastCreatorOutput: state.lastCreatorOutput,
    genzMarkerCount: state.genzMarkerCount,
    formalityScore: state.formalityScore,
    hasStatedGoal: state.hasStatedGoal,
    statedGoal: state.statedGoal,
    lastIntent: state.lastIntent,
    lastIntentFamily: state.lastIntentFamily,
  };
}

function detectPlatform(message: string): string {
  const lower = message.toLowerCase();
  if (/(tiktok|ติ๊กต็อก)/.test(lower)) return "TikTok";
  if (/(instagram|ig|อินสตา)/.test(lower)) return "Instagram";
  if (/(facebook|fb|เฟสบุ๊ค)/.test(lower)) return "Facebook";
  if (/(youtube|ยูทูบ)/.test(lower)) return "YouTube";
  if (/(line|ไลน์)/.test(lower)) return "LINE";
  return "general";
}

function persistExchangePair(params: {
  userId: string | null;
  state: SessionState;
  userInput: string;
  miomiContent: string;
  aiCostUsd?: number;
  intent?: string | null;
  emotionalSignal?: string | null;
}): void {
  const {
    userId,
    state,
    userInput,
    miomiContent,
    aiCostUsd,
    intent,
    emotionalSignal,
  } = params;

  void saveExchange({
    userId,
    sessionId: state.sessionId,
    exchangeNumber: state.exchangeNumber,
    role: "user",
    content: userInput,
    language: state.primaryLanguage,
  });
  void saveExchange({
    userId,
    sessionId: state.sessionId,
    exchangeNumber: state.exchangeNumber,
    role: "miomi",
    content: miomiContent,
    language: state.primaryLanguage,
    aiCostUsd,
    intent: intent ?? null,
    emotionalSignal: emotionalSignal ?? null,
    move: null,
  });
}

async function updateTimesServed(entryId: string) {
  try {
    const { createClient: createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    await supabase
      .from("library_entries")
      .update({ last_served_at: new Date().toISOString() })
      .eq("id", entryId);
  } catch (err) {
    console.error("Update times served error:", err);
  }
}
