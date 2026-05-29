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
import { buildClarificationPrompt } from "@/lib/ai/prompt";
import { cefrToLevel } from "@/lib/ai/vocabulary";
import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";
import {
  pickPhrase,
  RECOVERY_STRUGGLE,
  GUIDANCE_GUEST_LIMIT_HIT,
} from "@/lib/voice/warmth";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";
import { saveExchange } from "@/lib/brain/memory";
import { readBrainState, type BrainState } from "@/lib/brain/state";
import { chooseMove, type Move } from "@/lib/brain/move";
import { buildBrainPrompt } from "@/lib/brain/prompt";
import {
  detectReuseAndAdvance,
  introduceWord,
  pickWordToIntroduce,
  type IntroducedWord,
  type MasteryEvent,
} from "@/lib/brain/teaching";
import {
  buildPronunciationLesson,
  detectPronunciationRequest,
  resolveContinuationWord,
  type PronunciationLesson,
} from "@/lib/brain/pronunciation";

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
};

const BRAIN_PROMPT_FALLBACK =
  "You are Miomi, a warm Thai cat companion. Reply with one warm sentence in the user's language.";

// ─── MAIN ROUTE ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // SERVER reads user identity from cookies. Client cannot lie about tier.
    const profile = await getServerProfile();
    const serverUserId = profile?.id ?? null;
    const serverIsGuest = !profile;
    // Phase 4 will read profile.tier here for cost-cap enforcement.

    const {
      messages,
      sessionId,
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

    // ── SERVER-SIDE GUEST LIMIT (never trust client) ──────────────────────────
    if (serverIsGuest && state.exchangeNumber >= GUEST_EXCHANGE_LIMIT) {
      const lang = state.primaryLanguage === "english" ? "en" : "th";
      const guestLimitContent = pickPhrase(GUIDANCE_GUEST_LIMIT_HIT, { lang });
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
      } satisfies MiomiResponse);
    }

    // ── BRAIN: read state → choose move → build teacher-persona prompt ───────
    let brainState: BrainState;
    let move: Move;
    let adaptivePrompt: string;

    try {
      brainState = await readBrainState({
        userInput,
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
      });

      const pronReq = detectPronunciationRequest(userInput);
      if (pronReq.isRequest) {
        let pronWord = pronReq.word;
        if (!pronWord) {
          pronWord = await resolveContinuationWord(serverUserId, brainState.memory);
        }
        if (pronWord) {
          const lesson = await buildPronunciationLesson(pronWord);
          if (lesson) {
            const replyTh = `ดีเลยค่า~ มาฝึกออกเสียงกันค่ะ คำว่า "${lesson.word_th || lesson.word}" แปลว่า ${lesson.meaning_th}. ลองพูดตามหนูทีละพยางค์นะคะ — ${lesson.syllables.join(" · ")}. พร้อมแล้วลองพูดให้หนูฟังได้เลยค่า~`;
            const replyEn = `Let's practice~ The word "${lesson.word}" means ${lesson.meaning_en}. Try saying it with me, one syllable at a time — ${lesson.syllables.join(" · ")}. When you're ready, say it back to me~`;
            const useLang = brainState.nowLanguage === "th" ? "th" : "en";
            const content = useLang === "th" ? replyTh : replyEn;

            persistExchangePair({
              userId: serverUserId,
              state,
              userInput,
              miomiContent: content,
              move: "pronunciation",
            });

            state = { ...state, exchangeNumber: state.exchangeNumber + 1 };

            return NextResponse.json({
              content,
              wordCard: null,
              phraseCard: null,
              creatorAsset: null,
              sessionContext: buildSessionContext(state),
              servedVia: "pronunciation_lesson",
              wasFailover: false,
              intent: null,
              sessionMode: state.sessionMode,
              needsClarification: false,
              masteryEvent: null,
              pronunciationLesson: lesson,
            } satisfies MiomiResponse);
          }
        }
      }

      move = chooseMove(brainState);
      adaptivePrompt = buildBrainPrompt({ state: brainState, move, userInput });
      if (!adaptivePrompt.trim()) {
        adaptivePrompt = BRAIN_PROMPT_FALLBACK;
      }
    } catch (err) {
      console.error("[brain] readBrainState failed:", err);
      brainState = createDefaultBrainState({
        exchangeNumber: state.exchangeNumber,
        isGuest: serverIsGuest,
        userId: serverUserId,
      });
      move = chooseMove(brainState);
      adaptivePrompt = BRAIN_PROMPT_FALLBACK;
    }

    // ── Language from brain (replaces detectPrimaryLanguage flow) ────────────
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

    // ── STAGE 4b: Recovery — negative emotion override ───────────────────────
    // Never teach when user is frustrated. Face-saving is enforced.
    if (intentResult.family === "social" && intentResult.primary.intent === "social_emotion_negative") {
      const lang = brainReplyLang(brainState);
      const recoveryContent = pickPhrase(RECOVERY_STRUGGLE, { lang });
      persistExchangePair({
        userId: serverUserId,
        state,
        userInput,
        miomiContent: recoveryContent,
        intent: "social_emotion_negative",
        emotionalSignal: "negative",
        move,
      });
      return NextResponse.json({
        content: recoveryContent,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: buildSessionContext({ ...state, exchangeNumber: state.exchangeNumber + 1 }),
        servedVia: "recovery_struggle",
        wasFailover: false,
        intent: "social_emotion_negative",
        sessionMode: state.sessionMode,
        needsClarification: false,
        masteryEvent: null,
        pronunciationLesson: null,
      } satisfies MiomiResponse);
    }

    // ── STAGE 5: Handle clarification needed ─────────────────────────────────
    if (intentResult.needsClarification) {
      const clarification = buildClarificationPrompt(state.primaryLanguage);
      persistExchangePair({
        userId: serverUserId,
        state,
        userInput,
        miomiContent: clarification,
        intent: "meta_clarification_needed",
        move,
      });
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
        masteryEvent: null,
        pronunciationLesson: null,
      } satisfies MiomiResponse);
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

    if (move !== "repair") {
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
    }

    // Teaching only when user is FLOWING and not asking a question. Better to skip than to interrupt.
    const shouldPickWord =
      move !== "repair" &&
      move === "teach" &&
      state.exchangeNumber % 4 === 0 &&
      state.exchangeNumber >= 4 &&
      masteryEvent.type === "none" &&
      !userInput.includes("?") &&
      userInput.trim().length > 15 &&
      brainState.emotionalSignal !== "stuck" &&
      brainState.emotionalSignal !== "sad" &&
      brainState.intent !== "want_to_learn";

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
      content = `${thPart}\n\n${enPart}`;
      servedVia = `library_${match.matched_via}`;

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

      const result = await getAIResponse(formattedMessages, adaptivePrompt);
      content = result.content;
      servedVia = `ai_${result.engine}__${move}`;
      wasFailover = result.wasFailover;
      aiCostUsd = result.engine === "groq" ? 0 : 0.0008;

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
      move,
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
        masteryEvent: null,
        pronunciationLesson: null,
      } satisfies MiomiResponse,
      { status: 200 }
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function brainReplyLang(brainState: BrainState): "th" | "en" {
  if (brainState.nowLanguage === "mixed") {
    return brainState.profile.uiLanguage;
  }
  return brainState.nowLanguage;
}

function brainLanguageToSession(brainState: BrainState): SessionState["primaryLanguage"] {
  return brainReplyLang(brainState) === "en" ? "english" : "thai";
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
  move?: string | null;
}): void {
  const {
    userId,
    state,
    userInput,
    miomiContent,
    aiCostUsd,
    intent,
    emotionalSignal,
    move,
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
    move: move ?? null,
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
