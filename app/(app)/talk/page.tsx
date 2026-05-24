"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Keyboard, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";
import { MicButton, type MicState, type MicButtonHandle } from "@/components/talk/MicButton";
import { FuelPill } from "@/components/talk/FuelPill";
import { VoiceOrb, type OrbState } from "@/components/talk/VoiceOrb";
import { ModeStrip } from "@/components/talk/ModeStrip";
import { MiniCatRow } from "@/components/talk/MiniCatRow";
import { PracticeCard } from "@/components/talk/PracticeCard";
import { AdjustSheet } from "@/components/talk/AdjustSheet";
import { type VocabularyEntry } from "@/components/talk/WordCardV3";
import { matchLibrary } from "@/lib/library/matcher";
import { resolveWordCard } from "@/lib/library/resolver";
import { getSessionOpener } from "@/lib/library/sessionOpener";
import { type TalkConfig, loadTalkConfig, saveTalkConfig, DEFAULT_TALK_CONFIG } from "@/lib/talk/modes";

type CanvasItem =
  | { id: string; kind: "mini_cat"; textTh: string; textEn: string }
  | { id: string; kind: "practice"; word: VocabularyEntry; position: number; total: number; topic?: string }
  | { id: string; kind: "draft"; channel: string; label: string; body: string }
  | { id: string; kind: "user_said"; text: string };

const GUEST_LIMIT = 5;
const GUEST_COUNTER_KEY = "miomika.guest_exchanges";
const TRANSCRIPT_CLIP = 180;

