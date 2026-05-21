"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Volume2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type MicState = "idle" | "listening" | "processing" | "speaking";

interface MicButtonProps {
  state: MicState;
  language?: "th-TH" | "en-US" | "auto";
  onTranscript: (text: string, isFinal: boolean) => void;
  onStateChange: (state: MicState) => void;
  disabled?: boolean;
}

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string; confidence: number };
};

export function MicButton({
  state,
  language = "auto",
  onTranscript,
  onStateChange,
  disabled = false,
}: MicButtonProps) {
  const [speechSupported, setSpeechSupported] = useState(true);
  const [amplitude, setAmplitude] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<unknown>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const stopAmplitude = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setAmplitude(0);
  }, []);

  const startAmplitude = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
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
    } catch {
      // Amplitude unavailable — fallback animation handled by CSS
    }
  }, []);

  const startListening = useCallback(() => {
    if (disabled || isListeningRef.current) return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new (SpeechRecognition as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      maxAlternatives: number;
      onstart: (() => void) | null;
      onresult: ((e: SpeechRecognitionEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    })();

    recognition.lang = language === "auto" ? "th-TH" : language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      onStateChange("listening");
      void startAmplitude();
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r?.isFinal) final += r[0]?.transcript ?? "";
        else interim += r?.[0]?.transcript ?? "";
      }
      if (final) {
        setLiveTranscript("");
        onTranscript(final.trim(), true);
        onStateChange("processing");
      } else {
        setLiveTranscript(interim);
        onTranscript(interim, false);
      }
    };

    recognition.onerror = () => {
      isListeningRef.current = false;
      stopAmplitude();
      setLiveTranscript("");
      onStateChange("idle");
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      stopAmplitude();
      setLiveTranscript("");
      // Always return to idle on end — don't check state
      onStateChange("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [disabled, language, onStateChange, onTranscript, startAmplitude, state, stopAmplitude]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;
    const rec = recognitionRef.current as { stop: () => void } | null;
    rec?.stop();
    stopAmplitude();
    isListeningRef.current = false;
  }, [stopAmplitude]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (state === "speaking") { onStateChange("idle"); return; }
    if (state === "listening") { stopListening(); return; }
    if (state === "idle") { startListening(); }
  }, [disabled, onStateChange, startListening, state, stopListening]);

  useEffect(() => {
    return () => { stopAmplitude(); };
  }, [stopAmplitude]);

  const ringScale = 1 + amplitude * 0.08;

  if (!speechSupported) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          border: "2px solid #E8E5DF", background: "#FAFAF6",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.5,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="#C4BDB5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
        <p style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "10px", color: "#C4BDB5",
          textAlign: "center", maxWidth: "120px",
        }}>
          Voice not supported in this browser
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      {/* Live transcript pill */}
      <AnimatePresence>
        {liveTranscript && state === "listening" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#FFFFFF",
              border: "1px solid #EDE8E0",
              borderRadius: "999px",
              padding: "6px 14px",
              maxWidth: "300px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "12px",
              fontStyle: "italic",
              color: "#9A8B73",
              boxShadow: "0 2px 8px rgba(26,26,24,0.08)",
              zIndex: 20,
            }}
          >
            {liveTranscript}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer ring — amplitude responder */}
      <motion.div
        animate={{
          scale: state === "listening" ? ringScale : 1,
          opacity: state === "listening" ? 1 : 0,
        }}
        transition={{ duration: 0.1 }}
        style={{
          position: "absolute",
          width: "92px",
          height: "92px",
          borderRadius: "50%",
          background: "rgba(249,168,212,0.20)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Main mic button */}
      <motion.button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          handlePress();
        }}
        animate={state === "idle" ? { scale: [1, 1.02, 1] } : {}}
        transition={state === "idle" ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : {}}
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          border: state === "idle" ? "2px solid #E8E5DF"
            : state === "processing" ? "2px solid #C9A96E"
            : state === "speaking" ? "2px solid #F9A8D4"
            : "none",
          background: state === "listening"
            ? "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)"
            : state === "processing"
            ? "#FFF8F2"
            : "#FFFFFF",
          boxShadow: state === "listening"
            ? "0 8px 32px rgba(219,39,119,0.35)"
            : "0 4px 16px rgba(26,26,24,0.06)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          opacity: disabled ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        {/* Icon */}
        {state === "processing" ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 style={{ width: "24px", height: "24px", color: "#9A8B73" }} />
          </motion.div>
        ) : state === "speaking" ? (
          <Volume2 style={{ width: "32px", height: "32px", color: "#DB2777" }} strokeWidth={1.75} />
        ) : (
          <Mic
            style={{ width: "32px", height: "32px", color: state === "listening" ? "#FFFFFF" : "#DB2777" }}
            strokeWidth={state === "listening" ? 2.0 : 1.75}
          />
        )}

        {/* Waveform bars during listening */}
        {state === "listening" && (
          <div style={{ display: "flex", gap: "3px", position: "absolute", bottom: "12px" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 8 + amplitude * 16, 8] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
                style={{
                  width: "4px",
                  background: "#FFFFFF",
                  borderRadius: "2px",
                  minHeight: "8px",
                }}
              />
            ))}
          </div>
        )}
      </motion.button>
    </div>
  );
}
