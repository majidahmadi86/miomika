"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { COLORS } from "@/lib/design/colors";
import { log, logError } from "@/lib/debug/log";

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

/**
 * MicButton — VAD-driven voice input.
 *
 * Architecture (read this before touching anything):
 *   1. Tap → load VAD library (lazy, ~1.2 MB once, cached).
 *   2. VAD starts a continuous mic session. It runs the Silero VAD ONNX
 *      model in-browser to detect real speech start/end — works in noisy
 *      environments, doesn't guess from amplitude.
 *   3. When VAD emits a finished utterance, we package the Float32 audio
 *      as WAV, POST to /api/talk/transcribe.
 *   4. Session stays alive across utterances. No re-acquisition.
 *   5. On unmount or 60s idle, we destroy the VAD instance and release
 *      the mic.
 *
 * Why VAD instead of RMS amplitude / MediaRecorder + silence timer:
 *   Previous attempts using amplitude thresholds (`SILENCE_THRESHOLD =
 *   0.025`) failed in noisy real-world environments — the threshold
 *   either never tripped (background noise above threshold) or tripped
 *   mid-sentence (user paused for breath). VAD uses a learned model
 *   to distinguish speech from non-speech.
 *
 * No "warm stream reuse" cleverness. VAD owns the stream for its
 * entire lifetime. We start it once, we stop it once.
 */

const IDLE_RELEASE_MS = 60_000;

type MicVADInstance = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
};

