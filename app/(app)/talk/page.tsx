"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";
import { MicButton, type MicState, type MicButtonHandle } from "@/components/talk/MicButton";
import { FuelPill } from "@/components/talk/FuelPill";
import { type OrbState } from "@/components/talk/VoiceOrb";
import { PersistentMiomi, type MiomiMood } from "@/components/talk/PersistentMiomi";
import { MicRow } from "@/components/talk/MicRow";
import { Toolbox, type ResponseLength } from "@/components/talk/Toolbox";
import { MiniCatRow } from "@/components/talk/MiniCatRow";
import { PracticeCard } from "@/components/talk/PracticeCard";
import {
  PronunciationCardV1,
  type PronunciationLessonPayload,
} from "@/components/talk/PronunciationCardV1";
import { AdjustSheet } from "@/components/talk/AdjustSheet";
import { type VocabularyEntry } from "@/components/talk/WordCardV3";
import { type TalkConfig, loadTalkConfig, saveTalkConfig, DEFAULT_TALK_CONFIG } from "@/lib/talk/modes";
import { speak, stopTts, detectLangSwitchCommand, preloadTtsVoices, type TtsLang } from "@/lib/voice/tts";
import { pickIceBreaker, pickMasteryAdvanced, pickMasteryCelebration } from "@/lib/voice/warmth";

type IntroducedWordPayload = {
  word: string;
  word_th: string;
  word_en: string;
  cefr_level: string | null;
  emoji: string | null;
  mastery_level?: number;
};

type MasteryEventPayload = {
  type: "introduced" | "advanced" | "mastered" | "none";
  word?: string;
  newStage?: number;
} | null;

type MiomiApiResponse = {
  content?: string;
  servedVia?: string;
  wordCard?: IntroducedWordPayload | null;
  masteryEvent?: MasteryEventPayload;
  pronunciationLesson?: PronunciationLessonPayload | null;
};

type CanvasItem =
  | { id: string; kind: "mini_cat"; textTh: string; textEn: string }
  | { id: string; kind: "practice"; word: VocabularyEntry; position: number; total: number; topic?: string }
  | { id: string; kind: "pronunciation"; lesson: PronunciationLessonPayload; heardText?: string | null }
  | { id: string; kind: "user_said"; text: string };

const GUEST_LIMIT = 5;
const GUEST_COUNTER_KEY = "miomika.guest_exchanges";
const TRANSCRIPT_CLIP = 180;

function readGuestExchanges(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return !isNaN(parsed) && parsed > 0 ? parsed : 0;
}

function readUiLang(): "th" | "en" {
  if (typeof window === "undefined") return "th";
  const lang = navigator.language || "th";
  return lang.startsWith("en") ? "en" : "th";
}

function toVocabularyEntry(word: IntroducedWordPayload): VocabularyEntry {
  return {
    id: word.word_en,
    word_en: word.word_en,
    word_th: word.word_th,
    cefr_level: word.cefr_level ?? undefined,
    emoji: word.emoji ?? undefined,
  };
}

function makeOpenerItem(): CanvasItem {
  const iceBreaker = pickIceBreaker();
  return { id: crypto.randomUUID(), kind: "mini_cat", textTh: iceBreaker.th, textEn: iceBreaker.en };
}

/** Dominant language from this message's text; previous only when undecidable. */
function resolveMessageLang(text: string, previous: TtsLang): TtsLang {
  const switchCmd = detectLangSwitchCommand(text);
  if (switchCmd) return switchCmd;
  const thaiCount = text.match(/[\u0E00-\u0E7F]/g)?.length ?? 0;
  const latinCount = text.match(/[a-zA-Z]/g)?.length ?? 0;
  if (thaiCount === 0 && latinCount === 0) return previous;
  if (thaiCount >= 3 && thaiCount > latinCount) return "th";
  if (latinCount >= 3 && latinCount > thaiCount) return "en";
  return previous;
}

