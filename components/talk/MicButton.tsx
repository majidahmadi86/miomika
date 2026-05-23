"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/colors";
import {
  getSpeechRecognitionConstructor,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from "@/lib/talk/speech-support";

export type MicState = "idle" | "listening" | "processing" | "speaking";

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
  if (typeof window === "undefined") return { supported: false, reason: "no_api" };
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("samsungbrowser")) return { supported: false, reason: "samsung_internet" };
  if (ua.includes("firefox")) return { supported: false, reason: "firefox" };
  const hasAPI =
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  if (!hasAPI) return { supported: false, reason: "no_api" };
  return { supported: true };
}

export function MicButton({
  state,
  language = "auto",
  onTranscript,
  onStateChange,
  disabled = false,
}: MicButtonProps) {
  const [support] = useState<SpeechSupport>(() =>
    typeof window === "undefined"
      ? { supported: true }
      : detectSpeechSupport(),
  );
  const [amplitude, setAmplitude] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [debugLang, setDebugLang] = useState<string>("?");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef(false);
  const isManualStopRef = useRef(false);
  const transcriptBufferRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const longPressTimerRef = useRef<number | null>(null);


  const log = useCallback((msg: string) => {
    if (typeof window === "undefined") return;
    console.log(`[MicButton] ${msg}`);
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}  ${msg}`]);
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
      log(`amplitude unavailable: ${(e as Error).message}`);
    }
  }, [log]);

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

  const commit = useCallback((text: string) => {
    const cleaned = text.trim();
    if (cleaned.length === 0) {
      onStateChange("idle");
      return;
    }
    log(`commit: "${cleaned.slice(0, 40)}"`);
    transcriptBufferRef.current = "";
    onTranscript(cleaned, true);
    onStateChange("processing");
  }, [log, onStateChange, onTranscript]);

  const startListening = useCallback(() => {
    if (isListeningRef.current) return;
    if (typeof window === "undefined") return;

    const SpeechRecognitionImpl = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionImpl) {
      log("no SpeechRecognition API");
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    // LANGUAGE STRATEGY (the root fix):
    // "en-US" is the most permissive setting — Chrome handles English perfectly
    // AND still returns something for Thai/other languages (better than silent fail).
    // Only force "th-TH" when caller explicitly requests it via the language prop.
    // Server-side intent classifier handles actual language routing of the response.
    const resolvedLang: string =
      language === "th-TH" ? "th-TH" :
      language === "en-US" ? "en-US" :
      "en-US"; // "auto" or anything else → safe en-US default

    recognition.lang = resolvedLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      log(`onstart (lang=${resolvedLang})`);
      setDebugLang(resolvedLang);
      isListeningRef.current = true;
      isManualStopRef.current = false;
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
        log(`onresult FINAL: "${final.slice(0, 60)}"`);
        isManualStopRef.current = true;
        try { recognition.stop(); } catch { /* ignore */ }
        commit(final);
        stopAmplitude();
      } else if (interim) {
        transcriptBufferRef.current = interim;
        onTranscript(interim, false);
      } else {
        log(`onresult empty (resultIndex=${e.resultIndex}, length=${e.results.length})`);
      }
    };

    recognition.onerror = (e: Event & { error?: string; message?: string }) => {
      log(`onerror: ${e?.error ?? "unknown"} message="${e?.message ?? ""}"`);
      const code = e?.error ?? "unknown";
      isListeningRef.current = false;
      stopAmplitude();
      if (code === "not-allowed" || code === "permission-denied") {
        onStateChange("idle");
      }
    };

    recognition.onend = () => {
      log(`onend (manual=${isManualStopRef.current}, buffer="${transcriptBufferRef.current.slice(0, 30)}")`);
      isListeningRef.current = false;

      if (isManualStopRef.current) {
        if (transcriptBufferRef.current.trim().length > 0) {
          commit(transcriptBufferRef.current);
        } else {
          onStateChange("idle");
        }
        stopAmplitude();
        return;
      }

      if (transcriptBufferRef.current.trim().length > 0) {
        log("auto-commit interim (timeout)");
        commit(transcriptBufferRef.current);
        stopAmplitude();
        return;
      }

      try {
        log("auto-restart");
        recognition.start();
        isListeningRef.current = true;
      } catch (e) {
        log(`restart failed: ${(e as Error).message}`);
        onStateChange("idle");
        stopAmplitude();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      log(`start failed: ${(e as Error).message}`);
      onStateChange("idle");
    }
  }, [language, log, commit, onStateChange, onTranscript, startAmplitude, stopAmplitude]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;
    log("manual stop");
    isManualStopRef.current = true;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, [log]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (!support.supported) return;
    if (state === "speaking") { onStateChange("idle"); return; }
    if (state === "listening") { stopListening(); return; }
    if (state === "idle") {
      startListening();
    }
  }, [disabled, support.supported, state, onStateChange, startListening, stopListening]);

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
      stopAmplitude();
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, [stopAmplitude]);

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
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
        <p style={{
          fontSize: "12px",
          color: COLORS.textMuted,
          textAlign: "center",
          maxWidth: "260px",
          fontFamily: "Kanit, sans-serif",
          margin: 0,
          lineHeight: 1.4,
        }}>
          {reasonMsgTh}
          <br />
          <span style={{ fontFamily: "Quicksand, sans-serif", fontSize: "11px", opacity: 0.8 }}>
            {reasonMsgEn}
          </span>
        </p>
      </div>
    );
  }

  const isActive = state === "listening";
  const ringScale = 1 + amplitude * 0.18;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
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
        <div style={{
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
        }}>
          <p style={{ margin: 0, marginBottom: "4px", color: COLORS.ctaSolid }}>
            MicButton debug · state={state} · lang={debugLang}
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
