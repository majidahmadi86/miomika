"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { MicButton, type MicState } from "@/components/talk/MicButton";
import { MiomiLive, type MiomiState } from "@/components/talk/MiomiLive";
import { WordCardV3, type VocabularyEntry } from "@/components/talk/WordCardV3";
import { matchLibrary } from "@/lib/library/matcher";
import { resolveWordCard } from "@/lib/library/resolver";
import { getSessionOpener } from "@/lib/library/sessionOpener";
import { getCorrectReaction } from "@/lib/library/reactions";
import { useProfile } from "@/lib/auth/use-profile";

export default function TalkPage() {
  const GUEST_LIMIT = 5;
  const GUEST_COUNTER_KEY = "miomika.guest_exchanges";
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const [guestExchanges, setGuestExchangesRaw] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const TRANSCRIPT_CLIP = 180;
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const [uiLang, setUiLang] = useState<"th" | "en">("th");
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

  // Hydrate from localStorage on mount (client-only).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    if (!isNaN(parsed) && parsed > 0) {
      setGuestExchangesRaw(parsed);
    }
  }, []);

  // Clear counter when user converts from guest to logged-in.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authReady && !isGuest) {
      window.localStorage.removeItem(GUEST_COUNTER_KEY);
      setGuestExchangesRaw(0);
    }
  }, [authReady, isGuest]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on every change.
  const setGuestExchanges = useCallback((updater: number | ((prev: number) => number)) => {
    setGuestExchangesRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(GUEST_COUNTER_KEY, String(next));
      }
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTo({
        top: canvasRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [canvasItems]);

  // TODO(phase-3): refactor miomiState to derive synchronously from micState.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (micState === "listening") setMiomiState("listening");
    else if (micState === "processing") setMiomiState("thinking");
    else if (micState === "speaking") setMiomiState("speaking");
    else setMiomiState("idle");
  }, [micState]);

  // TODO(phase-3): replace with useUILanguage from lib/i18n/client.ts.
  useEffect(() => {
    const lang = navigator.language || "th";
    if (lang.startsWith("en")) {
      setUiLang("en");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const opener = getSessionOpener({
      isFirstSession: true,
      hoursSinceLastSession: null,
      streakDays: 0,
    });

    const openerTh = uiLang === "en"
      ? "Hi~ I'm Miomi! Want to learn Thai today? or improve your English?"
      : opener.speech_th;
    const openerEn = uiLang === "en"
      ? "พูดหรือพิมพ์อะไรก็ได้ค่า~"
      : opener.speech_en;

    // TODO(phase-3): move opener selection out of effect (compute synchronously).
    /* eslint-disable react-hooks/set-state-in-effect */
    setSubtitleTh(uiLang === "en" ? "Hi~ I'm Miomi!" : "สวัสดีค่า~");
    setCanvasItems([{
      id: crypto.randomUUID(),
      type: "miomi_message" as const,
      textTh: openerTh,
      textEn: openerEn,
    }]);
    window.setTimeout(() => setMiomiState("idle"), 1000);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [uiLang]);

  const processUserInput = useCallback(async (text: string) => {
    // Authoritative gate — hold messages until auth resolves.
    if (!authReady) {
      return;
    }
    if (isGuest && guestExchanges >= GUEST_LIMIT) {
      setShowGuestSheet(true);
      return;
    }

    if (!text.trim()) return;
    setInputText("");

    // Increment counter the moment a guest commits a message,
    // BEFORE library/AI routing — library matches must count.
    if (isGuest) {
      setGuestExchanges((prev) => prev + 1);
    }

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
          setMiomiState("teaching");
          setSubtitleTh("หนูสอนคำใหม่ให้ค่า~");
          window.setTimeout(() => {
            setCanvasItems(prev => [...prev, {
              id: crypto.randomUUID(),
              type: "word_card" as const,
              word,
            }]);
            setMiomiState("idle");
          }, 800);
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
            sessionInstruction: uiLang === "en"
              ? "You are Miomi, a warm kawaii cat language teacher. The user is an English speaker learning Thai. ALWAYS respond in English. Keep Thai words in quotes with pronunciation. Under 60 words. Always end with one question."
              : "You are Miomi, a warm kawaii cat language teacher. Respond in Thai first, then English below. Under 60 words. Always end with one question.",
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
  }, [wordsIntroduced, canvasItems, isGuest, guestExchanges, GUEST_LIMIT, uiLang, authReady, setGuestExchanges]);

  // Default to "auto" (which MicButton resolves to en-US — safe for both languages).
  // Only force "th-TH" when user has explicitly set Thai as both UI and primary.
  const recognitionLang: "th-TH" | "en-US" | "auto" =
    profile?.ui_language === "th" &&
    (profile as { primary_language?: string } | null)?.primary_language === "th"
      ? "th-TH"
      : "auto";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#FAFAF6",
      }}
    >
      {/* TOP BAR — sticky with safe-area */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          background: "rgba(250, 250, 246, 0.95)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(232, 229, 223, 0.4)",
          minHeight: "44px",
          flexShrink: 0,
        }}
      >
        <Link
          href="/home"
          aria-label="Back to home"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            color: "#3D352B",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={22} strokeWidth={2} />
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
              {uiLang === "en"
                ? `${Math.max(0, GUEST_LIMIT - guestExchanges)} left`
                : `เหลืออีก ${Math.max(0, GUEST_LIMIT - guestExchanges)} ครั้ง`}
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
          {micState === "processing" && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "4px",
                marginTop: "8px",
              }}
              aria-label="Miomi is thinking"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#C9A96E",
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
          )}
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
              {uiLang === "en" ? "Speak or type to begin~" : "พูดหรือพิมพ์เพื่อเริ่มต้นค่า~"}
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
                    {(() => {
                      const fullText = item.text ?? "";
                      const isLong = fullText.length > TRANSCRIPT_CLIP;
                      const isExpanded = expandedItems.has(item.id);
                      const displayText = !isLong || isExpanded ? fullText : fullText.slice(0, TRANSCRIPT_CLIP) + "…";
                      return (
                        <>
                          <p style={{
                            fontFamily: "'Quicksand', sans-serif",
                            fontSize: "13px",
                            color: "#3D352B",
                            lineHeight: 1.5,
                            margin: "2px 0 0",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}>
                            {displayText}
                          </p>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              style={{
                                marginTop: "4px",
                                background: "none",
                                border: "none",
                                padding: 0,
                                color: "#9A8B73",
                                fontSize: "12px",
                                fontFamily: "'Quicksand', sans-serif",
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                            >
                              {isExpanded
                                ? (uiLang === "en" ? "Show less" : "ย่อ")
                                : (uiLang === "en" ? "Show more" : "ดูเพิ่ม")}
                            </button>
                          )}
                        </>
                      );
                    })()}
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
                        fontFamily: uiLang === "en" ? "'Sarabun', sans-serif" : "'Kanit', sans-serif",
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#1A1A18",
                        lineHeight: 1.65,
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}>
                        {uiLang === "en" && item.textEn ? item.textEn : item.textTh}
                      </p>
                      {((uiLang === "en" && item.textTh) || (uiLang === "th" && item.textEn)) && (
                        <p style={{
                          fontFamily: uiLang === "en" ? "'Sarabun', sans-serif" : "'Quicksand', sans-serif",
                          fontSize: "12px",
                          color: "#9A8B73",
                          marginTop: "4px",
                          lineHeight: 1.5,
                          margin: "4px 0 0",
                        }}>
                          {uiLang === "en" ? item.textTh : item.textEn}
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
          language={recognitionLang}
          onTranscript={async (text, isFinal) => {
            if (!isFinal) return;
            setLastTranscript(text);
            await processUserInput(text);
          }}
          onStateChange={setMicState}
          locked={isGuest && guestExchanges >= GUEST_LIMIT}
          onLockedTap={() => setShowGuestSheet(true)}
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
            placeholder={uiLang === "en" ? "Type here~" : "พิมพ์ที่นี่ค่า~"}
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
                background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
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

      {showGuestSheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,26,24,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: "100%",
              background: "#FFFFFF",
              borderRadius: "28px 28px 0 0",
              paddingBottom: "env(safe-area-inset-bottom, 24px)",
              boxShadow: "0 -8px 40px rgba(26,26,24,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "14px", marginBottom: "8px" }}>
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Image
                src="/miomi/head-happy.png"
                alt="Miomi"
                width={130}
                height={130}
                style={{ objectFit: "contain" }}
              />
            </div>

            <div style={{ textAlign: "center", padding: "0 28px", marginBottom: "20px" }}>
              <p style={{
                fontFamily: "'Kanit', sans-serif",
                fontSize: "22px",
                fontWeight: 600,
                color: "#1A1A18",
                margin: "0 0 8px",
                lineHeight: 1.3,
              }}>
                {uiLang === "en"
                  ? "I want to remember you~"
                  : "หนูอยากจำคุณได้ค่า~"}
              </p>
              <p style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "14px",
                color: "#9A8B73",
                margin: 0,
                lineHeight: 1.5,
              }}>
                {uiLang === "en"
                  ? "Sign up free — I'll remember everything we learned together"
                  : "สมัครฟรีได้เลยค่า — หนูจะจำทุกอย่างที่เราเรียนด้วยกัน"}
              </p>
            </div>

            <div style={{
              background: "#FAFAF6",
              borderRadius: "16px",
              padding: "16px 20px",
              margin: "0 24px 24px",
            }}>
              {[
                {
                  th: "หนูจำชื่อและความก้าวหน้าของคุณได้",
                  en: "I remember your name and progress",
                },
                {
                  th: "คำศัพท์ที่เรียนสะสมไว้ไม่หายไป",
                  en: "Your vocabulary stays saved forever",
                },
                {
                  th: "คุยกับหนูได้ไม่จำกัด ฟรี",
                  en: "Chat with me unlimited, free",
                },
              ].map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    marginBottom: i < 2 ? "12px" : 0,
                  }}
                >
                  <span style={{
                    color: "#C9A96E",
                    fontSize: "16px",
                    lineHeight: 1,
                    marginTop: "2px",
                    flexShrink: 0,
                  }}>
                    ✦
                  </span>
                  <div>
                    <p style={{
                      fontFamily: "'Kanit', sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1A1A18",
                      margin: "0 0 2px",
                    }}>
                      {uiLang === "en" ? b.en : b.th}
                    </p>
                    <p style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "12px",
                      color: "#9A8B73",
                      margin: 0,
                    }}>
                      {uiLang === "en" ? b.th : b.en}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/signup"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "56px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "18px",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  textDecoration: "none",
                  boxShadow: "0 6px 20px -4px rgba(201,169,110,0.45)",
                }}
              >
                {uiLang === "en" ? "Sign up free~" : "สมัครฟรีเลยค่า~"}
              </Link>

              <button
                type="button"
                onClick={() => setShowGuestSheet(false)}
                style={{
                  height: "48px",
                  borderRadius: "999px",
                  background: "none",
                  border: "1.5px solid #EDE8E0",
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#9A8B73",
                  cursor: "pointer",
                }}
              >
                {uiLang === "en" ? "Maybe later~" : "ไว้ทีหลังนะคะ~"}
              </button>
            </div>

            <p style={{
              textAlign: "center",
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "11px",
              color: "#C4BDB5",
              marginTop: "12px",
              paddingBottom: "8px",
            }}>
              {uiLang === "en" ? "No credit card · No ads · Free forever" : "ไม่ต้องใช้บัตรเครดิต · ไม่มีโฆษณา · ฟรีตลอด"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