export default function TalkPage() {
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();

  const [config, setConfig] = useState<TalkConfig>(() =>
    typeof window !== "undefined" ? loadTalkConfig() : DEFAULT_TALK_CONFIG,
  );
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [uiLang, setUiLang] = useState<"th" | "en">(readUiLang);
  const [micState, setMicState] = useState<MicState>("idle");
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [textInput, setTextInput] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [wordsIntroduced, setWordsIntroduced] = useState<string[]>([]);
  const [respLength, setRespLength] = useState<ResponseLength>("normal");
  const [ttsOn, setTtsOn] = useState(true);
  const conversationLangRef = useRef<TtsLang>("th");
  const [conversationLang, setConversationLang] = useState<TtsLang>("th");
  const [guestExchangesRaw, setGuestExchangesRaw] = useState(readGuestExchanges);
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [masteryToast, setMasteryToast] = useState<{ th: string; en: string } | null>(null);
  const activePronunciationIdRef = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const micRef = useRef<MicButtonHandle>(null);
  const mountedRefForTts = useRef(true);

  useEffect(() => {
    mountedRefForTts.current = true;
    return () => {
      mountedRefForTts.current = false;
      stopTts();
    };
  }, []);

  const updateConversationLang = useCallback((lang: TtsLang) => {
    conversationLangRef.current = lang;
    setConversationLang(lang);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate localStorage + navigator prefs on mount */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setConfig(loadTalkConfig());
    const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    if (!isNaN(parsed) && parsed > 0) setGuestExchangesRaw(parsed);
    const navLang = navigator.language || "th";
    const isEnglishUser = navLang.startsWith("en");
    if (isEnglishUser) setUiLang("en");
    updateConversationLang(isEnglishUser ? "en" : "th");
    const ttsStored = window.localStorage.getItem("miomika.tts_on");
    if (ttsStored !== null) setTtsOn(ttsStored === "1");
    void preloadTtsVoices();
  }, [updateConversationLang]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!profile?.ui_language) return;
    const lang = profile.ui_language;
    queueMicrotask(() => updateConversationLang(lang));
  }, [profile?.ui_language, updateConversationLang]);

  /* eslint-disable react-hooks/set-state-in-effect -- session ice-breaker on fresh /talk open */
  useEffect(() => {
    if (items.length > 0 || !authReady) return;
    const iceBreaker = pickIceBreaker();
    const navIsTh =
      typeof window !== "undefined" && (navigator.language || "th").startsWith("th");
    const isThaiLeadUser =
      profile?.ui_language === "th" ||
      (profile?.ui_language !== "en" && navIsTh);
    const openerLang: TtsLang = isThaiLeadUser ? "th" : "en";
    updateConversationLang(openerLang);
    setItems([{ id: crypto.randomUUID(), kind: "mini_cat", textTh: iceBreaker.th, textEn: iceBreaker.en }]);
    // Speak the ice-breaker if TTS is on. Small delay so voices have time to load.
    if (ttsOn) {
      const speakText = isThaiLeadUser ? iceBreaker.th : iceBreaker.en;
      window.setTimeout(() => {
        if (!mountedRefForTts.current) return;
        setMicState("speaking");
        void speak(speakText, openerLang, {
          onEnd: () => { if (mountedRefForTts.current) setMicState("idle"); },
          onError: () => { if (mountedRefForTts.current) setMicState("idle"); },
        });
      }, 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, authReady, profile?.ui_language, uiLang]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- guest counter reset + auto-raise CTA on limit */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authReady && !isGuest) {
      window.localStorage.removeItem(GUEST_COUNTER_KEY);
      setGuestExchangesRaw(0);
    }
  }, [authReady, isGuest]);

  const guestExchanges = authReady && !isGuest ? 0 : guestExchangesRaw;

  // Auto-raise the guest CTA sheet the instant the limit is hit.
  useEffect(() => {
    if (authReady && isGuest && guestExchanges >= GUEST_LIMIT) {
      micRef.current?.stop();
      setMicState("idle");
      setShowGuestSheet(true);
    }
  }, [authReady, isGuest, guestExchanges]);
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

  const isLocked = authReady && isGuest && guestExchanges >= GUEST_LIMIT;

  const orbState: OrbState = (() => {
    if (isLocked) return "locked";
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const miomiMood: MiomiMood = (() => {
    if (micState === "listening") return "listening";
    if (micState === "processing") return "thinking";
    if (micState === "speaking") return "speaking";
    return "idle";
  })();

  const fuelHeart = ((profile as { mood?: number } | null)?.mood ?? 0.82) * 100;
  const fuelZap = 64;
  const fuelBrain = 45;

  const processInput = useCallback(
    async (text: string) => {
      if (!authReady) return;
      if (isLocked) {
        micRef.current?.stop();
        setMicState("idle");
        setShowGuestSheet(true);
        return;
      }
      if (!text.trim()) return;

      const trimmed = text.trim();
      const langFallback: TtsLang =
        profile?.ui_language === "en" || profile?.ui_language === "th"
          ? profile.ui_language
          : uiLang === "en"
            ? "en"
            : "th";
      const messageLang = resolveMessageLang(trimmed, langFallback);
      updateConversationLang(messageLang);

      const userItemId = crypto.randomUUID();
      setItems((prev) => {
        const next = [...prev, { id: userItemId, kind: "user_said" as const, text: trimmed }];
        if (activePronunciationIdRef.current) {
          return next.map((item) =>
            item.kind === "pronunciation" && item.id === activePronunciationIdRef.current
              ? { ...item, heardText: trimmed }
              : item,
          );
        }
        return next;
      });
      setTextInput("");

      if (isGuest) setGuestExchanges((p) => p + 1);

      try {
        const res = await fetch("/api/miomi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: trimmed }],
            sessionInstruction: (() => {
              const lengthRule = respLength === "short" ? "Under 25 words." : respLength === "detailed" ? "60-100 words, thorough." : "Under 50 words.";
              const userLang = messageLang;
              const langRule = userLang === "th"
                ? "The user spoke in Thai. Respond in Thai ONLY. Be warm and natural."
                : "The user spoke in English. Respond in English ONLY. Be warm and natural. Do NOT add Thai unless they ask to learn Thai.";
              const levelRule = "CRITICAL: Mirror the user's language level. Look at the complexity, vocabulary, and sentence length of their LAST message. If they used simple words and short sentences, reply with simple words and short sentences. If they used advanced vocabulary, you can match it. Never speak above their level. Beginners get short, warm, easy replies — like a kind friend, not a textbook.";
              const modeRule = config.mode === "teach" ? `You are in Teach mode. The user is learning ${config.teach.learning === "th" ? "Thai" : "English"} at ${config.teach.level} level.` : config.mode === "social" ? `You are in Social mode. ${config.social.channel ? `Channel: ${config.social.channel}.` : ""} ${config.social.niche ? `Niche: ${config.social.niche}.` : ""}` : config.mode === "translate" ? "You are in Translator mode. Always provide translations with romanization." : config.mode === "chat" ? "You are in Just-chat mode. Be warm, present, brief, no teaching." : "Auto mode. Detect what the user needs and respond accordingly.";
              return `You are Miomi, a warm kawaii cat companion. ${modeRule} ${langRule} ${levelRule} ${lengthRule} Always end with one question or invitation.`;
            })(),
            sessionContext: { exchangeNumber: items.filter((i) => i.kind === "user_said").length, wordsIntroduced },
          }),
        });
        if (!res.ok) throw new Error("api failed");
        const data = (await res.json()) as MiomiApiResponse;
        const content = data.content ?? "";
        const lang = messageLang;
        const parts = content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
        const primary = parts[0] ?? content;
        const secondary = parts[1] ?? "";
        let textTh = lang === "th" ? primary : secondary;
        let textEn = lang === "en" ? primary : secondary;

        const mastery = data.masteryEvent;
        if (mastery?.type === "advanced" && mastery.word) {
          const advTh = pickMasteryAdvanced(mastery.word, "th");
          const advEn = pickMasteryAdvanced(mastery.word, "en");
          if (lang === "th") {
            textTh = [primary, advTh].filter(Boolean).join("\n\n");
          } else {
            textEn = [primary, advEn].filter(Boolean).join("\n\n");
          }
        }

        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            kind: "mini_cat",
            textTh: textTh || primary,
            textEn: textEn || primary,
          },
        ]);

        if (mastery?.type === "mastered" && mastery.word) {
          void import("@/lib/celebration/burst")
            .then(({ triggerCelebration }) => {
              triggerCelebration({
                intensity: "high",
                miomi_state: "excited",
                duration_ms: 1400,
              });
            })
            .catch(() => {});
          setMasteryToast({
            th: `${pickMasteryCelebration(mastery.word, "th")} +5 ✦`,
            en: `${pickMasteryCelebration(mastery.word, "en")} +5 ✦`,
          });
          window.setTimeout(() => {
            if (mountedRefForTts.current) setMasteryToast(null);
          }, 3200);
        }

        const pronunciationLesson = data.pronunciationLesson;
        if (
          pronunciationLesson &&
          typeof pronunciationLesson.word === "string" &&
          Array.isArray(pronunciationLesson.syllables)
        ) {
          const pronId = crypto.randomUUID();
          activePronunciationIdRef.current = pronId;
          const pronItem: CanvasItem = {
            id: pronId,
            kind: "pronunciation",
            lesson: pronunciationLesson,
            heardText: null,
          };
          window.setTimeout(() => {
            if (!mountedRefForTts.current) return;
            setItems((prev) => [...prev, pronItem]);
          }, 500);
        }

        const wordCard = data.wordCard;
        if (
          wordCard &&
          typeof wordCard.word_en === "string" &&
          typeof wordCard.word_th === "string"
        ) {
          const position = wordCard.mastery_level ?? 1;
          const practiceItem: CanvasItem = {
            id: crypto.randomUUID(),
            kind: "practice",
            word: toVocabularyEntry(wordCard),
            position,
            total: 3,
          };
          window.setTimeout(() => {
            if (!mountedRefForTts.current) return;
            setItems((prev) => [...prev, practiceItem]);
            setWordsIntroduced((prev) =>
              prev.includes(wordCard.word_en) ? prev : [...prev, wordCard.word_en],
            );
          }, 600);
        }

        const speakText = lang === "th" ? (textTh || primary) : (textEn || primary);
        if (ttsOn && speakText.trim()) {
          setMicState("speaking");
          void speak(speakText, lang, {
            onEnd: () => { if (mountedRefForTts.current) setMicState("idle"); },
            onError: () => { if (mountedRefForTts.current) setMicState("idle"); },
          });
        }
        if (data.servedVia === "guest_limit") {
          setShowGuestSheet(true);
        } else if (isGuest && guestExchanges + 1 >= GUEST_LIMIT) {
          window.setTimeout(() => setShowGuestSheet(true), 800);
        }
      } catch {
        setItems((prev) => [
          ...prev,
          { id: crypto.randomUUID(), kind: "mini_cat", textTh: "หนูขอโทษค่า~ มีบางอย่างผิดพลาด", textEn: "Sorry~ something went wrong." },
        ]);
      }
    },
    [authReady, isLocked, isGuest, guestExchanges, wordsIntroduced, items, setGuestExchanges, config, respLength, ttsOn, updateConversationLang, profile, uiLang],
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
    activePronunciationIdRef.current = null;
    setItems([makeOpenerItem()]);
    setExpandedItems(new Set());
  }, []);

  const handleOrbTap = useCallback(() => {
    if (isLocked) {
      setShowGuestSheet(true);
      return;
    }
    if (micState === "speaking") {
      stopTts();
      setMicState("idle");
      return;
    }
    if (micState === "listening") {
      micRef.current?.stop();
      return;
    }
    if (micState === "idle") {
      micRef.current?.start();
    }
  }, [micState, isLocked]);

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
        background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
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
          background: "transparent",
        }}
      >
        <Link href="/home" aria-label="Back" style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3D352B", textDecoration: "none" }}>
          <ArrowLeft size={22} strokeWidth={2} />
        </Link>

        {authReady && isGuest ? (
          <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, color: "#9A8B73", background: "transparent", padding: "5px 12px" }}>
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
            <line x1="21" y1="6" x2="14" y2="6" /><line x1="10" y1="6" x2="3" y2="6" />
            <line x1="21" y1="12" x2="12" y2="12" /><line x1="8" y1="12" x2="3" y2="12" />
            <line x1="21" y1="18" x2="16" y2="18" /><line x1="12" y1="18" x2="3" y2="18" />
            <line x1="14" y1="9" x2="14" y2="3" /><line x1="8" y1="15" x2="8" y2="9" /><line x1="16" y1="21" x2="16" y2="15" />
          </svg>
        </button>
      </div>

      <PersistentMiomi
        mood={miomiMood}
        uiLang={uiLang}
        subtitleTh={items.length <= 1 ? "หนูพร้อมแล้วค่า~" : undefined}
        subtitleEn={items.length <= 1 ? "I'm ready~" : undefined}
      />

      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Toolbox
          length={respLength}
          lang={conversationLang}
          ttsOn={ttsOn}
          keyboardMode={keyboardMode}
          uiLang={uiLang}
          onCycleLength={() => setRespLength((p) => (p === "short" ? "normal" : p === "normal" ? "detailed" : "short"))}
          onCycleLang={() => {}}
          onToggleTts={() => {
            setTtsOn((p) => {
              const next = !p;
              if (typeof window !== "undefined") window.localStorage.setItem("miomika.tts_on", next ? "1" : "0");
              if (!next) stopTts();
              return next;
            });
          }}
          onToggleKeyboard={() => setKeyboardMode((p) => !p)}
        />
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "8px 14px 0",
            paddingRight: "52px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
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
                  <div style={{ maxWidth: "78%", background: "linear-gradient(135deg, rgba(232,199,122,0.16) 0%, rgba(232,199,122,0.06) 100%)", border: "0.5px solid rgba(232,199,122,0.3)", borderRadius: "18px 4px 18px 18px", padding: "11px 14px" }}>
                    <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "14px", color: "#1A1A18", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{display}</p>
                    {isLong && (
                      <button type="button" onClick={() => toggleExpand(item.id)} style={{ marginTop: "4px", background: "none", border: "none", padding: 0, color: "#9A8B73", fontSize: "12px", fontFamily: "'Quicksand', sans-serif", textDecoration: "underline", cursor: "pointer" }}>
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
                  onHear={() => { /* TTS */ }}
                  onSpeak={() => micRef.current?.start()}
                  onCopy={() => { void navigator.clipboard.writeText(item.word.word_th); }}
                  onNext={() => { /* engine */ }}
                />
              );
            }
            if (item.kind === "pronunciation") {
              return (
                <PronunciationCardV1
                  key={item.id}
                  lesson={item.lesson}
                  uiLang={uiLang}
                  heardText={item.heardText}
                  onTrySpeak={() => micRef.current?.start()}
                />
              );
            }
            return null;
          })}
          <div style={{ height: "8px" }} />
        </div>
      </div>

      {/* HIDDEN MicButton drives VAD pipeline; UI is the orb inside MicRow */}
      <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
        <MicButton
          ref={micRef}
          state={micState}
          language={
            profile?.ui_language === "en"
              ? "en-US"
              : profile?.ui_language === "th"
                ? "th-TH"
                : "auto"
          }
          onTranscript={async (text, isFinal) => {
            if (!isFinal) return;
            if (isLocked) {
              micRef.current?.stop();
              setMicState("idle");
              setShowGuestSheet(true);
              return;
            }
            console.log("[mic] heard:", JSON.stringify(text));
            await processInput(text);
          }}
          onStateChange={setMicState}
          locked={isLocked}
          onLockedTap={() => setShowGuestSheet(true)}
        />
      </div>

      {/* MicRow ALWAYS visible. Keyboard mode just adds the input above it. */}
      {keyboardMode && (
        <div style={{ flexShrink: 0, padding: "6px 12px 4px", background: "transparent" }}>
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
            <button type="button" onClick={() => { /* placeholder attach */ }} aria-label="Attach" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "none", color: "#9A8B73", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
              <Plus size={17} strokeWidth={2} />
            </button>
            {textInput.trim() && (
              <button type="button" onClick={() => void processInput(textInput)} aria-label="Send" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <MicRow
        current={config.mode}
        orbState={orbState}
        uiLang={uiLang}
        onModeChange={(m) => {
          const next = { ...config, mode: m };
          setConfig(next);
          saveTalkConfig(next);
        }}
        onOrbTap={handleOrbTap}
        orbAriaLabel={orbState === "listening" ? (uiLang === "en" ? "Stop listening" : "หยุดฟัง") : (uiLang === "en" ? "Tap to talk with Miomi" : "แตะเพื่อพูดกับหนู")}
      />

      {items.length > 1 && (
        <button
          type="button"
          onClick={handleClear}
          style={{ position: "absolute", top: "62px", right: "12px", background: "transparent", border: "none", padding: "4px 12px", fontFamily: "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 600, color: "#9A8B73", cursor: "pointer", zIndex: 5 }}
        >
          {uiLang === "en" ? "Clear" : "ล้าง"}
        </button>
      )}

      <AdjustSheet
        open={adjustOpen}
        config={config}
        uiLang={uiLang}
        onSave={(c) => { setConfig(c); saveTalkConfig(c); setAdjustOpen(false); }}
        onClose={() => setAdjustOpen(false)}
        onMiomiHelp={(topic) => {
          setAdjustOpen(false);
          const promptTh = topic === "pillars" ? "ช่วยหนูตั้งเสาหลักของเนื้อหาให้หน่อยค่า~" : topic === "niche" ? "ช่วยหนูหานิชของฉันหน่อยค่า~" : "ช่วยหนูตั้งสไตล์เนื้อหาให้หน่อยค่า~";
          void processInput(promptTh);
        }}
      />

      {masteryToast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
            transform: "translateX(-50%)",
            zIndex: 150,
            maxWidth: "88%",
            padding: "10px 16px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.92)",
            border: "0.5px solid rgba(232,199,122,0.5)",
            boxShadow: "0 4px 20px rgba(201,169,110,0.25)",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#1A1A18",
              textAlign: "center",
            }}
          >
            {uiLang === "en" ? masteryToast.en : masteryToast.th}
          </p>
        </div>
      )}

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
    </div>
  );
}
