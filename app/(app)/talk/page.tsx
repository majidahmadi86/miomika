"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { updateUiLanguage, useProfile } from "@/lib/auth/use-profile";
import { MicButton, type MicState, type MicButtonHandle } from "@/components/talk/MicButton";
import { FuelPill } from "@/components/talk/FuelPill";
import { type OrbState } from "@/components/talk/VoiceOrb";
import { PersistentMiomi, type MiomiMood } from "@/components/talk/PersistentMiomi";
import { MicRow } from "@/components/talk/MicRow";
import { Toolbox, type ResponseLength } from "@/components/talk/Toolbox";
import { MiniCatRow } from "@/components/talk/MiniCatRow";
import { PracticeCard } from "@/components/talk/PracticeCard";
import { AdjustSheet } from "@/components/talk/AdjustSheet";
import { type VocabularyEntry } from "@/components/talk/WordCardV3";
import { type TalkConfig, loadTalkConfig, saveTalkConfig, DEFAULT_TALK_CONFIG } from "@/lib/talk/modes";
import { speak, stopTts, preloadTtsVoices, subscribeSpeaking, type TtsLang } from "@/lib/voice/tts";
import { isLikelyHallucination } from "@/lib/voice/hallucination";
import { pickIceBreaker, pickMasteryCelebration } from "@/lib/voice/warmth";
import { logEvent } from "@/lib/debug/event-bus";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { TalkErrorBoundary } from "@/components/error/TalkErrorBoundary";

type IntroducedWordPayload = {
  word: string;
  word_th: string;
  word_en: string;
  cefr_level: string | null;
  emoji: string | null;
  mastery_level?: number;
};

type MasteryEventPayload = {
  type: "introduced" | "advanced" | "mastered" | "none";
  word?: string;
  newStage?: number;
} | null;

type MiomiApiResponse = {
  content?: string;
  servedVia?: string;
  replyLanguage?: TtsLang;
  wordCard?: IntroducedWordPayload | null;
  masteryEvent?: MasteryEventPayload;
};

type CanvasItem =
  | { id: string; kind: "mini_cat"; textTh: string; textEn: string }
  | { id: string; kind: "practice"; word: VocabularyEntry; position: number; total: number; topic?: string }
  | { id: string; kind: "user_said"; text: string };

const GUEST_LIMIT = 5;
const GUEST_COUNTER_KEY = "miomika.guest_exchanges";
const TRANSCRIPT_CLIP = 180;
const TURN_PLAYBACK_TIMEOUT_MS = 12_000;
/** Skip thinking cue if reply TTS is ready within this window after VAD speech-end. */
const THINKING_CUE_DELAY_MS = 250;

type TurnTiming = {
  t0: number;
  t1?: number;
  t2?: number;
  t3?: number;
  t5?: number;
  asrServedBy?: string;
  voiceTurn: boolean;
  logged: boolean;
};

function msBetween(from: number, to: number): number {
  return Math.round(to - from);
}

function logTurnTimingLine(t: TurnTiming): void {
  if (t.logged || t.t1 == null || t.t2 == null) return;
  const end = t.t5 ?? t.t2;
  const asr = msBetween(t.t0, t.t1);
  const llm = msBetween(t.t1, t.t2);
  const tts = t.t5 != null ? msBetween(t.t2, t.t5) : null;
  const total = msBetween(t.t0, end);
  const ttfs =
    t.voiceTurn && t.t5 != null ? msBetween(t.t0, t.t5) : null;
  const ttsPart = tts != null ? `TTS=${tts}ms` : "TTS=n/a";
  const ttfsPart = ttfs != null ? `TTFS=${ttfs}ms` : "TTFS=n/a";
  const asrBackend = t.asrServedBy ?? (t.voiceTurn ? "unknown" : "keyboard");
  const line = `[turn-timing] ASR=${asr}ms LLM=${llm}ms ${ttsPart} ${ttfsPart} TOTAL=${total}ms asr=${asrBackend}`;
  console.log(line);
  logEvent({
    kind: "state",
    level: "info",
    message: "turn timing",
    data: { ASR: asr, LLM: llm, TTS: tts, TTFS: ttfs, TOTAL: total, asr: asrBackend },
  });
  t.logged = true;
}

const MIOMI_TTS_NAME: Record<TtsLang, string> = {
  en: "Mee-oh-mee",
  th: "มิโอมิ",
};

