"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { COLORS } from "@/lib/design/colors";
import { log } from "@/lib/debug/log";
import {
  getSpeechRecognitionConstructor,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from "@/lib/talk/speech-support";

export type MicState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "needs-permission";

interface MicButtonProps {
  state: MicState;
  language?: "th-TH" | "en-US" | "auto";
  onTranscript: (text: string, isFinal: boolean) => void;
  onStateChange: (state: MicState) => void;
  disabled?: boolean;
}

type SpeechSupport =
  | { supported: true }
  | { supported: false; reason: "samsung_internet" | "firefox" | "no_api" };

function detectSpeechSupport(): SpeechSupport {
  if (typeof window === "undefined")
    return { supported: false, reason: "no_api" };
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("samsungbrowser"))
    return { supported: false, reason: "samsung_internet" };
  if (ua.includes("firefox")) return { supported: false, reason: "firefox" };
  const hasAPI =
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  if (!hasAPI) return { supported: false, reason: "no_api" };
  return { supported: true };
}

const SILENCE_TIMEOUT_MS = 2000;

export function MicButton({
  state,
  language = "auto",
  onTranscript,
  onStateChange,
  disabled = false,
}: MicButtonProps) {
  const [support] = useState<SpeechSupport>(() =>
    typeof window === "undefined" ? { supported: true } : detectSpeechSupport(),
  );
  const [amplitude, setAmplitude] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [debugLang, setDebugLang] = useState<string>("?");
  const flowTagSetRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef(false);
  const transcriptBufferRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const trace = useCallback((msg: string, data?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    log("mic", msg, data);
    setDebugLog((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}  ${msg}`,
    ]);
  }, []);

  const ensureFlowTag = useCallback(() => {
    if (flowTagSetRef.current) return;
    flowTagSetRef.current = true;
    try {
      Sentry.setTag("flow", "voice");
    } catch {
      /* Sentry not initialized in some contexts */
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startAmplitude = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAmplitude(avg / 255);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      trace("amplitude unavailable", { error: (e as Error).message });
    }
  }, [trace]);

  const stopAmplitude = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAmplitude(0);
  }, []);

  const commit = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (cleaned.length === 0) {
        onStateChange("idle");
        return;
      }
      trace("commit", { length: cleaned.length, preview: cleaned.slice(0, 40) });
      transcriptBufferRef.current = "";
      onTranscript(cleaned, true);
      onStateChange("processing");
    },
    [trace, onStateChange, onTranscript],
  );

  const startListening = useCallback(() => {
    ensureFlowTag();
    if (isListeningRef.current) return;
    if (typeof window === "undefined") return;

    const SpeechRecognitionImpl = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionImpl) {
      trace("no SpeechRecognition API");
      return;
    }

    const recognition = new SpeechRecognitionImpl();

    // LANGUAGE STRATEGY:
    // "en-US" is the most permissive — Chrome handles English perfectly and
    // still returns partial results for other languages. Server-side intent
    // classifier handles actual language routing of the response.
    const resolvedLang: string =
      language === "th-TH"
        ? "th-TH"
        : language === "en-US"
          ? "en-US"
          : "en-US"; // "auto" or default → safe en-US

    // SINGLE-SHOT recognition. No continuous=true. No auto-restart from onend.
    // This avoids Chrome's anti-abuse heuristic that revokes the mic after
    // repeated programmatic start() calls. One tap = one utterance.
    recognition.lang = resolvedLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      trace("onstart", { lang: resolvedLang });
      setDebugLang(resolvedLang);
      isListeningRef.current = true;
      transcriptBufferRef.current = "";
      onStateChange("listening");
      void startAmplitude();
    };

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r?.isFinal) final += r[0]?.transcript ?? "";
        else interim += r[0]?.transcript ?? "";
      }

      if (final.trim()) {
        trace("onresult final", { preview: final.slice(0, 60) });
        clearSilenceTimer();
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        commit(final);
        stopAmplitude();
        return;
      }

      if (interim) {
        transcriptBufferRef.current = interim;
        onTranscript(interim, false);

        // Reset the silence timer on every interim chunk. If 2s passes
        // without new interim results, commit what we have.
        clearSilenceTimer();
        silenceTimerRef.current = window.setTimeout(() => {
          trace("silence timeout — committing buffer");
          const buffered = transcriptBufferRef.current;
          try {
            recognition.stop();
          } catch {
            /* ignore */
          }
          if (buffered.trim().length > 0) commit(buffered);
          else onStateChange("idle");
          stopAmplitude();
        }, SILENCE_TIMEOUT_MS);
      }
    };

    recognition.onerror = (
      e: Event & { error?: string; message?: string },
    ) => {
      const code = e?.error ?? "unknown";
      trace("onerror", { code, message: e?.message ?? "" });
      clearSilenceTimer();
      isListeningRef.current = false;
      stopAmplitude();

      if (code === "not-allowed" || code === "permission-denied") {
        try {
          Sentry.captureMessage("mic permission revoked", {
            level: "info",
            tags: { stage: "recognition.onerror", error_code: code },
          });
        } catch {
          /* ignore */
        }
        onStateChange("needs-permission");
        return;
      }

      // Other errors (network, aborted, no-speech) — just return to idle.
      onStateChange("idle");
    };

    recognition.onend = () => {
      trace("onend", {
        bufferLength: transcriptBufferRef.current.length,
      });
      clearSilenceTimer();
      isListeningRef.current = false;

      // If we have buffered interim text but no final result came through,
      // commit what we have. Otherwise return to idle. NO AUTO-RESTART.
      if (transcriptBufferRef.current.trim().length > 0) {
        commit(transcriptBufferRef.current);
      } else {
        onStateChange("idle");
      }
      stopAmplitude();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      trace("start failed", { error: (e as Error).message });
      onStateChange("idle");
    }
  }, [
    language,
    trace,
    commit,
    onStateChange,
    onTranscript,
    startAmplitude,
    stopAmplitude,
    clearSilenceTimer,
    ensureFlowTag,
  ]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;
    trace("manual stop");
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, [trace, clearSilenceTimer]);

  const requestPermissionAgain = useCallback(async () => {
    trace("recovery: requesting permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release — we only wanted the prompt.
      stream.getTracks().forEach((t) => t.stop());
      trace("recovery: permission granted");
      onStateChange("idle");
    } catch (e) {
      trace("recovery: permission still denied", {
        error: (e as Error).message,
      });
      // Stay in needs-permission state. User must open browser settings.
    }
  }, [trace, onStateChange]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (!support.supported) return;
    if (state === "speaking") {
      onStateChange("idle");
      return;
    }
    if (state === "listening") {
      stopListening();
      return;
    }
    if (state === "idle") {
      startListening();
    }
  }, [
    disabled,
    support.supported,
    state,
    onStateChange,
    startListening,
    stopListening,
  ]);

  const onPointerDown = useCallback(() => {
    longPressTimerRef.current = window.setTimeout(() => {
      setDebugVisible((v) => !v);
    }, 800);
  }, []);

  const onPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      stopAmplitude();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [stopAmplitude, clearSilenceTimer]);

  // ---------------------------------------------------------------------------
  // RENDER: unsupported browser fallback
  // ---------------------------------------------------------------------------

  if (!support.supported) {
    const reasonMsgTh =
      support.reason === "samsung_internet"
        ? "เปิดใน Chrome เพื่อใช้เสียง~ พิมพ์ก็ได้ค่า"
        : "ใช้เสียงไม่ได้ค่า~ พิมพ์ได้เลยนะ";
    const reasonMsgEn =
      support.reason === "samsung_internet"
        ? "Open in Chrome for voice~ or just type"
        : "Voice unavailable~ just type below";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button
          type="button"
          disabled
          aria-label="Voice not available"
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: COLORS.surface,
            border: `1px solid ${COLORS.borderLight}`,
            opacity: 0.5,
            cursor: "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MicOff size={28} strokeWidth={1.75} color={COLORS.textMuted} />
        </button>
        <p
          style={{
            fontSize: "12px",
            color: COLORS.textMuted,
            textAlign: "center",
            maxWidth: "260px",
            fontFamily: "Kanit, sans-serif",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {reasonMsgTh}
          <br />
          <span
            style={{
              fontFamily: "Quicksand, sans-serif",
              fontSize: "11px",
              opacity: 0.8,
            }}
          >
            {reasonMsgEn}
          </span>
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: needs-permission recovery card
  // ---------------------------------------------------------------------------

  if (state === "needs-permission") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => void requestPermissionAgain()}
          aria-label="Re-enable microphone"
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: COLORS.surface,
            border: `1px solid ${COLORS.borderMedium}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(26, 26, 24, 0.06)",
          }}
        >
          <MicOff size={28} strokeWidth={1.75} color={COLORS.textPrimary} />
        </button>
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.borderLight}`,
            borderRadius: "12px",
            padding: "12px 16px",
            maxWidth: "280px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.textPrimary,
              margin: 0,
              marginBottom: "4px",
              fontFamily: "Kanit, sans-serif",
            }}
          >
            ไมค์ถูกปิดอยู่ค่า
          </p>
          <p
            style={{
              fontSize: "11px",
              color: COLORS.textMuted,
              margin: 0,
              marginBottom: "10px",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            Mic was paused. Tap below to allow again.
          </p>
          <button
            type="button"
            onClick={() => void requestPermissionAgain()}
            style={{
              background: COLORS.ctaGradient,
              color: "#FFFFFF",
              border: "none",
              borderRadius: "999px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Kanit, sans-serif",
            }}
          >
            ลองใหม่ / Try again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: normal mic button
  // ---------------------------------------------------------------------------

  const isActive = state === "listening";
  const ringScale = 1 + amplitude * 0.18;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <motion.button
        type="button"
        onClick={handlePress}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        disabled={disabled}
        aria-label={isActive ? "Stop recording" : "Start recording"}
        aria-pressed={isActive}
        whileTap={{ scale: 0.94 }}
        style={{
          position: "relative",
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: isActive ? COLORS.ctaGradient : COLORS.surface,
          border: `1px solid ${isActive ? "transparent" : COLORS.borderMedium}`,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
          boxShadow: isActive
            ? "0 8px 24px rgba(201, 169, 110, 0.40)"
            : "0 2px 8px rgba(26, 26, 24, 0.06)",
          transition: "background 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {isActive && (
          <motion.div
            animate={{ scale: ringScale }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              inset: "-8px",
              borderRadius: "50%",
              border: `2px solid ${COLORS.ctaSolid}`,
              opacity: 0.4,
              pointerEvents: "none",
            }}
          />
        )}
        <Mic
          size={28}
          strokeWidth={1.75}
          color={isActive ? "#FFFFFF" : COLORS.textPrimary}
        />
      </motion.button>

      {debugVisible && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            left: "16px",
            right: "16px",
            background: "rgba(26, 26, 24, 0.92)",
            color: "#FFFFFF",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: "monospace",
            maxHeight: "240px",
            overflow: "auto",
            zIndex: 9999,
          }}
        >
          <p
            style={{
              margin: 0,
              marginBottom: "4px",
              color: COLORS.ctaSolid,
            }}
          >
            MicButton debug · state={state} · lang={debugLang}
          </p>
          {debugLog.map((line, i) => (
            <p key={i} style={{ margin: 0, opacity: 0.85 }}>
              {line}
            </p>
          ))}
          <p
            style={{
              margin: 0,
              marginTop: "8px",
              opacity: 0.5,
              fontSize: "10px",
            }}
          >
            long-press mic to toggle
          </p>
        </div>
      )}
    </div>
  );
}
