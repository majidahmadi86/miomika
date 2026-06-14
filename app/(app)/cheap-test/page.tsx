"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  MicButton,
  type MicState,
} from "@/components/talk/MicButton";
import { PersistentMiomi, type MiomiMood } from "@/components/talk/PersistentMiomi";
import { speak, speakReply, unlockTtsPlayback } from "@/lib/voice/tts";
import { COLORS } from "@/lib/design/colors";

type WordCardPayload = {
  word: string;
  word_th: string;
  word_en: string;
  cefr_level?: string | null;
  emoji?: string | null;
  th_romanization?: string | null;
};

type PronunciationLessonPayload = {
  word: string;
  word_th: string;
  syllables: string[];
  meaning_en: string;
  meaning_th: string;
};

type ChatBubble = {
  id: string;
  role: "user" | "miomi";
  text: string;
  phonetics?: string | null;
  wordCard?: WordCardPayload | null;
  phoneticsNote?: string | null;
};

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
  wordCard?: WordCardPayload | null;
  pronunciationLesson?: PronunciationLessonPayload | null;
  servedVia?: string;
};

const EMPTY_TIMINGS: LegTimings = {
  transcribeMs: null,
  miomiMs: null,
  ttsStartMs: null,
  totalMs: null,
};

function resolvePhonetics(data: MiomiApiResponse): {
  phonetics: string | null;
  wordCard: WordCardPayload | null;
  phoneticsNote: string | null;
} {
  const wordCard = data.wordCard ?? null;
  const lesson = data.pronunciationLesson ?? null;

  if (lesson?.syllables?.length) {
    return {
      phonetics: lesson.syllables.join(" · "),
      wordCard,
      phoneticsNote: null,
    };
  }

  const roman = wordCard?.th_romanization?.trim();
  if (roman) {
    return { phonetics: roman, wordCard, phoneticsNote: null };
  }

  if (wordCard?.word_th) {
    return {
      phonetics: null,
      wordCard,
      phoneticsNote:
        "wordCard missing th_romanization — /api/miomi prompt should attach bank phonetics",
    };
  }

  if (data.servedVia?.includes("__taught")) {
    return {
      phonetics: null,
      wordCard: null,
      phoneticsNote:
        "Teaching flagged in servedVia but no wordCard — /api/miomi prompt gap",
    };
  }

  return { phonetics: null, wordCard, phoneticsNote: null };
}

export default function CheapTestPage() {
  const turnInFlightRef = useRef(false);
  const pipelineStageRef = useRef<"idle" | "transcribing" | "miomi" | "tts">("idle");
  const speechEndAtRef = useRef<number | null>(null);
  const miomiStartAtRef = useRef<number | null>(null);

  const [micState, setMicState] = useState<MicState>("idle");
  const [turnBusy, setTurnBusy] = useState(false);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [timings, setTimings] = useState<LegTimings>(EMPTY_TIMINGS);
  const [statusLine, setStatusLine] = useState("Tap mic and speak~");
  const [apiMessages, setApiMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [sessionContext, setSessionContext] = useState<Record<string, unknown>>({});
  // Persist conversation across remount/refresh so it never vanishes mid-chat.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("miomika.cheaptest");
      if (raw) {
        const saved = JSON.parse(raw) as { bubbles?: ChatBubble[]; apiMessages?: typeof apiMessages };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sessionStorage hydrate on mount
        if (Array.isArray(saved.bubbles)) setBubbles(saved.bubbles);
        if (Array.isArray(saved.apiMessages)) setApiMessages(saved.apiMessages);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem("miomika.cheaptest", JSON.stringify({ bubbles, apiMessages }));
    } catch { /* ignore */ }
  }, [bubbles, apiMessages]);

  const releaseTurn = useCallback(() => {
    turnInFlightRef.current = false;
    pipelineStageRef.current = "idle";
    setTurnBusy(false);
  }, []);

  const armTurn = useCallback(() => {
    turnInFlightRef.current = true;
    pipelineStageRef.current = "transcribing";
    setTurnBusy(true);
  }, []);

  const mood: MiomiMood = (() => {
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const primeAudio = useCallback(() => {
    unlockTtsPlayback();
  }, []);

  const handleMicStateChange = useCallback(
    (state: MicState) => {
      setMicState(state);
      if (
        state === "idle" &&
        pipelineStageRef.current === "transcribing" &&
        turnInFlightRef.current
      ) {
        releaseTurn();
        setStatusLine("Tap mic and speak~");
      }
    },
    [releaseTurn],
  );

  const handleVadSpeechEnd = useCallback(() => {
    if (turnInFlightRef.current) return false;
    armTurn();
    speechEndAtRef.current = performance.now();
    setTimings(EMPTY_TIMINGS);
    setStatusLine("Transcribing…");
    return true;
  }, [armTurn]);

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
        releaseTurn();
        setMicState("idle");
        setStatusLine("Tap mic and speak~");
        return;
      }
      if (!turnInFlightRef.current) return;

      pipelineStageRef.current = "miomi";

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

        const { phonetics, wordCard, phoneticsNote } = resolvePhonetics(data);

        setApiMessages([
          ...nextMessages,
          { role: "assistant", content: reply },
        ]);
        setBubbles((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "miomi",
            text: reply,
            phonetics,
            wordCard,
            phoneticsNote,
          },
        ]);

        const lang = data.replyLanguage ?? "th";
        pipelineStageRef.current = "tts";
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

        if (phonetics) {
          await speak(phonetics, "en");
        }
      } catch {
        setStatusLine("Network hiccup — tap to try again~");
        setMicState("idle");
      } finally {
        releaseTurn();
        miomiStartAtRef.current = null;
      }
    },
    [apiMessages, sessionContext, releaseTurn],
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
            }}
          >
            <div
              style={{
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
            {b.role === "miomi" && b.phonetics ? (
              <p
                style={{
                  margin: "6px 0 0",
                  paddingLeft: "4px",
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6D5BBF",
                }}
              >
                {b.phonetics}
              </p>
            ) : null}
            {b.role === "miomi" && b.wordCard ? (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background: COLORS.surfaceWarm,
                  border: `1px solid ${COLORS.borderLight}`,
                  fontFamily: "'Sarabun', sans-serif",
                  fontSize: "13px",
                  color: COLORS.textPrimary,
                }}
              >
                {b.wordCard.emoji ? `${b.wordCard.emoji} ` : ""}
                <span style={{ fontWeight: 600 }}>{b.wordCard.word_th}</span>
                <span style={{ color: COLORS.textMuted }}> · </span>
                <span>{b.wordCard.word_en}</span>
              </div>
            ) : null}
            {b.role === "miomi" && b.phoneticsNote ? (
              <p
                style={{
                  margin: "6px 0 0",
                  paddingLeft: "4px",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  color: COLORS.textMuted,
                  lineHeight: 1.4,
                }}
              >
                {b.phoneticsNote}
              </p>
            ) : null}
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
          disabled={turnBusy}
          onTranscript={handleTranscript}
          onStateChange={handleMicStateChange}
          speakingActive={micState === "speaking" || turnBusy}
          onVadSpeechEnd={handleVadSpeechEnd}
          onTranscribeReceived={handleTranscribeReceived}
        />
      </div>
    </div>
  );
}
