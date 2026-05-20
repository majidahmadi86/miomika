import { NextRequest, NextResponse } from "next/server";
import { getAIResponse } from "@/lib/ai/router";
import { matchLibrary, logInteraction, type MatchContext } from "@/lib/ai/matcher";
import { createClient } from "@/lib/supabase/server";
import {
  createSessionState,
  updateSessionWithLanguage,
  updateSessionWithIntent,
  updateSessionState,
  getExchangeInstruction,
  getFailoverResponse,
  type SessionState,
} from "@/lib/ai/session";
import {
  classifyIntentAdvanced,
  getIntentFamily,
} from "@/lib/ai/intents";
import {
  detectPrimaryLanguage,
  detectLearningDirection,
  getVoiceRatio,
} from "@/lib/ai/language";
import {
  detectArchetype,
  buildPersonaPromptSection,
  buildEmotionalModifier,
} from "@/lib/ai/persona";
import {
  buildAdaptiveSystemPrompt,
  buildClarificationPrompt,
  detectSessionMode,
  type PromptContext,
} from "@/lib/ai/prompt";
import { getWordForSession } from "@/lib/ai/vocabulary";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MiomiResponse = {
  content: string;
  wordCard: unknown | null;
  phraseCard: unknown | null;
  creatorAsset: unknown | null;
  sessionContext: Partial<SessionState>;
  servedVia: string;
  wasFailover: boolean;
  intent: string | null;
  sessionMode: string;
  needsClarification: boolean;
};

// ─── MAIN ROUTE ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      isGuest,
      sessionId,
      userId,
      sessionContext: clientSessionContext,
    } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userInput: string = lastMessage?.content ?? "";

    if (!userInput.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // ── STAGE 1: Reconstruct session state ───────────────────────────────────
    let state: SessionState = createSessionState(!!isGuest, userId ?? null);
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

    // ── STAGE 2: Language detection ──────────────────────────────────────────
    state = updateSessionWithLanguage(state, userInput);

    // ── STAGE 3: Intent classification ───────────────────────────────────────
    const intentResult = classifyIntentAdvanced(
      userInput,
      state.currentTargetWord?.word ?? null,
      state.exchangeNumber
    );

    // ── STAGE 4: Update session mode ─────────────────────────────────────────
    state = updateSessionWithIntent(state, userInput);

    // ── STAGE 5: Handle clarification needed ─────────────────────────────────
    if (intentResult.needsClarification) {
      const clarification = buildClarificationPrompt(state.primaryLanguage);
      return NextResponse.json({
        content: clarification,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: buildSessionContext(state),
        servedVia: "clarification",
        wasFailover: false,
        intent: "meta_clarification_needed",
        sessionMode: state.sessionMode,
        needsClarification: true,
      } satisfies MiomiResponse);
    }

    // ── STAGE 6: Build prompt context ────────────────────────────────────────
    const cefrMap: Record<string, string> = {
      beginner: "A1", elementary: "A2", intermediate: "B1", upper: "B2",
    };
    const cefrLevel = cefrMap[state.estimatedLevel] ?? "A2";

    // ── STAGE 7: Check library with new intent taxonomy ──────────────────────
    const matchContext: MatchContext = {
      estimatedLevel: state.estimatedLevel,
      sessionArc: state.sessionArc,
      exchangeNumber: state.exchangeNumber,
      currentTargetWord: state.currentTargetWord?.word ?? null,
      emotionalMomentum: state.emotionalMomentum,
    };

    const supabase = await createClient();
    const matchResult = await matchLibrary(userInput, matchContext);

    // ── STAGE 8: Get word to introduce ───────────────────────────────────────
    const shouldIntroduceWord =
      (state.exchangeNumber === 2 || state.exchangeNumber === 5) &&
      state.sessionMode === "learning" &&
      intentResult.family !== "creating";

    let wordToIntroduce = null;
    if (shouldIntroduceWord) {
      wordToIntroduce = await getWordForSession(
        state.estimatedLevel,
        state.wordsIntroduced,
        supabase
      );
    }

    // ── STAGE 9: Build adaptive prompt ───────────────────────────────────────
    const promptContext: PromptContext = {
      primaryLanguage: state.primaryLanguage,
      learningDirection: state.learningDirection,
      cefrLevel,
      voiceRatio: state.voiceRatioTarget,
      archetype: state.detectedArchetype,
      archetypeConfidence: state.archetypeConfidence,
      intent: intentResult.primary.intent,
      intentFamily: intentResult.family,
      exchangeNumber: state.exchangeNumber,
      sessionArc: state.sessionArc,
      wordsIntroduced: state.wordsIntroduced,
      currentTargetWord: state.currentTargetWord?.word ?? null,
      emotionalMomentum: state.emotionalMomentum,
      isGuest: !!isGuest,
      wordToIntroduce: wordToIntroduce?.word ?? null,
      wordToIntroduceThai: wordToIntroduce?.thai ?? null,
      shouldCelebrate: false,
      celebrationText: null,
    };

    const adaptivePrompt = buildAdaptiveSystemPrompt(promptContext);

    // ── STAGE 10: Serve from library or AI ───────────────────────────────────
    let content: string;
    let servedVia: string;
    let wasFailover = false;

    if (matchResult.type === "library") {
      const { match } = matchResult;
      const thPart = match.follow_up_question_th
        ? `${match.response_th}\n${match.follow_up_question_th}`
        : match.response_th;
      const enPart = match.follow_up_question_en
        ? `${match.response_en}\n${match.follow_up_question_en}`
        : match.response_en;
      content = `${thPart}\n\n${enPart}`;
      servedVia = `library_${match.matched_via}`;

      void updateTimesServed(match.id);
      void logInteraction({
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
        userId: userId ?? null,
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

      const result = await getAIResponse(formattedMessages, adaptivePrompt);
      content = result.content;
      servedVia = `ai_${result.engine}`;
      wasFailover = result.wasFailover;

      void logInteraction({
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
        userId: userId ?? null,
        userInput,
        servedResponse: content,
        servedVia,
        libraryEntryId: null,
        matchConfidence: null,
        aiCostUsd: result.engine === "groq" ? 0 : 0.0008,
      });
    }

    // ── STAGE 11: Extract teaching artifacts ─────────────────────────────────
    const wordCard = wordToIntroduce ?? null;

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
        wordsIntroduced: [...state.wordsIntroduced, wordToIntroduce.word],
        currentTargetWord: wordToIntroduce,
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
    } satisfies MiomiResponse);

  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Route error:", err?.message);
    const failover = getFailoverResponse();
    return NextResponse.json(
      {
        content: `${failover.th}\n\n${failover.en}`,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: {},
        servedVia: "failover",
        wasFailover: true,
        intent: null,
        sessionMode: "learning",
        needsClarification: false,
      } satisfies MiomiResponse,
      { status: 200 }
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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
