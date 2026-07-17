export const preferredRegion = ["sin1", "hnd1"];

import { NextRequest, NextResponse } from "next/server";
import { getAIResponse } from "@/lib/ai/router";
import { routeTurn } from "@/lib/ai/comprehension-router";
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
import { GUEST_EXCHANGE_LIMIT, DAILY_EXCHANGE_CAPS } from "@/lib/ai/limits";
import {
  pickPhrase,
  GUIDANCE_GUEST_LIMIT_HIT,
  GUIDANCE_DAILY_LIMIT_HIT,
  TALK_OPENERS,
} from "@/lib/voice/warmth";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";
import { saveExchange } from "@/lib/brain/memory";
import { readBrainState, type BrainState } from "@/lib/brain/state";
import { buildBrainPrompt } from "@/lib/brain/prompt";
import { buildMemoryContext } from "@/lib/ai/memory-context";
import { fetchUserMemories, extractAndStoreMemories } from "@/lib/ai/memory-store";
import { detectExplicitUiLanguageRequest } from "@/lib/brain/language";
import { resolveOrGenerateWord } from "@/lib/brain/word-content";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import {
  detectReuseAndAdvance,
  introduceWord,
  type IntroducedWord,
  type MasteryEvent,
} from "@/lib/brain/teaching";
import type { PronunciationLesson } from "@/lib/brain/pronunciation";
import { log } from "@/lib/debug/log";
import { withUsage, enableBudget, budgetState } from "@/lib/usage/ledger";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TeachCard = {
  word_en: string;
  word_th: string;
  emoji: string | null;
  cefr_level: string | null;
  phonetics: string;
  phonetics_source: string;
  th_romanization?: string;
  en_ipa?: string;
  example_th?: string;
  example_en?: string;
};
type MiomiResponse = {
  content: string;
  wordCard: TeachCard | null;
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
  /** Set when a member hit their per-day chat cap — client shows the upgrade prompt. */
  limitReached?: "daily";
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
    return await withUsage("talk.miomi", serverUserId, async () => {
    await enableBudget(profile?.tier ?? "guest");
    const serverIsGuest = !profile;

    const body = await req.json();
    const {
      messages,
      sessionId,
      sessionContext: clientSessionContext,
    } = body;
    const rawMode = body?.mode as string | undefined;
    // Retired modes ("social", "translate") from old clients collapse to auto.
    const mode: "auto" | "teach" | "chat" =
      rawMode === "teach" || rawMode === "chat" ? rawMode : "auto";
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
    let userMemories: string[] = [];

    try {
      brainState = await readBrainState({
        userInput,
        sessionId: state.sessionId,
        exchangeNumber: state.exchangeNumber,
        // R10 — the route owns the language medium. For a logged-in user the
        // authoritative source is their persisted profile (getServerProfile inside
        // readBrainState), NOT the client hint: the talk client seeds uiLanguage to
        // "en" and may POST a stale value before the profile settles, which would
        // wrongly greet a Thai-UI learner in English. Only a GUEST (no server profile)
        // needs the client's session-seeded language.
        overrideUiLanguage: serverIsGuest ? clientUiLanguage : null,
        overrideTargetLanguage: serverIsGuest ? clientTargetLanguage : null,
      });

      const isKickoff = userInput.trim().startsWith("[kickoff]");
      if (isKickoff) {
        // Miomi's session opener needs NO model call — serve a dedicated ice-breaker from
        // TALK_OPENERS: a persona conversation-STARTER (playful or curious about them, ending
        // in a hook), NOT a recycled lesson/care line. pickPhrase randomizes → varies every
        // open. Opening the talk screen and saying nothing costs ZERO tokens.
        const openerContent = pickPhrase(TALK_OPENERS, { lang: brainState.uiLanguage });
        persistExchangePair({ userId: serverUserId, state, userInput, miomiContent: openerContent });
        return NextResponse.json({
          content: openerContent,
          wordCard: null,
          phraseCard: null,
          creatorAsset: null,
          sessionContext: buildSessionContext(state),
          servedVia: "kickoff_static",
          wasFailover: false,
          intent: null,
          sessionMode: state.sessionMode,
          needsClarification: false,
          masteryEvent: null,
          pronunciationLesson: null,
          replyLanguage: brainState.uiLanguage,
          userSpeaksLanguage: brainState.uiLanguage,
        } satisfies MiomiResponse);
      }
      adaptivePrompt = buildBrainPrompt({ state: brainState, userInput, mode });
      adaptivePrompt += `\n\nNAME: Your name is Miomi. Never spell it out, never count its syllables, never write it in Thai script when speaking English. Just say "Miomi" naturally.`;
      userMemories = serverUserId ? await fetchUserMemories(serverUserId) : [];
      adaptivePrompt += buildMemoryContext(profile, userMemories);
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

    // ── DAILY MESSAGE LIMIT (members) — warm "see you tomorrow" on the NEXT turn ──
    // The user's CURRENT input ALWAYS earns a real reply — we never swallow the
    // message they just sent. Enforcement is `>` (strictly past the cap): the turn
    // that reaches the cap still answers; only when they come back OVER it do they get
    // the goodbye (+ the upgrade CTA the client shows off `limitReached`). Free users
    // get ~DAILY_EXCHANGE_CAPS.free replies/day; pro / pro_max sit far higher as an
    // abuse backstop. Guests are bounded per-session by GUEST_EXCHANGE_LIMIT above.
    // Count = the ledger's tally of today's real model-call exchanges (kickoff openers
    // and this limit message make no model call, so they don't consume the allowance).
    const memberTier = profile?.tier ?? "guest";
    const dailyExchangeCap = DAILY_EXCHANGE_CAPS[memberTier];
    const exchangesToday = budgetState()?.dailyExchanges ?? 0;
    if (!serverIsGuest && dailyExchangeCap != null && exchangesToday > dailyExchangeCap) {
      const limitContent = pickPhrase(GUIDANCE_DAILY_LIMIT_HIT, { lang: brainState.uiLanguage });
      return NextResponse.json({
        content: limitContent,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: buildSessionContext(state),
        servedVia: "daily_limit",
        wasFailover: false,
        intent: null,
        sessionMode: state.sessionMode,
        needsClarification: false,
        masteryEvent: null,
        pronunciationLesson: null,
        replyLanguage: brainState.uiLanguage,
        userSpeaksLanguage: brainState.uiLanguage,
        limitReached: "daily",
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

    // ── BRAIN STEP 4: mastery detect ─────────────────────────────────────────
    let masteryEvent: MasteryEvent = { type: "none" };
    let wordToIntroduce: IntroducedWord | null = null;
    let teachCard: TeachCard | null = null;

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

    // TEACHING DECISION: the model now decides if/what to teach at i+1 from the conversation and emits a
    // [[CARD: th | roman | en]] tag we turn into a verified card AFTER its reply — so the card always
    // matches exactly what it taught (no more pre-picked, frequency-level cards). We only SUPPRESS
    // teaching when it would be unwelcome: relaxed chat, or when they're stuck / sad / just mastered one.
    // ── COMPREHENSION ROUTER: read the turn, decide real / route / teach ─────
    // One cheap call that understands the message in context. Biased to the model;
    // teaching off by default. This is the "understand, THEN route" brain.
    const turn = await routeTurn(messages, userInput);

    // INPUT GUARD: STT noise, a stray fragment, or just a name with no request —
    // gently re-prompt instead of inventing a reply or firing a card off junk.
    if (!turn.real) {
      const didntCatch =
        brainState.uiLanguage === "th"
          ? "ขอโทษค่ะ หนูฟังไม่ค่อยชัดเลย ลองพูดอีกครั้งได้ไหมคะ~"
          : "Sorry, I didn't quite catch that — could you say it again?";
      persistExchangePair({ userId: serverUserId, state, userInput, miomiContent: didntCatch });
      return NextResponse.json({
        content: didntCatch,
        wordCard: null,
        phraseCard: null,
        creatorAsset: null,
        sessionContext: buildSessionContext(state),
        servedVia: "input_guard",
        wasFailover: false,
        intent: null,
        sessionMode: state.sessionMode,
        needsClarification: false,
        masteryEvent: null,
        pronunciationLesson: null,
        replyLanguage: brainState.uiLanguage,
        userSpeaksLanguage: brainState.uiLanguage,
      } satisfies MiomiResponse);
    }

    // TEACHING is now OFF by default — only when the router sees a genuine
    // teaching moment (turn.teach). Still suppress on mastery / stuck / sad.
    const suppressTeaching =
      !turn.teach ||
      masteryEvent.type !== "none" ||
      brainState.emotionalSignal === "stuck" ||
      brainState.emotionalSignal === "sad";
    if (suppressTeaching) {
      adaptivePrompt += `\n\nNO TEACHING THIS TURN: Just be a warm friend — do NOT introduce a new word and do NOT add any [[CARD]] tag. ${
        masteryEvent.type !== "none"
          ? "They just used a word well — notice it and celebrate that instead."
          : "Stay with them."
      }`;
    }

    // (word selection now happens AFTER the model reply, from its [[CARD]] tag — see Stage 10.)

    if (isLastFreeGuestTurn) {
      // Guest's final free turn. DELIVER value (Mike's "B", 2026-06-19) — do NOT tease-and-withhold.
      // Reply must NOT mention signup; the invitation is a separate spoken cue handled elsewhere.
      adaptivePrompt += `\n\nLAST-TURN HAND-OFF: This is the guest's final free turn. DO NOT mention signing up, accounts, remembering, limits, quota, trial, or goodbye anywhere in your reply. Fully and warmly ANSWER what they just asked and actually DELIVER it — if they asked to learn something, teach it for real (the word, what it means, a quick example of using it); if they asked a question, answer it completely. Give them a satisfying, complete payoff. Do NOT tease something and stop at the edge. The sign-up invitation is handled separately, after your reply.`;
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

    // Model-biased: only consult the canned library when the router decided this
    // turn is trivially formulaic. Anything with real content goes to the model.
    const matchResult =
      turn.route === "library"
        ? await matchLibraryFromDB(userInput, matchContext)
        : ({ type: "ai", reason: "router_to_model", intent: "unclear" } as const);

    // ── STAGE 10: Serve from library or AI ───────────────────────────────────
    let content: string;
    let servedVia: string;
    let wasFailover = false;
    let budgetCappedDaily = false;

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
      const [result] = await Promise.all([
        getAIResponse(formattedMessages, adaptivePrompt, brainState.uiLanguage),
        serverUserId
          ? extractAndStoreMemories({
              userId: serverUserId,
              userInput,
              existing: userMemories,
              uiLanguage: brainState.uiLanguage,
            })
          : Promise.resolve(),
      ]);
      content = result.content;
      // Budget daily cap: speak with the SAME warm varied voice + upgrade CTA
      // as the member exchange cap (limitReached below), instead of the old
      // static wall — walls-into-doors law. Turn-scope caps stay a normal reply.
      budgetCappedDaily = result.cappedScope === "daily";
      if (budgetCappedDaily) {
        content = pickPhrase(GUIDANCE_DAILY_LIMIT_HIT, { lang: brainState.uiLanguage });
      }
      // STAGE 10b: turn the model's [[CARD: th | roman | en]] tag into a verified card == exactly what
      // it taught, then strip the tag so it never leaks. Always strip; build the card only when teaching
      // is allowed and the tag is well-formed (resolve fills phonetics + example, same builder as before).
      {
        const cardTag = content.match(
          /\[\[\s*CARD\s*:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*\|\s*([^\]]+?)\s*\]\]/i
        );
        content = content
          .replace(/\[\[\s*CARD\s*:[^\]]*\]\]/gi, "")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        if (cardTag && !suppressTeaching) {
          const taughtTh = (cardTag[1] ?? "").trim();
          const taughtRoman = (cardTag[2] ?? "").trim();
          const taughtEn = (cardTag[3] ?? "").trim();
          const wordKey = taughtEn || taughtTh;
          if (wordKey && taughtTh && taughtEn) {
            try {
              const cardTarget = brainState.profile.learningTarget ?? "th";
              // Resolve ONLY to borrow phonetics + an example sentence. The card's
              // headword MUST stay exactly what she taught (the tag) — never let a
              // near-but-different bank row (ilike) swap สนทนา → การศึกษา. We feed the
              // resolver the verbatim taught word and keep the taught word regardless.
              const resolved = await resolveOrGenerateWord({
                word: wordKey,
                learningTarget: cardTarget,
                cefrLevel: brainState.profile.cefrLevel,
              });
              // Only adopt the resolver's example if it actually contains the word
              // she taught — otherwise it belongs to a different word and would mislead.
              const exampleMatches =
                !!resolved &&
                ((resolved.example_th?.includes(taughtTh) ?? false) ||
                  (resolved.example_en?.toLowerCase().includes(taughtEn.toLowerCase()) ?? false));
              const phon = await resolvePhonetics({
                word_th: taughtTh,
                word_en: taughtEn,
                learningTarget: cardTarget,
                bankRomanization: taughtRoman || resolved?.th_romanization || null,
                bankIpa: resolved?.en_ipa ?? null,
              });
              wordToIntroduce = {
                word: taughtEn,
                word_en: taughtEn,
                word_th: taughtTh,
                cefr_level: resolved?.cefr_level ?? brainState.profile.cefrLevel ?? null,
                emoji: resolved?.emoji ?? null,
              };
              teachCard = {
                word_en: taughtEn,
                word_th: taughtTh,
                emoji: resolved?.emoji ?? null,
                cefr_level: resolved?.cefr_level ?? brainState.profile.cefrLevel ?? null,
                phonetics: phon.phonetics,
                phonetics_source: phon.phonetics_source,
                ...(phon.th_romanization
                  ? { th_romanization: phon.th_romanization }
                  : taughtRoman
                    ? { th_romanization: taughtRoman }
                    : {}),
                ...(phon.en_ipa ? { en_ipa: phon.en_ipa } : {}),
                ...(exampleMatches && resolved?.example_th ? { example_th: resolved.example_th } : {}),
                ...(exampleMatches && resolved?.example_en ? { example_en: resolved.example_en } : {}),
              };
            } catch (err) {
              console.error("[brain] card from tag failed:", err);
            }
          }
        }
      }
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
    const wordCard = teachCard ?? null;
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
      limitReached: budgetCappedDaily ? ("daily" as const) : undefined,
    } satisfies MiomiResponse);

    });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    log("miomi", "error", { error: err.message, stack: err.stack?.slice(0, 300) });
    console.error("Route error:", err?.message);
    const failover = getFailoverResponse();
    const failoverReplyLang = (brainState as BrainState | null)?.uiLanguage ?? "en";
    const failoverContent = failoverReplyLang === "th" ? failover.th : failover.en;
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
