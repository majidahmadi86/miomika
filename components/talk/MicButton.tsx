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

const SILENCE_THRESHOLD = 0.025;     // Slightly more sensitive
const SILENCE_DURATION_MS = 900;     // Trim 600ms off end-of-utterance lag
const MIN_SPEECH_DURATION_MS = 400;  // Ignore stops before this much audio
const MAX_RECORDING_MS = 12000;      // Hard cap to prevent runaway recordings
const COOLDOWN_MS = 250;             // Dodge Android Chrome rapid-acquire detection

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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const recordStartTimeRef = useRef<number>(0);
  const silenceStartTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const mimeTypeRef = useRef<string>("audio/webm");
  const hardStopTimerRef = useRef<number | null>(null);
  const idleReleaseTimerRef = useRef<number | null>(null);
  const lastStopAtRef = useRef<number>(0);

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

  // Lightweight reset between utterances — keeps the mic stream warm.
  const resetForNextUtterance = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (hardStopTimerRef.current !== null) {
      clearTimeout(hardStopTimerRef.current);
      hardStopTimerRef.current = null;
    }
    setAmplitude(0);
    silenceStartTimeRef.current = null;
    isRecordingRef.current = false;
  }, []);

  // Full teardown — only on unmount or 60s idle. Releases OS mic handle.
  const fullTeardown = useCallback(() => {
    resetForNextUtterance();
    if (idleReleaseTimerRef.current !== null) {
      clearTimeout(idleReleaseTimerRef.current);
      idleReleaseTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [resetForNextUtterance]);

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

    // Cancel any pending idle-release.
    if (idleReleaseTimerRef.current !== null) {
      clearTimeout(idleReleaseTimerRef.current);
      idleReleaseTimerRef.current = null;
    }

    // Cooldown: if we just stopped, wait a bit before re-acquiring.
    const sinceStop = Date.now() - lastStopAtRef.current;
    if (lastStopAtRef.current > 0 && sinceStop < COOLDOWN_MS) {
      const wait = COOLDOWN_MS - sinceStop;
      trace("cooldown", { ms: wait });
      await new Promise((r) => setTimeout(r, wait));
    }

    // If a previous stream is still alive AND tracks are actually usable,
    // reuse it. Android Chrome often marks tracks as readyState="live" even
    // after MediaRecorder has stopped, but the recorder won't accept them
    // for a second pass. So we explicitly test by checking if we already
    // have a working analyser. If not, get a fresh stream.
    let stream = streamRef.current;
    const needsFreshStream =
      !stream ||
      !analyserRef.current ||
      stream.getAudioTracks().some((t) => t.readyState !== "live");

    if (needsFreshStream) {
      // Release any stale stream before acquiring a new one.
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        analyserRef.current = null;
      }

      trace("acquiring mic stream");
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
      trace("mic stream acquired", { mimeType });

      try {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch (e) {
        trace("AudioContext failed", { error: (e as Error).message });
        fullTeardown();
        onStateChange("idle");
        return;
      }
    } else {
      trace("reusing warm mic stream");
    }

    const analyser = analyserRef.current;
    if (!analyser || !stream) {
      trace("analyser/stream missing — bailing");
      fullTeardown();
      onStateChange("idle");
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
    } catch (e) {
      trace("MediaRecorder failed", { error: (e as Error).message });
      fullTeardown();
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
      resetForNextUtterance();
      lastStopAtRef.current = Date.now();

      // CRITICAL: release the stream after each utterance. Reusing the same
      // stream for a second MediaRecorder fails on Android Chrome. The 250ms
      // delay before next acquire dodges anti-abuse rate limiting.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        analyserRef.current = null;
      }

      void transcribeAndCommit(blob);
    };

    recorder.onerror = (ev: Event) => {
      const errMsg =
        (ev as Event & { error?: { message?: string } }).error?.message ??
        "unknown";
      trace("recorder onerror", { error: errMsg });
      fullTeardown();
      onStateChange("idle");
    };

    recordStartTimeRef.current = Date.now();
    silenceStartTimeRef.current = null;
    isRecordingRef.current = true;

    try {
      recorder.start(250);
    } catch (e) {
      trace("recorder.start threw", { error: (e as Error).message });
      fullTeardown();
      onStateChange("idle");
      return;
    }

    onStateChange("listening");
    trace("recording started");

    hardStopTimerRef.current = window.setTimeout(() => {
      trace("hard cap reached");
      stopRecording("hard-cap");
    }, MAX_RECORDING_MS);

    const tick = () => {
      if (!isRecordingRef.current) return;
      analyser.getByteFrequencyData(data);
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
    resetForNextUtterance,
    fullTeardown,
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
      fullTeardown();
      const recorder = recorderRef.current;
      if (recorder && recorder.state === "recording") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, [fullTeardown]);

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
