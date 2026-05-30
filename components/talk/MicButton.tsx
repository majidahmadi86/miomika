"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type CSSProperties,
} from "react";
import { Mic, MicOff, Lock } from "lucide-react";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { COLORS } from "@/lib/design/colors";
import { log, logError } from "@/lib/debug/log";
import { logEvent } from "@/lib/debug/event-bus";

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
  locked?: boolean;
  onLockedTap?: () => void;
  /** When true (Miomi speaking), VAD stays paused to avoid speaker echo. */
  speakingActive?: boolean;
}

type MicVADInstance = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
};

export interface MicButtonHandle {
  start: () => void;
  stop: () => void;
  setInterruptMode: (enabled: boolean) => void;
}

/**
 * MicButton — explicit-intent VAD voice input.
 *
 * Key invariants:
 *   - VAD instance created once on mount, destroyed on unmount.
 *   - VAD only listens when user intent + not speaking/locked/disabled.
 *   - userIntentRef tracks whether user has asked to be listening.
 */
export const MicButton = forwardRef<MicButtonHandle, MicButtonProps>(function MicButton(
  {
    state,
    language = "auto",
    onTranscript,
    onStateChange,
    disabled = false,
    locked = false,
    onLockedTap,
    speakingActive = false,
  },
  ref,
) {
  const [amplitude, setAmplitude] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [listenIntent, setListenIntent] = useState(false);
  const [vadReady, setVadReady] = useState(false);

  const flowTagSetRef = useRef(false);
  const vadInstanceRef = useRef<MicVADInstance | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const userIntentRef = useRef(false);

  const trace = useCallback((msg: string, data?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    log("mic", msg, data);
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}  ${msg}`]);
  }, []);

  const ensureFlowTag = useCallback(() => {
    if (flowTagSetRef.current) return;
    flowTagSetRef.current = true;
    try { Sentry.setTag("flow", "voice"); } catch { /* ignore */ }
  }, []);

  const setUserListening = useCallback((on: boolean) => {
    userIntentRef.current = on;
    setListenIntent(on);
  }, []);

  const transcribeAndCommit = useCallback(
    async (audio: Float32Array) => {
      if (!mountedRef.current) return;
      if (!userIntentRef.current) {
        trace("transcribe skipped — user not listening");
        if (mountedRef.current) onStateChange("idle");
        return;
      }
      const wavBlob = float32ToWav(audio, 16000);
      trace("uploading", { samples: audio.length, bytes: wavBlob.size });
      if (wavBlob.size < 2000) {
        trace("utterance too small, ignoring");
        onStateChange("idle");
        return;
      }
      onStateChange("processing");
      logEvent({ kind: "network", level: "info", message: "POST /transcribe", data: { wavBytes: wavBlob.size, language } });
      const transcribeCtrl = new AbortController();
      const transcribeTimeout = window.setTimeout(() => transcribeCtrl.abort(), 8000);
      try {
        const form = new FormData();
        form.append("audio", wavBlob, "utterance.wav");
        form.append("language", language);
        const res = await fetch("/api/talk/transcribe", {
          method: "POST",
          body: form,
          credentials: "include",
          cache: "no-store",
          signal: transcribeCtrl.signal,
        });
        if (!mountedRef.current) return;
        if (!userIntentRef.current) {
          trace("transcribe response dropped — user stopped");
          if (mountedRef.current) onStateChange("idle");
          return;
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errorBodyText = JSON.stringify(errBody);
          logEvent({
            kind: "transcribe",
            level: "error",
            message: "failed",
            data: { status: res.status, body: errorBodyText },
          });
          logEvent({
            kind: "network",
            level: "error",
            message: `/transcribe ${res.status}`,
            data: { status: res.status, body: errorBodyText },
          });
          trace("transcribe failed", { status: res.status, error: (errBody as { error?: string }).error ?? "unknown" });
          onStateChange("idle");
          return;
        }
        logEvent({
          kind: "network",
          level: "info",
          message: `/transcribe ${res.status}`,
          data: { status: res.status },
        });
        const json = (await res.json()) as { text?: string };
        const text = (json.text ?? "").trim();
        if (text.length === 0) {
          trace("empty transcription");
          onStateChange("idle");
          return;
        }
        trace("transcribed", { preview: text.slice(0, 40) });
        onTranscript(text, true);
      } catch (e) {
        logError("mic", "transcribe network error", e);
        if (mountedRef.current) onStateChange("idle");
      } finally {
        window.clearTimeout(transcribeTimeout);
      }
    },
    [language, trace, onStateChange, onTranscript],
  );

  // Create VAD once on mount; destroy once on unmount.
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    if (typeof window !== "undefined") {
      void import("@ricky0123/vad-web").catch(() => { /* ignore */ });
      const urls = ["/vad/silero_vad_v5.onnx", "/vad/ort-wasm-simd-threaded.wasm"];
      urls.forEach((u) => { void fetch(u, { cache: "force-cache" }).catch(() => { /* ignore */ }); });
    }

    const initVad = async () => {
      ensureFlowTag();
      try {
        trace("loading VAD library");
        logEvent({ kind: "vad", level: "info", message: "vad loading" });
        const { MicVAD } = await import("@ricky0123/vad-web");
        if (cancelled || !mountedRef.current) return;

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
          redemptionMs: 1200,
          onSpeechStart: () => {
            if (!mountedRef.current) return;
            if (!userIntentRef.current) return;
            logEvent({ kind: "vad", level: "info", message: "speech start" });
            trace("speech start");
            onStateChange("listening");
          },
          onSpeechEnd: (audio: Float32Array) => {
            if (!mountedRef.current) return;
            if (!userIntentRef.current) {
              trace("speech end ignored — user stopped");
              return;
            }
            const wavBlob = float32ToWav(audio, 16000);
            logEvent({
              kind: "vad",
              level: "info",
              message: "speech end",
              data: { samples: audio.length, wavBytes: wavBlob.size },
            });
            trace("speech end", { samples: audio.length });
            void transcribeAndCommit(audio);
          },
          onVADMisfire: () => {
            if (!mountedRef.current) return;
            if (!userIntentRef.current) return;
            logEvent({ kind: "vad", level: "warn", message: "misfire too short" });
            trace("vad misfire (too short)");
            onStateChange("idle");
          },
          onFrameProcessed: (probs) => {
            if (!mountedRef.current) return;
            setAmplitude(probs.isSpeech);
          },
        });

        if (cancelled || !mountedRef.current) {
          try { await vad.destroy(); } catch { /* ignore */ }
          return;
        }

        vadInstanceRef.current = vad as unknown as MicVADInstance;
        logEvent({
          kind: "vad",
          level: "info",
          message: "vad created",
          data: { threshold: 0.5, redemptionMs: 1200 },
        });
        trace("VAD instance ready");
        setVadReady(true);
      } catch (e) {
        const msg = (e as Error).message ?? "unknown";
        trace("VAD init failed", { error: msg });
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
          onStateChange("needs-permission");
        }
      }
    };

    void initVad();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      userIntentRef.current = false;
      const v = vadInstanceRef.current;
      vadInstanceRef.current = null;
      if (v) {
        logEvent({ kind: "vad", level: "info", message: "vad destroyed" });
        try { void v.destroy().catch(() => { /* ignore */ }); } catch { /* ignore */ }
      }
    };
  }, [trace, ensureFlowTag, onStateChange, transcribeAndCommit]);

  const shouldListen =
    vadReady && !speakingActive && !locked && !disabled && listenIntent;

  useEffect(() => {
    const vad = vadInstanceRef.current;
    if (!vad) return;
    if (shouldListen) {
      void vad.start().then(() => {
        if (mountedRef.current && userIntentRef.current && shouldListen) {
          trace("VAD listening");
          onStateChange("listening");
        }
      }).catch((e) => {
        trace("VAD start failed", { error: (e as Error).message });
      });
    } else {
      void vad.pause().catch(() => { /* ignore */ });
    }
  }, [shouldListen, trace, onStateChange]);

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

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        if (disabled || locked) {
          if (locked && onLockedTap) onLockedTap();
          return;
        }
        setUserListening(true);
      },
      stop: () => {
        setUserListening(false);
        if (mountedRef.current) onStateChange("idle");
      },
      setInterruptMode: () => {
        // Deferred: interrupt-while-speaking disabled until foundation is solid.
      },
    }),
    [disabled, locked, onLockedTap, setUserListening, onStateChange],
  );

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (locked) {
      if (onLockedTap) onLockedTap();
      return;
    }
    if (state === "processing") return;
    if (state === "speaking") {
      setUserListening(false);
      onStateChange("idle");
      return;
    }
    if (state === "listening") {
      setUserListening(false);
      onStateChange("idle");
      return;
    }
    if (state === "idle") {
      setUserListening(true);
    }
  }, [disabled, locked, onLockedTap, state, onStateChange, setUserListening]);

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
    if (locked) {
      setUserListening(false);
      if (mountedRef.current) onStateChange("idle");
    }
  }, [locked, setUserListening, onStateChange]);

  if (state === "needs-permission") {
    return (
      <div style={containerStyle}>
        <button type="button" onClick={() => void requestPermissionAgain()} aria-label="Re-enable microphone" style={micButtonStyle(false)}>
          <MicOff size={28} strokeWidth={1.75} color={COLORS.textPrimary} />
        </button>
        <div style={cardStyle}>
          <p style={cardTitleStyle}>ไมค์ถูกปิดอยู่ค่า</p>
          <p style={cardBodyStyle}>Mic was paused. Tap to allow again.</p>
          <button type="button" onClick={() => void requestPermissionAgain()} style={cardCtaStyle}>ลองใหม่ / Try again</button>
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
        aria-label={locked ? "Sign up to keep talking" : state === "processing" ? "Transcribing" : isActive ? "Stop" : "Start talking"}
        aria-pressed={isActive}
        whileTap={{ scale: 0.94 }}
        style={micButtonStyle(isActive, state === "processing", locked)}
      >
        {isActive && !locked && (
          <>
            <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: "-10px", borderRadius: "50%", border: `2px solid ${COLORS.ctaSolid}`, pointerEvents: "none" }} />
            <motion.div animate={{ scale: ringScale, opacity: 0.3 + amplitude * 0.5 }} transition={{ duration: 0.08 }}
              style={{ position: "absolute", inset: "-10px", borderRadius: "50%", border: `2px solid ${COLORS.ctaSolid}`, pointerEvents: "none" }} />
          </>
        )}
        {locked ? (
          <Lock size={26} strokeWidth={2} color="#FFFFFF" />
        ) : (
          <Mic size={28} strokeWidth={1.75} color={isActive ? "#FFFFFF" : COLORS.textPrimary} />
        )}
      </motion.button>
      {debugVisible && (
        <div style={debugPanelStyle}>
          <p style={{ margin: 0, marginBottom: "4px", color: COLORS.ctaSolid }}>MicButton · state={state} · intent={String(userIntentRef.current)} · shouldListen={String(shouldListen)} · speech={amplitude.toFixed(2)}</p>
          {debugLog.map((line, i) => (<p key={i} style={{ margin: 0, opacity: 0.85 }}>{line}</p>))}
          <p style={{ margin: 0, marginTop: "8px", opacity: 0.5, fontSize: "10px" }}>long-press mic to toggle</p>
        </div>
      )}
    </div>
  );
});

const containerStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" };
function micButtonStyle(isActive: boolean, isProcessing: boolean = false, isLocked: boolean = false): CSSProperties {
  return {
    position: "relative", width: "72px", height: "72px", borderRadius: "50%",
    background: isLocked ? COLORS.ctaGradient : isActive ? COLORS.ctaGradient : COLORS.surface,
    border: `1px solid ${isActive || isLocked ? "transparent" : COLORS.borderMedium}`,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    opacity: isProcessing ? 0.55 : 1,
    boxShadow: isActive || isLocked ? "0 8px 24px rgba(201, 169, 110, 0.40)" : "0 2px 8px rgba(26, 26, 24, 0.06)",
    transition: "background 240ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out",
  };
}
const cardStyle: CSSProperties = { background: COLORS.surface, border: `1px solid ${COLORS.borderLight}`, borderRadius: "12px", padding: "12px 16px", maxWidth: "280px", textAlign: "center" };
const cardTitleStyle: CSSProperties = { fontSize: "13px", fontWeight: 600, color: COLORS.textPrimary, margin: 0, marginBottom: "4px", fontFamily: "Kanit, sans-serif" };
const cardBodyStyle: CSSProperties = { fontSize: "11px", color: COLORS.textMuted, margin: 0, marginBottom: "10px", fontFamily: "Quicksand, sans-serif" };
const cardCtaStyle: CSSProperties = { background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", color: "#FFFFFF", border: "none", borderRadius: "999px", padding: "8px 20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Kanit, sans-serif" };
const debugPanelStyle: CSSProperties = { position: "fixed", bottom: "16px", left: "16px", right: "16px", background: "rgba(26, 26, 24, 0.92)", color: "#FFFFFF", padding: "12px", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace", maxHeight: "240px", overflow: "auto", zIndex: 9999 };

function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1, bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
