"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { updateUiLanguage, useProfile } from "@/lib/auth/use-profile";
import { FuelPill } from "@/components/talk/FuelPill";
import { type OrbState } from "@/components/talk/VoiceOrb";
import { PersistentMiomi, type MiomiMood } from "@/components/talk/PersistentMiomi";
import { MicRow } from "@/components/talk/MicRow";
import { Toolbox, type ResponseLength } from "@/components/talk/Toolbox";
import { MiniCatRow } from "@/components/talk/MiniCatRow";
import { WordCardV3 } from "@/components/talk/WordCardV3";
import { AdjustSheet } from "@/components/talk/AdjustSheet";
import { type TalkConfig, loadTalkConfig, saveTalkConfig, DEFAULT_TALK_CONFIG } from "@/lib/talk/modes";
import { pickIceBreaker } from "@/lib/voice/warmth";
import { unlockTtsPlayback } from "@/lib/voice/tts";
import { logEvent } from "@/lib/debug/event-bus";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { TalkErrorBoundary } from "@/components/error/TalkErrorBoundary";
import { MiomiLiveClient, type LiveClientMessage } from "@/lib/live/miomi-client";
import { MediaHandler } from "@/lib/live/media-handler";
import { isHiddenLiveTranscript, sanitizeUserTranscript } from "@/lib/live/transcript";
import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";
import {
  detectLanguage,
  detectPracticeAttempt,
  normalizeLearningTarget,
  normalizeUiLanguage,
  resolveSessionLanguages,
  resolveTargetLanguage,
  resolveUiLanguage,
} from "@/lib/brain/language";
import {
  newGeminiTranscriptItem,
  routeGeminiTranscriptChunk,
} from "@/lib/live/transcript-routing";
import {
  cardDirectionForTarget,
  teachWordToVocabularyEntry,
  type TeachWordResult,
} from "@/lib/talk/teach-word-card";
import { recordWordPick } from "@/lib/talk/teaching-mode";
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
  | { id: string; kind: "mini_cat"; textTh: string; textEn: string }
  | { id: string; kind: "user_said"; text: string }
  | { id: string; kind: "word_card"; word: VocabularyEntry; direction: "th_to_en" | "en_to_th" };

type LiveUiState = "idle" | "connecting" | "listening" | "speaking" | "error";

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

function canvasToMemory(
  items: CanvasItem[],
): Array<{ role: "user" | "miomi"; content: string }> {
  const memory: Array<{ role: "user" | "miomi"; content: string }> = [];
  for (const item of items) {
    if (item.kind === "user_said") {
      memory.push({ role: "user", content: item.text });
      continue;
    }
    if (item.kind === "word_card") continue;
    const content = [item.textEn, item.textTh].filter(Boolean).join(" ");
    if (content) memory.push({ role: "miomi", content });
  }
  return memory;
}

function makeOpenerItem(): CanvasItem {
  const iceBreaker = pickIceBreaker();
  return { id: crypto.randomUUID(), kind: "mini_cat", textTh: iceBreaker.th, textEn: iceBreaker.en };
}

