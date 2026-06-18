"use client";
import { speak as ttsSpeak, detectLang as ttsDetectLang } from "@/lib/voice/tts";
import { sfxSuccess as roomSfxSuccess } from "@/lib/sound/sfx";
import { Volume2 as RoomVolume } from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";
import { FuelPill } from "@/components/talk/FuelPill";
import { type OrbState } from "@/components/talk/VoiceOrb";
import { MiomiTurnClient } from "@/lib/live/miomi-turn-client";
import { PersistentMiomi, type MiomiMood } from "@/components/talk/PersistentMiomi";
import { MicRow } from "@/components/talk/MicRow";
import { MiniCatRow } from "@/components/talk/MiniCatRow";
import { WordCardV3 } from "@/components/talk/WordCardV3";
import { AdjustSheet } from "@/components/talk/AdjustSheet";
import { type TalkConfig, loadTalkConfig, saveTalkConfig, DEFAULT_TALK_CONFIG } from "@/lib/talk/modes";
import {
  appendGeminiTranscriptChunk,
  bindKickoffToOpener,
  makeSessionOpenerShell,
  type SessionMiniCatItem,
} from "@/lib/talk/session-canvas";
import { useUILanguage } from "@/lib/i18n/client";
import { unlockTtsPlayback, killAllAudio } from "@/lib/voice/tts";
import { GUIDANCE_GUEST_LIMIT_HIT, pickPhrase } from "@/lib/voice/warmth";
import { logEvent } from "@/lib/debug/event-bus";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { TalkErrorBoundary } from "@/components/error/TalkErrorBoundary";
import { MiomiLiveClient, type LiveClientCloseDetail, type LiveClientErrorDetail, type LiveClientMessage, type LiveSessionSnapshot } from "@/lib/live/miomi-client";
import { MediaHandler } from "@/lib/live/media-handler";
import { isHiddenLiveTranscript, sanitizeUserTranscript } from "@/lib/live/transcript";
import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";
import {
  canAttemptTransportReconnect,
  classifyLiveClose,
  nextResumeWordHint,
  shouldIgnoreClientEpoch,
} from "@/lib/live/session-continuity";
import { resolveKickoffAudience, type MemberContextBundle } from "@/lib/live/member-context";
import { resolveLiveSessionLanguages } from "@/lib/brain/language";
import {
  sortTranscriptItems,
  TRANSCRIPT_CARD_ORDER,
  TRANSCRIPT_USER_ORDER,
} from "@/lib/live/transcript-order";
import {
  isLessonComplete,
  nextPlannedWord,
} from "@/lib/talk/lesson-plan";
import {
  claimLessonWordCard,
  isLessonWordCarded,
  planBackstopCardWords,
  teachResultWordId,
} from "@/lib/talk/lesson-layer";
import {
  cardDirectionForTarget,
  teachWordToVocabularyEntry,
  type TeachWordResult,
} from "@/lib/talk/teach-word-card";
import {
  buildExplicitLessonRequestNudge,
  detectExplicitLessonWordRequest,
  recordWordPick,
} from "@/lib/talk/teaching-mode";
import {
  buildContentIntentNudge,
  detectLessonContentIntent,
} from "@/lib/talk/lesson-intent";
import { ROOM_MAX_SECONDS, ROOM_WARN_SECONDS } from "@/lib/live/voice-allowance";
import { TurnRuntime, isReplaySuspended } from "@/lib/live/turn-runtime";
import type { LiveUiPhase } from "@/lib/live/turn-controller";
import { replayWordAudio } from "@/lib/talk/word-replay";
import type { VocabularyEntry } from "@/components/talk/WordCardV3";

/**
 * LOCKED 2026-06-05 — /talk is audio-native Gemini Live (MiomiLiveClient + /api/live-token
 * ephemeral mint). Legacy ASR → LLM → TTS pipeline is NOT used on this route. Do not re-wire
 * transcribe/miomi/speak here without re-verifying the full /talk + guest flow end-to-end.
 */

type CanvasItem =
  | { id: string; kind: "mini_cat"; textTh: string; textEn: string; turnSeq: number; roleOrder: number }
  | { id: string; kind: "user_said"; text: string; turnSeq: number; roleOrder: number }
  | {
      id: string;
      kind: "word_card";
      word: VocabularyEntry;
      direction: "th_to_en" | "en_to_th";
      turnSeq: number;
      roleOrder: number;
    };

type LiveUiState = "idle" | "connecting" | "thinking" | "listening" | "speaking" | "error";

const TRANSCRIPT_CLIP = 180;
const GUEST_COUNTER_KEY = "miomika.guest_exchanges";

function readGuestExchanges(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return !isNaN(parsed) && parsed > 0 ? parsed : 0;
}

function sessionIntroducedWords(items: CanvasItem[]): string[] {
  return items
    .filter((item): item is Extract<CanvasItem, { kind: "word_card" }> => item.kind === "word_card")
    .map((item) => item.word.word_en);
}

function makeOpenerItem(): CanvasItem {
  return makeSessionOpenerShell(crypto.randomUUID(), 0);
}

