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
import { log } from "@/lib/debug/log";
import type { VadConfig } from "@/lib/conversation/orchestrator";

export type MicState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "needs-permission";

interface MicButtonProps {
  state: MicState;
  language?: "th-TH" | "en-US" | "auto";
  onSpeechStart: () => void;
  onSpeechEnd: (audio: Float32Array) => void;
  onStateChange?: (state: MicState) => void;
  disabled?: boolean;
  locked?: boolean;
  onLockedTap?: () => void;
}

type MicVADInstance = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
};

export interface MicButtonHandle {
  start: () => void;
  stop: () => void;
  setVadThresholds: (config: { positive: number; negative: number; redemptionMs: number }) => void;
}

const DEFAULT_VAD: VadConfig = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  redemptionMs: 1200,
};

/**
 * MicButton — explicit-intent VAD voice input.
 * VAD lifecycle stays here; transcription and state machine live in ConversationOrchestrator.
 */
export const MicButton = forwardRef<MicButtonHandle, MicButtonProps>(function MicButton(
  {
    state,
    language = "auto",
    onSpeechStart,
    onSpeechEnd,
    onStateChange,
    disabled = false,
    locked = false,
    onLockedTap,
  },
  ref,
) {
  const [amplitude, setAmplitude] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const flowTagSetRef = useRef(false);
  const vadRef = useRef<MicVADInstance | null>(null);
  const isLoadingVadRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const userIntentRef = useRef(false);
  const vadConfigRef = useRef<VadConfig>(DEFAULT_VAD);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
    onStateChangeRef.current = onStateChange;
  }, [onSpeechStart, onSpeechEnd, onStateChange]);

  const notifyStateChange = useCallback((next: MicState) => {
    onStateChangeRef.current?.(next);
  }, []);

  const trace = useCallback((msg: string, data?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    log("mic", msg, data);
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}  ${msg}`]);
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

  const killVAD = useCallback(() => {
    if (vadRef.current) {
      const v = vadRef.current;
      vadRef.current = null;
      try {
        void v.destroy().catch(() => {});
      } catch {
        /* ignore */
      }
    }
    isLoadingVadRef.current = false;
  }, []);

  const startVAD = useCallback(async () => {
    if (!userIntentRef.current) {
      trace("startVAD aborted — no user intent");
      return;
    }

    if (vadRef.current) {
      try {
        await vadRef.current.start();
        if (mountedRef.current && userIntentRef.current) {
          trace("VAD resumed (warm)");
          notifyStateChange("listening");
        }
      } catch (e) {
        trace("VAD resume failed", { error: (e as Error).message });
      }
      return;
    }

    if (isLoadingVadRef.current) return;
    ensureFlowTag();
    isLoadingVadRef.current = true;

    const cfg = vadConfigRef.current;

    try {
      trace("loading VAD library");
      const { MicVAD } = await import("@ricky0123/vad-web");
      if (!userIntentRef.current) {
        trace("startVAD aborted post-load — user stopped");
        isLoadingVadRef.current = false;
        return;
      }

      const vad = await MicVAD.new({
        model: "v5",
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        workletOptions: {},
        startOnLoad: false,
        positiveSpeechThreshold: cfg.positiveSpeechThreshold,
        negativeSpeechThreshold: cfg.negativeSpeechThreshold,
        minSpeechMs: 400,
        preSpeechPadMs: 250,
        redemptionMs: cfg.redemptionMs,
        onSpeechStart: () => {
          if (!mountedRef.current || !userIntentRef.current) return;
          trace("speech start");
          onSpeechStartRef.current();
          notifyStateChange("listening");
        },
        onSpeechEnd: (audio: Float32Array) => {
          if (!mountedRef.current || !userIntentRef.current) return;
          trace("speech end", { samples: audio.length });
          onSpeechEndRef.current(audio);
        },
        onVADMisfire: () => {
          if (!mountedRef.current || !userIntentRef.current) return;
          trace("vad misfire (too short)");
          notifyStateChange("idle");
        },
        onFrameProcessed: (probs) => {
          if (!mountedRef.current) return;
          setAmplitude(probs.isSpeech);
        },
      });

      if (!mountedRef.current || !userIntentRef.current) {
        try {
          await vad.destroy();
        } catch {
          /* ignore */
        }
        isLoadingVadRef.current = false;
        return;
      }

      vadRef.current = vad as unknown as MicVADInstance;
      await vad.start();
      trace("VAD running");
      notifyStateChange("listening");
    } catch (e) {
      const msg = (e as Error).message ?? "unknown";
      trace("VAD start failed", { error: msg });
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        notifyStateChange("needs-permission");
      } else {
        notifyStateChange("idle");
      }
    } finally {
      isLoadingVadRef.current = false;
    }
  }, [trace, ensureFlowTag, notifyStateChange]);

  const setVadThresholds = useCallback(
    (config: { positive: number; negative: number; redemptionMs: number }) => {
      const next: VadConfig = {
        positiveSpeechThreshold: config.positive,
        negativeSpeechThreshold: config.negative,
        redemptionMs: config.redemptionMs,
      };
      const prev = vadConfigRef.current;
      if (
        prev.positiveSpeechThreshold === next.positiveSpeechThreshold &&
        prev.negativeSpeechThreshold === next.negativeSpeechThreshold &&
        prev.redemptionMs === next.redemptionMs
      ) {
        return;
      }
      vadConfigRef.current = next;
      if (vadRef.current && userIntentRef.current) {
        killVAD();
        void startVAD();
      }
    },
    [killVAD, startVAD],
  );

  const requestPermissionAgain = useCallback(async () => {
    trace("recovery: requesting permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      trace("recovery: permission granted");
      notifyStateChange("idle");
    } catch (e) {
      trace("recovery: still denied", { error: (e as Error).message });
    }
  }, [trace, notifyStateChange]);

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        if (disabled || locked) {
          if (locked && onLockedTap) onLockedTap();
          return;
        }
        if (userIntentRef.current) return;
        userIntentRef.current = true;
        void startVAD();
      },
      stop: () => {
        if (!userIntentRef.current) return;
        userIntentRef.current = false;
        if (vadRef.current) {
          try {
            void vadRef.current.pause().catch(() => {});
          } catch {
            /* ignore */
          }
        }
        if (mountedRef.current) notifyStateChange("idle");
      },
      setVadThresholds,
    }),
    [disabled, locked, onLockedTap, startVAD, setVadThresholds, notifyStateChange],
  );

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (locked) {
      onLockedTap?.();
      return;
    }
    if (state === "processing") return;
    if (state === "speaking" || state === "listening") {
      userIntentRef.current = false;
      if (vadRef.current) {
        try {
          void vadRef.current.pause().catch(() => {});
        } catch {
          /* ignore */
        }
      }
      notifyStateChange("idle");
      return;
    }
    if (state === "idle") {
      if (userIntentRef.current) return;
      userIntentRef.current = true;
      void startVAD();
    }
  }, [disabled, locked, onLockedTap, state, startVAD, notifyStateChange]);

  const onPointerDown = useCallback(() => {
    try {
      new Audio().play().catch(() => {});
    } catch {
      /* ignore */
    }
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
      userIntentRef.current = false;
      killVAD();
      if (mountedRef.current) notifyStateChange("idle");
    }
  }, [locked, killVAD, notifyStateChange]);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== "undefined") {
      void import("@ricky0123/vad-web").catch(() => {});
      const urls = ["/vad/silero_vad_v5.onnx", "/vad/ort-wasm-simd-threaded.wasm"];
      urls.forEach((u) => {
        void fetch(u, { cache: "force-cache" }).catch(() => {});
      });
    }
    return () => {
      mountedRef.current = false;
      userIntentRef.current = false;
      if (vadRef.current) {
        try {
          vadRef.current.destroy();
        } catch {
          /* ignore */
        }
        vadRef.current = null;
      }
    };
  }, []);

  void language;

  if (state === "needs-permission") {
    return (
      <div style={containerStyle}>
        <button type="button" onClick={() => void requestPermissionAgain()} aria-label="Re-enable microphone" style={micButtonStyle(false)}>
          <MicOff size={28} strokeWidth={1.75} color={COLORS.textPrimary} />
        </button>
        <div style={cardStyle}>
          <p style={cardTitleStyle}>ไมค์ถูกปิดอยู่ค่า</p>
          <p style={cardBodyStyle}>Mic was paused. Tap to allow again.</p>
          <button type="button" onClick={() => void requestPermissionAgain()} style={cardCtaStyle}>
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
        aria-label={
          locked
            ? "Sign up to keep talking"
            : state === "processing"
              ? "Transcribing"
              : isActive
                ? "Stop"
                : "Start talking"
        }
        aria-pressed={isActive}
        whileTap={{ scale: 0.94 }}
        style={micButtonStyle(isActive, state === "processing", locked)}
      >
        {isActive && !locked && (
          <>
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: "-10px",
                borderRadius: "50%",
                border: `2px solid ${COLORS.ctaSolid}`,
                pointerEvents: "none",
              }}
            />
            <motion.div
              animate={{ scale: ringScale, opacity: 0.3 + amplitude * 0.5 }}
              transition={{ duration: 0.08 }}
              style={{
                position: "absolute",
                inset: "-10px",
                borderRadius: "50%",
                border: `2px solid ${COLORS.ctaSolid}`,
                pointerEvents: "none",
              }}
            />
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
          <p style={{ margin: 0, marginBottom: "4px", color: COLORS.ctaSolid }}>
            MicButton · state={state} · intent={String(userIntentRef.current)} · speech={amplitude.toFixed(2)}
          </p>
          {debugLog.map((line, i) => (
            <p key={i} style={{ margin: 0, opacity: 0.85 }}>
              {line}
            </p>
          ))}
          <p style={{ margin: 0, marginTop: "8px", opacity: 0.5, fontSize: "10px" }}>long-press mic to toggle</p>
        </div>
      )}
    </div>
  );
});

const containerStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" };
function micButtonStyle(isActive: boolean, isProcessing: boolean = false, isLocked: boolean = false): CSSProperties {
  return {
    position: "relative",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: isLocked ? COLORS.ctaGradient : isActive ? COLORS.ctaGradient : COLORS.surface,
    border: `1px solid ${isActive || isLocked ? "transparent" : COLORS.borderMedium}`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: isProcessing ? 0.55 : 1,
    boxShadow: isActive || isLocked ? "0 8px 24px rgba(201, 169, 110, 0.40)" : "0 2px 8px rgba(26, 26, 24, 0.06)",
    transition: "background 240ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out",
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