export default function TalkPage() {
  const { isGuest, authReady: guestAuthReady } = useGuestExploration();
  const { profile, authReady: profileAuthReady } = useProfile();
  /** Members must wait for profile row — guest auth alone is not enough (entryStartedRef race). */
  const canUseLive =
    guestAuthReady && (isGuest || (profileAuthReady && !!profile));

  const [config, setConfig] = useState<TalkConfig>(() =>
    typeof window !== "undefined" ? loadTalkConfig() : DEFAULT_TALK_CONFIG,
  );
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [uiLang, setUiLang] = useState<"th" | "en">("en");
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [textInput, setTextInput] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [respLength, setRespLength] = useState<ResponseLength>("normal");
  const [conversationLang, setConversationLang] = useState<"th" | "en">("en");
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const [guestSheetReason, setGuestSheetReason] = useState<"talk" | "save">("talk");
  const [guestExchangesRaw, setGuestExchangesRaw] = useState(readGuestExchanges);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [awaitingMic, setAwaitingMic] = useState(false);
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
  const conversationLangRef = useRef<"th" | "en">("en");
  const sessionUiLangRef = useRef<"th" | "en">("en");
  const sessionTargetLangRef = useRef<"th" | "en">("th");
  const itemsRef = useRef<CanvasItem[]>([]);

  const syncTeachWordContext = useCallback(() => {
    clientRef.current?.setTeachWordContext({
      learningTarget: sessionTargetLangRef.current,
      sessionIntroduced: sessionIntroducedWords(itemsRef.current),
    });
  }, []);

  const resetTranscriptIds = useCallback(() => {
    currentGeminiItemIdRef.current = null;
    currentUserItemIdRef.current = null;
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

  const teardownSession = useCallback(() => {
    kickoffSentRef.current = false;
    entryStartedRef.current = false;
    mediaRef.current?.stopAudio();
    mediaRef.current?.stopAudioPlayback();
    clientRef.current?.disconnect();
    clientRef.current = null;
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
          },
          onOpenGuestSheet: openGuestSignupSheet,
          onTeardown: teardownSession,
          onResetTranscriptIds: resetTranscriptIds,
          onKickoffCanvas: () => {
            kickoffSentRef.current = true;
            setItems((prev) => {
              if (prev.length === 1 && prev[0]?.kind === "mini_cat") {
                currentGeminiItemIdRef.current = prev[0].id;
                return [{ ...prev[0], textTh: "", textEn: "" }];
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
        },
        guestExchangesRef.current,
        isGuestRef.current,
      );
    }
    return turnRuntimeRef.current;
  }, [openGuestSignupSheet, resetTranscriptIds, startContinuousMic, stopContinuousMic, teardownSession]);

  const dispatchTurn = useCallback(
    (event: Parameters<TurnRuntime["dispatch"]>[0]) => {
      return ensureTurnRuntime().dispatch(event);
    },
    [ensureTurnRuntime],
  );

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

  const maybeAdaptSessionLanguages = useCallback(
    (userInput: string) => {
      const trimmed = userInput.trim();
      if (!trimmed) return;

      const memory = canvasToMemory(itemsRef.current);
      const sessionUi = sessionUiLangRef.current;
      const targetLang = sessionTargetLangRef.current;
      const profileUiAnchor = isGuestRef.current
        ? sessionUi
        : normalizeUiLanguage(profile?.ui_language ?? null);
      const profileTarget = normalizeLearningTarget(profile?.learning_target_language ?? null);

      const isPracticeAttempt = detectPracticeAttempt({
        userInput: trimmed,
        nowLanguage: detectLanguage(trimmed, sessionUi),
        learningTargetLanguage: targetLang,
        uiLanguage: sessionUi,
        memory,
        introducedWords: sessionIntroducedWords(itemsRef.current),
      });
      if (isPracticeAttempt) return;

      const resolvedUi = resolveUiLanguage({
        profileUiLang: profileUiAnchor,
        userInput: trimmed,
        memory,
        learningTargetLanguage: targetLang,
      });
      const resolvedTarget = resolveTargetLanguage({
        userInput: trimmed,
        memory,
        profileTarget,
        uiLanguage: resolvedUi,
      });

      const uiChanged = resolvedUi !== sessionUi;
      const targetChanged = resolvedTarget !== targetLang;
      if (!uiChanged && !targetChanged) return;

      sessionUiLangRef.current = resolvedUi;
      sessionTargetLangRef.current = resolvedTarget;
      conversationLangRef.current = resolvedUi;
      setConversationLang(resolvedUi);
      setUiLang(resolvedUi);
      clientRef.current?.sendLanguageContext(resolvedUi, resolvedTarget);
      syncTeachWordContext();
    },
    [profile?.ui_language, profile?.learning_target_language, syncTeachWordContext],
  );

  const appendTranscript = useCallback((role: "user" | "gemini", chunk: string) => {
    if (role === "user") {
      const cleaned = sanitizeUserTranscript(chunk);
      if (!cleaned) return;
      if (currentUserItemIdRef.current) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === currentUserItemIdRef.current && item.kind === "user_said"
              ? { ...item, text: item.text + cleaned }
              : item,
          ),
        );
      } else {
        const id = crypto.randomUUID();
        currentUserItemIdRef.current = id;
        setItems((prev) => [...prev, { id, kind: "user_said", text: cleaned }]);
      }
      return;
    }

    const uiField = sessionUiLangRef.current;
    if (currentGeminiItemIdRef.current) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== currentGeminiItemIdRef.current || item.kind !== "mini_cat") return item;
          return {
            ...item,
            ...routeGeminiTranscriptChunk(uiField, item, chunk),
          };
        }),
      );
    } else {
      const id = crypto.randomUUID();
      currentGeminiItemIdRef.current = id;
      const routed = newGeminiTranscriptItem(uiField, chunk);
      setItems((prev) => [
        ...prev,
        {
          id,
          kind: "mini_cat",
          textTh: routed.textTh,
          textEn: routed.textEn,
        },
      ]);
    }
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
        return;
      }
      const lastUser = [...itemsRef.current]
        .reverse()
        .find((item): item is Extract<CanvasItem, { kind: "user_said" }> => item.kind === "user_said");
      if (lastUser) {
        maybeAdaptSessionLanguages(lastUser.text);
      }
      dispatchTurn({ type: "turn_complete" });
      return;
    }
    if (msg.type === "audio") {
      if (suspended) return;
      dispatchTurn({ type: "model_audio" });
      mediaRef.current?.playAudio(msg.data);
      return;
    }
    if (msg.type === "user") {
      if (isHiddenLiveTranscript(msg.text)) return;
      const isFirst = !currentUserItemIdRef.current;
      if (isFirst) {
        dispatchTurn({
          type: "user_transcript",
          text: msg.text,
          isFirstChunk: true,
          isGuest: isGuestRef.current,
        });
      }
      appendTranscript("user", msg.text);
      return;
    }
    if (msg.type === "gemini") {
      if (suspended) return;
      if (isHiddenLiveTranscript(msg.text)) return;
      dispatchTurn({ type: "model_transcript", text: msg.text });
      appendTranscript("gemini", msg.text);
      return;
    }
    if (
      msg.type === "tool_call" &&
      (msg.name === "get_word_to_teach" || msg.name === "get_word_to_review")
    ) {
      if (suspended) return;
      const result = msg.result as TeachWordResult;
      logEvent({
        kind: "engine",
        level: "info",
        message: `${msg.name} tool call`,
        data: { args: msg.args, result, phonetics_source: result.phonetics_source ?? null },
      });
      syncTeachWordContext();
      if (runtime.state.handoffArmed) return;
      const entry = teachWordToVocabularyEntry(result);
      let hadCard = false;
      if (entry) {
        hadCard = true;
        const pickKind = msg.name === "get_word_to_review" ? "review" : "new";
        runtime.state = {
          ...runtime.state,
          teaching: recordWordPick(runtime.state.teaching, pickKind),
        };
        const direction = cardDirectionForTarget(sessionTargetLangRef.current);
        const cardId = crypto.randomUUID();
        setItems((prev) => {
          const next = [
            ...prev,
            { id: cardId, kind: "word_card" as const, word: entry, direction },
          ];
          itemsRef.current = next;
          return next;
        });
        syncTeachWordContext();
      }
      dispatchTurn({ type: "tool_result", name: msg.name, hadCard });
    }
  }, [
    appendTranscript,
    discardSuspendedModelTurn,
    dispatchTurn,
    ensureTurnRuntime,
    maybeAdaptSessionLanguages,
    resetTranscriptIds,
    syncTeachWordContext,
  ]);

  const startLiveSession = useCallback(async () => {
    const runtime = ensureTurnRuntime();
    if (!canUseLive || runtime.state.sessionActive) return;
    dispatchTurn({ type: "session_connect_start" });
    logEvent({ kind: "state", level: "info", message: "live session starting" });

    if (!mediaRef.current) mediaRef.current = new MediaHandler();
    await mediaRef.current.unlockPlayback();
    if (!clientRef.current) {
      clientRef.current = new MiomiLiveClient({
        onOpen: () => {
          logEvent({ kind: "state", level: "info", message: "live connected" });
        },
        onMessage: handleLiveMessage,
        onClose: () => {
          teardownSession();
        },
        onError: (detail) => {
          logEvent({ kind: "state", level: "error", message: "live error", data: detail });
          setLiveUiState("error");
        },
      });
    }

    try {
      const { uiLanguage, targetLanguage } = resolveSessionLanguages({
        isGuest: isGuestRef.current,
        profileUiLang: profile?.ui_language ?? null,
        profileTarget: profile?.learning_target_language ?? null,
      });
      sessionUiLangRef.current = uiLanguage;
      sessionTargetLangRef.current = targetLanguage;
      conversationLangRef.current = uiLanguage;
      setConversationLang(uiLanguage);
      setUiLang(uiLanguage);

      await clientRef.current.connect({ uiLanguage, targetLanguage });
      syncTeachWordContext();
      dispatchTurn({
        type: "session_connected",
        isGuest: isGuestRef.current,
        guestExchanges: guestExchangesRef.current,
        skipKickoff: kickoffSentRef.current,
      });
    } catch (err) {
      logEvent({
        kind: "state",
        level: "error",
        message: "live session failed",
        data: { error: String(err) },
      });
      entryStartedRef.current = false;
      teardownSession();
      setLiveUiState("error");
    }
  }, [
    canUseLive,
    dispatchTurn,
    ensureTurnRuntime,
    handleLiveMessage,
    teardownSession,
    profile,
    syncTeachWordContext,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardownSession();
    };
  }, [teardownSession]);

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
    const { uiLanguage } = resolveSessionLanguages({
      isGuest: true,
      profileUiLang: null,
      profileTarget: null,
    });
    setUiLang(uiLanguage);
    setConversationLang(uiLanguage);
    sessionUiLangRef.current = uiLanguage;
    conversationLangRef.current = uiLanguage;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!profileAuthReady || isGuest) return;
    const { uiLanguage, targetLanguage } = resolveSessionLanguages({
      isGuest: false,
      profileUiLang: profile?.ui_language ?? null,
      profileTarget: profile?.learning_target_language ?? null,
    });
    queueMicrotask(() => {
      setConversationLang(uiLanguage);
      setUiLang(uiLanguage);
      sessionUiLangRef.current = uiLanguage;
      sessionTargetLangRef.current = targetLanguage;
      conversationLangRef.current = uiLanguage;
    });
  }, [profileAuthReady, isGuest, profile?.ui_language, profile?.learning_target_language]);

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

  const handleCycleLang = useCallback(() => {
    const next: "th" | "en" = conversationLang === "th" ? "en" : "th";
    setConversationLang(next);
    setUiLang(next);
    void updateUiLanguage(next);
  }, [conversationLang]);

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
    const runtime = ensureTurnRuntime();
    if (runtime.state.sessionActive) {
      if (liveUiState === "listening") {
        dispatchTurn({ type: "orb_mic_stop" });
        return;
      }
      if (awaitingMic || liveUiState === "idle") {
        dispatchTurn({ type: "orb_mic_start" });
        return;
      }
      return;
    }
    void (async () => {
      await ensurePlaybackUnlocked();
      await startLiveSession();
    })();
  }, [
    guestAuthReady,
    isLocked,
    liveUiState,
    awaitingMic,
    primeAudio,
    ensurePlaybackUnlocked,
    dispatchTurn,
    ensureTurnRuntime,
    startLiveSession,
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
    const id = crypto.randomUUID();
    currentUserItemIdRef.current = id;
    const cleaned = sanitizeUserTranscript(trimmed);
    const newItem = { id, kind: "user_said" as const, text: cleaned };
    itemsRef.current = [...itemsRef.current, newItem];
    setItems((prev) => [...prev, newItem]);
    setTextInput("");
    maybeAdaptSessionLanguages(cleaned);
    if (!ensureTurnRuntime().state.sessionActive) {
      void (async () => {
        await ensurePlaybackUnlocked();
        await startLiveSession();
        clientRef.current?.sendText(trimmed);
      })();
    } else {
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
    maybeAdaptSessionLanguages,
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
      const id = crypto.randomUUID();
      currentUserItemIdRef.current = id;
      setItems((prev) => [...prev, { id, kind: "user_said", text }]);
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

  const stateLabel = (() => {
    if (isLocked) {
      return uiLang === "th" ? "สมัครเพื่อพูดคุยต่อกับหนูค่า~" : "Sign in to keep talking with Miomi~";
    }
    if (!audioUnlocked) {
      return uiLang === "th" ? "แตะเพื่อเริ่มค่า~" : "tap anywhere to begin~";
    }
    if (awaitingMic && liveUiState !== "speaking" && liveUiState !== "connecting") {
      return uiLang === "th" ? "กดไมค์เมื่อพร้อมพูดค่า~" : "press the mic when you're ready~";
    }
    if (liveUiState === "connecting") return uiLang === "th" ? "กำลังเชื่อมต่อค่า..." : "connecting...";
    if (liveUiState === "listening") return uiLang === "th" ? "กำลังฟังค่า..." : "I'm listening...";
    if (liveUiState === "speaking") return uiLang === "th" ? "หนูกำลังพูดค่า..." : "Miomi is talking...";
    if (liveUiState === "error") return uiLang === "th" ? "ลองอีกครั้งนะคะ~" : "tap to try again~";
    return "";
  })();

  const micStateForDebug = liveUiState === "connecting" ? "processing" : liveUiState === "listening" ? "listening" : liveUiState === "speaking" ? "speaking" : "idle";

  return (
    <TalkErrorBoundary>
    <div
      onPointerDown={handlePointerDown}
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
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
        <Link href="/home" aria-label="Back" style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3D352B", textDecoration: "none" }}>
          <ArrowLeft size={22} strokeWidth={2} />
        </Link>

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

      <PersistentMiomi
        mood={miomiMood}
        uiLang={uiLang}
        subtitleTh={items.length <= 1 ? "หนูพร้อมแล้วค่า~" : undefined}
        subtitleEn={items.length <= 1 ? "I'm ready~" : undefined}
      />

      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Toolbox
          length={respLength}
          lang={conversationLang}
          keyboardMode={keyboardMode}
          uiLang={uiLang}
          onCycleLength={() => setRespLength((p) => (p === "short" ? "normal" : p === "normal" ? "detailed" : "short"))}
          onCycleLang={handleCycleLang}
          onToggleKeyboard={() => setKeyboardMode((p) => !p)}
        />
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "8px 14px 0",
            paddingRight: "52px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "stretch",
              gap: "12px",
              minHeight: "min-content",
            }}
          >
          {items.map((item) => {
            if (item.kind === "mini_cat") {
              return <MiniCatRow key={item.id} textTh={item.textTh} textEn={item.textEn} uiLang={uiLang} />;
            }
            if (item.kind === "user_said") {
              const fullText = item.text;
              const isLong = fullText.length > TRANSCRIPT_CLIP;
              const isExpanded = expandedItems.has(item.id);
              const display = !isLong || isExpanded ? fullText : fullText.slice(0, TRANSCRIPT_CLIP) + "…";
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "flex-end", alignSelf: "stretch", flexShrink: 0 }}>
                  <div style={{ maxWidth: "78%", background: "linear-gradient(135deg, rgba(232,199,122,0.16) 0%, rgba(232,199,122,0.06) 100%)", border: "0.5px solid rgba(232,199,122,0.3)", borderRadius: "18px 4px 18px 18px", padding: "11px 14px" }}>
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

      {keyboardMode && (
        <div style={{ flexShrink: 0, padding: "6px 12px 4px", background: "transparent" }}>
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
              <button type="button" onClick={handleSendText} aria-label="Send" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {!audioUnlocked && items.length <= 1 && (
          <p
            style={{
              margin: "0 0 4px",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#C9A96E",
              opacity: 0.85,
            }}
          >
            {uiLang === "th" ? "แตะที่ไหนก็ได้เพื่อเริ่มค่า~" : "tap anywhere to begin~"}
          </p>
        )}
        <MicRow
          current={config.mode}
          orbState={orbState}
          uiLang={uiLang}
          onModeChange={(m) => {
            const next = { ...config, mode: m };
            setConfig(next);
            saveTalkConfig(next);
          }}
          onOrbTap={handleOrbTap}
          orbAriaLabel={
            isLocked
              ? uiLang === "en" ? "Sign in to keep talking" : "สมัครเพื่อพูดคุยต่อ"
              : orbState === "listening"
                ? uiLang === "en" ? "Stop listening" : "หยุดฟัง"
                : awaitingMic
                  ? uiLang === "en" ? "Press mic to speak" : "กดไมค์เพื่อพูด"
                  : uiLang === "en" ? "Tap to talk with Miomi" : "แตะเพื่อพูดกับหนู"
          }
        />
        {stateLabel ? (
          <p
            style={{
              margin: "2px 0 0",
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "12px",
              color: "#C9A96E",
              opacity: 0.7,
            }}
          >
            {stateLabel}
          </p>
        ) : null}
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
        onSave={(c) => { setConfig(c); saveTalkConfig(c); setAdjustOpen(false); }}
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
              <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "56px", borderRadius: "999px", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", fontFamily: "'Kanit', sans-serif", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", textDecoration: "none", boxShadow: "0 6px 20px -4px rgba(201,169,110,0.45)" }}>
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