export function MicButton({
  state,
  language = "auto",
  onTranscript,
  onStateChange,
  disabled = false,
}: MicButtonProps) {
  const [amplitude, setAmplitude] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const flowTagSetRef = useRef(false);

  const vadRef = useRef<MicVADInstance | null>(null);
  const isLoadingVadRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const idleReleaseTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

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
      /* ignore */
    }
  }, []);

  // --- Send utterance to server -------------------------------------------

  const transcribeAndCommit = useCallback(
    async (audio: Float32Array) => {
      if (!mountedRef.current) return;

      const wavBlob = float32ToWav(audio, 16000);
      trace("uploading", { samples: audio.length, bytes: wavBlob.size });

      if (wavBlob.size < 2000) {
        trace("utterance too small, ignoring");
        onStateChange("idle");
        return;
      }

      onStateChange("processing");

      try {
        const form = new FormData();
        form.append("audio", wavBlob, "utterance.wav");
        form.append("language", language);

        const res = await fetch("/api/talk/transcribe", {
          method: "POST",
          body: form,
          credentials: "include",
          cache: "no-store",
        });

        if (!mountedRef.current) return;

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          trace("transcribe failed", {
            status: res.status,
            error: (errBody as { error?: string }).error ?? "unknown",
          });
          onStateChange("idle");
          return;
        }

        const json = (await res.json()) as { text?: string };
        const text = (json.text ?? "").trim();
        if (text.length === 0) {
          trace("empty transcription");
          onStateChange("idle");
          return;
        }

        trace("transcribed", { preview: text.slice(0, 40) });
        onTranscript(text, true);
        // Parent drives onStateChange (processing → speaking → idle).
      } catch (e) {
        logError("mic", "transcribe network error", e);
        if (mountedRef.current) onStateChange("idle");
      }
    },
    [language, trace, onStateChange, onTranscript],
  );

  // --- Lazy-load and start VAD --------------------------------------------

  const startVAD = useCallback(async () => {
    if (vadRef.current || isLoadingVadRef.current) return;
    ensureFlowTag();
    isLoadingVadRef.current = true;

    try {
      trace("loading VAD library");
      const { MicVAD } = await import("@ricky0123/vad-web");

      const vad = await MicVAD.new({
        model: "v5",
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        workletOptions: {},
        startOnLoad: false,

        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechMs: 400,
        preSpeechPadMs: 250,
        redemptionMs: 750,

        onSpeechStart: () => {
          if (!mountedRef.current) return;
          trace("speech start");
          onStateChange("listening");
          if (idleReleaseTimerRef.current !== null) {
            clearTimeout(idleReleaseTimerRef.current);
            idleReleaseTimerRef.current = null;
          }
        },

        onSpeechEnd: (audio: Float32Array) => {
          if (!mountedRef.current) return;
          trace("speech end", { samples: audio.length });
          void transcribeAndCommit(audio);
          if (idleReleaseTimerRef.current !== null) {
            clearTimeout(idleReleaseTimerRef.current);
          }
          idleReleaseTimerRef.current = window.setTimeout(() => {
            trace("idle release — destroying VAD");
            void vadRef.current?.destroy();
            vadRef.current = null;
          }, IDLE_RELEASE_MS);
        },

        onVADMisfire: () => {
          if (!mountedRef.current) return;
          trace("vad misfire (too short)");
          onStateChange("idle");
        },

        onFrameProcessed: (probs) => {
          if (!mountedRef.current) return;
          setAmplitude(probs.isSpeech);
        },
      });

      if (!mountedRef.current) {
        await vad.destroy();
        return;
      }

      vadRef.current = vad as unknown as MicVADInstance;
      await vad.start();
      trace("VAD running");
      onStateChange("listening");
    } catch (e) {
      const msg = (e as Error).message ?? "unknown";
      trace("VAD start failed", { error: msg });
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        onStateChange("needs-permission");
      } else {
        onStateChange("idle");
      }
    } finally {
      isLoadingVadRef.current = false;
    }
  }, [trace, ensureFlowTag, onStateChange, transcribeAndCommit]);

  // --- Stop / cleanup -----------------------------------------------------

  const stopVAD = useCallback(() => {
    if (idleReleaseTimerRef.current !== null) {
      clearTimeout(idleReleaseTimerRef.current);
      idleReleaseTimerRef.current = null;
    }
    if (vadRef.current) {
      try {
        void vadRef.current.destroy();
      } catch {
        /* ignore */
      }
      vadRef.current = null;
      trace("VAD destroyed");
    }
    setAmplitude(0);
  }, [trace]);

  // --- Permission recovery -------------------------------------------------

  const requestPermissionAgain = useCallback(async () => {
    trace("recovery: requesting permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      trace("recovery: permission granted");
      onStateChange("idle");
    } catch (e) {
      trace("recovery: still denied", { error: (e as Error).message });
    }
  }, [trace, onStateChange]);

  // --- Press handlers ------------------------------------------------------

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (state === "speaking") {
      onStateChange("idle");
      return;
    }
    if (state === "listening" || state === "processing") {
      stopVAD();
      onStateChange("idle");
      return;
    }
    if (state === "idle") {
      void startVAD();
    }
  }, [disabled, state, onStateChange, startVAD, stopVAD]);

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

  // --- Mount / unmount lifecycle ------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Direct destroy — do NOT call stopVAD here, it would create a
      // dependency-driven cleanup that fires on every state change.
      if (idleReleaseTimerRef.current !== null) {
        clearTimeout(idleReleaseTimerRef.current);
        idleReleaseTimerRef.current = null;
      }
      if (vadRef.current) {
        try {
          vadRef.current.destroy();
        } catch {
          /* ignore */
        }
        vadRef.current = null;
      }
    };
  }, []); // EMPTY deps — runs once on mount, cleanup once on unmount.

  // --- Render: needs-permission -------------------------------------------

  if (state === "needs-permission") {
    return (
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => void requestPermissionAgain()}
          aria-label="Re-enable microphone"
          style={micButtonStyle(false)}
        >
          <MicOff size={28} strokeWidth={1.75} color={COLORS.textPrimary} />
        </button>
        <div style={cardStyle}>
          <p style={cardTitleStyle}>ไมค์ถูกปิดอยู่ค่า</p>
          <p style={cardBodyStyle}>Mic was paused. Tap to allow again.</p>
          <button
            type="button"
            onClick={() => void requestPermissionAgain()}
            style={cardCtaStyle}
          >
            ลองใหม่ / Try again
          </button>
        </div>
      </div>
    );
  }

  const isActive = state === "listening";
  const ringScale = 1 + amplitude * 0.4;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.button
        type="button"
        onClick={handlePress}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        disabled={disabled}
        aria-label={isActive ? "Stop" : "Start talking"}
        aria-pressed={isActive}
        whileTap={{ scale: 0.94 }}
        style={micButtonStyle(isActive)}
      >
        {isActive && (
          <motion.div
            animate={{ scale: ringScale }}
            transition={{ duration: 0.08 }}
            style={{
              position: "absolute",
              inset: "-10px",
              borderRadius: "50%",
              border: `2px solid ${COLORS.ctaSolid}`,
              opacity: 0.4 + amplitude * 0.4,
              pointerEvents: "none",
            }}
          />
        )}
        <Mic size={28} strokeWidth={1.75} color={isActive ? "#FFFFFF" : COLORS.textPrimary} />
      </motion.button>

      {debugVisible && (
        <div style={debugPanelStyle}>
          <p style={{ margin: 0, marginBottom: "4px", color: COLORS.ctaSolid }}>
            MicButton · state={state} · speech={amplitude.toFixed(2)}
          </p>
          {debugLog.map((line, i) => (
            <p key={i} style={{ margin: 0, opacity: 0.85 }}>{line}</p>
          ))}
          <p style={{ margin: 0, marginTop: "8px", opacity: 0.5, fontSize: "10px" }}>
            long-press mic to toggle
          </p>
        </div>
      )}
    </div>
  );
}

// --- Style fragments (kept inline to avoid touching design tokens) ---------

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};

function micButtonStyle(isActive: boolean): CSSProperties {
  return {
    position: "relative",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: isActive ? COLORS.ctaGradient : COLORS.surface,
    border: `1px solid ${isActive ? "transparent" : COLORS.borderMedium}`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: isActive
      ? "0 8px 24px rgba(201, 169, 110, 0.40)"
      : "0 2px 8px rgba(26, 26, 24, 0.06)",
    transition: "background 240ms cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

const cardStyle: CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.borderLight}`,
  borderRadius: "12px",
  padding: "12px 16px",
  maxWidth: "280px",
  textAlign: "center",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  margin: 0,
  marginBottom: "4px",
  fontFamily: "Kanit, sans-serif",
};

const cardBodyStyle: CSSProperties = {
  fontSize: "11px",
  color: COLORS.textMuted,
  margin: 0,
  marginBottom: "10px",
  fontFamily: "Quicksand, sans-serif",
};

const cardCtaStyle: CSSProperties = {
  background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "999px",
  padding: "8px 20px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "Kanit, sans-serif",
};

const debugPanelStyle: CSSProperties = {
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
};

// --- Float32 PCM → WAV blob ------------------------------------------------

function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
