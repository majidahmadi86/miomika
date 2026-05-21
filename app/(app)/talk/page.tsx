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
  const [canvasItems, setCanvasItems] = useState<Array<{
    id: string;
    type: "word_card" | "user_echo" | "miomi_message";
    word?: VocabularyEntry;
    text?: string;
    textTh?: string;
    textEn?: string;
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
    setSubtitleTh("สวัสดีค่า~");
    setCanvasItems([{
      id: crypto.randomUUID(),
      type: "miomi_message" as const,
      textTh: opener.speech_th,
      textEn: opener.speech_en,
    }]);
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
      setSubtitleTh("หนูตอบแล้วค่า~");
      setMiomiState(template.miomi_state_during as MiomiState);
      setCanvasItems(prev => [...prev, {
        id: crypto.randomUUID(),
        type: "miomi_message" as const,
        textTh: template.response.speech_th,
        textEn: template.response.speech_en,
      }]);

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
            setSubtitleTh("หนูสอนคำใหม่ให้ค่า~");
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
      // No library match — call AI
      setSubtitleTh("กำลังคิดให้ค่า...");
      setMiomiState("thinking");

      try {
        const res = await fetch("/api/miomi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: text.trim() }],
            isGuest: true,
            sessionInstruction: "You are Miomi, a warm kawaii cat language teacher. Respond warmly in Thai first, then English below. Keep response under 60 words total. Never break character. Always end with one question.",
            sessionContext: {
              exchangeNumber: canvasItems.filter(i => i.type === "user_echo").length,
              estimatedLevel: "elementary",
              sessionArc: "opening",
              currentTargetWord: null,
              emotionalMomentum: "neutral",
              wordsIntroduced: wordsIntroduced,
            },
            sessionId: crypto.randomUUID(),
            userId: null,
          }),
        });

        if (res.ok) {
          const data = await res.json() as { content?: string };
          const content = data.content ?? "";
          const parts = content.split(/\n\n+/);
          const textTh = parts[0]?.trim() ?? content;
          const textEn = parts[1]?.trim() ?? "";

          setSubtitleTh("หนูตอบแล้วค่า~");
          setMiomiState("speaking");
          setCanvasItems(prev => [...prev, {
            id: crypto.randomUUID(),
            type: "miomi_message" as const,
            textTh,
            textEn,
          }]);
          window.setTimeout(() => setMiomiState("idle"), 2000);
        } else {
          throw new Error("API failed");
        }
      } catch {
        setSubtitleTh("หนูขอโทษค่า~");
        setMiomiState("idle");
        setCanvasItems(prev => [...prev, {
          id: crypto.randomUUID(),
          type: "miomi_message" as const,
          textTh: "หนูขอโทษค่า~ มีบางอย่างผิดพลาด ลองพูดใหม่นะคะ",
          textEn: "Sorry~ something went wrong. Please try again.",
        }]);
      }
    }
  }, [wordsIntroduced, canvasItems]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#FAFAF6",
        paddingTop: "env(safe-area-inset-top, 0px)",
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
          position: "relative",
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

      {/* MIOMI STAGE */}
      <div
        style={{
          height: "180px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "8px",
          position: "relative",
          overflow: "visible",
          zIndex: 2,
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

        {/* Miomi head */}
        <MiomiLive state={miomiState} size={130} />

        {/* Subtitle — short emotional cue only */}
        <div
          style={{
            marginTop: "6px",
            textAlign: "center",
            padding: "0 32px",
            maxWidth: "320px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#9A8B73",
              lineHeight: 1.4,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitleTh}
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
            {canvasItems.map(item => {
              if (item.type === "word_card" && item.word) {
                return (
                  <WordCardV3
                    key={item.id}
                    word={item.word}
                    direction="th_to_en"
                    onPronunciationCheck={(w) => {
                      const reaction = getCorrectReaction({ type: "pronunciation", word: w.word_en });
                      setSubtitleTh("เก่งมากค่า~");
                      setCanvasItems(prev => [...prev, {
                        id: crypto.randomUUID(),
                        type: "miomi_message" as const,
                        textTh: reaction.speech_th,
                        textEn: reaction.speech_en,
                      }]);
                      setMiomiState("reacting");
                      window.setTimeout(() => setMiomiState("idle"), 1200);
                    }}
                  />
                );
              }
              if (item.type === "user_echo" && item.text) {
                return (
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
                );
              }
              if (item.type === "miomi_message") {
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                      marginBottom: "4px",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        background: "#FFFFFF",
                        border: "1px solid #EDE8E0",
                        borderRadius: "4px 20px 20px 20px",
                        padding: "12px 16px",
                        boxShadow: "0 1px 3px rgba(26,26,24,0.04)",
                      }}
                    >
                      <p style={{
                        fontFamily: "'Kanit', sans-serif",
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#1A1A18",
                        lineHeight: 1.65,
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}>
                        {item.textTh}
                      </p>
                      {item.textEn && (
                        <p style={{
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: "12px",
                          color: "#9A8B73",
                          marginTop: "4px",
                          lineHeight: 1.5,
                          margin: "4px 0 0",
                        }}>
                          {item.textEn}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
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