function stripForTts(text: string, lang: TtsLang): string {
  let out = text
    .replace(/มิโอมิ/g, MIOMI_TTS_NAME[lang])
    .replace(/miomi/gi, MIOMI_TTS_NAME[lang])
    // Meta is for the eyes, never the voice: stage directions, glosses, romanization.
    // Remove the CONTENT, not just the brackets.
    .replace(/[([{][^)\]}]*[)\]}]/g, " ")
    .replace(/\*[^*\n]+\*/g, " ")
    .replace(/_[^_\n]+_/g, " ")
    .replace(/["“”«»„‟‹›]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[~*_`#|<>^=+/\\]/g, " ")
    .replace(/(\p{L})-(\p{L})/gu, "$1 $2")
    .replace(/[-–—]/g, " ")
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // TTS-only polish — never applied to on-screen text or model input
  out = out
    .replace(
      /\b([\p{Script=Latin}]{1,3})\b(?:[\s,]+\b([\p{Script=Latin}]{1,3})\b)+/giu,
      (segment) => {
        const parts = segment.match(/\b[\p{Script=Latin}]{1,3}\b/giu) ?? [];
        if (parts.length < 3) return segment;
        const first = parts[0];
        if (!first) return segment;
        const key = first.toLowerCase();
        if (parts.every((p) => p.toLowerCase() === key)) return key;
        return segment;
      },
    )
    .replace(/([\p{Script=Latin}])\1{2,}/giu, "$1")
    .replace(/\.{2,}/g, ", ")
    .replace(/\s+[-–—]\s+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\s:;!?\-–—]+|[,.\s:;!?\-–—]+$/g, "")
    .trim();

  return out;
}