export default function TalkPage() {
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();

  const [config, setConfig] = useState<TalkConfig>(DEFAULT_TALK_CONFIG);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [uiLang, setUiLang] = useState<"th" | "en">("th");
  const [micState, setMicState] = useState<MicState>("idle");
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [textInput, setTextInput] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [wordsIntroduced, setWordsIntroduced] = useState<string[]>([]);
  const [guestExchanges, setGuestExchangesRaw] = useState(0);
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const micRef = useRef<MicButtonHandle>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setConfig(loadTalkConfig());
    const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    if (!isNaN(parsed) && parsed > 0) setGuestExchangesRaw(parsed);
    const lang = navigator.language || "th";
    if (lang.startsWith("en")) setUiLang("en");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authReady && !isGuest) {
      window.localStorage.removeItem(GUEST_COUNTER_KEY);
      setGuestExchangesRaw(0);
    }
  }, [authReady, isGuest]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setGuestExchanges = useCallback((updater: number | ((p: number) => number)) => {
    setGuestExchangesRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") window.localStorage.setItem(GUEST_COUNTER_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.scrollTo({ top: canvasRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [items]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (items.length > 0) return;
    const opener = getSessionOpener({ isFirstSession: true, hoursSinceLastSession: null, streakDays: 0 });
    setItems([
      {
        id: crypto.randomUUID(),
        kind: "mini_cat",
        textTh: opener.speech_th,
        textEn: opener.speech_en,
      },
    ]);
  }, [items.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const orbState: OrbState = (() => {
    if (authReady && isGuest && guestExchanges >= GUEST_LIMIT) return "locked";
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const fuelHeart = ((profile as { mood?: number } | null)?.mood ?? 0.82) * 100;
  const fuelZap = 64;
  const fuelBrain = 45;

  const triggerMic = useCallback(() => {
    micRef.current?.start();
  }, []);

  const processInput = useCallback(
    async (text: string) => {
      if (!authReady) return;
      if (isGuest && guestExchanges >= GUEST_LIMIT) {
        setShowGuestSheet(true);
        return;
      }
      if (!text.trim()) return;

      setItems((prev) => [...prev, { id: crypto.randomUUID(), kind: "user_said", text: text.trim() }]);
      setTextInput("");

      if (isGuest) setGuestExchanges((p) => p + 1);

      const template = matchLibrary(text.trim(), { wordsIntroduced });
      if (template) {
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            kind: "mini_cat",
            textTh: template.response.speech_th,
            textEn: template.response.speech_en,
          },
        ]);

        if (template.follow_up?.type === "word_card" && template.follow_up.payload_resolver) {
          const word = await resolveWordCard(
            template.follow_up.payload_resolver,
            (template.follow_up.payload_params ?? {}) as Record<string, unknown>,
            text.trim(),
            wordsIntroduced
          );
          if (word) {
            setWordsIntroduced((p) => [...p, word.word_en]);
            window.setTimeout(() => {
              setItems((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  kind: "practice",
                  word,
                  position: wordsIntroduced.length + 1,
                  total: 3,
                  topic: undefined,
                },
              ]);
            }, 600);
          }
        }
        return;
      }

      try {
        const res = await fetch("/api/miomi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: text.trim() }],
            sessionInstruction:
              uiLang === "en"
                ? "You are Miomi, a warm kawaii cat companion. Respond in English first, Thai phrases in quotes if relevant. Under 50 words. End with one question or invitation."
                : "You are Miomi, a warm kawaii cat companion. Respond in Thai first, English below. Under 50 words. End with one question or invitation.",
            sessionContext: {
              exchangeNumber: items.filter((i) => i.kind === "user_said").length,
              wordsIntroduced,
            },
          }),
        });
        if (!res.ok) throw new Error("api failed");
        const data = (await res.json()) as { content?: string };
        const content = data.content ?? "";
        const parts = content.split(/\n\n+/);
        const textTh = parts[0]?.trim() ?? content;
        const textEn = parts[1]?.trim() ?? "";
        setItems((prev) => [...prev, { id: crypto.randomUUID(), kind: "mini_cat", textTh, textEn }]);
      } catch {
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            kind: "mini_cat",
            textTh: "หนูขอโทษค่า~ มีบางอย่างผิดพลาด",
            textEn: "Sorry~ something went wrong.",
          },
        ]);
      }
    },
    [authReady, isGuest, guestExchanges, wordsIntroduced, uiLang, items, setGuestExchanges]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setItems([]);
    setExpandedItems(new Set());
  }, []);

  const handleOrbTap = useCallback(() => {
    if (orbState === "locked") {
      setShowGuestSheet(true);
      return;
    }
    if (micState === "listening") {
      micRef.current?.stop();
      return;
    }
    micRef.current?.start();
  }, [orbState, micState]);

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#FAFAF6",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "54px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          paddingTop: "calc(env(safe-area-inset-top, 0px))",
          background: "rgba(250,250,246,0.96)",
          borderBottom: "0.5px solid rgba(232,229,223,0.5)",
        }}
      >
        <Link
          href="/home"
          aria-label="Back"
          style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3D352B", textDecoration: "none" }}
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </Link>

        {authReady && isGuest ? (
          <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, color: "#9A8B73", background: "rgba(255,255,255,0.88)", border: "0.5px solid #EDE8E0", borderRadius: "999px", padding: "5px 12px" }}>
            {uiLang === "en" ? `${Math.max(0, GUEST_LIMIT - guestExchanges)} left` : `เหลืออีก ${Math.max(0, GUEST_LIMIT - guestExchanges)} ครั้ง`}
          </span>
        ) : (
          <FuelPill heart={fuelHeart} zap={fuelZap} brain={fuelBrain} />
        )}

        <button
          type="button"
          onClick={() => setAdjustOpen(true)}
          aria-label="Adjust"
          style={{ width: "36px", height: "36px", borderRadius: "50%", background: "transparent", border: "none", color: "#9A8B73", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="21" y1="6" x2="14" y2="6" />
            <line x1="10" y1="6" x2="3" y2="6" />
            <line x1="21" y1="12" x2="12" y2="12" />
            <line x1="8" y1="12" x2="3" y2="12" />
            <line x1="21" y1="18" x2="16" y2="18" />
            <line x1="12" y1="18" x2="3" y2="18" />
            <line x1="14" y1="9" x2="14" y2="3" />
            <line x1="8" y1="15" x2="8" y2="9" />
            <line x1="16" y1="21" x2="16" y2="15" />
          </svg>
        </button>
      </div>

      <ModeStrip
        mode={config.mode}
        isLive={micState === "listening" || micState === "processing"}
        uiLang={uiLang}
        onTap={() => setAdjustOpen(true)}
      />

      <div
        ref={canvasRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "14px 14px 0",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {items.length <= 1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 18px", position: "relative" }}>
            <div style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,168,212,0.16) 0%, transparent 65%)", top: "-10px", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: "260px", height: "260px", borderRadius: "50%", border: "1px solid rgba(232,199,122,0.2)", animation: "ringBreatheBig 3.8s ease-in-out infinite", top: "-10px" }} />
            <div style={{ width: "200px", height: "200px", borderRadius: "50%", background: "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, animation: "catBreatheBig 4s ease-in-out infinite" }}>
              <Image src="/characters/miomi/full/idle.png" alt="Miomi" width={172} height={172} style={{ objectFit: "contain" }} priority />
            </div>
            <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "15px", fontWeight: 500, color: "#3D352B", margin: "22px 0 4px", textAlign: "center" }}>
              {uiLang === "en" ? "I'm ready~" : "หนูพร้อมแล้วค่า~"}
            </p>
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "12px", color: "#9A8B73", margin: 0, textAlign: "center" }}>
              {uiLang === "en" ? "just start talking · I'll keep up" : "พูดอะไรก็ได้ค่า~ หนูเข้าใจ"}
            </p>
          </div>
        )}

        {items.map((item) => {
          if (item.kind === "mini_cat") {
            return <MiniCatRow key={item.id} textTh={item.textTh} textEn={item.textEn} uiLang={uiLang} />;
          }
          if (item.kind === "user_said") {
            const fullText = item.text;
            const isLong = fullText.length > TRANSCRIPT_CLIP;
            const isExpanded = expandedItems.has(item.id);
            const display = !isLong || isExpanded ? fullText : fullText.slice(0, TRANSCRIPT_CLIP) + "…";
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    maxWidth: "78%",
                    background: "linear-gradient(135deg, #FFF8F2 0%, #FFEFE0 100%)",
                    border: "0.5px solid rgba(232,199,122,0.35)",
                    borderRadius: "18px 4px 18px 18px",
                    padding: "11px 14px",
                  }}
                >
                  <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "14px", color: "#1A1A18", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {display}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      style={{ marginTop: "4px", background: "none", border: "none", padding: 0, color: "#9A8B73", fontSize: "12px", fontFamily: "'Quicksand', sans-serif", textDecoration: "underline", cursor: "pointer" }}
                    >
                      {isExpanded ? (uiLang === "en" ? "Show less" : "ย่อ") : (uiLang === "en" ? "Show more" : "ดูเพิ่ม")}
                    </button>
                  )}
                </div>
              </div>
            );
          }
          if (item.kind === "practice") {
            return (
              <PracticeCard
                key={item.id}
                word={item.word}
                position={item.position}
                total={item.total}
                topic={item.topic}
                uiLang={uiLang}
                onHear={() => { /* future TTS hook */ }}
                onSpeak={triggerMic}
                onCopy={() => {
                  void navigator.clipboard.writeText(item.word.word_th);
                }}
                onNext={() => { /* engine advances */ }}
              />
            );
          }
          return null;
        })}

        <div style={{ height: "8px" }} />
      </div>

      {keyboardMode ? (
        <div style={{ flexShrink: 0, padding: "10px 12px 14px", background: "linear-gradient(180deg, rgba(250,250,246,0) 0%, #FAFAF6 30%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", border: "0.5px solid #EDE8E0", borderRadius: "26px", padding: "5px 5px 5px 16px", boxShadow: "0 2px 10px rgba(26,26,24,0.04)" }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  void processInput(textInput);
                }
              }}
              placeholder={uiLang === "en" ? "Message Miomi~" : "พิมพ์ถึงหนู~"}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'Kanit', sans-serif", fontSize: "13.5px", color: "#1A1A18", padding: "8px 0" }}
            />
            <button
              type="button"
              onClick={() => setKeyboardMode(false)}
              aria-label="Use voice"
              style={{ width: "34px", height: "34px", borderRadius: "50%", background: "transparent", border: "none", color: "#9A8B73", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
            >
              <Plus size={17} strokeWidth={2} />
            </button>
            {textInput.trim() && (
              <button
                type="button"
                onClick={() => void processInput(textInput)}
                aria-label="Send"
                style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", padding: "12px 16px 16px", position: "relative" }}>
          <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
            <MicButton
              ref={micRef}
              state={micState}
              language="auto"
              onTranscript={async (text, isFinal) => {
                if (!isFinal) return;
                await processInput(text);
              }}
              onStateChange={setMicState}
              locked={authReady && isGuest && guestExchanges >= GUEST_LIMIT}
              onLockedTap={() => setShowGuestSheet(true)}
            />
          </div>
          <VoiceOrb
            state={orbState}
            onTap={handleOrbTap}
            ariaLabel={
              orbState === "listening"
                ? uiLang === "en"
                  ? "Stop listening"
                  : "หยุดฟัง"
                : uiLang === "en"
                  ? "Tap to talk with Miomi"
                  : "แตะเพื่อพูดกับหนู"
            }
          />
          <button
            type="button"
            onClick={() => setKeyboardMode(true)}
            aria-label="Use keyboard"
            style={{ position: "absolute", right: "24px", width: "36px", height: "36px", borderRadius: "50%", background: "transparent", border: "0.5px solid #EDE8E0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Keyboard size={16} color="#9A8B73" strokeWidth={2} />
          </button>
        </div>
      )}

      {items.length > 1 && (
        <button
          type="button"
          onClick={handleClear}
          style={{ position: "absolute", top: "62px", right: "12px", background: "rgba(255,255,255,0.88)", border: "0.5px solid #EDE8E0", borderRadius: "999px", padding: "4px 12px", fontFamily: "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 600, color: "#9A8B73", cursor: "pointer", zIndex: 5 }}
        >
          {uiLang === "en" ? "Clear" : "ล้าง"}
        </button>
      )}

      <AdjustSheet
        open={adjustOpen}
        config={config}
        uiLang={uiLang}
        onSave={(c) => {
          setConfig(c);
          saveTalkConfig(c);
          setAdjustOpen(false);
        }}
        onClose={() => setAdjustOpen(false)}
        onMiomiHelp={(topic) => {
          setAdjustOpen(false);
          const promptTh = topic === "pillars"
            ? "ช่วยหนูตั้งเสาหลักของเนื้อหาให้หน่อยค่า~"
            : topic === "niche"
              ? "ช่วยหนูหานิชของฉันหน่อยค่า~"
              : "ช่วยหนูตั้งสไตล์เนื้อหาให้หน่อยค่า~";
          void processInput(promptTh);
        }}
      />

      {showGuestSheet && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(26,26,24,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }} style={{ width: "100%", background: "#FFFFFF", borderRadius: "28px 28px 0 0", paddingBottom: "env(safe-area-inset-bottom, 24px)", boxShadow: "0 -8px 40px rgba(26,26,24,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "14px", marginBottom: "8px" }}>
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Image src="/characters/miomi/head/idle.png" alt="Miomi" width={130} height={130} />
            </div>
            <div style={{ textAlign: "center", padding: "0 28px", marginBottom: "20px" }}>
              <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "22px", fontWeight: 600, color: "#1A1A18", margin: "0 0 8px", lineHeight: 1.3 }}>
                {uiLang === "en" ? "I want to remember you~" : "หนูอยากจำคุณได้ค่า~"}
              </p>
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "14px", color: "#9A8B73", margin: 0, lineHeight: 1.5 }}>
                {uiLang === "en" ? "Sign up free — I'll keep everything we learned today" : "สมัครฟรีได้เลยค่า — หนูจะจำทุกอย่างที่เราเรียนด้วยกัน"}
              </p>
            </div>
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "56px", borderRadius: "999px", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", fontFamily: "'Kanit', sans-serif", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", textDecoration: "none", boxShadow: "0 6px 20px -4px rgba(201,169,110,0.45)" }}>
                {uiLang === "en" ? "Stay with me ✦" : "อยู่กับหนูค่า ✦"}
              </Link>
              <button type="button" onClick={() => setShowGuestSheet(false)} style={{ height: "44px", borderRadius: "999px", background: "none", border: "1.5px solid #EDE8E0", fontFamily: "'Quicksand', sans-serif", fontSize: "14px", fontWeight: 600, color: "#9A8B73", cursor: "pointer" }}>
                {uiLang === "en" ? "Maybe later~" : "ไว้ทีหลังนะคะ~"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        @keyframes catBreatheBig { 0%,100% { transform:scale(1); } 50% { transform:scale(1.02); } }
        @keyframes ringBreatheBig { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.06); opacity:0.8; } }
      `}</style>
    </div>
  );
}
