"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

// --- Tuning constants ------------------------------------------------------

const SILENCE_THRESHOLD = 0.03;      // RMS amplitude below this counts as silence
const SILENCE_DURATION_MS = 1500;    // How long silence must persist to stop
const MIN_SPEECH_DURATION_MS = 400;  // Ignore "stops" before this much audio
const MAX_RECORDING_MS = 12000;      // Hard cap to prevent runaway recordings

// --- Browser support detection --------------------------------------------

type MediaSupport =
  | { supported: true }
  | { supported: false; reason: "no_recorder" | "no_getUserMedia" };

function detectMediaSupport(): MediaSupport {
  if (typeof window === "undefined") return { supported: true };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, reason: "no_getUserMedia" };
  }
  if (typeof MediaRecorder === "undefined") {
    return { supported: false, reason: "no_recorder" };
  }
  return { supported: true };
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

// --- Component -------------------------------------------------------------

export function MicButton({
  state,
  language = "auto",
  onTranscript,
  onStateChange,
  disabled = false,
}: MicButtonProps) {
  const [support] = useState<MediaSupport>(() =>
    typeof window === "undefined" ? { supported: true } : detectMediaSupport(),
  );
  const [amplitude, setAmplitude] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const flowTagSetRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const recordStartTimeRef = useRef<number>(0);
  const silenceStartTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const mimeTypeRef = useRef<string>("audio/webm");
  const hardStopTimerRef = useRef<number | null>(null);

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

  // --- Teardown ------------------------------------------------------------

  const teardown = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (hardStopTimerRef.current !== null) {
      clearTimeout(hardStopTimerRef.current);
      hardStopTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAmplitude(0);
    silenceStartTimeRef.current = null;
    isRecordingRef.current = false;
  }, []);

  // --- Send audio to server -----------------------------------------------

  const transcribeAndCommit = useCallback(
    async (blob: Blob) => {
      const elapsedMs = Date.now() - recordStartTimeRef.current;
      trace("uploading", { bytes: blob.size, ms: elapsedMs });

      if (blob.size < 1000) {
        trace("audio too small, returning to idle");
        onStateChange("idle");
        return;
      }

      onStateChange("processing");

      try {
        const form = new FormData();
        const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
        form.append("audio", blob, `utterance.${ext}`);
        form.append("language", language);

        const res = await fetch("/api/talk/transcribe", {
          method: "POST",
          body: form,
          credentials: "include",
          cache: "no-store",
        });

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
        // onStateChange will be driven by parent (processing → speaking → idle)
      } catch (e) {
        logError("mic", "transcribe network error", e);
        onStateChange("idle");
      }
    },
    [language, trace, onStateChange, onTranscript],
  );

  // --- Stop recording ------------------------------------------------------

  const stopRecording = useCallback(
    (reason: "silence" | "user" | "hard-cap") => {
      if (!isRecordingRef.current) return;
      isRecordingRef.current = false;
      trace("stopping", { reason });

      const recorder = recorderRef.current;
      if (recorder && recorder.state === "recording") {
        try {
          recorder.stop();
        } catch (e) {
          trace("recorder.stop threw", { error: (e as Error).message });
        }
      }
    },
    [trace],
  );

  // --- Start recording -----------------------------------------------------

  const startRecording = useCallback(async () => {
    ensureFlowTag();
    if (isRecordingRef.current) return;
    if (typeof window === "undefined") return;
    if (!support.supported) return;

    trace("warming up mic stream");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      trace("permission denied", { error: (e as Error).message });
      onStateChange("needs-permission");
      return;
    }

    streamRef.current = stream;
    const mimeType = pickMimeType();
    mimeTypeRef.current = mimeType;
    trace("mic stream warm", { mimeType });

    // --- Set up amplitude analyzer for silence detection -------------------
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
    } catch (e) {
      trace("AudioContext failed", { error: (e as Error).message });
      teardown();
      onStateChange("idle");
      return;
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    // --- Set up the recorder ----------------------------------------------
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (e) {
      trace("MediaRecorder failed", { error: (e as Error).message });
      teardown();
      onStateChange("idle");
      return;
    }
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const chunks = chunksRef.current;
      chunksRef.current = [];
      const blob = new Blob(chunks, { type: mimeTypeRef.current });
      teardown();
      void transcribeAndCommit(blob);
    };

    recorder.onerror = (ev: Event) => {
      const errMsg =
        (ev as Event & { error?: { message?: string } }).error?.message ??
        "unknown";
      trace("recorder onerror", { error: errMsg });
      teardown();
      onStateChange("idle");
    };

    // --- Start everything --------------------------------------------------
    recordStartTimeRef.current = Date.now();
    silenceStartTimeRef.current = null;
    isRecordingRef.current = true;

    try {
      recorder.start(250); // emit data chunks every 250ms
    } catch (e) {
      trace("recorder.start threw", { error: (e as Error).message });
      teardown();
      onStateChange("idle");
      return;
    }

    onStateChange("listening");
    trace("recording started");

    // Hard cap so a mic left running can't drain forever.
    hardStopTimerRef.current = window.setTimeout(() => {
      trace("hard cap reached");
      stopRecording("hard-cap");
    }, MAX_RECORDING_MS);

    // --- Amplitude + silence detection loop -------------------------------
    const tick = () => {
      if (!isRecordingRef.current) return;
      analyser.getByteFrequencyData(data);
      // RMS-style: average normalized to 0-1
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length) / 255;
      setAmplitude(rms);

      const now = Date.now();
      const elapsed = now - recordStartTimeRef.current;

      if (rms < SILENCE_THRESHOLD) {
        if (silenceStartTimeRef.current === null) {
          silenceStartTimeRef.current = now;
        } else {
          const silenceFor = now - silenceStartTimeRef.current;
          if (
            silenceFor >= SILENCE_DURATION_MS &&
            elapsed >= MIN_SPEECH_DURATION_MS
          ) {
            trace("silence detected — stopping");
            stopRecording("silence");
            return;
          }
        }
      } else {
        silenceStartTimeRef.current = null;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [
    support.supported,
    ensureFlowTag,
    trace,
    teardown,
    transcribeAndCommit,
    onStateChange,
    stopRecording,
  ]);

  // --- Recovery from denied permission ------------------------------------

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

  // --- Button press handlers ----------------------------------------------

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (!support.supported) return;
    if (state === "speaking") {
      onStateChange("idle");
      return;
    }
    if (state === "listening") {
      stopRecording("user");
      return;
    }
    if (state === "idle") {
      void startRecording();
    }
  }, [
    disabled,
    support.supported,
    state,
    onStateChange,
    startRecording,
    stopRecording,
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
      teardown();
      const recorder = recorderRef.current;
      if (recorder && recorder.state === "recording") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, [teardown]);

  // --- Render: unsupported ------------------------------------------------

  if (!support.supported) {
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
          ใช้เสียงไม่ได้ค่า~ พิมพ์ได้เลยนะ
          <br />
          <span
            style={{
              fontFamily: "Quicksand, sans-serif",
              fontSize: "11px",
              opacity: 0.8,
            }}
          >
            Voice unavailable~ just type below
          </span>
        </p>
      </div>
    );
  }

  // --- Render: needs-permission -------------------------------------------

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
              background:
                "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
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

  // --- Render: normal mic --------------------------------------------------

  const isActive = state === "listening";
  const ringScale = 1 + amplitude * 6;

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
            MicButton debug · state={state} · amp=
            {amplitude.toFixed(3)}
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