export default function TalkPage() {
  const { isGuest, authReady: guestAuthReady } = useGuestExploration();
  const { profile, authReady: profileAuthReady } = useProfile();
  const browserUi = useUILanguage();
  /** Members must wait for profile row — guest auth alone is not enough (entryStartedRef race). */
  const canUseLive =
    guestAuthReady && (isGuest || (profileAuthReady && !!profile));

  const [config, setConfig] = useState<TalkConfig>(() =>
    typeof window !== "undefined" ? loadTalkConfig() : DEFAULT_TALK_CONFIG,
  );
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [uiLang, setUiLang] = useState<"th" | "en">("th");
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [textInput, setTextInput] = useState("");
  const [conversationLang, setConversationLang] = useState<"th" | "en">("th");
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const [guestSheetReason, setGuestSheetReason] = useState<"talk" | "save">("talk");
  const [guestExchangesRaw, setGuestExchangesRaw] = useState(readGuestExchanges);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [awaitingMic, setAwaitingMic] = useState(false);
  const [awaitingContinueTap, setAwaitingContinueTap] = useState(false);
  const [liveUiState, setLiveUiState] = useState<LiveUiState>("idle");
  const [debugOpen, setDebugOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const titleTapsRef = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const clientRef = useRef<MiomiLiveClient | null>(null);
  const mediaRef = useRef<MediaHandler | null>(null);
  const turnRuntimeRef = useRef<TurnRuntime | null>(null);
  const currentUserItemIdRef = useRef<string | null>(null);
  const currentGeminiItemIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const entryStartedRef = useRef(false);
  const kickoffSentRef = useRef(false);
  const guestExchangesRef = useRef(0);
  const isGuestRef = useRef(false);
  const isLockedRef = useRef(false);
  const freeLimitLoggedRef = useRef(false);
  const conversationLangRef = useRef<"th" | "en">("th");
  const sessionUiLangRef = useRef<"th" | "en">("th");
  const sessionTargetLangRef = useRef<"th" | "en">("en");
  const browserUiLangRef = useRef<"th" | "en">("th");
  const itemsRef = useRef<CanvasItem[]>([]);
  const liveClientEpochRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectInFlightRef = useRef(false);
  const wasListeningBeforeDropRef = useRef(false);
  const lessonHadStartedRef = useRef(false);
  const liveUiStateRef = useRef<LiveUiState>("idle");
  const lastSessionSnapshotRef = useRef<LiveSessionSnapshot | null>(null);
  const handleLiveMessageRef = useRef<(msg: LiveClientMessage) => void>(() => {});
  const handleClientCloseRef = useRef<(detail: LiveClientCloseDetail) => Promise<void>>(async () => {});
  const resumeLiveSessionRef = useRef<
    (snapshot: LiveSessionSnapshot, restoreMic: boolean) => Promise<void>
  >(async () => {});
  const turnSeqRef = useRef(0);
  const currentTurnSeqRef = useRef(0);
  const pendingUserTextRef = useRef("");
  const userInputFinalizedRef = useRef(false);
  // Verified-attempt: the last REAL thing the learner said, used to gate whether
  // the brain's "objective earned" claim is honest. Updated on finalize.
  const lastUserTranscriptRef = useRef("");
  const cardedPlanWordsRef = useRef<Set<string>>(new Set());
  const memberContextRef = useRef<MemberContextBundle | null>(null);
  const planWordCacheRef = useRef<Map<string, TeachWordResult>>(new Map());

  const syncTeachWordContext = useCallback(() => {
    clientRef.current?.setTeachWordContext({
      learningTarget: sessionTargetLangRef.current,
      sessionIntroduced: sessionIntroducedWords(itemsRef.current),
    });
  }, []);

  const applySessionLanguages = useCallback(() => {
    const { uiLanguage, targetLanguage } = resolveLiveSessionLanguages({
      isGuest: isGuestRef.current,
      profileUiLang: profile?.ui_language ?? null,
      profileTarget: profile?.learning_target_language ?? null,
      sessionUiLang: sessionUiLangRef.current,
      browserUiLang: browserUiLangRef.current,
      teachLearningTarget: config.teach.learning,
    });
    sessionUiLangRef.current = uiLanguage;
    sessionTargetLangRef.current = targetLanguage;
    conversationLangRef.current = uiLanguage;
    setConversationLang(uiLanguage);
    setUiLang(uiLanguage);
  }, [profile?.ui_language, profile?.learning_target_language, config.teach.learning]);

  const getLessonNudgeHints = useCallback(() => {
    const snap = clientRef.current?.getSessionSnapshot().teachWord;
    const plan = snap?.lessonPlan ?? [];
    const idx = snap?.introducedIdx ?? 0;
    return {
      nextPlannedWord: nextPlannedWord(plan, idx),
      lessonTopic: snap?.lessonTopic ?? null,
      lessonComplete: isLessonComplete(plan, idx),
    };
  }, []);

  const pushWordCard = useCallback((entry: VocabularyEntry, turnSeq: number) => {
    const cardAlreadyThisTurn = itemsRef.current.some(
      (item) => item.kind === "word_card" && item.turnSeq === turnSeq,
    );
    if (cardAlreadyThisTurn) return;
    if (!claimLessonWordCard(cardedPlanWordsRef.current, entry.word_en)) return;
    const direction = cardDirectionForTarget(sessionTargetLangRef.current);
    const cardId = crypto.randomUUID();
    setItems((prev) => {
      const next = [
        ...prev,
        {
          id: cardId,
          kind: "word_card" as const,
          word: entry,
          direction,
          turnSeq,
          roleOrder: TRANSCRIPT_CARD_ORDER,
        },
      ];
      itemsRef.current = next;
      const cardCountThisTurn = next.filter(
        (i) => i.kind === "word_card" && i.turnSeq === turnSeq,
      ).length;
      logEvent({
        kind: "state",
        level: "info",
        message: "pushWordCard",
        data: { word_en: entry.word_en, cardCountThisTurn, turnSeq },
      });
      return next;
    });
    syncTeachWordContext();
  }, [syncTeachWordContext]);

  const fetchAndPushPlanCard = useCallback(
    async (wordId: string, turnSeq: number, cached?: TeachWordResult) => {
      if (isLessonWordCarded(cardedPlanWordsRef.current, wordId)) return;
      let result = cached ?? planWordCacheRef.current.get(wordId);
      if (!result?.word_en) {
        const snap = clientRef.current?.getSessionSnapshot().teachWord;
        if (!snap) return;
        const idx = snap.lessonPlan.indexOf(wordId);
        if (idx < 0 || idx !== snap.introducedIdx) return;
        try {
          const resp = await fetch("/api/teach-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              learning_target: snap.learningTarget,
              session_introduced: snap.sessionIntroduced,
              lesson_plan: snap.lessonPlan,
              introduced_idx: snap.introducedIdx,
            }),
          });
          if (!resp.ok) return;
          result = (await resp.json()) as TeachWordResult;
          clientRef.current?.applyTeachWordResponse(result);
          const servedId = teachResultWordId(result);
          if (servedId) planWordCacheRef.current.set(servedId, result);
        } catch {
          return;
        }
      }
      const entry = teachWordToVocabularyEntry(result);
      if (!entry) return;
      pushWordCard(entry, turnSeq);
    },
    [pushWordCard],
  );

  const runCardBackstop = useCallback(
    async (preTurnState: TurnRuntime["state"]) => {
      const snap = clientRef.current?.getSessionSnapshot().teachWord;
      if (!snap || snap.lessonPlan.length === 0) return;
      const turnSeq = currentTurnSeqRef.current;
      const cardsThisTurn = itemsRef.current.filter(
        (item) => item.kind === "word_card" && item.turnSeq === turnSeq,
      );
      if (cardsThisTurn.length > 0) return;
      const wordIds = planBackstopCardWords({
        teaching: preTurnState.teaching,
        wordPickThisTurn: preTurnState.wordPickThisTurn,
        hasDueReview: !isGuestRef.current,
        canIntroNew: !isLessonComplete(snap.lessonPlan, snap.introducedIdx),
        plan: snap.lessonPlan,
        introducedIdx: snap.introducedIdx,
        carded: cardedPlanWordsRef.current,
      });
      for (const wordId of wordIds) {
        if (
          itemsRef.current.some(
            (item) => item.kind === "word_card" && item.turnSeq === turnSeq,
          )
        ) {
          break;
        }
        await fetchAndPushPlanCard(wordId, turnSeq);
      }
    },
    [fetchAndPushPlanCard],
  );

  const commitUserTranscript = useCallback((): string => {
    const finalText = sanitizeUserTranscript(pendingUserTextRef.current);
    pendingUserTextRef.current = "";
    if (!currentUserItemIdRef.current) {
      if (!finalText) return "";
      const id = crypto.randomUUID();
      currentUserItemIdRef.current = id;
      setItems((prev) => {
        const next = [
          ...prev,
          {
            id,
            kind: "user_said" as const,
            text: finalText,
            turnSeq: currentTurnSeqRef.current,
            roleOrder: TRANSCRIPT_USER_ORDER,
          },
        ];
        itemsRef.current = next;
        return next;
      });
      return finalText;
    }
    if (!finalText) {
      const ghostId = currentUserItemIdRef.current;
      currentUserItemIdRef.current = null;
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== ghostId);
        itemsRef.current = next;
        return next;
      });
      return "";
    }
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === currentUserItemIdRef.current && item.kind === "user_said"
          ? { ...item, text: finalText }
          : item,
      );
      itemsRef.current = next;
      return next;
    });
    return finalText;
  }, []);

  const resetTranscriptIds = useCallback(() => {
    currentGeminiItemIdRef.current = null;
    currentUserItemIdRef.current = null;
    pendingUserTextRef.current = "";
    userInputFinalizedRef.current = false;
  }, []);

  const stopContinuousMic = useCallback(() => {
    mediaRef.current?.suspendMicSend(false);
    mediaRef.current?.stopAudio();
    logEvent({ kind: "mic", level: "info", message: "continuous mic stopped" });
  }, []);

  const startContinuousMic = useCallback(async () => {
    if (!mediaRef.current) return;
    mediaRef.current.suspendMicSend(false);
    await mediaRef.current.startAudio((pcm) => {
      if (!mediaRef.current?.shouldForwardMicToGemini()) return;
      if (clientRef.current?.isConnected()) clientRef.current.sendAudio(pcm);
    });
    logEvent({ kind: "mic", level: "info", message: "continuous mic started" });
  }, []);

  const openGuestSignupSheet = useCallback((reason: "talk" | "save") => {
    setGuestSheetReason(reason);
    setShowGuestSheet(true);
  }, []);

  const teardownSessionIntentional = useCallback(() => {
    reconnectInFlightRef.current = false;
    reconnectAttemptsRef.current = 0;
    setAwaitingContinueTap(false);
    lastSessionSnapshotRef.current = null;
    memberContextRef.current = null;
    kickoffSentRef.current = false;
    entryStartedRef.current = false;
    lessonHadStartedRef.current = false;
    cardedPlanWordsRef.current.clear();
    planWordCacheRef.current.clear();
    mediaRef.current?.stopAudio();
    mediaRef.current?.stopAudioPlayback();
    clientRef.current?.disconnectIntentionally();
    clientRef.current = null;
    liveClientEpochRef.current = null;
    resetTranscriptIds();
    turnRuntimeRef.current?.reset(guestExchangesRef.current, isGuestRef.current);
    setLiveUiState("idle");
    setAwaitingMic(false);
  }, [resetTranscriptIds]);

  const ensureTurnRuntime = useCallback((): TurnRuntime => {
    if (!turnRuntimeRef.current) {
      turnRuntimeRef.current = new TurnRuntime(
        {
          getClient: () => clientRef.current,
          getMedia: () => mediaRef.current,
          getUiLang: () => sessionUiLangRef.current,
          getKickoffAudience: () =>
            resolveKickoffAudience(isGuestRef.current, memberContextRef.current),
          isGuest: () => isGuestRef.current,
          isMounted: () => mountedRef.current,
          onLiveUi: (ui: LiveUiPhase) => setLiveUiState(ui),
          onAwaitingMic: setAwaitingMic,
          onGuestExchanges: (n) => {
            guestExchangesRef.current = n;
            setGuestExchangesRaw(n);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(GUEST_COUNTER_KEY, String(n));
            }
            if (
              isGuestRef.current &&
              n >= GUEST_EXCHANGE_LIMIT &&
              !freeLimitLoggedRef.current
            ) {
              freeLimitLoggedRef.current = true;
              logEvent({
                kind: "state",
                level: "info",
                message: "free limit reached",
                data: { guestExchanges: n, limit: GUEST_EXCHANGE_LIMIT },
              });
            }
          },
          onOpenGuestSheet: openGuestSignupSheet,
          onTeardown: teardownSessionIntentional,
          onResetTranscriptIds: resetTranscriptIds,
          onKickoffCanvas: () => {
            kickoffSentRef.current = true;
            setItems((prev) => {
              const openers = prev.filter(
                (item): item is SessionMiniCatItem => item.kind === "mini_cat",
              );
              const { items: nextOpeners, geminiItemId } = bindKickoffToOpener(openers);
              if (geminiItemId) currentGeminiItemIdRef.current = geminiItemId;
              if (nextOpeners.length === 1 && prev.length === 1 && prev[0]?.kind === "mini_cat") {
                return [nextOpeners[0]!];
              }
              return prev;
            });
            if (canvasRef.current) canvasRef.current.scrollTop = 0;
          },
          onStartMic: async () => {
            await startContinuousMic();
            setLiveUiState("listening");
          },
          onStopMic: stopContinuousMic,
          getLessonNudgeHints,
          getMode: () => loadTalkConfig().mode,
        },
        guestExchangesRef.current,
        isGuestRef.current,
      );
    }
    return turnRuntimeRef.current;
  }, [openGuestSignupSheet, resetTranscriptIds, startContinuousMic, stopContinuousMic, teardownSessionIntentional, getLessonNudgeHints]);

  const dispatchTurn = useCallback(
    (event: Parameters<TurnRuntime["dispatch"]>[0]) => {
      return ensureTurnRuntime().dispatch(event);
    },
    [ensureTurnRuntime],
  );

  const wireLiveClient = useCallback((client: MiomiLiveClient) => {
    liveClientEpochRef.current = client.epochId;
    clientRef.current = client;
  }, []);

  const createLiveClient = useCallback((): MiomiLiveClient => {
    return new MiomiTurnClient({
      onOpen: () => {
        logEvent({ kind: "state", level: "info", message: "live connected" });
      },
      onMessage: (msg) => handleLiveMessageRef.current(msg),
      onStatus: (status) => {
        if ((status as { phase?: string } | null)?.phase === "thinking") {
          setLiveUiState("thinking");
        }
      },
      onClose: (detail) => {
        void handleClientCloseRef.current(detail);
      },
      onError: (detail: LiveClientErrorDetail) => {
        if (shouldIgnoreClientEpoch(detail.epochId, liveClientEpochRef.current)) return;
        logEvent({ kind: "state", level: "error", message: "live error", data: detail });
        if (!ensureTurnRuntime().state.sessionActive) {
          setLiveUiState("error");
        }
      },
    }) as unknown as MiomiLiveClient;
  }, [ensureTurnRuntime]);

  const primeAudio = useCallback(() => {
    if (!mediaRef.current) mediaRef.current = new MediaHandler();
    mediaRef.current.primeAudioContext();
    if (!audioUnlocked) setAudioUnlocked(true);
  }, [audioUnlocked]);

  const ensurePlaybackUnlocked = useCallback(async () => {
    if (!mediaRef.current) mediaRef.current = new MediaHandler();
    await mediaRef.current.unlockPlayback();
    setAudioUnlocked(true);
  }, []);

  const guestExchanges = guestAuthReady && !isGuest ? 0 : guestExchangesRaw;
  const isLocked = guestAuthReady && isGuest && guestExchanges >= GUEST_EXCHANGE_LIMIT;

  useEffect(() => {
    guestExchangesRef.current = guestExchanges;
  }, [guestExchanges]);

  useEffect(() => {
    isGuestRef.current = isGuest;
  }, [isGuest]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    conversationLangRef.current = conversationLang;
  }, [conversationLang]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const honorContentIntent = useCallback(
    async (userText: string) => {
      const intent = detectLessonContentIntent(userText);
      if (!intent?.shouldRebuild) return;
      const client = clientRef.current;
      if (!client?.isConnected()) return;
      const snap = client.getSessionSnapshot().teachWord;
      const currentTopic = snap.lessonTopic;
      const rejectedCurrent =
        currentTopic != null && intent.excludeTopics.includes(currentTopic);
      const topicChanged =
        intent.topicHint != null && intent.topicHint !== currentTopic;
      if (!rejectedCurrent && !topicChanged && intent.excludeTopics.length === 0) {
        return;
      }

      try {
        const resp = await fetch("/api/teach-word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            learning_target: snap.learningTarget,
            session_introduced: snap.sessionIntroduced,
            topic_hint: intent.topicHint || undefined,
            exclude_topics: intent.excludeTopics,
            rebuild_plan: true,
            plan_only: true,
          }),
        });
        if (!resp.ok) return;
        const result = (await resp.json()) as TeachWordResult & {
          lesson_plan?: string[];
          lesson_topic?: string | null;
          introduced_idx?: number;
        };
        client.applyTeachWordResponse(result);
        client.setTeachWordContext({
          learningTarget: snap.learningTarget,
          sessionIntroduced: snap.sessionIntroduced,
          topicHint: intent.topicHint,
          excludeTopics: intent.excludeTopics,
        });
        cardedPlanWordsRef.current.clear();
        planWordCacheRef.current.clear();

        const newTopic = result.lesson_topic ?? intent.topicHint;
        const plan = result.lesson_plan ?? [];
        const idx = result.introduced_idx ?? 0;
        const nextWord = nextPlannedWord(plan, idx);
        mediaRef.current?.deferUntilPlaybackIdle(() =>
          client.sendHiddenContext(
            buildContentIntentNudge(intent, sessionUiLangRef.current, newTopic, nextWord),
          ),
        );
      } catch {
        /* never break audio */
      }
    },
    [],
  );

  const honorExplicitLessonRequest = useCallback(
    async (userText: string) => {
      const kind = detectExplicitLessonWordRequest(userText);
      if (!kind) return;
      const client = clientRef.current;
      if (!client?.isConnected()) return;
      const snap = client.getSessionSnapshot().teachWord;
      if (!snap.lessonPlan.length || isLessonComplete(snap.lessonPlan, snap.introducedIdx)) {
        return;
      }
      const nextWord = nextPlannedWord(snap.lessonPlan, snap.introducedIdx);
      if (!nextWord) return;

      await fetchAndPushPlanCard(nextWord, currentTurnSeqRef.current);

      const runtime = ensureTurnRuntime();
      runtime.state = {
        ...runtime.state,
        teaching: recordWordPick(runtime.state.teaching, "new"),
      };
      mediaRef.current?.deferUntilPlaybackIdle(() =>
        client.sendHiddenContext(
          buildExplicitLessonRequestNudge(kind, sessionUiLangRef.current, nextWord),
        ),
      );
    },
    [ensureTurnRuntime, fetchAndPushPlanCard],
  );

  const finalizeUserInputTranscript = useCallback(() => {
    if (userInputFinalizedRef.current) return "";
    userInputFinalizedRef.current = true;
    const finalUserText = commitUserTranscript();
    if (finalUserText && finalUserText.trim().length > 0) {
      lastUserTranscriptRef.current = finalUserText.trim();
    }
    if (finalUserText) {
      void honorContentIntent(finalUserText);
      void honorExplicitLessonRequest(finalUserText);
    }
    return finalUserText;
  }, [commitUserTranscript, honorContentIntent, honorExplicitLessonRequest]);

  const appendTranscript = useCallback((role: "user" | "gemini", chunk: string) => {
    if (role === "user") {
      const cleaned = sanitizeUserTranscript(chunk);
      if (!cleaned) return;
      pendingUserTextRef.current += cleaned;
      if (currentUserItemIdRef.current) return;
      const id = crypto.randomUUID();
      currentUserItemIdRef.current = id;
      setItems((prev) => [
        ...prev,
        {
          id,
          kind: "user_said",
          text: "",
          turnSeq: currentTurnSeqRef.current,
          roleOrder: TRANSCRIPT_USER_ORDER,
        },
      ]);
      return;
    }

    setItems((prev) => {
      const miniCats = prev.filter(
        (item): item is SessionMiniCatItem => item.kind === "mini_cat",
      );
      const others = prev.filter((item) => item.kind !== "mini_cat");
      const { items: nextMiniCats, currentGeminiItemId } = appendGeminiTranscriptChunk(
        miniCats,
        currentGeminiItemIdRef.current,
        chunk,
        currentTurnSeqRef.current,
      );
      currentGeminiItemIdRef.current = currentGeminiItemId;
      return sortTranscriptItems([...others, ...nextMiniCats]);
    });
  }, []);

  const discardSuspendedModelTurn = useCallback(() => {
    const ghostId = currentGeminiItemIdRef.current;
    currentGeminiItemIdRef.current = null;
    if (!ghostId) return;
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== ghostId);
      itemsRef.current = next;
      return next;
    });
  }, []);

  // ── Speaking Room (Confident Speaking) — chrome state. Inert unless /learn
  // wrote a handoff and the URL carries room=1. Normal /talk is untouched. ──
  type RoomPhrase = { en: string; th: string; romanization: string | null };
  type RoomHandoff = {
    sessionId: string;
    title_en: string;
    level: "A1" | "A2" | "B1" | "B2" | "C1";
    learningTarget: "th" | "en";
    register: string;
    plan: {
      scene: string;
      miomi_role: string;
      objectives: string[];
      stages: Array<{ id: string; title: string; activity: string; guidance: string }>;
      phrases: RoomPhrase[];
    };
  };
  const [roomSession, setRoomSession] = useState<RoomHandoff | null>(null);
  const roomSessionRef = useRef<RoomHandoff | null>(null);
  const [roomStageId, setRoomStageId] = useState<string>("warmup");
  const roomStageIdRef = useRef<string>("warmup");
  const [roomObjectivesDone, setRoomObjectivesDone] = useState<number[]>([]);
  const [roomNotes, setRoomNotes] = useState<Array<{ kind: "glow" | "grow"; note: string }>>([]);
  const [roomLearned, setRoomLearned] = useState<string[]>([]);
  // Persist bookkeeping across refresh — a reload must not wipe earned progress.
  useEffect(() => {
    if (!roomSession) return;
    try {
      window.sessionStorage.setItem("miomika.room_progress", JSON.stringify({
        stageId: roomStageId, objectives: roomObjectivesDone, notes: roomNotes, learned: roomLearned,
      }));
    } catch { /* best-effort */ }
  }, [roomSession, roomStageId, roomObjectivesDone, roomNotes, roomLearned]);
  const [roomHintsOpen, setRoomHintsOpen] = useState(false);
  const [roomBoardOpen, setRoomBoardOpen] = useState(false);
  const [roomSlow, setRoomSlow] = useState(false);
  const roomSlowRef = useRef(false);
  const [voiceExhausted, setVoiceExhausted] = useState(false);
  const [voiceWarn, setVoiceWarn] = useState(false);
  const [roomTimeUp, setRoomTimeUp] = useState(false);
  const [roomEnding, setRoomEnding] = useState(false);
  const roomStartedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.search.includes("room=1")) return;
    try {
      const raw = window.sessionStorage.getItem("miomika.room_session");
      if (!raw) return;
      const handoff = JSON.parse(raw) as RoomHandoff;
      if (!handoff?.sessionId || !handoff?.plan?.stages?.length) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot room handoff read on mount, matching the app's fetch-on-mount pattern
      setRoomSession(handoff);
      roomSessionRef.current = handoff;
      // Preserve the original start across refreshes — a reload must not reset
      // the clock (full minute-enforcement lands with metering at /api/live-token).
      let startedAt = Date.now();
      try {
        const saved = window.sessionStorage.getItem("miomika.room_started_at");
        if (saved && Number(saved) > 0) startedAt = Number(saved);
        else window.sessionStorage.setItem("miomika.room_started_at", String(startedAt));
      } catch { /* best-effort */ }
      roomStartedAtRef.current = startedAt;
      const startSlow = handoff.level === "A1" || handoff.level === "A2";
      setRoomSlow(startSlow);
      roomSlowRef.current = startSlow;
      // Restore bookkeeping if this is a refresh mid-session.
      try {
        const savedProg = window.sessionStorage.getItem("miomika.room_progress");
        if (savedProg) {
          const p = JSON.parse(savedProg) as { stageId?: string; objectives?: number[]; notes?: Array<{ kind: "glow" | "grow"; note: string }>; learned?: string[] };
          if (p.stageId) { setRoomStageId(p.stageId); roomStageIdRef.current = p.stageId; }
          if (Array.isArray(p.objectives)) setRoomObjectivesDone(p.objectives);
          if (Array.isArray(p.notes)) setRoomNotes(p.notes);
          if (Array.isArray(p.learned)) setRoomLearned(p.learned);
        }
      } catch { /* best-effort */ }
    } catch {
      /* no room — normal talk */
    }
  }, []);
  const endRoomSession = useCallback(async () => {
    const room = roomSessionRef.current;
    if (!room || roomEnding) return;
    setRoomEnding(true);
    const elapsedMs = roomStartedAtRef.current ? Date.now() - roomStartedAtRef.current : 0;
    const minutes = elapsedMs ? Math.max(1, Math.round(elapsedMs / 60000)) : 0;
    // Account the live-voice seconds to the metering ledger (server-side,
    // refresh-proof). Best-effort — never block the results flow.
    if (elapsedMs > 0) {
      try {
        void fetch("/api/voice-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds: Math.round(elapsedMs / 1000) }),
          keepalive: true,
        });
      } catch { /* best-effort */ }
    }
    try {
      await fetch("/api/speaking/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: room.sessionId,
          status: "completed",
          objectives_done: roomObjectivesDone,
          notes: roomNotes,
          learned: roomLearned,
          minutes,
          exit_done: roomStageId === "exit",
        }),
      });
    } catch {
      /* results are best-effort; the session itself was the value */
    }
    try {
      window.sessionStorage.removeItem("miomika.room_session");
      window.sessionStorage.removeItem("miomika.room_started_at");
      window.sessionStorage.removeItem("miomika.room_progress");
    } catch {
      /* ignore */
    }
    window.location.href = `/learn?session=${room.sessionId}`;
  }, [roomEnding, roomObjectivesDone, roomNotes, roomLearned, roomStageId]);

  // LESSON COMPLETE: once every objective is genuinely earned and the exit stage is
  // reached, the SYSTEM closes — one warm goodbye, no more teaching or questions —
  // so she can't ramble past the finish line. Fires once.
  const lessonClosedRef = useRef(false);
  useEffect(() => {
    if (!roomSession || lessonClosedRef.current) return;
    const total = roomSession.plan.objectives.length;
    const allEarned = total > 0 && roomObjectivesDone.length >= total;
    const atExit = roomStageId === "exit";
    if (allEarned && atExit) {
      lessonClosedRef.current = true;
      try { clientRef.current?.sendLessonComplete?.(sessionUiLangRef.current); } catch { /* best-effort */ }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot lesson close when exit + all objectives earned
      setRoomTimeUp(true); // surfaces the "See my results" button; she gives one goodbye
    }
  }, [roomSession, roomObjectivesDone, roomStageId]);

  // ROOM HARD-STOP: the room is a bounded 10-min unit. A ticking clock warns
  // once in voice at 8 min, then warmly auto-ends at 10 min — the session can
  // NEVER run indefinitely (the money-leak fix). Survives refresh via the
  // persisted start stamp. Checks every 5s (cheap, no per-second churn).
  useEffect(() => {
    if (!roomSession) return;
    const warnedRef = { current: false };
    const id = window.setInterval(() => {
      const startedAt = roomStartedAtRef.current;
      if (!startedAt) return;
      const elapsed = (Date.now() - startedAt) / 1000;
      if (!warnedRef.current && elapsed >= ROOM_WARN_SECONDS && elapsed < ROOM_MAX_SECONDS) {
        warnedRef.current = true;
        // Ask Miomi to give a warm in-voice heads-up — once.
        try { clientRef.current?.sendRoomWrapUp?.(sessionUiLangRef.current); } catch { /* best-effort */ }
        setVoiceWarn(true);
      }
      if (elapsed >= ROOM_MAX_SECONDS) {
        window.clearInterval(id);
        // End the LIVE voice (stops cost) but keep the learner in the room to read
        // the transcript. They tap "See results" when ready — no harsh redirect.
        try { clientRef.current?.sendRoomTimeUp?.(sessionUiLangRef.current); } catch { /* best-effort */ }
        setRoomTimeUp(true);
        window.setTimeout(() => {
          try { clientRef.current?.disconnectIntentionally(); clientRef.current = null; } catch { /* best-effort */ }
        }, 6000); // let her finish ONE short goodbye line, then cut the voice
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [roomSession, endRoomSession]);

  const handleLiveMessage = useCallback((msg: LiveClientMessage) => {
    const runtime = ensureTurnRuntime();
    const suspended = isReplaySuspended(runtime, mediaRef.current);

    if (msg.type === "interrupted") {
      mediaRef.current?.stopAudioPlayback();
      resetTranscriptIds();
      dispatchTurn({ type: "interrupted" });
      return;
    }
    if (msg.type === "turn_complete") {
      if (suspended) {
        discardSuspendedModelTurn();
        mediaRef.current?.signalModelTurnComplete();
        void mediaRef.current?.endModelTurnWhenDrained();
        return;
      }
      const preTurnState = { ...runtime.state };
      void runCardBackstop(preTurnState);
      mediaRef.current?.signalModelTurnComplete();
      dispatchTurn({ type: "turn_complete" });
      const handoffReplyFinishing =
        preTurnState.handoffArmed && preTurnState.handoffReplyStarted;
      const invitationFinishing =
        preTurnState.invitationPending && preTurnState.invitationVoiceSent;
      if (!handoffReplyFinishing && !invitationFinishing) {
        void mediaRef.current?.endModelTurnWhenDrained();
      }
      return;
    }
    if (msg.type === "go_away") {
      if (!clientRef.current || reconnectInFlightRef.current) return;
      const wasListening = runtime.state.phase === "listening";
      const snapshot = clientRef.current.getSessionSnapshot();
      logEvent({ kind: "state", level: "info", message: "live go_away — proactive resume" });
      clientRef.current.disconnectIntentionally();
      clientRef.current = null;
      liveClientEpochRef.current = null;
      void resumeLiveSessionRef.current(snapshot, wasListening);
      return;
    }
    if (msg.type === "audio") {
      if (suspended) return;
      logEvent({
        kind: "tts",
        level: "info",
        message: "model first-audio emit",
        data: { bytes: msg.data.byteLength, modelTurnActive: mediaRef.current?.isModelTurnActive() },
      });
      dispatchTurn({ type: "model_audio" });
      mediaRef.current?.playAudio(msg.data);
      return;
    }
    if (msg.type === "user") {
      if (isHiddenLiveTranscript(msg.text)) return;
      const isFirst = !currentUserItemIdRef.current;
      if (isFirst) {
        currentTurnSeqRef.current = ++turnSeqRef.current;
        dispatchTurn({
          type: "user_transcript",
          text: msg.text,
          isFirstChunk: true,
          isGuest: isGuestRef.current,
        });
      }
      appendTranscript("user", msg.text);
      if (msg.finished) finalizeUserInputTranscript();
      return;
    }
    if (msg.type === "gemini") {
      if (suspended) return;
      if (isHiddenLiveTranscript(msg.text)) return;
      let geminiText = msg.text;
      if (roomSessionRef.current) {
        // Backstop: the brain is forbidden from writing tool calls as text,
        // but leaked fragments take many shapes — none may reach the learner.
        const scrubbed = geminiText
          .replace(/call:?\s*report_?stage\s*\{[^}]*\}?/gi, "")
          .replace(/report_?stage/gi, "")
          .replace(/\{\s*(?:event|stage_id|objective_index|note_kind|note)\b[^}]*\}?/gi, "")
          .replace(/\(\s*["']?\s*(?:stage|event|objective|note|hint)\b[^)]{0,40}\)/gi, "")
          .replace(/\bhint:\s*(—\s*)?/gi, "");
        // NOTE: deliberately NO whitespace-collapsing here — streamed fragments
        // concatenate, and \s{2,}->" " was eating the single spaces between words.
        if (scrubbed !== geminiText) {
          geminiText = scrubbed;
          if (!geminiText.trim()) return;
        }
      }
      if (!userInputFinalizedRef.current && pendingUserTextRef.current) {
        finalizeUserInputTranscript();
      }
      dispatchTurn({ type: "model_transcript", text: geminiText });
      appendTranscript("gemini", geminiText);
      return;
    }
    if (msg.type === "tool_call" && msg.name === "report_stage") {
      const args = (msg.args ?? {}) as {
        event?: string;
        stage_id?: string;
        objective_index?: number;
        note_kind?: string;
        note?: string;
      };
      if (args.event === "stage" && typeof args.stage_id === "string") {
        // Stages move FORWARD only — a wobbling brain can never reset the bar.
        const stages = roomSessionRef.current?.plan.stages ?? [];
        const fromIdx = stages.findIndex((s) => s.id === roomStageIdRef.current);
        const toIdx = stages.findIndex((s) => s.id === args.stage_id);
        if (toIdx >= 0 && toIdx >= fromIdx) {
          setRoomStageId(args.stage_id);
          roomStageIdRef.current = args.stage_id;
        }
      } else if (args.event === "objective" && typeof args.objective_index === "number") {
        const idx = args.objective_index;
        // VERIFIED-ATTEMPT GATE: the system — not the model — decides if this is
        // real. Reject when the learner's last utterance was a bare acknowledgement
        // or too short to be a genuine spoken attempt. Kills false-praise mechanically.
        const said = lastUserTranscriptRef.current.toLowerCase().trim();
        const ACK_ONLY = /^(ok(ay)?|yes|yeah|yep|sure|right|uh-?huh|hmm+|khrap|krub|ka|kha|ค่ะ|ครับ|ใช่|โอเค|haha|55+)[\s.!~]*$/i;
        // Block ONLY the unambiguous ack-only case (clear even through bad transcription).
        // For anything else — including empty/garbled transcripts — trust the brain's
        // audio-based earn, since the recognizer text is unreliable but the audio wasn't.
        if (said.length > 0 && ACK_ONLY.test(said)) {
          // Pure acknowledgement, no real attempt — re-invite, don't mark earned.
          return;
        }
        setRoomObjectivesDone((prev) =>
          prev.includes(idx) || idx < 0 || idx > 2 ? prev : [...prev, idx],
        );
        // Consume the transcript so the same utterance can't earn two objectives.
        lastUserTranscriptRef.current = "";
        try { roomSfxSuccess(); } catch { /* sound is best-effort */ }
      } else if (args.event === "note" && typeof args.note === "string" && args.note.trim()) {
        const kind = args.note_kind === "grow" ? "grow" : "glow";
        const note = args.note.trim();
        setRoomNotes((prev) => (prev.length >= 6 ? prev : [...prev, { kind, note }]));
      } else if (args.event === "hint" && typeof args.note === "string" && args.note.trim()) {
        const hint = args.note.trim();
        // Only accept a "learned" item that corresponds to a REAL plan phrase —
        // the brain must not invent learned items that were never in the lesson.
        const phrases = roomSessionRef.current?.plan.phrases ?? [];
        const isReal = phrases.some((p) => {
          const en = (p.en ?? "").toLowerCase();
          const th = (p.th ?? "").toLowerCase();
          const h = hint.toLowerCase();
          return (en && (h.includes(en) || en.includes(h))) || (th && (h.includes(th) || th.includes(h)));
        });
        if (isReal) {
          setRoomLearned((prev) => (prev.includes(hint) || prev.length >= 12 ? prev : [...prev, hint]));
        }
      }
      return;
    }
    if (
      msg.type === "tool_call" &&
      (msg.name === "get_word_to_teach" || msg.name === "get_word_to_review")
    ) {
      const result = msg.result as TeachWordResult;
      logEvent({
        kind: "engine",
        level: "info",
        message: `${msg.name} tool call`,
        data: { args: msg.args, result, phonetics_source: result.phonetics_source ?? null },
      });
      syncTeachWordContext();
      const servedId = teachResultWordId(result);
      if (servedId) planWordCacheRef.current.set(servedId, result);
      const entry = teachWordToVocabularyEntry(result);
      let hadCard = false;
      if (entry) {
        hadCard = true;
        const pickKind = msg.name === "get_word_to_review" ? "review" : "new";
        runtime.state = {
          ...runtime.state,
          teaching: recordWordPick(runtime.state.teaching, pickKind),
        };
        pushWordCard(entry, currentTurnSeqRef.current);
      }
      if (!suspended && !runtime.state.handoffArmed) {
        dispatchTurn({ type: "tool_result", name: msg.name, hadCard });
      }
    }
  }, [
    appendTranscript,
    discardSuspendedModelTurn,
    dispatchTurn,
    ensureTurnRuntime,
    finalizeUserInputTranscript,
    pushWordCard,
    resetTranscriptIds,
    runCardBackstop,
    syncTeachWordContext,
  ]);

  const resumeLiveSession = useCallback(
    async (snapshot: LiveSessionSnapshot, restoreMic: boolean) => {
      if (!canUseLive || reconnectInFlightRef.current) return;
      reconnectInFlightRef.current = true;
      setAwaitingContinueTap(false);
      setLiveUiState("connecting");
      logEvent({ kind: "state", level: "info", message: "live session resuming", data: { restoreMic } });

      if (!mediaRef.current) mediaRef.current = new MediaHandler();
      await mediaRef.current.unlockPlayback();

      const client = createLiveClient();
      client.restoreSessionSnapshot(snapshot);
      wireLiveClient(client);

      try {
        const uiLanguage = sessionUiLangRef.current;
        const targetLanguage = sessionTargetLangRef.current;
        await client.connect({
          uiLanguage,
          targetLanguage,
          resume: true,
          mode: config.mode,
          level: roomSessionRef.current?.level ?? config.teach.level,
          session: roomSessionRef.current?.plan
            ? {
                paceSlow: roomSlowRef.current,
                title: roomSessionRef.current.title_en,
                scene: roomSessionRef.current.plan.scene,
                miomiRole: roomSessionRef.current.plan.miomi_role,
                register: roomSessionRef.current.register,
                objectives: roomSessionRef.current.plan.objectives,
                stages: roomSessionRef.current.plan.stages,
                phrases: roomSessionRef.current.plan.phrases,
              }
            : undefined,
        });
        memberContextRef.current = client.getMemberContext();
        syncTeachWordContext();
        lessonHadStartedRef.current = true;
        dispatchTurn({
          type: "session_connected",
          isGuest: isGuestRef.current,
          guestExchanges: guestExchangesRef.current,
          skipKickoff: true,
        });
        if (roomSessionRef.current?.plan) {
          client.sendSessionResume(uiLanguage, roomStageIdRef.current);
        } else {
          const nextWord = nextResumeWordHint(
            snapshot.teachWord.lessonPlan,
            snapshot.teachWord.introducedIdx,
          );
          client.sendResume(uiLanguage, nextWord);
        }
        if (!restoreMic) {
          stopContinuousMic();
          setLiveUiState("idle");
        }
        reconnectAttemptsRef.current = 0;
        logEvent({ kind: "state", level: "info", message: "live session resumed" });
      } catch (err) {
        reconnectAttemptsRef.current += 1;
        logEvent({
          kind: "state",
          level: "error",
          message: "live session resume failed",
          data: { error: String(err), attempts: reconnectAttemptsRef.current },
        });
        clientRef.current = null;
        liveClientEpochRef.current = null;
        if (canAttemptTransportReconnect(reconnectAttemptsRef.current)) {
          void resumeLiveSessionRef.current(snapshot, restoreMic);
        } else {
          setAwaitingContinueTap(true);
          setLiveUiState("idle");
        }
      } finally {
        reconnectInFlightRef.current = false;
      }
    },
    [
      canUseLive,
      createLiveClient,
      wireLiveClient,
      syncTeachWordContext,
      dispatchTurn,
      stopContinuousMic,
      config.mode,
      config.teach.level,
    ],
  );
  // Speaking Room: pace nudge on the live session — no reconnect.
  const toggleRoomPace = useCallback(() => {
    if (!roomSessionRef.current?.plan) return;
    if (!clientRef.current) return;
    const next = !roomSlowRef.current;
    roomSlowRef.current = next;
    setRoomSlow(next);
    // Change pace IN PLACE on the live session — no reconnect, so she never
    // restarts or re-greets. (Live can't change waveform speed; this asks for
    // slower delivery. Precise slow pronunciation lives in the banked buttons.)
    try { clientRef.current.sendPaceChange(sessionUiLangRef.current, next); } catch { /* best-effort */ }
  }, []);

  /** Mid-session mode flick: snapshot → soft reconnect with the new brain. */
  const pendingModeSwitchRef = useRef<TalkConfig["mode"] | null>(null);
  const switchLiveModeRef = useRef<((m: TalkConfig["mode"]) => Promise<void>) | null>(null);
  const switchLiveMode = useCallback(
    async (nextMode: TalkConfig["mode"]) => {
      const runtime = turnRuntimeRef.current;
      if (!runtime || !runtime.state.sessionActive) return;
      if (!clientRef.current) return;
      if (reconnectInFlightRef.current) {
        pendingModeSwitchRef.current = nextMode;
        return;
      }
      reconnectInFlightRef.current = true;
      const wasListening = runtime.state.phase === "listening";
      setLiveUiState("connecting");
      const snapshot = clientRef.current.getSessionSnapshot();
      try {
        mediaRef.current?.stopAudioPlayback();
        clientRef.current.disconnectIntentionally();
        clientRef.current = null;
        liveClientEpochRef.current = null;
        const client = createLiveClient();
        client.restoreSessionSnapshot(snapshot);
        wireLiveClient(client);
        await client.connect({
          uiLanguage: sessionUiLangRef.current,
          targetLanguage: sessionTargetLangRef.current,
          resume: true,
          mode: nextMode,
          level: loadTalkConfig().teach.level,
        });
        memberContextRef.current = client.getMemberContext();
        syncTeachWordContext();
        dispatchTurn({
          type: "session_connected",
          isGuest: isGuestRef.current,
          guestExchanges: guestExchangesRef.current,
          skipKickoff: true,
        });
        if (wasListening) {
          await startContinuousMic();
          setLiveUiState("listening");
        } else {
          stopContinuousMic();
          setLiveUiState("idle");
        }
        logEvent({ kind: "state", level: "info", message: "live mode switched", data: { mode: nextMode } });
      } catch (err) {
        logEvent({
          kind: "state",
          level: "error",
          message: "live mode switch failed",
          data: { error: String(err) },
        });
        teardownSessionIntentional();
      } finally {
        reconnectInFlightRef.current = false;
        const pending = pendingModeSwitchRef.current;
        pendingModeSwitchRef.current = null;
        if (pending && pending !== nextMode) {
          void switchLiveModeRef.current?.(pending);
        }
      }
    },
    [createLiveClient, wireLiveClient, syncTeachWordContext, dispatchTurn, startContinuousMic, stopContinuousMic, teardownSessionIntentional],
  );
  useEffect(() => {
    switchLiveModeRef.current = switchLiveMode;
  }, [switchLiveMode]);

  const handleClientClose = useCallback(
    async (detail: LiveClientCloseDetail) => {
      if (shouldIgnoreClientEpoch(detail.epochId, liveClientEpochRef.current)) {
        logEvent({
          kind: "state",
          level: "info",
          message: "live close ignored (stale epoch)",
          data: { epochId: detail.epochId, current: liveClientEpochRef.current },
        });
        return;
      }

      const closeKind = classifyLiveClose(detail.intentionalClose);
      logEvent({
        kind: "state",
        level: closeKind === "transport" ? "warn" : "info",
        message: "live websocket closed",
        data: {
          closeKind,
          code: detail.code,
          reason: detail.reason,
          wasClean: detail.wasClean,
        },
      });

      if (closeKind === "intentional") {
        return;
      }

      const runtime = ensureTurnRuntime();
      if (!runtime.state.sessionActive && !lessonHadStartedRef.current) {
        teardownSessionIntentional();
        return;
      }

      const snapshot = clientRef.current?.getSessionSnapshot() ?? {
        teachWord: {
          learningTarget: sessionTargetLangRef.current,
          sessionIntroduced: sessionIntroducedWords(itemsRef.current),
          lessonPlan: [],
          introducedIdx: 0,
          lessonTopic: null,
          topicHint: null,
          excludeTopics: [],
        },
        reviewServed: [],
      };
      wasListeningBeforeDropRef.current =
        liveUiStateRef.current === "listening" || (mediaRef.current?.isRecording ?? false);
      mediaRef.current?.stopAudioPlayback();
      mediaRef.current?.stopAudio();
      lastSessionSnapshotRef.current = snapshot;
      clientRef.current = null;
      liveClientEpochRef.current = null;

      if (!canAttemptTransportReconnect(reconnectAttemptsRef.current)) {
        setAwaitingContinueTap(true);
        setLiveUiState("idle");
        return;
      }

      reconnectAttemptsRef.current += 1;
      await resumeLiveSession(snapshot, wasListeningBeforeDropRef.current);
    },
    [ensureTurnRuntime, teardownSessionIntentional],
  );

  useEffect(() => {
    handleLiveMessageRef.current = handleLiveMessage;
    handleClientCloseRef.current = handleClientClose;
    resumeLiveSessionRef.current = resumeLiveSession;
  }, [handleLiveMessage, handleClientClose, resumeLiveSession]);

  const startLiveSession = useCallback(async (opts?: { resumeSnapshot?: LiveSessionSnapshot; restoreMic?: boolean }) => {
    if (opts?.resumeSnapshot) {
      await resumeLiveSession(opts.resumeSnapshot, opts.restoreMic ?? false);
      return;
    }

    const runtime = ensureTurnRuntime();
    if (!canUseLive || runtime.state.sessionActive) return;
    dispatchTurn({ type: "session_connect_start" });
    logEvent({ kind: "state", level: "info", message: "live session starting" });

    if (!mediaRef.current) mediaRef.current = new MediaHandler();
    await mediaRef.current.unlockPlayback();
    if (!clientRef.current) {
      wireLiveClient(createLiveClient());
    }

    try {
      const { uiLanguage, targetLanguage } = resolveLiveSessionLanguages({
        isGuest: isGuestRef.current,
        profileUiLang: profile?.ui_language ?? null,
        profileTarget: profile?.learning_target_language ?? null,
        sessionUiLang: sessionUiLangRef.current,
        browserUiLang: browserUiLangRef.current,
        teachLearningTarget: config.teach.learning,
      });
      sessionUiLangRef.current = uiLanguage;
      sessionTargetLangRef.current = targetLanguage;
      conversationLangRef.current = uiLanguage;
      setConversationLang(uiLanguage);
      setUiLang(uiLanguage);

      await clientRef.current!.connect({
        uiLanguage,
        targetLanguage,
        resume: false,
        mode: config.mode,
        level: roomSessionRef.current?.level ?? config.teach.level,
        session: roomSessionRef.current?.plan
          ? {
              paceSlow: roomSlowRef.current,
              title: roomSessionRef.current.title_en,
              scene: roomSessionRef.current.plan.scene,
              miomiRole: roomSessionRef.current.plan.miomi_role,
              register: roomSessionRef.current.register,
              objectives: roomSessionRef.current.plan.objectives,
              stages: roomSessionRef.current.plan.stages,
              phrases: roomSessionRef.current.plan.phrases,
            }
          : undefined,
      });
      memberContextRef.current = clientRef.current!.getMemberContext();
      {
        const vb = clientRef.current!.getVoiceBudget();
        if (vb && vb.budgetSeconds > 0 && vb.usedSeconds / vb.budgetSeconds >= 0.8) {
          setVoiceWarn(true);
        }
      }
      syncTeachWordContext();
      lessonHadStartedRef.current = true;
      const isRoom = !!roomSessionRef.current?.plan;
      dispatchTurn({
        type: "session_connected",
        isGuest: isGuestRef.current,
        guestExchanges: guestExchangesRef.current,
        skipKickoff: isRoom || kickoffSentRef.current,
      });
      if (isRoom && !kickoffSentRef.current) {
        // The Room opens in tutor voice — the companion greeting never fires here.
        kickoffSentRef.current = true;
        clientRef.current!.sendSessionKickoff(sessionUiLangRef.current);
      }
    } catch (err) {
      if ((err as Error & { code?: string })?.code === "voice_exhausted"
          || (err as Error)?.message === "voice_exhausted") {
        setVoiceExhausted(true);
        return;
      }
      logEvent({
        kind: "state",
        level: "error",
        message: "live session failed",
        data: { error: String(err) },
      });
      entryStartedRef.current = false;
      teardownSessionIntentional();
      setLiveUiState("error");
    }
  }, [
    canUseLive,
    dispatchTurn,
    ensureTurnRuntime,
    createLiveClient,
    wireLiveClient,
    resumeLiveSession,
    teardownSessionIntentional,
    profile,
    config.teach.learning,
    config.teach.level,
    config.mode,
    syncTeachWordContext,
  ]);

  useEffect(() => {
    liveUiStateRef.current = liveUiState;
  }, [liveUiState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardownSessionIntentional();
    };
  }, [teardownSessionIntentional]);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate localStorage + navigator prefs on mount */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setConfig(loadTalkConfig());
    const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    if (!isNaN(parsed) && parsed > 0) {
      setGuestExchangesRaw(parsed);
      guestExchangesRef.current = parsed;
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- browser ui-language seed + session languages */
  useEffect(() => {
    browserUiLangRef.current = browserUi;
    if (!profile?.ui_language || isGuest) {
      sessionUiLangRef.current = browserUi;
      conversationLangRef.current = browserUi;
      setConversationLang(browserUi);
      setUiLang(browserUi);
    }
    applySessionLanguages();
  }, [
    browserUi,
    guestAuthReady,
    isGuest,
    profileAuthReady,
    profile?.ui_language,
    profile?.learning_target_language,
    config.teach.learning,
    applySessionLanguages,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- session ice-breaker on fresh /talk open */
  useEffect(() => {
    if (items.length > 0 || !guestAuthReady) return;
    setItems([makeOpenerItem()]);
  }, [items.length, guestAuthReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- LOCKED 2026-06-05: voiced icebreaker on /talk entry; mic is separate orb tap */
  useEffect(() => {
    if (!canUseLive || isLocked || items.length < 1) return;
    if (turnRuntimeRef.current?.state.sessionActive || entryStartedRef.current) return;
    entryStartedRef.current = true;
    primeAudio();
    unlockTtsPlayback();
    void (async () => {
      await ensurePlaybackUnlocked();
      await startLiveSession();
    })();
  }, [canUseLive, isLocked, items.length, primeAudio, ensurePlaybackUnlocked, startLiveSession]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- guest counter reset on sign-in */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (guestAuthReady && !isGuest) {
      window.localStorage.removeItem(GUEST_COUNTER_KEY);
      setGuestExchangesRaw(0);
      guestExchangesRef.current = 0;
    }
  }, [guestAuthReady, isGuest]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + 4) {
        el.scrollTop = 0;
        return;
      }
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [items]);

  const handleAdjustSave = useCallback(
    (c: TalkConfig) => {
      setConfig(c);
      saveTalkConfig(c);
      const { uiLanguage, targetLanguage } = resolveLiveSessionLanguages({
        isGuest: isGuestRef.current,
        profileUiLang: profile?.ui_language ?? null,
        profileTarget: profile?.learning_target_language ?? null,
        sessionUiLang: sessionUiLangRef.current,
        browserUiLang: browserUiLangRef.current,
        teachLearningTarget: c.teach.learning,
      });
      sessionUiLangRef.current = uiLanguage;
      sessionTargetLangRef.current = targetLanguage;
      conversationLangRef.current = uiLanguage;
      setConversationLang(uiLanguage);
      setUiLang(uiLanguage);
      syncTeachWordContext();
      setAdjustOpen(false);
    },
    [profile?.ui_language, profile?.learning_target_language, syncTeachWordContext],
  );

  const openDebugOverlay = useCallback(() => {
    titleTapsRef.current = { count: 0, last: 0 };
    setDebugOpen(true);
    logEvent({ kind: "state", level: "info", message: "debug overlay opened" });
  }, []);

  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button, input, textarea")) return;
    const now = Date.now();
    const taps = titleTapsRef.current;
    if (now - taps.last > 900) {
      taps.count = 1;
    } else {
      taps.count += 1;
    }
    taps.last = now;
    if (taps.count >= 3) {
      openDebugOverlay();
    }
  }, [openDebugOverlay]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      setDebugOpen((open) => {
        if (!open) logEvent({ kind: "state", level: "info", message: "debug overlay opened" });
        return !open;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleWordReplay = useCallback(async (word: VocabularyEntry) => {
    dispatchTurn({ type: "replay_suspend", suspended: true });
    mediaRef.current?.suspendMicSend(true);
    discardSuspendedModelTurn();
    try {
      await replayWordAudio(word, sessionTargetLangRef.current);
    } finally {
      mediaRef.current?.suspendMicSend(false);
      void mediaRef.current?.endModelTurnWhenDrained();
      dispatchTurn({ type: "replay_suspend", suspended: false });
    }
  }, [discardSuspendedModelTurn, dispatchTurn]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setItems([makeOpenerItem()]);
    setExpandedItems(new Set());
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button, input, textarea")) return;
    primeAudio();
    unlockTtsPlayback();
  }, [primeAudio]);

  const handleOrbTap = useCallback(() => {
    primeAudio();
    if (!guestAuthReady) return;
    if (isLocked) {
      openGuestSignupSheet("talk");
      return;
    }
    if (awaitingContinueTap && lastSessionSnapshotRef.current) {
      void (async () => {
        await ensurePlaybackUnlocked();
        reconnectAttemptsRef.current = 0;
        await resumeLiveSession(
          lastSessionSnapshotRef.current!,
          wasListeningBeforeDropRef.current,
        );
      })();
      return;
    }
    const runtime = ensureTurnRuntime();
    if (runtime.state.sessionActive && !clientRef.current?.isConnected()) {
      if (lastSessionSnapshotRef.current) {
        void (async () => {
          await ensurePlaybackUnlocked();
          reconnectAttemptsRef.current = 0;
          await resumeLiveSession(
            lastSessionSnapshotRef.current!,
            wasListeningBeforeDropRef.current,
          );
        })();
      }
      return;
    }
    if (runtime.state.sessionActive) {
      if (liveUiState === "listening") {
        const s = runtime.state;
        if (
          s.handoffArmed ||
          s.invitationPending ||
          s.phase === "handoff" ||
          s.phase === "voiced_reply" ||
          s.phase === "invitation"
        ) {
          return;
        }
        dispatchTurn({ type: "orb_mic_stop" });
        return;
      }
      if (awaitingMic || liveUiState === "idle") {
        dispatchTurn({ type: "orb_mic_start" });
        return;
      }
      const interruptState = runtime.state;
      if (
        interruptState.handoffArmed ||
        interruptState.invitationPending ||
        interruptState.phase === "handoff" ||
        interruptState.phase === "voiced_reply" ||
        interruptState.phase === "invitation"
      ) {
        return;
      }
      killAllAudio();
      mediaRef.current?.stopAudioPlayback();
      dispatchTurn({ type: "orb_mic_stop" });
      return;
    }
    void (async () => {
      await ensurePlaybackUnlocked();
      await startLiveSession();
    })();
  }, [
    guestAuthReady,
    isLocked,
    awaitingContinueTap,
    liveUiState,
    awaitingMic,
    primeAudio,
    ensurePlaybackUnlocked,
    dispatchTurn,
    ensureTurnRuntime,
    startLiveSession,
    resumeLiveSession,
    openGuestSignupSheet,
  ]);

  const handleSendText = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    primeAudio();
    if (isLocked) {
      openGuestSignupSheet("talk");
      return;
    }
    dispatchTurn({ type: "guest_text_turn", isGuest: isGuestRef.current });
    currentTurnSeqRef.current = ++turnSeqRef.current;
    const id = crypto.randomUUID();
    currentUserItemIdRef.current = id;
    const cleaned = sanitizeUserTranscript(trimmed);
    const newItem = {
      id,
      kind: "user_said" as const,
      text: cleaned,
      turnSeq: currentTurnSeqRef.current,
      roleOrder: TRANSCRIPT_USER_ORDER,
    };
    itemsRef.current = [...itemsRef.current, newItem];
    setItems((prev) => [...prev, newItem]);
    setTextInput("");
    void honorContentIntent(cleaned);
    void honorExplicitLessonRequest(cleaned);
    if (!ensureTurnRuntime().state.sessionActive) {
      void (async () => {
        await ensurePlaybackUnlocked();
        await startLiveSession();
        clientRef.current?.sendText(trimmed);
      })();
    } else {
      mediaRef.current?.stopAudioPlayback();
      clientRef.current?.sendText(trimmed);
    }
  }, [
    textInput,
    isLocked,
    primeAudio,
    ensurePlaybackUnlocked,
    dispatchTurn,
    ensureTurnRuntime,
    startLiveSession,
    honorContentIntent,
    honorExplicitLessonRequest,
    openGuestSignupSheet,
  ]);

  const handleMiomiHelp = useCallback(
    (topic: "pillars" | "niche" | "voice") => {
      setAdjustOpen(false);
      primeAudio();
      if (isLocked) {
        openGuestSignupSheet("talk");
        return;
      }
      const text =
        topic === "pillars"
          ? uiLang === "en"
            ? "Help me define content pillars for my social presence."
            : "ช่วยหนูกำหนดเสาหลักของเนื้อหาให้หน่อยค่ะ"
          : topic === "niche"
            ? uiLang === "en"
              ? "Help me build my social creator profile — channel, niche, pillars, and audience."
              : "ช่วยหนูสร้างโปรไฟล์ครีเอเตอร์ให้หน่อยค่ะ — ช่อง นิช เสาหลัก และกลุ่มเป้าหมาย"
            : uiLang === "en"
              ? "Help me define my brand voice."
              : "ช่วยหนูกำหนดเสียงแบรนด์ให้หน่อยค่ะ";
      dispatchTurn({ type: "guest_text_turn", isGuest: isGuestRef.current });
      currentTurnSeqRef.current = ++turnSeqRef.current;
      const id = crypto.randomUUID();
      currentUserItemIdRef.current = id;
      setItems((prev) => [
        ...prev,
        {
          id,
          kind: "user_said",
          text,
          turnSeq: currentTurnSeqRef.current,
          roleOrder: TRANSCRIPT_USER_ORDER,
        },
      ]);
      if (!ensureTurnRuntime().state.sessionActive) {
        void (async () => {
          await ensurePlaybackUnlocked();
          await startLiveSession();
          if (ensureTurnRuntime().state.sessionActive) {
            clientRef.current?.sendText(text);
          }
        })();
      } else {
        clientRef.current?.sendText(text);
      }
    },
    [
      isLocked,
      uiLang,
      primeAudio,
      ensurePlaybackUnlocked,
      dispatchTurn,
      ensureTurnRuntime,
      startLiveSession,
      openGuestSignupSheet,
    ],
  );

  const orbState: OrbState = (() => {
    if (isLocked) return "locked";
    if (liveUiState === "thinking") return "thinking";
    if (liveUiState === "listening") return "listening";
    if (liveUiState === "connecting") return "thinking";
    if (liveUiState === "speaking") return "speaking";
    if (liveUiState === "error") return "idle";
    return "idle";
  })();

  const miomiMood: MiomiMood = (() => {
    if (liveUiState === "listening") return "listening";
    if (liveUiState === "connecting") return "thinking";
    if (liveUiState === "speaking") return "speaking";
    return "idle";
  })();

  const fuelHeart = ((profile as { mood?: number } | null)?.mood ?? 0.82) * 100;
  const fuelZap = 64;
  const fuelBrain = 45;

  const guestSignupPrompt = useMemo(
    () => pickPhrase(GUIDANCE_GUEST_LIMIT_HIT, { lang: uiLang }),
    [uiLang],
  );

  const stateLabel = (() => {
    if (isLocked) {
      return guestSignupPrompt;
    }
    if (!audioUnlocked) {
      return uiLang === "th" ? "แตะเพื่อเริ่มค่า~" : "tap anywhere to begin~";
    }
    if (awaitingContinueTap) {
      return uiLang === "th" ? "แตะเพื่อเรียนต่อค่า~" : "Tap to continue~";
    }
    if (awaitingMic && liveUiState !== "speaking" && liveUiState !== "connecting") {
      return uiLang === "th" ? "กดไมค์เมื่อพร้อมพูดค่า~" : "press the mic when you're ready~";
    }
    if (liveUiState === "thinking") return uiLang === "th" ? "หนูกำลังคิดอยู่ค่ะ~" : "thinking~";
    if (liveUiState === "connecting") return uiLang === "th" ? "กำลังเชื่อมต่อค่า..." : "connecting...";
    if (liveUiState === "listening") return uiLang === "th" ? "กำลังฟังค่า..." : "I'm listening...";
    if (liveUiState === "speaking") return uiLang === "th" ? "หนูกำลังพูดค่า..." : "Miomi is talking...";
    if (liveUiState === "error") return uiLang === "th" ? "ลองอีกครั้งนะคะ~" : "tap to try again~";
    return "";
  })();

  const sortedCanvasItems = useMemo(() => sortTranscriptItems(items), [items]);

  const micStateForDebug = liveUiState === "connecting" ? "processing" : liveUiState === "listening" ? "listening" : liveUiState === "speaking" ? "speaking" : "idle";

  return (
    <TalkErrorBoundary>
    <div
      onPointerDown={handlePointerDown}
      className="md:mx-auto md:w-full md:max-w-[860px]"
      style={{
        position: "relative",
        zIndex: 0,
        flex: 1,
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: roomSession
          ? "linear-gradient(168deg,#E9F8F4 0%,#FEFCF7 36%,#FDF3E3 100%)"
          : "transparent",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        style={{
          height: "54px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          paddingTop: "calc(env(safe-area-inset-top, 0px))",
          background: "transparent",
          touchAction: "manipulation",
        }}
      >
        {roomSession ? (
          <button onClick={() => void endRoomSession()} aria-label="Back" disabled={roomEnding} style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3D352B", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
        ) : (
          <Link href="/home" aria-label="Back" style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3D352B", textDecoration: "none" }}>
            <ArrowLeft size={22} strokeWidth={2} />
          </Link>
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "44px",
            cursor: "default",
          }}
        >
          {guestAuthReady && isGuest ? (
            <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, color: "#9A8B73", background: "transparent", padding: "5px 12px" }}>
              {uiLang === "en"
                ? `${Math.max(0, GUEST_EXCHANGE_LIMIT - guestExchanges)} left`
                : `เหลืออีก ${Math.max(0, GUEST_EXCHANGE_LIMIT - guestExchanges)} ครั้ง`}
            </span>
          ) : (
            <FuelPill heart={fuelHeart} zap={fuelZap} brain={fuelBrain} />
          )}
        </div>

        <button
          type="button"
          onClick={() => setAdjustOpen(true)}
          aria-label="Adjust"
          style={{ width: "36px", height: "36px", borderRadius: "50%", background: "transparent", border: "none", color: "#9A8B73", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="21" y1="6" x2="14" y2="6" /><line x1="10" y1="6" x2="3" y2="6" />
            <line x1="21" y1="12" x2="12" y2="12" /><line x1="8" y1="12" x2="3" y2="12" />
            <line x1="21" y1="18" x2="16" y2="18" /><line x1="12" y1="18" x2="3" y2="18" />
            <line x1="14" y1="9" x2="14" y2="3" /><line x1="8" y1="15" x2="8" y2="9" /><line x1="16" y1="21" x2="16" y2="15" />
          </svg>
        </button>
      </div>

      {items.length <= 1 && (
        <PersistentMiomi
          mood={miomiMood}
          uiLang={uiLang}
          subtitleTh={items.length <= 1 ? "หนูพร้อมแล้วค่า~" : undefined}
          subtitleEn={items.length <= 1 ? "I'm ready~" : undefined}
        />
      )}

      {roomSession ? (
        <div style={{ flexShrink: 0, padding: "6px 12px 4px", zIndex: 7 }}>
          <div style={{
            background: "linear-gradient(135deg,#34A98F 0%,#1F7A68 100%)",
            borderRadius: 16, padding: "10px 12px",
            boxShadow: "0 8px 20px -6px rgba(31,122,104,0.45)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.9)" }}>
                Confident Speaking · Private room
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {voiceWarn && !voiceExhausted && !roomTimeUp ? (
                  <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: "12px", color: "#9A8B73", textAlign: "center", padding: "4px 0" }}>
                    {uiLang === "en" ? "About a minute of voice left~ then we can keep going by text" : "เหลือเสียงอีกประมาณหนึ่งนาที~ จากนั้นเราคุยกันต่อด้วยข้อความได้นะ"}
                  </div>
                ) : null}
                {roomTimeUp ? (
                  <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 12, color: "#1F7A68", textAlign: "center", padding: "6px 0", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    <span>{uiLang === "en" ? "That's our session~ take a moment to read back, then see your results." : "ครบเวลาแล้วน้า~ อ่านทบทวนได้เลย แล้วค่อยกดดูผลลัพธ์"}</span>
                    <button onClick={() => void endRoomSession()} disabled={roomEnding} style={{
                      fontFamily: "'Quicksand', sans-serif", fontSize: 12, fontWeight: 700, padding: "6px 16px",
                      borderRadius: 99, border: "none", background: "linear-gradient(135deg,#6ECDB8,#34A98F)", color: "#FFFFFF", cursor: "pointer",
                    }}>
                      {roomEnding ? (uiLang === "en" ? "Saving…" : "กำลังบันทึก…") : (uiLang === "en" ? "See my results" : "ดูผลลัพธ์ของฉัน")}
                    </button>
                  </div>
                ) : null}
                <button onClick={() => { void toggleRoomPace(); }} style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: 10, fontWeight: 700, padding: "4px 11px",
                  borderRadius: 99, border: "1px solid rgba(255,255,255,.45)", background: roomSlow ? "#FFFFFF" : "rgba(255,255,255,.14)", color: roomSlow ? "#1F7A68" : "#FFFFFF", cursor: "pointer",
                }}>
                  {roomSlow ? "Slow~" : "Normal"}
                </button>
                <button onClick={() => setRoomHintsOpen((v) => !v)} style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: 10, fontWeight: 700, padding: "4px 11px",
                  borderRadius: 99, border: "1px solid rgba(255,255,255,.45)", background: "rgba(255,255,255,.14)", color: "#FFFFFF", cursor: "pointer",
                }}>
                  {roomHintsOpen ? "Hide hints" : "Hints~"}
                </button>
                <button onClick={() => void endRoomSession()} disabled={roomEnding} style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: 10, fontWeight: 700, padding: "4px 11px",
                  borderRadius: 99, border: "none", background: "#FFFFFF", color: "#1F7A68", cursor: "pointer",
                }}>
                  {roomEnding ? "Saving…" : "End session"}
                </button>
              </span>
            </div>
            <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
              {roomSession.plan.stages.map((s, idx) => {
                const order = roomSession.plan.stages.findIndex((x) => x.id === roomStageId);
                return (
                  <span key={s.id} style={{
                    flex: 1, height: 4, borderRadius: 4,
                    background: idx < order ? "#FFFFFF" : idx === order ? "#E8C77A" : "rgba(255,255,255,.25)",
                  }} />
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 11.5, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {roomSession.title_en} · {roomSession.plan.stages.find((s) => s.id === roomStageId)?.title ?? "Warm-up"}
              </span>
              <button onClick={() => setRoomBoardOpen((v) => !v)} style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 10.5, fontWeight: 700, color: "#FDE9B8", flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                {roomObjectivesDone.length}/{roomSession.plan.objectives.length} earned ▾
              </button>
            </div>
          </div>
          {roomBoardOpen ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #7DD3C0", borderRadius: 16, padding: "10px 12px", marginTop: 6, boxShadow: "0 8px 22px rgba(74,65,54,.12)" }}>
              {roomSession.plan.objectives.map((o, oi) => {
                const earned = roomObjectivesDone.includes(oi);
                return (
                  <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: oi < roomSession.plan.objectives.length - 1 ? "1px solid #EDE8E0" : "none" }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", flex: "0 0 16px", border: earned ? "2px solid transparent" : "2px solid #EDE8E0", background: earned ? "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)" : "#FFFFFF" }} />
                    <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 12, fontWeight: 700, color: earned ? "#2C8576" : "#9A8B73" }}>{o}</span>
                  </div>
                );
              })}
              {roomLearned.length ? (
                <div style={{ borderTop: "1px solid #EDE8E0", paddingTop: 6, marginTop: 6 }}>
                  <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#C2497E", margin: "0 0 4px" }}>New today~</p>
                  {roomLearned.map((h, hi) => (
                    <p key={hi} style={{ fontFamily: "'Sarabun', 'Quicksand', sans-serif", fontSize: 12, fontWeight: 600, color: "#3C352B", margin: "0 0 3px", lineHeight: 1.45 }}>{h}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {roomHintsOpen ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #C4B5FD", borderRadius: 16, padding: "10px 12px", marginTop: 6, boxShadow: "0 8px 22px rgba(74,65,54,.12)" }}>
              {roomLearned.length ? (
                <div style={{ borderBottom: "1px solid #EDE8E0", paddingBottom: 6, marginBottom: 6 }}>
                  <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#C2497E", margin: "0 0 4px" }}>
                    From Miomi just now~
                  </p>
                  {roomLearned.map((h, hi) => (
                    <p key={hi} style={{ fontFamily: "'Sarabun', 'Quicksand', sans-serif", fontSize: 12.5, fontWeight: 600, color: "#3C352B", margin: "0 0 4px", lineHeight: 1.45 }}>{h}</p>
                  ))}
                </div>
              ) : null}
              {roomSession.plan.phrases.map((p, pi) => {
                const targetIsEn = roomSession.learningTarget === "en";
                const targetText = targetIsEn ? p.en : p.th;
                return (
                  <div key={pi} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: pi < roomSession.plan.phrases.length - 1 ? "1px solid #EDE8E0" : "none" }}>
                    <button
                      onClick={() => { try { void ttsSpeak(targetText, ttsDetectLang(targetText)); } catch { /* best-effort */ } }}
                      aria-label="Play sound"
                      style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #EDE8E0", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 24px" }}
                    >
                      <RoomVolume style={{ width: 12, height: 12, color: "#3E9C82" }} aria-hidden />
                    </button>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: targetIsEn ? "'Quicksand', sans-serif" : "'Sarabun', sans-serif", display: "block", fontSize: 13, fontWeight: 700, color: "#3C352B" }}>{targetText}</span>
                      {!targetIsEn && p.romanization ? (
                        <span style={{ fontFamily: "'Quicksand', sans-serif", display: "block", fontSize: 10.5, fontWeight: 600, color: "#6D5BBF" }}>{p.romanization}</span>
                      ) : null}
                      <span style={{ fontFamily: targetIsEn ? "'Sarabun', sans-serif" : "'Quicksand', sans-serif", display: "block", fontSize: 11, fontWeight: 600, color: "#9A8B73" }}>{targetIsEn ? p.th : p.en}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column-reverse",
            padding: "8px 14px 0",
            paddingBottom: "150px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: "12px",
            }}
          >
          {sortedCanvasItems.map((item) => {
            if (item.kind === "mini_cat") {
              return <MiniCatRow key={item.id} textTh={item.textTh} textEn={item.textEn} uiLang={uiLang} />;
            }
            if (item.kind === "user_said") {
              if (!item.text.trim()) return null;
              const fullText = item.text;
              const isLong = fullText.length > TRANSCRIPT_CLIP;
              const isExpanded = expandedItems.has(item.id);
              const display = !isLong || isExpanded ? fullText : fullText.slice(0, TRANSCRIPT_CLIP) + "…";
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "flex-end", alignSelf: "stretch", flexShrink: 0 }}>
                  <div style={{ maxWidth: "78%", background: "linear-gradient(135deg, rgba(110,205,184,0.16) 0%, rgba(110,205,184,0.06) 100%)", border: "0.5px solid rgba(110,205,184,0.32)", borderRadius: "18px 4px 18px 18px", padding: "11px 14px" }}>
                    <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "14px", color: "#1A1A18", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{display}</p>
                    {isLong && (
                      <button type="button" onClick={() => toggleExpand(item.id)} style={{ marginTop: "4px", background: "none", border: "none", padding: 0, color: "#9A8B73", fontSize: "12px", fontFamily: "'Quicksand', sans-serif", textDecoration: "underline", cursor: "pointer" }}>
                        {isExpanded ? (uiLang === "en" ? "Show less" : "ย่อ") : (uiLang === "en" ? "Show more" : "ดูเพิ่ม")}
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            if (item.kind === "word_card") {
              return (
                <WordCardV3
                  key={item.id}
                  word={item.word}
                  direction={item.direction}
                  onReplayAudio={() => handleWordReplay(item.word)}
                  saveState={isGuest ? "guest_prompt" : "saved"}
                  onSaveTap={isGuest ? () => openGuestSignupSheet("save") : undefined}
                />
              );
            }
            return null;
          })}
          <div style={{ height: "8px", flexShrink: 0 }} />
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: "72px", zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
        {!audioUnlocked && items.length <= 1 && (
          <p
            style={{
              margin: "0 0 4px",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#9A8B73",
              opacity: 0.85,
            }}
          >
            {uiLang === "th" ? "แตะที่ไหนก็ได้เพื่อเริ่มค่า~" : "tap anywhere to begin~"}
          </p>
        )}
        <div style={{ pointerEvents: "auto" }}>
        <MicRow
          current={config.mode}
          orbState={orbState}
          uiLang={uiLang}
          showModes={!roomSession}
          onModeChange={(m) => {
            const next = { ...config, mode: m };
            setConfig(next);
            saveTalkConfig(next);
            void switchLiveMode(m);
          }}
          onOrbTap={handleOrbTap}
          orbAriaLabel={
            isLocked
              ? uiLang === "en" ? "Sign in to keep talking" : "สมัครเพื่อพูดคุยต่อ"
              : orbState === "listening"
                ? uiLang === "en" ? "Stop listening" : "หยุดฟัง"
              : awaitingContinueTap
                ? uiLang === "en" ? "Tap to continue" : "แตะเพื่อเรียนต่อ"
                : awaitingMic
                  ? uiLang === "en" ? "Press mic to speak" : "กดไมค์เพื่อพูด"
                  : uiLang === "en" ? "Tap to talk with Miomi" : "แตะเพื่อพูดกับหนู"
          }
        />
        </div>
        {stateLabel ? (
          <p
            style={{
              margin: "2px 0 0",
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "12px",
              color: "#9A8B73",
              opacity: 0.7,
            }}
          >
            {stateLabel}
          </p>
        ) : null}
      </div>
      <div style={{ flexShrink: 0, padding: "4px 12px 8px", background: "transparent" }}>
        {voiceExhausted ? (
          <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: "12px", color: "#9A8B73", textAlign: "center", padding: "0 4px 8px", lineHeight: 1.45 }}>
            {uiLang === "en"
              ? "Voice time for today is all used up~ type here and I'll still be with you"
              : "เวลาเสียงวันนี้หมดแล้วนะ~ พิมพ์ตรงนี้ได้เลย หนูยังอยู่กับคุณค่ะ"}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", border: "0.5px solid #EDE8E0", borderRadius: "26px", padding: "5px 5px 5px 16px", boxShadow: "0 2px 10px rgba(26,26,24,0.04)" }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && textInput.trim()) handleSendText();
            }}
            placeholder={uiLang === "en" ? "Message Miomi~" : "พิมพ์ถึงหนู~"}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'Kanit', sans-serif", fontSize: "13.5px", color: "#1A1A18", padding: "8px 0" }}
          />
          {textInput.trim() && (
            <button type="button" onClick={handleSendText} aria-label="Send" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {items.length > 1 && (
        <button
          type="button"
          onClick={handleClear}
          style={{ position: "absolute", top: "62px", right: "12px", background: "transparent", border: "none", padding: "4px 12px", fontFamily: "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 600, color: "#9A8B73", cursor: "pointer", zIndex: 5 }}
        >
          {uiLang === "en" ? "Clear" : "ล้าง"}
        </button>
      )}

      <AdjustSheet
        open={adjustOpen}
        config={config}
        uiLang={uiLang}
        onSave={handleAdjustSave}
        onClose={() => setAdjustOpen(false)}
        onMiomiHelp={handleMiomiHelp}
      />

      {showGuestSheet && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(26,26,24,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }} style={{ width: "100%", background: "#FFFFFF", borderRadius: "28px 28px 0 0", paddingBottom: "env(safe-area-inset-bottom, 24px)", boxShadow: "0 -8px 40px rgba(26,26,24,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "14px", marginBottom: "8px" }}>
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Image src="/characters/miomi/head/idle.png" alt="Miomi" width={130} height={130} />
            </div>
            <div style={{ textAlign: "center", padding: "0 28px", marginBottom: "20px" }}>
              <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "22px", fontWeight: 600, color: "#1A1A18", margin: "0 0 8px", lineHeight: 1.3 }}>
                {guestSheetReason === "save"
                  ? uiLang === "en"
                    ? "Sign up to save your words~"
                    : "สมัครเพื่อบันทึกคำศัพท์นะคะ~"
                  : uiLang === "en"
                    ? "Sign in to talk with Miomi~"
                    : "สมัครเพื่อพูดคุยกับหนูค่า~"}
              </p>
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "14px", color: "#9A8B73", margin: 0, lineHeight: 1.5 }}>
                {guestSheetReason === "save"
                  ? uiLang === "en"
                    ? "Create a free account and Miomi will remember every word you learn together"
                    : "สมัครฟรี หนูจะจำทุกคำที่เราเรียนด้วยกันไว้ให้ค่า"
                  : uiLang === "en"
                    ? "Voice chat is for members — sign up free and I'll remember everything we learn"
                    : "การพูดคุยเสียงสำหรับสมาชิกค่า — สมัครฟรี หนูจะจำทุกอย่างที่เราเรียนด้วยกัน"}
              </p>
            </div>
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "56px", borderRadius: "999px", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", fontFamily: "'Kanit', sans-serif", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", textDecoration: "none", boxShadow: "0 6px 20px -4px rgba(52,169,143,0.45)" }}>
                {uiLang === "en" ? "Stay with me ✦" : "อยู่กับหนูค่า ✦"}
              </Link>
              <button type="button" onClick={() => setShowGuestSheet(false)} style={{ height: "44px", borderRadius: "999px", background: "none", border: "1.5px solid #EDE8E0", fontFamily: "'Quicksand', sans-serif", fontSize: "14px", fontWeight: 600, color: "#9A8B73", cursor: "pointer" }}>
                {uiLang === "en" ? "Maybe later~" : "ไว้ทีหลังนะคะ~"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <DebugOverlay
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
        micState={micStateForDebug}
        conversationLang={conversationLang}
      />
    </div>
    </TalkErrorBoundary>
  );
}
