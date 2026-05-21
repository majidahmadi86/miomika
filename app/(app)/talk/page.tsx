"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { MicButton, type MicState } from "@/components/talk/MicButton";
import { MiomiLive, type MiomiState } from "@/components/talk/MiomiLive";
import { WordCardV3, type VocabularyEntry } from "@/components/talk/WordCardV3";
import { matchLibrary } from "@/lib/library/matcher";
import { resolveWordCard } from "@/lib/library/resolver";
import { getSessionOpener } from "@/lib/library/sessionOpener";
import { getCorrectReaction } from "@/lib/library/reactions";

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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [textInput, setInputText] = useState("");

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTo({
        top: canvasRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [canvasItems]);

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
    // No TTS for Miomi speech — subtitle only
    window.setTimeout(() => setMiomiState("idle"), 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setInputText("");

    // Add user echo
    setCanvasItems(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "user_echo" as const,
      text: text.trim(),
    }]);

    // Library-first routing
    const template = matchLibrary(text.trim(), { wordsIntroduced });

    if (template) {
      setSubtitleTh(template.response.speech_th);
      setSubtitleEn(template.response.speech_en);
      setMiomiState(template.miomi_state_during as MiomiState);

      if (template.follow_up?.type === "word_card" && template.follow_up.payload_resolver) {
        const word = await resolveWordCard(
          template.follow_up.payload_resolver,
          (template.follow_up.payload_params ?? {}) as Record<string, unknown>,
          text.trim(),
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
        } else {
          window.setTimeout(() => setMiomiState("idle"), 2000);
        }
      } else {
        window.setTimeout(() => setMiomiState("idle"), 2000);
      }
    } else {
      setSubtitleTh("หนูเข้าใจค่า~ กำลังคิดให้นะคะ");
      setSubtitleEn("I understand~ let me think...");
      setMiomiState("thinking");
      window.setTimeout(() => setMiomiState("idle"), 2000);
    }
  }, [wordsIntroduced]);

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

      {/* MIOMI STAGE — 200px */}
      <div
        style={{
          height: "200px",
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

        {/* Miomi head — 160px */}
        <MiomiLive state={miomiState} size={160} />

        {/* Subtitle */}
        <div
          style={{
            marginTop: "4px",
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
        ref={canvasRef}
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
                    window.setTimeout(() => setMiomiState("idle"), 1200);
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

      {/* MIC ZONE */}
      <div
        style={{
          height: "auto",
          minHeight: "120px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "#FAFAF6",
          borderTop: "1px solid rgba(232,229,223,0.6)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 8px)",
          paddingTop: "12px",
        }}
      >
        <MicButton
          state={micState}
          language="auto"
          onTranscript={async (text, isFinal) => {
            if (!isFinal) return;
            setLastTranscript(text);
            await processUserInput(text);
          }}
          onStateChange={setMicState}
        />

        <div style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          width: "100%",
          padding: "0 20px",
        }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && textInput.trim()) {
                void processUserInput(textInput);
              }
            }}
            placeholder="พิมพ์ที่นี่ค่า~"
            style={{
              flex: 1,
              height: "36px",
              borderRadius: "999px",
              border: "1px solid #EDE8E0",
              background: "rgba(255,255,255,0.9)",
              padding: "0 14px",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              color: "#1A1A18",
              outline: "none",
            }}
          />
          {textInput.trim() && (
            <button
              type="button"
              onClick={() => void processUserInput(textInput)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
