"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { MicButton, type MicState } from "@/components/talk/MicButton";
import { MiomiLive, type MiomiState } from "@/components/talk/MiomiLive";
import { WordCardV3, type VocabularyEntry } from "@/components/talk/WordCardV3";
import { matchLibrary } from "@/lib/library/matcher";
import { resolveWordCard } from "@/lib/library/resolver";
import { getSessionOpener } from "@/lib/library/sessionOpener";
import { getCorrectReaction } from "@/lib/library/reactions";
import { speakText } from "@/lib/talk/speech";

const GUEST_EXCHANGE_LIMIT = 5;

export default function TalkPage() {
  const { isGuest, authReady } = useGuestExploration();
  const [guestExchangesRemaining] = useState(GUEST_EXCHANGE_LIMIT);
  const [micState, setMicState] = useState<MicState>("idle");
  const [miomiState, setMiomiState] = useState<MiomiState>("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [subtitleTh, setSubtitleTh] = useState("พูดอะไรก็ได้ค่า~");
  const [subtitleEn, setSubtitleEn] = useState("Say anything~");
  const [canvasItems, setCanvasItems] = useState<Array<{
    id: string;
    type: "word_card" | "user_echo";
    word?: VocabularyEntry;
    text?: string;
  }>>([]);
  const [wordsIntroduced, setWordsIntroduced] = useState<string[]>([]);

  useEffect(() => {
    if (micState === "listening") setMiomiState("listening");
    else if (micState === "processing") setMiomiState("thinking");
    else if (micState === "speaking") setMiomiState("speaking");
    else setMiomiState("idle");
  }, [micState]);

  useEffect(() => {
    const opener = getSessionOpener({
      isFirstSession: true,
      hoursSinceLastSession: null,
      streakDays: 0,
    });
    setSubtitleTh(opener.speech_th);
    setSubtitleEn(opener.speech_en);
    setMiomiState("speaking");
    speakText(opener.speech_th, "th-TH").then(() => {
      setMiomiState("idle");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#FAFAF6",
        overflow: "hidden",
      }}
    >
      {/* TOP BAR — 44px */}
      <div
        style={{
          height: "44px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E8E5DF",
          zIndex: 10,
        }}
      >
        <Link
          href="/home"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: "20px", height: "20px", color: "#9A8B73" }} strokeWidth={2} />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {authReady && isGuest ? (
            <span
              style={{
                fontFamily: "'Kanit', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                color: "#9A8B73",
                background: "rgba(255,255,255,0.88)",
                border: "1px solid #EDE8E0",
                borderRadius: "999px",
                padding: "3px 10px",
              }}
            >
              เหลืออีก {guestExchangesRemaining} ครั้ง
            </span>
          ) : (
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "#C9A96E",
                background: "rgba(255,255,255,0.88)",
                border: "1px solid #EDE8E0",
                borderRadius: "999px",
                padding: "3px 10px",
              }}
            >
              ✦ Lv.1
            </span>
          )}
        </div>
      </div>

      {/* MIOMI STAGE — 220px */}
      <div
        style={{
          height: "220px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: "12px",
          position: "relative",
        }}
      >
        {/* Soft ambient glow behind Miomi */}
        <div
          style={{
            position: "absolute",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,168,212,0.20) 0%, transparent 65%)",
            pointerEvents: "none",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Miomi head — 180px */}
        <MiomiLive state={miomiState} size={180} />

        {/* Subtitle */}
        <div
          style={{
            marginTop: "8px",
            textAlign: "center",
            padding: "0 24px",
            maxWidth: "320px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "15px",
              fontWeight: 500,
              color: "#1A1A18",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {subtitleTh}
          </p>
          <p
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#9A8B73",
              margin: "2px 0 0",
            }}
          >
            {subtitleEn}
          </p>
        </div>
      </div>

      {/* CONVERSATION CANVAS — flex-1 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "16px 16px 24px",
          background: "#FAFAF6",
        }}
      >
        {canvasItems.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4 }}>
            <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#9A8B73", textAlign: "center" }}>
              พูดหรือพิมพ์เพื่อเริ่มต้นค่า~
              <br />
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px" }}>
                Speak or type to begin~
              </span>
            </p>
          </div>
        )}
        {canvasItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {canvasItems.map(item => (
              item.type === "word_card" && item.word ? (
                <WordCardV3
                  key={item.id}
                  word={item.word}
                  direction="th_to_en"
                  onPronunciationCheck={(w) => {
                    const reaction = getCorrectReaction({ type: "pronunciation", word: w.word_en });
                    setSubtitleTh(reaction.speech_th);
                    setSubtitleEn(reaction.speech_en);
                    setMiomiState("reacting");
                    void speakText(reaction.speech_th, "th-TH").then(() => setMiomiState("idle"));
                  }}
                />
              ) : item.type === "user_echo" && item.text ? (
                <div
                  key={item.id}
                  style={{
                    width: "100%",
                    padding: "6px 0",
                    textAlign: "center",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    justifyContent: "center",
                  }}>
                    <div style={{ flex: 1, height: "1px", background: "#E8E5DF" }} />
                    <span style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "9px", fontWeight: 600,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "#C4BDB5",
                      whiteSpace: "nowrap",
                    }}>
                      User said
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "#E8E5DF" }} />
                  </div>
                  <p style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "12px", fontStyle: "italic",
                    color: "#9A8B73", margin: "2px 0 0",
                  }}>
                    {item.text.length > 60 ? item.text.slice(0, 60) + "…" : item.text}
                  </p>
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>

      {/* MIC ZONE — 120px */}
      <div
        style={{
          height: "120px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "#FAFAF6",
          borderTop: "1px solid rgba(232,229,223,0.6)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
      >
        <MicButton
          state={micState}
          language="auto"
          onTranscript={async (text, isFinal) => {
            if (!isFinal) return;
            setLastTranscript(text);

            // Add user echo to canvas
            setCanvasItems(prev => [...prev, {
              id: crypto.randomUUID(),
              type: "user_echo" as const,
              text,
            }]);

            // Library-first routing
            const template = matchLibrary(text, { wordsIntroduced });

            if (template) {
              // Set subtitle and speak
              setSubtitleTh(template.response.speech_th);
              setSubtitleEn(template.response.speech_en);
              setMiomiState(template.miomi_state_during as MiomiState);

              void speakText(template.response.speech_th, "th-TH");

              // Resolve follow-up word card
              if (template.follow_up?.type === "word_card" && template.follow_up.payload_resolver) {
                const word = await resolveWordCard(
                  template.follow_up.payload_resolver,
                  (template.follow_up.payload_params ?? {}) as Record<string, unknown>,
                  text,
                  wordsIntroduced
                );

                if (word) {
                  setWordsIntroduced(prev => [...prev, word.word_en]);
                  window.setTimeout(() => {
                    setMiomiState("teaching");
                    window.setTimeout(() => {
                      setCanvasItems(prev => [...prev, {
                        id: crypto.randomUUID(),
                        type: "word_card" as const,
                        word,
                      }]);
                      setMiomiState("idle");
                    }, 600);
                  }, 1200);
                }
              } else {
                window.setTimeout(() => setMiomiState("idle"), 2000);
              }
            } else {
              // AI fallback — for now just acknowledge
              setSubtitleTh("หนูเข้าใจค่า~ กำลังคิดให้นะคะ");
              setSubtitleEn("I understand~ let me think...");
              setMiomiState("thinking");
              window.setTimeout(() => setMiomiState("idle"), 2000);
            }
          }}
          onStateChange={setMicState}
        />

        {/* Secondary controls */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            type="button"
            style={{
              height: "32px",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              padding: "0 10px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A8B73" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" x2="15" y1="20" y2="20" />
              <line x1="12" x2="12" y1="4" y2="20" />
            </svg>
            <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", color: "#9A8B73" }}>text ↗</span>
          </button>
          <button
            type="button"
            style={{
              height: "32px",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              padding: "0 10px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A8B73" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
              <path d="M6 8h.001" />
              <path d="M10 8h.001" />
              <path d="M14 8h.001" />
              <path d="M18 8h.001" />
              <path d="M8 12h.001" />
              <path d="M12 12h.001" />
              <path d="M16 12h.001" />
              <path d="M7 16h10" />
            </svg>
            <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", color: "#9A8B73" }}>keyboard ↗</span>
          </button>
        </div>
      </div>
    </div>
  );
}
