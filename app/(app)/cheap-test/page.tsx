"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  MicButton,
  type MicState,
} from "@/components/talk/MicButton";
import { PersistentMiomi, type MiomiMood } from "@/components/talk/PersistentMiomi";
import { speakReply, unlockTtsPlayback } from "@/lib/voice/tts";
import { COLORS } from "@/lib/design/colors";

type ChatBubble = { id: string; role: "user" | "miomi"; text: string };

type LegTimings = {
  transcribeMs: number | null;
  miomiMs: number | null;
  ttsStartMs: number | null;
  totalMs: number | null;
};

type MiomiApiResponse = {
  content?: string;
  replyLanguage?: "th" | "en";
  sessionContext?: Record<string, unknown>;
};

const EMPTY_TIMINGS: LegTimings = {
  transcribeMs: null,
  miomiMs: null,
  ttsStartMs: null,
  totalMs: null,
};

export default function CheapTestPage() {
  const turnInFlightRef = useRef(false);
  const speechEndAtRef = useRef<number | null>(null);
  const miomiStartAtRef = useRef<number | null>(null);

  const [micState, setMicState] = useState<MicState>("idle");
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [timings, setTimings] = useState<LegTimings>(EMPTY_TIMINGS);
  const [statusLine, setStatusLine] = useState("Tap mic and speak~");
  const [apiMessages, setApiMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [sessionContext, setSessionContext] = useState<Record<string, unknown>>({});

  const mood: MiomiMood = (() => {
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const primeAudio = useCallback(() => {
    unlockTtsPlayback();
  }, []);

  const handleVadSpeechEnd = useCallback(() => {
    if (turnInFlightRef.current) return false;
    speechEndAtRef.current = performance.now();
    setTimings(EMPTY_TIMINGS);
    setStatusLine("Transcribing…");
    return true;
  }, []);

  const handleTranscribeReceived = useCallback(() => {
    const anchor = speechEndAtRef.current;
    if (anchor == null) return;
    setTimings((prev) => ({
      ...prev,
      transcribeMs: Math.round(performance.now() - anchor),
    }));
  }, []);

  const handleTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!isFinal || !text.trim()) {
        setMicState("idle");
        setStatusLine("Tap mic and speak~");
        return;
      }
      if (turnInFlightRef.current) return;
      turnInFlightRef.current = true;

      const userText = text.trim();
      setBubbles((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", text: userText },
      ]);
      setStatusLine("Miomi is thinking…");

      const nextMessages = [
        ...apiMessages,
        { role: "user" as const, content: userText },
      ];
      miomiStartAtRef.current = performance.now();

      try {
        const res = await fetch("/api/miomi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            messages: nextMessages,
            mode: "chat",
            sessionContext,
          }),
        });

        const miomiStart = miomiStartAtRef.current;
        const miomiMs =
          miomiStart != null ? Math.round(performance.now() - miomiStart) : null;

        if (!res.ok) {
          setStatusLine("Something went quiet — try again~");
          setTimings((prev) => ({ ...prev, miomiMs }));
          setMicState("idle");
          return;
        }

        const data = (await res.json()) as MiomiApiResponse;
        const reply = (data.content ?? "").trim();
        if (!reply) {
          setStatusLine("No reply — try again~");
          setTimings((prev) => ({ ...prev, miomiMs }));
          setMicState("idle");
          return;
        }

        if (data.sessionContext) {
          setSessionContext(data.sessionContext);
        }

        setApiMessages([
          ...nextMessages,
          { role: "assistant", content: reply },
        ]);
        setBubbles((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "miomi", text: reply },
        ]);

        const lang = data.replyLanguage ?? "th";
        setMicState("speaking");
        setStatusLine("Miomi is speaking…");

        await speakReply(reply, lang, {
          onStart: () => {
            const speechAnchor = speechEndAtRef.current;
            const ttsStartMs =
              miomiStart != null
                ? Math.round(performance.now() - miomiStart)
                : null;
            const totalMs =
              speechAnchor != null
                ? Math.round(performance.now() - speechAnchor)
                : null;
            setTimings((prev) => ({
              ...prev,
              miomiMs,
              ttsStartMs,
              totalMs,
            }));
          },
          onEnd: () => {
            setMicState("idle");
            setStatusLine("Tap mic and speak~");
          },
          onError: () => {
            setMicState("idle");
            setStatusLine("Voice hiccup — tap to try again~");
          },
        });
      } catch {
        setStatusLine("Network hiccup — tap to try again~");
        setMicState("idle");
      } finally {
        turnInFlightRef.current = false;
        miomiStartAtRef.current = null;
      }
    },
    [apiMessages, sessionContext],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: COLORS.bg,
      }}
      onPointerDown={primeAudio}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          borderBottom: `1px solid ${COLORS.borderLight}`,
          flexShrink: 0,
        }}
      >
        <Link
          href="/home"
          aria-label="Back"
          style={{ color: COLORS.textPrimary, display: "flex" }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "Kanit, sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              color: COLORS.textPrimary,
            }}
          >
            Cheap path mock
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: "Quicksand, sans-serif",
              fontSize: "11px",
              color: COLORS.textMuted,
            }}
          >
            transcribe → miomi → TTS latency
          </p>
        </div>
      </header>

      <PersistentMiomi
        mood={mood}
        uiLang="en"
        subtitleEn={statusLine}
      />

      <div
        style={{
          margin: "0 16px 12px",
          padding: "12px 14px",
          borderRadius: "12px",
          background: COLORS.surfaceWarm,
          border: `1px solid ${COLORS.borderLight}`,
          fontFamily: "monospace",
          fontSize: "12px",
          color: COLORS.textPrimary,
          flexShrink: 0,
        }}
      >
        <p style={{ margin: "0 0 8px", fontFamily: "Kanit, sans-serif", fontSize: "11px", fontWeight: 600, color: COLORS.ctaSolid }}>
          Latency (last turn)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
          <span style={{ color: COLORS.textMuted }}>speech → transcript</span>
          <span>{timings.transcribeMs != null ? `${timings.transcribeMs} ms` : "—"}</span>
          <span style={{ color: COLORS.textMuted }}>transcript → miomi</span>
          <span>{timings.miomiMs != null ? `${timings.miomiMs} ms` : "—"}</span>
          <span style={{ color: COLORS.textMuted }}>miomi → first audio</span>
          <span>{timings.ttsStartMs != null ? `${timings.ttsStartMs} ms` : "—"}</span>
          <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>total → audio</span>
          <span style={{ fontWeight: 600 }}>{timings.totalMs != null ? `${timings.totalMs} ms` : "—"}</span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "8px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {bubbles.length === 0 && (
          <p
            style={{
              textAlign: "center",
              fontFamily: "Quicksand, sans-serif",
              fontSize: "13px",
              color: COLORS.textMuted,
              marginTop: "24px",
            }}
          >
            Tap the mic, say something, and watch the timers~
          </p>
        )}
        {bubbles.map((b) => (
          <div
            key={b.id}
            style={{
              alignSelf: b.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: b.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: b.role === "user" ? COLORS.ctaGradient : COLORS.surface,
              border: b.role === "user" ? "none" : `1px solid ${COLORS.borderLight}`,
              color: b.role === "user" ? COLORS.ctaTextColor : COLORS.textPrimary,
              fontFamily: "Quicksand, sans-serif",
              fontSize: "14px",
              lineHeight: 1.45,
              boxShadow: b.role === "miomi" ? "0 2px 8px rgba(26,26,24,0.04)" : COLORS.ctaShadow,
            }}
          >
            {b.text}
          </div>
        ))}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "16px",
          borderTop: `1px solid ${COLORS.borderLight}`,
          display: "flex",
          justifyContent: "center",
          background: COLORS.surface,
        }}
      >
        <MicButton
          state={micState}
          language="auto"
          onTranscript={handleTranscript}
          onStateChange={setMicState}
          speakingActive={micState === "speaking"}
          onVadSpeechEnd={handleVadSpeechEnd}
          onTranscribeReceived={handleTranscribeReceived}
        />
      </div>
    </div>
  );
}