// Spoken language follows Miomi's OWN reply (her output script), not the transcript.
// Output-based detection is reliable — this is NOT the transcript detection removed in 120eeeb.
function detectSpokenLangFromReply(text: string, fallback: TtsLang): TtsLang {
  const thai = (text.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (thai > latin) return "th";
  if (latin > thai) return "en";
  return fallback;
}

function readGuestExchanges(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return !isNaN(parsed) && parsed > 0 ? parsed : 0;
}

function readUiLang(): "th" | "en" {
  if (typeof window === "undefined") return "th";
  const lang = navigator.language || "th";
  return lang.startsWith("en") ? "en" : "th";
}

function replyLangFromSetting(
  profileLang: "th" | "en" | null | undefined,
  fallback: "th" | "en",
): TtsLang {
  return profileLang === "en" || profileLang === "th" ? profileLang : fallback;
}

function toVocabularyEntry(word: IntroducedWordPayload): VocabularyEntry {
  return {
    id: word.word_en,
    word_en: word.word_en,
    word_th: word.word_th,
    cefr_level: word.cefr_level ?? undefined,
    emoji: word.emoji ?? undefined,
  };
}

function makeOpenerItem(): CanvasItem {
  const iceBreaker = pickIceBreaker();
  return { id: crypto.randomUUID(), kind: "mini_cat", textTh: iceBreaker.th, textEn: iceBreaker.en };
}

export default function TalkPage() {
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();

  const [config, setConfig] = useState<TalkConfig>(() =>
    typeof window !== "undefined" ? loadTalkConfig() : DEFAULT_TALK_CONFIG,
  );
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [uiLang, setUiLang] = useState<"th" | "en">(readUiLang);
  const [micState, setMicState] = useState<MicState>("idle");
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [textInput, setTextInput] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [wordsIntroduced, setWordsIntroduced] = useState<string[]>([]);
  const [respLength, setRespLength] = useState<ResponseLength>("normal");
  const [ttsOn, setTtsOn] = useState(true);
  const conversationLangRef = useRef<TtsLang>("th");
  const [conversationLang, setConversationLang] = useState<TtsLang>("th");
  const [guestExchangesRaw, setGuestExchangesRaw] = useState(readGuestExchanges);
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [masteryToast, setMasteryToast] = useState<{ th: string; en: string } | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const micRef = useRef<MicButtonHandle>(null);
  const mountedRefForTts = useRef(true);
  const openerSpokenRef = useRef(false);
  const transcriptBufferRef = useRef<string>("");
  const transcriptTimerRef = useRef<number | null>(null);
  const prevMicStateRef = useRef<MicState>("idle");
  const titleTapsRef = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const [debugOpen, setDebugOpen] = useState(false);
  const isSpeakingRef = useRef(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const turnTimingRef = useRef<TurnTiming | null>(null);
  const turnInFlightRef = useRef(false);
  const turnGenRef = useRef(0);
  const turnWatchdogRef = useRef<number | null>(null);
  const engineAbortRef = useRef<AbortController | null>(null);
  const micSessionRef = useRef(false);
  const micStateRef = useRef<MicState>(micState);
  const turnAckTimerRef = useRef<number | null>(null);
  const turnAckReplyReadyRef = useRef(false);
  const turnAckCueRef = useRef<Promise<boolean> | null>(null);
  const pendingSpeakAfterAckRef = useRef<(() => void) | null>(null);

  const cancelVoiceTurnAck = useCallback(() => {
    if (turnAckTimerRef.current != null) {
      window.clearTimeout(turnAckTimerRef.current);
      turnAckTimerRef.current = null;
    }
    turnAckReplyReadyRef.current = false;
    turnAckCueRef.current = null;
    pendingSpeakAfterAckRef.current = null;
  }, []);

  const scheduleVoiceTurnAck = useCallback(
    (turnGen: number) => {
      cancelVoiceTurnAck();
      if (!ttsOn) return;
      turnAckTimerRef.current = window.setTimeout(() => {
        turnAckTimerRef.current = null;
        if (turnGen !== turnGenRef.current) return;
        if (turnAckReplyReadyRef.current) return;
        const lang = conversationLangRef.current;
        const cuePromise = import("@/lib/voice/cues").then((m) => m.playThinkingCue(lang));
        turnAckCueRef.current = cuePromise;
        logEvent({ kind: "tts", level: "info", message: "thinking cue play" });
        void cuePromise.then(() => {
          const pending = pendingSpeakAfterAckRef.current;
          if (pending) {
            pendingSpeakAfterAckRef.current = null;
            pending();
          }
        });
      }, THINKING_CUE_DELAY_MS);
    },
    [cancelVoiceTurnAck, ttsOn],
  );

  const enqueueReplyTts = useCallback((runSpeak: () => void) => {
    turnAckReplyReadyRef.current = true;
    if (turnAckTimerRef.current != null) {
      window.clearTimeout(turnAckTimerRef.current);
      turnAckTimerRef.current = null;
    }
    const cue = turnAckCueRef.current;
    if (cue) {
      pendingSpeakAfterAckRef.current = runSpeak;
      void cue.then(() => {
        if (pendingSpeakAfterAckRef.current === runSpeak) {
          pendingSpeakAfterAckRef.current = null;
          runSpeak();
        }
      });
      return;
    }
    runSpeak();
  }, []);

  const clearTurnWatchdog = useCallback(() => {
    if (turnWatchdogRef.current != null) {
      window.clearTimeout(turnWatchdogRef.current);
      turnWatchdogRef.current = null;
    }
  }, []);

  const recoverFromTurn = useCallback(
    (opts?: { playSorryCue?: boolean; reason?: string }) => {
      cancelVoiceTurnAck();
      clearTurnWatchdog();
      turnInFlightRef.current = false;
      turnTimingRef.current = null;
      engineAbortRef.current?.abort();
      engineAbortRef.current = null;
      stopTts();
      transcriptBufferRef.current = "";
      if (transcriptTimerRef.current != null) {
        window.clearTimeout(transcriptTimerRef.current);
        transcriptTimerRef.current = null;
      }
      if (opts?.reason) {
        logEvent({
          kind: "state",
          level: "warn",
          message: "turn recovered",
          data: { reason: opts.reason },
        });
      }
      if (opts?.playSorryCue) {
        void import("@/lib/voice/cues").then((m) => m.cueSorry()).catch(() => {});
      }
      if (micSessionRef.current) {
        setMicState("listening");
      } else {
        setMicState("idle");
      }
    },
    [clearTurnWatchdog, cancelVoiceTurnAck],
  );

  const armTurnWatchdog = useCallback(() => {
    clearTurnWatchdog();
    turnWatchdogRef.current = window.setTimeout(() => {
      recoverFromTurn({ playSorryCue: true, reason: "watchdog" });
    }, TURN_PLAYBACK_TIMEOUT_MS);
  }, [clearTurnWatchdog, recoverFromTurn]);

  const finishTurn = useCallback(() => {
    cancelVoiceTurnAck();
    clearTurnWatchdog();
    turnInFlightRef.current = false;
    turnTimingRef.current = null;
    if (micSessionRef.current) {
      setMicState("listening");
    } else {
      setMicState("idle");
    }
  }, [clearTurnWatchdog, cancelVoiceTurnAck]);

  useEffect(() => {
    micStateRef.current = micState;
  }, [micState]);

  useEffect(() => {
    const prev = prevMicStateRef.current;
    if (
      prev === "processing" &&
      micState === "idle" &&
      turnInFlightRef.current &&
      micSessionRef.current
    ) {
      recoverFromTurn({ playSorryCue: true, reason: "transcribe-abort" });
    }
  }, [micState, recoverFromTurn]);

  useEffect(() => {
    mountedRefForTts.current = true;
    return () => {
      mountedRefForTts.current = false;
      clearTurnWatchdog();
      stopTts();
    };
  }, [clearTurnWatchdog]);

  useEffect(() => {
    const unsub = subscribeSpeaking((speaking: boolean) => {
      isSpeakingRef.current = speaking;
      setIsSpeakingState(speaking);
      logEvent({ kind: "tts", level: "info", message: speaking ? "audio started" : "audio ended" });
      if (speaking) {
        clearTurnWatchdog();
        const t = turnTimingRef.current;
        if (t && !t.logged && t.t5 == null) {
          t.t5 = performance.now();
          logTurnTimingLine(t);
        }
      }
    });
    return () => unsub();
  }, [clearTurnWatchdog]);

  const updateConversationLang = useCallback((lang: TtsLang) => {
    conversationLangRef.current = lang;
    setConversationLang(lang);
  }, []);

  const handleCycleLang = useCallback(() => {
    const current = replyLangFromSetting(profile?.ui_language, uiLang);
    const next: TtsLang = current === "th" ? "en" : "th";
    updateConversationLang(next);
    setUiLang(next);
    void updateUiLanguage(next);
  }, [profile?.ui_language, uiLang, updateConversationLang]);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate localStorage + navigator prefs on mount */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setConfig(loadTalkConfig());
    const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    if (!isNaN(parsed) && parsed > 0) setGuestExchangesRaw(parsed);
    const navLang = navigator.language || "th";
    const isEnglishUser = navLang.startsWith("en");
    if (isEnglishUser) setUiLang("en");
    updateConversationLang(isEnglishUser ? "en" : "th");
    const ttsStored = window.localStorage.getItem("miomika.tts_on");
    if (ttsStored !== null) setTtsOn(ttsStored === "1");
    void preloadTtsVoices();
  }, [updateConversationLang]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!profile?.ui_language) return;
    const lang = profile.ui_language;
    queueMicrotask(() => {
      updateConversationLang(lang);
      setUiLang(lang);
    });
  }, [profile?.ui_language, updateConversationLang]);

  useEffect(() => {
    if (prevMicStateRef.current !== micState) {
      logEvent({
        kind: "state",
        level: "info",
        message: `micState → ${micState}`,
        data: { prev: prevMicStateRef.current },
      });
      prevMicStateRef.current = micState;
    }
  }, [micState]);

  useEffect(() => {
    if (micState === "listening") {
      import("@/lib/voice/cues").then((m) => m.cueListening()).catch(() => {});
    }
  }, [micState]);

  useEffect(() => {
    if (!ttsOn) return;
    void import("@/lib/voice/cues")
      .then((m) => m.preloadThinkingCues(conversationLang))
      .catch(() => {});
  }, [ttsOn, conversationLang]);

  const handleTitleTap = useCallback(() => {
    const now = Date.now();
    const taps = titleTapsRef.current;
    if (now - taps.last > 1500) {
      taps.count = 1;
    } else {
      taps.count += 1;
    }
    taps.last = now;
    if (taps.count >= 3) {
      taps.count = 0;
      setDebugOpen(true);
    }
  }, []);

  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    try {
      new Audio().play().catch(() => {});
    } catch {
      /* ignore */
    }
  }, [audioUnlocked]);

  /* eslint-disable react-hooks/set-state-in-effect -- session ice-breaker on fresh /talk open */
  useEffect(() => {
    if (items.length > 0 || !authReady) return;
    const iceBreaker = pickIceBreaker();
    const openerLang: TtsLang =
      profile?.ui_language === "en" || profile?.ui_language === "th"
        ? profile.ui_language
        : uiLang;
    updateConversationLang(openerLang);
    setItems([{ id: crypto.randomUUID(), kind: "mini_cat", textTh: iceBreaker.th, textEn: iceBreaker.en }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, authReady, profile?.ui_language, uiLang]);

  useEffect(() => {
    if (!ttsOn || items.length !== 1 || openerSpokenRef.current || !authReady) return;
    const first = items[0];
    if (first?.kind !== "mini_cat") return;
    openerSpokenRef.current = true;
    const openerLang: TtsLang =
      profile?.ui_language === "en" || profile?.ui_language === "th"
        ? profile.ui_language
        : uiLang;
    const speakText = openerLang === "th" ? first.textTh : first.textEn;
    window.setTimeout(() => {
      if (!mountedRefForTts.current) return;
      logEvent({ kind: "tts", level: "info", message: "speak called (opener)", data: { lang: openerLang, len: speakText.length } });
      setMicState("speaking");
      void speak(stripForTts(speakText, openerLang), openerLang, {
        onEnd: () => { if (mountedRefForTts.current) setMicState("idle"); },
        onError: () => { if (mountedRefForTts.current) setMicState("idle"); },
      });
    }, 800);
  }, [ttsOn, items, authReady, profile?.ui_language, uiLang]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- guest counter reset + auto-raise CTA on limit */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authReady && !isGuest) {
      window.localStorage.removeItem(GUEST_COUNTER_KEY);
      setGuestExchangesRaw(0);
    }
  }, [authReady, isGuest]);

  const guestExchanges = authReady && !isGuest ? 0 : guestExchangesRaw;

  // Auto-raise the guest CTA sheet the instant the limit is hit.
  useEffect(() => {
    if (authReady && isGuest && guestExchanges >= GUEST_LIMIT) {
      micRef.current?.stop();
      micSessionRef.current = false;
      recoverFromTurn({ reason: "guest-limit" });
      setShowGuestSheet(true);
    }
  }, [authReady, isGuest, guestExchanges, recoverFromTurn]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setGuestExchanges = useCallback((updater: number | ((p: number) => number)) => {
    setGuestExchangesRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") window.localStorage.setItem(GUEST_COUNTER_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTo({ top: canvasRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [items]);

  const isLocked = authReady && isGuest && guestExchanges >= GUEST_LIMIT;

  const orbState: OrbState = (() => {
    if (isLocked) return "locked";
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const miomiMood: MiomiMood = (() => {
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const fuelHeart = ((profile as { mood?: number } | null)?.mood ?? 0.82) * 100;
  const fuelZap = 64;
  const fuelBrain = 45;

  const isTurnInFlight = useCallback(
    () =>
      turnInFlightRef.current ||
      micStateRef.current === "processing" ||
      micStateRef.current === "speaking" ||
      isSpeakingRef.current,
    [],
  );

  const handleVadSpeechEnd = useCallback((): boolean => {
    if (
      turnInFlightRef.current ||
      micStateRef.current === "processing" ||
      micStateRef.current === "speaking"
    ) {
      logEvent({
        kind: "vad",
        level: "warn",
        message: "dropped speech-end (turn in flight)",
        data: { micState: micStateRef.current },
      });
      return false;
    }
    turnGenRef.current += 1;
    turnInFlightRef.current = true;
    turnTimingRef.current = {
      t0: performance.now(),
      voiceTurn: true,
      logged: false,
    };
    armTurnWatchdog();
    scheduleVoiceTurnAck(turnGenRef.current);
    return true;
  }, [armTurnWatchdog, scheduleVoiceTurnAck]);

  const handleTranscribeReceived = useCallback((meta: { servedBy: string }) => {
    const t = turnTimingRef.current;
    if (!t || t.logged) return;
    t.t1 = performance.now();
    t.asrServedBy = meta.servedBy;
  }, []);

  const processInput = useCallback(
    async (text: string) => {
      if (!authReady) return;
      if (isLocked) {
        micRef.current?.stop();
        micSessionRef.current = false;
        finishTurn();
        setShowGuestSheet(true);
        return;
      }
      if (!text.trim()) return;

      const trimmed = text.trim();
      const turnGen = turnGenRef.current;
      const voiceTurn = turnTimingRef.current?.voiceTurn ?? false;

      if (!voiceTurn && isTurnInFlight()) {
        logEvent({
          kind: "state",
          level: "warn",
          message: "dropped processInput (turn in flight)",
        });
        return;
      }

      if (!voiceTurn) {
        turnInFlightRef.current = true;
        turnTimingRef.current = {
          t0: performance.now(),
          t1: performance.now(),
          voiceTurn: false,
          asrServedBy: "keyboard",
          logged: false,
        };
        armTurnWatchdog();
      }

      setItems((prev) => [...prev, { id: crypto.randomUUID(), kind: "user_said", text: trimmed }]);
      setTextInput("");

      if (isGuest) setGuestExchanges((p) => p + 1);

      try {
        if (turnGen !== turnGenRef.current) return;
        logEvent({
          kind: "engine",
          level: "info",
          message: "sending to engine",
          data: { input: trimmed.slice(0, 80), mode: config.mode },
        });
        const engineCtrl = new AbortController();
        engineAbortRef.current = engineCtrl;
        const engineTimeout = window.setTimeout(() => engineCtrl.abort(), 12000);
        let res: Response;
        try {
          res = await fetch("/api/miomi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: engineCtrl.signal,
            body: JSON.stringify({
            mode: config.mode,
            messages: [{ role: "user", content: trimmed }],
            sessionInstruction: (() => {
              const lengthRule = respLength === "short" ? "Under 25 words." : respLength === "detailed" ? "60-100 words, thorough." : "Under 50 words.";
              const levelRule = "CRITICAL: Mirror the user's language level. Look at the complexity, vocabulary, and sentence length of their LAST message. If they used simple words and short sentences, reply with simple words and short sentences. If they used advanced vocabulary, you can match it. Never speak above their level. Beginners get short, warm, easy replies — like a kind friend, not a textbook.";
              const modeRule = config.mode === "teach" ? `You are in Teach mode. The user is learning ${config.teach.learning === "th" ? "Thai" : "English"} at ${config.teach.level} level.` : config.mode === "social" ? `You are in Social mode. ${config.social.channel ? `Channel: ${config.social.channel}.` : ""} ${config.social.niche ? `Niche: ${config.social.niche}.` : ""}` : config.mode === "translate" ? "You are in Translator mode. Always provide translations with romanization." : config.mode === "chat" ? "You are in Just-chat mode. Be warm, present, brief, no teaching." : "Auto mode. Detect what the user needs and respond accordingly.";
              return `You are Miomi, a warm kawaii cat companion. ${modeRule} ${levelRule} ${lengthRule} Always end with one question or invitation.`;
            })(),
            sessionContext: { exchangeNumber: items.filter((i) => i.kind === "user_said").length, wordsIntroduced },
          }),
          });
        } finally {
          window.clearTimeout(engineTimeout);
          if (engineAbortRef.current === engineCtrl) engineAbortRef.current = null;
        }
        if (turnGen !== turnGenRef.current) return;
        if (!res.ok) throw new Error("api failed");
        const data = (await res.json()) as MiomiApiResponse;
        {
          const t = turnTimingRef.current;
          if (t && !t.logged) t.t2 = performance.now();
        }
        logEvent({
          kind: "engine",
          level: "info",
          message: "engine reply",
          data: {
            servedVia: data.servedVia,
            wordCard: !!data.wordCard,
            masteryEvent: data.masteryEvent?.type,
          },
        });
        const settingLang = replyLangFromSetting(profile?.ui_language, uiLang);
        const replyLang = detectSpokenLangFromReply(data.content ?? "", settingLang);

        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            kind: "mini_cat",
            textTh: replyLang === "th" ? (data.content ?? "") : "",
            textEn: replyLang === "en" ? (data.content ?? "") : "",
          },
        ]);

        const mastery = data.masteryEvent;

        if (mastery?.type === "mastered" && mastery.word) {
          void import("@/lib/celebration/burst")
            .then(({ triggerCelebration }) => {
              triggerCelebration({
                intensity: "high",
                miomi_state: "excited",
                duration_ms: 1400,
              });
            })
            .catch(() => {});
          setMasteryToast({
            th: `${pickMasteryCelebration(mastery.word, "th")} +5 ✦`,
            en: `${pickMasteryCelebration(mastery.word, "en")} +5 ✦`,
          });
          window.setTimeout(() => {
            if (mountedRefForTts.current) setMasteryToast(null);
          }, 3200);
        }

        const wordCard = data.wordCard;
        if (
          wordCard &&
          typeof wordCard.word_en === "string" &&
          typeof wordCard.word_th === "string"
        ) {
          const position = wordCard.mastery_level ?? 1;
          const practiceItem: CanvasItem = {
            id: crypto.randomUUID(),
            kind: "practice",
            word: toVocabularyEntry(wordCard),
            position,
            total: 3,
          };
          window.setTimeout(() => {
            if (!mountedRefForTts.current) return;
            setItems((prev) => [...prev, practiceItem]);
            setWordsIntroduced((prev) =>
              prev.includes(wordCard.word_en) ? prev : [...prev, wordCard.word_en],
            );
          }, 600);
        }

        const speakText = data.content ?? "";
        if (ttsOn && speakText.trim()) {
          const runSpeak = () => {
            setMicState("speaking");
            {
              const t = turnTimingRef.current;
              if (t && !t.logged) t.t3 = performance.now();
            }
            logEvent({
              kind: "tts",
              level: "info",
              message: "speak called",
              data: { lang: replyLang, len: speakText.length },
            });
            void speak(stripForTts(speakText, replyLang), replyLang, {
              onEnd: () => {
                if (!mountedRefForTts.current) return;
                const t = turnTimingRef.current;
                if (t && !t.logged) logTurnTimingLine(t);
                finishTurn();
              },
              onError: () => {
                if (!mountedRefForTts.current) return;
                const t = turnTimingRef.current;
                if (t && !t.logged) logTurnTimingLine(t);
                recoverFromTurn({ reason: "tts-error", playSorryCue: true });
              },
            });
          };
          if (voiceTurn) {
            enqueueReplyTts(runSpeak);
          } else {
            runSpeak();
          }
        } else {
          const t = turnTimingRef.current;
          if (t && !t.logged) logTurnTimingLine(t);
          finishTurn();
        }
        if (data.servedVia === "guest_limit") {
          setShowGuestSheet(true);
        } else if (isGuest && guestExchanges + 1 >= GUEST_LIMIT) {
          window.setTimeout(() => setShowGuestSheet(true), 800);
        }
      } catch (e) {
        if (turnGen !== turnGenRef.current) return;
        logEvent({
          kind: "engine",
          level: "error",
          message: "engine failed",
          data: { error: String(e) },
        });
        setItems((prev) => [
          ...prev,
          { id: crypto.randomUUID(), kind: "mini_cat", textTh: "หนูขอโทษค่า~ มีบางอย่างผิดพลาด", textEn: "Sorry~ something went wrong." },
        ]);
        recoverFromTurn({ reason: "engine", playSorryCue: true });
      }
    },
    [
      authReady,
      isLocked,
      isGuest,
      guestExchanges,
      wordsIntroduced,
      items,
      setGuestExchanges,
      config,
      respLength,
      ttsOn,
      profile?.ui_language,
      uiLang,
      isTurnInFlight,
      armTurnWatchdog,
      finishTurn,
      recoverFromTurn,
      enqueueReplyTts,
    ],
  );

  const flushBuffer = useCallback(() => {
    const scheduledGen = turnGenRef.current;
    const text = transcriptBufferRef.current;
    transcriptBufferRef.current = "";
    transcriptTimerRef.current = null;
    if (!text.trim()) {
      recoverFromTurn({ reason: "empty-transcript" });
      return;
    }
    if (scheduledGen !== turnGenRef.current) return;
    void processInput(text);
  }, [processInput, recoverFromTurn]);

  const handleMicTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!isFinal) return;
      if (isLocked) {
        micRef.current?.stop();
        micSessionRef.current = false;
        recoverFromTurn();
        setShowGuestSheet(true);
        return;
      }
      // Echo from Miomi's reply audio — drop (no barge-in). Never drop this turn's
      // own in-flight transcript while still processing (thinking cue may overlap ASR).
      const isReplyEcho =
        micStateRef.current === "speaking" ||
        (isSpeakingRef.current &&
          !(turnInFlightRef.current && micStateRef.current === "processing"));
      if (isReplyEcho) {
        logEvent({ kind: "transcribe", level: "warn", message: "dropped echo (speaking)", data: { text } });
        recoverFromTurn({ reason: "echo" });
        return;
      }
      if (!turnInFlightRef.current) {
        logEvent({ kind: "transcribe", level: "warn", message: "dropped transcript (no turn)", data: { text } });
        return;
      }
      logEvent({
        kind: "mic",
        level: "info",
        message: "transcript received",
        data: { text, len: text.length, lang: conversationLangRef.current },
      });
      if (isLikelyHallucination(text, profile?.ui_language ?? "en", false)) {
        logEvent({ kind: "transcribe", level: "warn", message: "dropped hallucination", data: { text } });
        recoverFromTurn({ reason: "hallucination" });
        return;
      }
      if (transcriptBufferRef.current) {
        transcriptBufferRef.current += ", " + text.trim();
      } else {
        transcriptBufferRef.current = text.trim();
      }
      if (transcriptTimerRef.current) window.clearTimeout(transcriptTimerRef.current);
      const scheduledGen = turnGenRef.current;
      transcriptTimerRef.current = window.setTimeout(() => {
        if (scheduledGen !== turnGenRef.current) return;
        flushBuffer();
      }, 600);
    },
    [isLocked, flushBuffer, profile?.ui_language, recoverFromTurn],
  );

  const stateLabel = (() => {
    if (!audioUnlocked) return uiLang === "th" ? "แตะเพื่อเริ่มค่า~" : "tap anywhere to begin~";
    if (micState === "listening") return uiLang === "th" ? "กำลังฟังค่า..." : "I'm listening...";
    if (micState === "processing") return uiLang === "th" ? "กำลังคิดค่า..." : "thinking...";
    if (micState === "speaking") return uiLang === "th" ? "หนูกำลังพูดค่า..." : "Miomi is talking...";
    return "";
  })();

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

  const handleOrbTap = useCallback(() => {
    if (isLocked) { setShowGuestSheet(true); return; }
    if (micState === "speaking" || micState === "processing" || micState === "listening") {
      stopTts();
      micRef.current?.stop();
      micSessionRef.current = false;
      turnGenRef.current += 1;
      recoverFromTurn({ reason: "user-stop" });
      return;
    }
    micSessionRef.current = true;
    micRef.current?.start();
  }, [micState, isLocked, recoverFromTurn]);

  return (
    <TalkErrorBoundary>
    <div
      onPointerDown={unlockAudio}
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
        style={{
          height: "54px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          paddingTop: "calc(env(safe-area-inset-top, 0px))",
          background: "transparent",
        }}
      >
        <Link href="/home" aria-label="Back" style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3D352B", textDecoration: "none" }}>
          <ArrowLeft size={22} strokeWidth={2} />
        </Link>

        <div onClick={handleTitleTap} style={{ cursor: "default" }}>
          {authReady && isGuest ? (
            <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, color: "#9A8B73", background: "transparent", padding: "5px 12px" }}>
              {uiLang === "en" ? `${Math.max(0, GUEST_LIMIT - guestExchanges)} left` : `เหลืออีก ${Math.max(0, GUEST_LIMIT - guestExchanges)} ครั้ง`}
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
          ttsOn={ttsOn}
          keyboardMode={keyboardMode}
          uiLang={uiLang}
          onCycleLength={() => setRespLength((p) => (p === "short" ? "normal" : p === "normal" ? "detailed" : "short"))}
          onCycleLang={handleCycleLang}
          onToggleTts={() => {
            setTtsOn((p) => {
              const next = !p;
              if (typeof window !== "undefined") window.localStorage.setItem("miomika.tts_on", next ? "1" : "0");
              if (!next) stopTts();
              return next;
            });
          }}
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
            display: "flex",
            flexDirection: "column",
            gap: "12px",
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
                <div key={item.id} style={{ display: "flex", justifyContent: "flex-end" }}>
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
            if (item.kind === "practice") {
              return (
                <PracticeCard
                  key={item.id}
                  word={item.word}
                  position={item.position}
                  total={item.total}
                  topic={item.topic}
                  uiLang={uiLang}
                  onHear={() => { /* TTS */ }}
                  onSpeak={() => micRef.current?.start()}
                  onCopy={() => { void navigator.clipboard.writeText(item.word.word_th); }}
                  onNext={() => { /* engine */ }}
                />
              );
            }
            return null;
          })}
          <div style={{ height: "8px" }} />
        </div>
      </div>

      {/* HIDDEN MicButton drives VAD pipeline; UI is the orb inside MicRow */}
      <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
        <MicButton
          ref={micRef}
          state={micState}
          speakingActive={isSpeakingState || micState === "speaking" || micState === "processing"}
          language={profile?.ui_language === "th" ? "th" : profile?.ui_language === "en" ? "en" : "auto"}
          onVadSpeechEnd={handleVadSpeechEnd}
          onTranscribeReceived={handleTranscribeReceived}
          onTranscript={handleMicTranscript}
          onStateChange={setMicState}
          locked={isLocked}
          onLockedTap={() => setShowGuestSheet(true)}
        />
      </div>

      {/* MicRow ALWAYS visible. Keyboard mode just adds the input above it. */}
      {keyboardMode && (
        <div style={{ flexShrink: 0, padding: "6px 12px 4px", background: "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", border: "0.5px solid #EDE8E0", borderRadius: "26px", padding: "5px 5px 5px 16px", boxShadow: "0 2px 10px rgba(26,26,24,0.04)" }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  void processInput(textInput);
                }
              }}
              placeholder={uiLang === "en" ? "Message Miomi~" : "พิมพ์ถึงหนู~"}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'Kanit', sans-serif", fontSize: "13.5px", color: "#1A1A18", padding: "8px 0" }}
            />
            <button type="button" onClick={() => { /* placeholder attach */ }} aria-label="Attach" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "none", color: "#9A8B73", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
              <Plus size={17} strokeWidth={2} />
            </button>
            {textInput.trim() && (
              <button type="button" onClick={() => void processInput(textInput)} aria-label="Send" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
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
          orbAriaLabel={orbState === "listening" ? (uiLang === "en" ? "Stop listening" : "หยุดฟัง") : (uiLang === "en" ? "Tap to talk with Miomi" : "แตะเพื่อพูดกับหนู")}
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
        onMiomiHelp={(topic) => {
          setAdjustOpen(false);
          const promptTh = topic === "pillars" ? "ช่วยหนูตั้งเสาหลักของเนื้อหาให้หน่อยค่า~" : topic === "niche" ? "ช่วยหนูหานิชของฉันหน่อยค่า~" : "ช่วยหนูตั้งสไตล์เนื้อหาให้หน่อยค่า~";
          void processInput(promptTh);
        }}
      />

      {masteryToast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
            transform: "translateX(-50%)",
            zIndex: 150,
            maxWidth: "88%",
            padding: "10px 16px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.92)",
            border: "0.5px solid rgba(232,199,122,0.5)",
            boxShadow: "0 4px 20px rgba(201,169,110,0.25)",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#1A1A18",
              textAlign: "center",
            }}
          >
            {uiLang === "en" ? masteryToast.en : masteryToast.th}
          </p>
        </div>
      )}

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
                {uiLang === "en" ? "I want to remember you~" : "หนูอยากจำคุณได้ค่า~"}
              </p>
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "14px", color: "#9A8B73", margin: 0, lineHeight: 1.5 }}>
                {uiLang === "en" ? "Sign up free — I'll keep everything we learned today" : "สมัครฟรีได้เลยค่า — หนูจะจำทุกอย่างที่เราเรียนด้วยกัน"}
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
        micState={micState}
        conversationLang={conversationLang}
      />
    </div>
    </TalkErrorBoundary>
  );
}
