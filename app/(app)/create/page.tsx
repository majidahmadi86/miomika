"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ChevronLeft, Copy, Gift, Mic } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { WordCard } from "@/components/WordCard";
import type { SessionVocabWord } from "@/lib/ai/vocabulary";
import {
  createSessionState,
  getExchangeInstruction,
  updateSessionState,
  getSessionOpening,
  type SessionState,
} from "@/lib/ai/session";

type OutputLang = "thai" | "english" | "both";

type MiomiExpression = "idle" | "listening" | "thinking" | "happy";

type ConversationStage =
  | "awaiting_topic"
  | "processing_topic"
  | "streaming_main"
  | "followup"
  | "awaiting_comment"
  | "processing_comment"
  | "streaming_comments"
  | "finished";

type CardType =
  | "hook"
  | "caption"
  | "hashtags"
  | "cta"
  | "comment_reply_1"
  | "comment_reply_2"
  | "comment_reply_3";

type ThreadMessage =
  | { id: string; type: "miomi"; th: string; en: string }
  | { id: string; type: "user"; text: string }
  | { id: string; type: "typing" }
  | {
      id: string;
      type: "card";
      cardType: CardType;
      label: string;
      th: string;
      en: string;
    }
  | { id: string; type: "word_card"; variant: "intro" | "celebration"; word: SessionVocabWord; timestamp: Date };

const PLATFORMS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "YouTube",
  "LINE OA",
] as const;

const FREE_TONES = ["Cute Thai", "Professional"] as const;
const PAID_TONES = ["Gen-Z", "Korean", "Anime", "Luxury"] as const;

const INITIAL_MIOMI_TH = "สวัสดีค่า~ วันนี้เป็นยังไงบ้างคะ? บอกหนูได้เลยนะคะ~";
const INITIAL_MIOMI_EN = "Hi~ How are you doing today? Just tell me anything~";

const GUEST_EXCHANGE_LIMIT = 5;

const tapFeedback =
  "transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1A35]";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

function threadToApiMessages(
  msgs: ThreadMessage[],
): { role: string; content: string }[] {
  return msgs
    .filter(
      (m): m is Extract<ThreadMessage, { type: "miomi" | "user" }> =>
        m.type === "miomi" || m.type === "user",
    )
    .map((m) =>
      m.type === "user"
        ? { role: "user", content: m.text }
        : {
            role: "assistant",
            content: `${m.th}\n\n${m.en}`.trim(),
          },
    );
}

function parseMiomiResponse(content: string): { th: string; en: string } {
  const trimmed = content.trim();
  
  // Split on double newline — library format: Thai\n\nEnglish
  const parts = trimmed.split(/\n\n+/);
  
  if (parts.length >= 2) {
    // First part is Thai, rest is English
    const th = parts[0]!.trim();
    const en = parts.slice(1).join("\n\n").trim();
    return { th, en };
  }
  
  // Single line — check if it contains Thai characters
  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);
  if (hasThai) {
    return { th: trimmed, en: "" };
  }
  
  return { th: trimmed, en: "" };
}

type SpeechRecLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Append only finalized segments; rebuild interim from this event only (no duplication). */
function speechDisplayFromResultEvent(
  event: unknown,
  committedRef: MutableRefObject<string>,
): string {
  const e = event as {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
  };
  if (!e.results) return committedRef.current;
  let interim = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i];
    if (!r?.[0]?.transcript) continue;
    const t = r[0].transcript;
    if (r.isFinal) committedRef.current += t;
    else interim += t;
  }
  return committedRef.current + interim;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecLike)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecLike;
      webkitSpeechRecognition?: new () => SpeechRecLike;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function pillClass(selected: boolean) {
  return cn(
    "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition-colors",
    selected
      ? "border-[#8B1A35] bg-[#FBEAF0] text-[#8B1A35]"
      : "border-[#EAD0DB] bg-[#FAFAFA] text-[#666666]",
  );
}

function paidTonePillClass() {
  return cn(
    "inline-flex shrink-0 cursor-not-allowed items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium whitespace-nowrap text-[#AAAAAA] opacity-75",
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-rose-mid"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

function renderMiomiTh(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
    const bold = segment.match(/^\*\*(.+)\*\*$/);
    if (bold) {
      return (
        <span
          key={i}
          style={{
            background: "rgba(249,168,212,0.15)",
            borderRadius: "4px",
            padding: "1px 4px",
          }}
        >
          {bold[1]}
        </span>
      );
    }
    return <span key={i}>{segment}</span>;
  });
}

export default function CreatePage() {
  const reduceMotion = useReducedMotion();
  const { isGuest, authReady } = useGuestExploration();
  const idRef = useRef(0);
  const genId = () => `${Date.now()}-${++idRef.current}`;

  const [messages, setMessages] = useState<ThreadMessage[]>(() => [
    {
      id: `${Date.now()}-init`,
      type: "miomi",
      th: INITIAL_MIOMI_TH,
      en: INITIAL_MIOMI_EN,
    },
  ]);
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Cute Thai");
  const [outputLang, setOutputLang] = useState<OutputLang>("thai");
  const [stage, setStage] = useState<ConversationStage>("awaiting_topic");
  const [followupChipsVisible, setFollowupChipsVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [postGiftMood, setPostGiftMood] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [toast, setToast] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"th-TH" | "en-US">("en-US");
  const [guestExchangesRemaining, setGuestExchangesRemaining] = useState(
    GUEST_EXCHANGE_LIMIT,
  );
  const [sessionState, setSessionState] = useState<SessionState>(() =>
    createSessionState(isGuest ?? true)
  );
  const threadRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecLike | null>(null);
  const transcriptLiveRef = useRef("");
  const speechCommittedRef = useRef("");
  const lastTopicRef = useRef("");
  const stageRef = useRef<ConversationStage>("awaiting_topic");
  const processingLockRef = useRef(false);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    queueMicrotask(() => {
      setSpeechSupported(!!getSpeechRecognitionCtor());
    });
  }, []);

  useEffect(() => {
    if (!postGiftMood) return;
    const id = window.setTimeout(() => setPostGiftMood(false), 4200);
    return () => window.clearTimeout(id);
  }, [postGiftMood]);

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const showCopyToast = useCallback(() => {
    setToast(true);
    window.setTimeout(() => setToast(false), 2000);
  }, []);

  const copyThai = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text);
      showCopyToast();
    },
    [showCopyToast],
  );

  const miomiExpression: MiomiExpression = (() => {
    if (isRecording) return "listening";
    if (apiLoading || isSpeaking) return "thinking";
    if (postGiftMood) return "happy";
    return "idle";
  })();

  const bubbleByExpression: Record<MiomiExpression, { th: string; en: string }> =
    {
      idle: {
        th: "วันนี้จะโพสต์อะไรดีคะ~",
        en: "What shall we post today?",
      },
      listening: {
        th: "กำลังฟังอยู่นะคะ~",
        en: "I'm listening~",
      },
      thinking: {
        th: "กำลังคิดให้ค่า...",
        en: "Let me think...",
      },
      happy: {
        th: "นี่คือของขวัญจากหนูนะคะ หวังว่าจะชอบค่า~",
        en: "A little gift from me — hope you like it~",
      },
    };

  const headImage = (() => {
    switch (miomiExpression) {
      case "listening":
        return "/miomi/head-speaking.png";
      case "thinking":
        return "/miomi/head-thinking.png";
      case "happy":
        return "/miomi/head-happy.png";
      default:
        return "/miomi/head-idle.png";
    }
  })();

  const pushMiomi = useCallback((th: string, en: string) => {
    setMessages((prev) => [...prev, { id: genId(), type: "miomi", th, en }]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: genId(), type: "user", text }]);
  }, []);

  const pushTyping = useCallback(() => {
    setMessages((prev) => [...prev, { id: genId(), type: "typing" }]);
  }, []);

  const removeTyping = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.type !== "typing"));
  }, []);

  const pushCard = useCallback(
    (card: Omit<Extract<ThreadMessage, { type: "card" }>, "id" | "type">) => {
      setMessages((prev) => [...prev, { ...card, id: genId(), type: "card" }]);
    },
    [],
  );
  const runConversationTurn = useCallback(
    async (userText: string, opts?: { skipUserBubble?: boolean }) => {
      if (processingLockRef.current) return;
      processingLockRef.current = true;
      const trimmed = userText.trim();
      if (!trimmed) {
        processingLockRef.current = false;
        return;
      }
  
      // Get instruction for this exact exchange
      const supabase = createClient();
      const instruction = await getExchangeInstruction(
        sessionState,
        trimmed,
        supabase,
      );
  
      const history = threadToApiMessages(messages);
      if (!opts?.skipUserBubble) {
        pushUser(trimmed);
      }
      lastTopicRef.current = trimmed;
      setInputText("");
      setStage("processing_topic");
      setApiLoading(true);
      pushTyping();
  
      try {
        const apiMessages = [...history, { role: "user", content: trimmed }];
  
        // Send session instruction with every API call
        const res = await fetch("/api/miomi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            isGuest,
            sessionInstruction: instruction.promptInstruction,
            sessionContext: {
              exchangeNumber: sessionState.exchangeNumber,
              estimatedLevel: sessionState.estimatedLevel,
              sessionArc: sessionState.sessionArc,
              currentTargetWord: sessionState.currentTargetWord,
              emotionalMomentum: sessionState.emotionalMomentum,
              wordsIntroduced: sessionState.wordsIntroduced,
            },
            sessionId: sessionState.sessionId,
            userId: sessionState.userId ?? null,
          }),
        });
  
        const data = (await res.json()) as {
          content?: string;
          error?: string;
          wasFailover?: boolean;
          wordCard?: SessionVocabWord | null;
        };
  
        const content = data.content ?? "";
        removeTyping();
        const { th, en } = parseMiomiResponse(content);
  
        // If there's a celebration, prepend it
        const finalTh = instruction.shouldCelebrate && instruction.celebrationText
          ? `${instruction.celebrationText}\n\n${th}`
          : th;
  
        pushMiomi(finalTh, en);

        if (data.wordCard) {
          const wordCard = data.wordCard;
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: "word_card" as const,
            variant: "intro" as const,
            word: wordCard,
            timestamp: new Date(),
          }]);
        }

        // If conversion window opened, show it after a short delay
        if (instruction.shouldOpenConversionWindow && instruction.conversionMessage) {
          window.setTimeout(() => {
            pushMiomi(
              instruction.conversionMessage!.th,
              instruction.conversionMessage!.en
            );
          }, 1200);
        }
  
        // Update session state for next exchange
        setSessionState((prev) => updateSessionState(prev, trimmed, instruction));
  
        setStage("awaiting_topic");
        setFollowupChipsVisible(false);
      } catch (e) {
        removeTyping();
        pushMiomi(
          e instanceof Error ? e.message : "มีบางอย่างผิดพลาดค่า ลองใหม่นะคะ",
          "Something went wrong — want to try again?",
        );
        setStage("awaiting_topic");
        setFollowupChipsVisible(false);
      } finally {
        setApiLoading(false);
        processingLockRef.current = false;
      }
    },
    [isGuest, messages, pushMiomi, pushTyping,
      pushUser, removeTyping, sessionState],
  );

  const runTopicPipeline = runConversationTurn;

  const runCommentPipeline = runConversationTurn;

  const consumeGuestExchange = useCallback(() => {
    if (!isGuest) return;
    setGuestExchangesRemaining((n) => Math.max(0, n - 1));
  }, [isGuest]);

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t || isRecording) return;
    if (isGuest && guestExchangesRemaining <= 0) return;
    if (stage === "awaiting_topic") {
      consumeGuestExchange();
      void runTopicPipeline(t);
      return;
    }
    if (stage === "awaiting_comment") {
      consumeGuestExchange();
      void runCommentPipeline(t);
    }
  }, [
    consumeGuestExchange,
    guestExchangesRemaining,
    inputText,
    isGuest,
    isRecording,
    runCommentPipeline,
    runTopicPipeline,
    stage,
  ]);

  const getOrCreateRecognition = useCallback((): SpeechRecLike | null => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;
    if (!recognitionRef.current) {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      recognitionRef.current = rec;
    }
    return recognitionRef.current;
  }, []);

  const attachRecognitionHandlers = useCallback(
    (rec: SpeechRecLike) => {
      rec.continuous = false;  // change from true to false
      rec.interimResults = false;  // change from true to false  
      rec.lang = voiceLang;
      rec.onresult = (event: unknown) => {
        const display = speechDisplayFromResultEvent(event, speechCommittedRef);
        transcriptLiveRef.current = display;
        setInputText(display);
      };
      rec.onerror = () => {
        setIsRecording(false);
      };
      rec.onend = () => {
        setIsRecording(false);
        const finalText = transcriptLiveRef.current.trim();
        transcriptLiveRef.current = "";
        speechCommittedRef.current = "";
        if (finalText) {
          setInputText(finalText);
          if (isGuest && guestExchangesRemaining <= 0) return;
          if (stageRef.current === "awaiting_topic") {
            consumeGuestExchange();
            void runTopicPipeline(finalText);
          } else if (stageRef.current === "awaiting_comment") {
            consumeGuestExchange();
            void runCommentPipeline(finalText);
          }
        }
      };
    },
    [
      consumeGuestExchange,
      guestExchangesRemaining,
      isGuest,
      runCommentPipeline,
      runTopicPipeline,
      voiceLang,
    ],
  );

  const toggleMic = useCallback(() => {
    if (!speechSupported || apiLoading || isSpeaking) return;
    if (stage !== "awaiting_topic" && stage !== "awaiting_comment") return;

    const rec = getOrCreateRecognition();
    if (!rec) return;
    attachRecognitionHandlers(rec);

    if (!isRecording) {
      try {
        speechCommittedRef.current = "";
        transcriptLiveRef.current = "";
        setInputText("");
        rec.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    } else {
      try {
        rec.stop();
      } catch {
        setIsRecording(false);
      }
    }
  }, [
    apiLoading,
    attachRecognitionHandlers,
    getOrCreateRecognition,
    isRecording,
    isSpeaking,
    speechSupported,
    stage,
  ]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const onKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onChipComment = () => {
    setFollowupChipsVisible(false);
    pushMiomi(
      "บอก Miomi ว่ามีคอมเมนต์อะไรบ้างที่อยากตอบคะ?",
      "Tell me which comments you want to reply to!",
    );
    setStage("awaiting_comment");
  };

  const onChipRegenerate = () => {
    setFollowupChipsVisible(false);
    const topic = lastTopicRef.current.trim();
    if (!topic) {
      pushMiomi(
        "ยังไม่มีหัวข้อให้ทำใหม่ค่า ลองบอกโพสต์ก่อนนะคะ",
        "I need a topic first — tell me what you want to post~",
      );
      setFollowupChipsVisible(true);
      return;
    }
    pushMiomi(
      "โอเคค่า~ จะทำเวอร์ชั่นใหม่ให้เลยค่า~",
      "Okay~ Spinning up a fresh version for you~",
    );
    void runTopicPipeline(topic, { skipUserBubble: true });
  };

  const onChipDone = () => {
    setFollowupChipsVisible(false);
    pushMiomi(
      "เยี่ยมมากค่า~ อย่าลืมกลับมาคุยกับ Miomi พรุ่งนี้ด้วยนะคะ Miomi รออยู่เลย~",
      "You're amazing~ Come say hi again tomorrow — I'll be right here~",
    );
    setStage("finished");
  };

  const bubble = bubbleByExpression[miomiExpression];

  const inputDisabled =
    apiLoading ||
    isSpeaking ||
    stage === "processing_topic" ||
    stage === "processing_comment" ||
    stage === "streaming_main" ||
    stage === "streaming_comments" ||
    stage === "finished" ||
    stage === "followup";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: "#FAFAF6" }}>

      {/* ── ZONE A — Miomi stage (top ~42%) ── */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          height: "144px",
          minHeight: "144px",
          maxHeight: "144px",
          background: "#FAFAF6",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: "12px",
          overflow: "hidden",
        }}
      >
        {/* Back button */}
        <Link
          href="/home"
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            zIndex: 10,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
            border: "1px solid #EAD0DB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Back to home"
        >
          <ChevronLeft style={{ width: "18px", height: "18px", color: "#9A8B73" }} strokeWidth={2} />
        </Link>

        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {authReady && isGuest ? (
            <span
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(8px)",
                border: "1px solid #EDE8E0",
                borderRadius: "999px",
                padding: "3px 10px",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                color: "#9A8B73",
              }}
            >
              เหลืออีก {guestExchangesRemaining} ครั้ง
            </span>
          ) : (
            <span
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(8px)",
                border: "1px solid #EDE8E0",
                borderRadius: "999px",
                padding: "3px 10px",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "#C9A96E",
                letterSpacing: "0.02em",
              }}
            >
              ✦ {sessionState.wordsIntroduced.length} คำ
            </span>
          )}
        </div>

        {/* Soft glow behind Miomi */}
        <div
          style={{
            position: "absolute",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,168,212,0.20) 0%, transparent 65%)",
            pointerEvents: "none",
            bottom: "20px",
          }}
        />

        {/* Miomi image — large, expressive */}
        <motion.div
          className={cn(!reduceMotion && "miomi-breathe")}
          style={{ position: "relative", zIndex: 2 }}
        >
          <Image
            src={headImage}
            alt="Miomi"
            width={96}
            height={96}
            style={{ width: "96px", height: "96px", objectFit: "contain" }}
            priority
          />
        </motion.div>

        {/* Speech subtitle — appears below Miomi, not in a bubble */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "0 32px",
            marginTop: "4px",
          }}
        >
          <p
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#1A1A18",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {bubble.th}
          </p>
          {bubble.en && (
            <p
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                color: "#C4BDB5",
                marginTop: "2px",
                letterSpacing: "0.02em",
              }}
            >
              {bubble.en}
            </p>
          )}
        </div>
      </div>

      {/* ── ZONE B — Learning space (scrollable) ── */}
      <div
        ref={threadRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "16px 20px",
          background: "#FAFAF6",
          borderTop: "1px solid #F0ECE8",
        }}
      >
        {/* Gold progress bar */}
        <div
          style={{
            width: "100%",
            height: "2px",
            background: "rgba(201,169,110,0.12)",
            flexShrink: 0,
            margin: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min((messages.filter((msg) => msg.type === "user").length / 8) * 100, 100)}%`,
              background: "linear-gradient(90deg, #C9A96E 0%, #E8C77F 100%)",
              transition: "width 400ms ease-out",
            }}
          />
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((m, msgIndex) => {
            const userExchangeNum =
              m.type === "user"
                ? messages.slice(0, msgIndex + 1).filter((msg) => msg.type === "user").length
                : 0;

            return (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.20, ease: "easeOut" }}
              style={{ marginBottom: "8px" }}
            >
              {/* User message — learning-document row */}
              {m.type === "user" && (
                <div style={{ width: "100%", background: "transparent", overflow: "hidden" }}>
                  <div
                    style={{
                      maxWidth: "75%",
                      float: "right",
                      background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                      borderRadius: "20px 4px 20px 20px",
                      padding: "10px 16px",
                      boxShadow: "0 2px 8px rgba(219,39,119,0.15)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Kanit', sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#FFFFFF",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {m.text}
                    </p>
                  </div>
                  <p
                    style={{
                      clear: "both",
                      textAlign: "right",
                      marginTop: "3px",
                      marginBottom: 0,
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "#C4BDB5",
                    }}
                  >
                    แลกเปลี่ยนที่ {userExchangeNum}
                  </p>
                </div>
              )}

              {/* Miomi message — naked text, left accent */}
              {m.type === "miomi" && (
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      borderLeft: "2px solid rgba(249,168,212,0.4)",
                      paddingLeft: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Kanit', sans-serif",
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "#1A1A18",
                        lineHeight: 1.7,
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {renderMiomiTh(m.th)}
                    </p>
                    {m.en && (
                      <p
                        style={{
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#9A8B73",
                          marginTop: "4px",
                          lineHeight: 1.55,
                          marginBottom: 0,
                        }}
                      >
                        {m.en}
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "1px",
                      background: "rgba(232,229,223,0.5)",
                      margin: "8px 0",
                    }}
                  />
                </div>
              )}

              {/* Typing indicator — learning-document style */}
              {m.type === "typing" && (
                <div
                  style={{
                    width: "100%",
                    borderLeft: "2px solid rgba(249,168,212,0.4)",
                    paddingLeft: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {(["#F9A8D4", "#C9A96E", "#F9A8D4"] as const).map((color, i) => (
                      <motion.span
                        key={i}
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: color,
                          display: "block",
                        }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    style={{
                      fontFamily: "'Kanit', sans-serif",
                      fontSize: "12px",
                      fontWeight: 400,
                      color: "#9A8B73",
                    }}
                  >
                    มิโอมิกำลังคิด...
                  </motion.span>
                </div>
              )}

              {/* Word card — document flow */}
              {m.type === "word_card" && (
                <div
                  style={{
                    margin: "12px 0",
                    borderLeft: "3px solid #C9A96E",
                    paddingLeft: "12px",
                  }}
                >
                  <WordCard word={m.word} variant={m.variant} />
                </div>
              )}

              {/* Content card */}
              {m.type === "card" && (
                <div
                  style={{
                    width: "100%",
                    background: "#FFFFFF",
                    border: m.cardType === "hook" ? "1.5px solid #C9A96E" : "1px solid #EDE8E0",
                    borderRadius: "16px",
                    padding: "12px 14px",
                    boxShadow: m.cardType === "hook" ? "0 2px 12px rgba(201,169,110,0.15)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {m.cardType === "hook" && (
                        <Gift style={{ width: "14px", height: "14px", color: "#C9A96E" }} strokeWidth={2} />
                      )}
                      <span
                        style={{
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#C9A96E",
                        }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyThai(m.th)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "4px",
                        cursor: "pointer",
                        borderRadius: "8px",
                        color: "#9A8B73",
                      }}
                      aria-label="Copy"
                    >
                      <Copy style={{ width: "15px", height: "15px" }} strokeWidth={2} />
                    </button>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Kanit', sans-serif",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "#1A1A18",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {m.th}
                  </p>
                  {m.en && (
                    <p
                      style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: "12px",
                        color: "#9A8B73",
                        marginTop: "6px",
                        lineHeight: 1.55,
                      }}
                    >
                      {m.en}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.filter((msg) => msg.type === "user").length > 0 && (
          <p
            style={{
              textAlign: "center",
              margin: "8px 0",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "#C4BDB5",
            }}
          >
            แลกเปลี่ยน {messages.filter((msg) => msg.type === "user").length} ครั้งแล้วค่า~ · Exchange{" "}
            {messages.filter((msg) => msg.type === "user").length} of 8
          </p>
        )}

        {/* Followup chips */}
        {followupChipsVisible && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingBottom: "8px" }}>
            {[
              { label: "ตอบคอมเมนต์", sub: "Comment replies", onClick: onChipComment },
              { label: "ทำใหม่อีกครั้ง", sub: "Make another version", onClick: onChipRegenerate },
              { label: "เสร็จแล้ว", sub: "I'm done", onClick: onChipDone },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onClick}
                style={{
                  background: "#FAFAF6",
                  border: "1px solid #EDE8E0",
                  borderRadius: "999px",
                  padding: "8px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "block", fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, color: "#1A1A18" }}>{chip.label}</span>
                <span style={{ display: "block", fontFamily: "'Quicksand', sans-serif", fontSize: "9px", color: "#9A8B73" }}>{chip.sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* Finished state */}
        {stage === "finished" && (
          <div style={{ paddingBottom: "12px", paddingTop: "4px" }}>
            <Link
              href="/home"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "48px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "15px",
                fontWeight: 500,
                color: "#FFFFFF",
                textDecoration: "none",
                boxShadow: "0 4px 16px -4px rgba(219,39,119,0.40)",
              }}
            >
              กลับหน้าหลัก
            </Link>
            <p style={{ textAlign: "center", fontFamily: "'Quicksand', sans-serif", fontSize: "10px", color: "#C4BDB5", marginTop: "4px" }}>Go home</p>
          </div>
        )}
      </div>

      {/* ── ZONE C — Input bar (fixed bottom) ── */}
      <div
        style={{
          flexShrink: 0,
          height: "64px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 12px",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #F0ECE8",
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={onKeyDownInput}
          disabled={inputDisabled}
          placeholder="พูดหรือพิมพ์กับมิโอมิ..."
          title="พูดหรือพิมพ์กับมิโอมิ"
          style={{
            flex: 1,
            minWidth: 0,
            height: "40px",
            borderRadius: "999px",
            border: "1px solid #EDE8E0",
            background: "#FAFAF6",
            padding: "0 16px",
            fontFamily: "'Kanit', sans-serif",
            fontSize: "14px",
            color: "#1A1A18",
            outline: "none",
          }}
        />

        {/* Voice language toggle */}
        <button
          type="button"
          onClick={() => setVoiceLang(v => v === "en-US" ? "th-TH" : "en-US")}
          style={{
            flexShrink: 0,
            height: "36px",
            borderRadius: "999px",
            border: "1px solid #EDE8E0",
            background: "#FAFAF6",
            padding: "0 10px",
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            color: "#9A8B73",
            cursor: "pointer",
          }}
        >
          {voiceLang === "en-US" ? "EN" : "ไทย"}
        </button>

        {/* Mic button */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={!speechSupported || apiLoading || isSpeaking || (stage !== "awaiting_topic" && stage !== "awaiting_comment")}
          style={{
            flexShrink: 0,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: isRecording ? "#DB2777" : "#FBEAF0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
          aria-pressed={isRecording}
        >
          {isRecording && !reduceMotion && (
            <motion.span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#DB2777",
                pointerEvents: "none",
              }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0.15, 0.55] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <Mic
            style={{
              position: "relative",
              zIndex: 1,
              width: "18px",
              height: "18px",
              color: isRecording ? "#FFFFFF" : "#DB2777",
            }}
            strokeWidth={2}
          />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim() || inputDisabled || isRecording || (isGuest && guestExchangesRemaining <= 0)}
          style={{
            flexShrink: 0,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: (!inputText.trim() || inputDisabled || isRecording || (isGuest && guestExchangesRemaining <= 0)) ? 0.45 : 1,
            boxShadow: "0 2px 8px rgba(219,39,119,0.25)",
          }}
          aria-label="Send"
        >
          <ArrowUp style={{ width: "18px", height: "18px", color: "#FFFFFF" }} strokeWidth={2.5} />
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              position: "fixed",
              bottom: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 60,
              background: "#1A1A18",
              color: "#FFFFFF",
              borderRadius: "999px",
              padding: "8px 20px",
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "12px",
              fontWeight: 600,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            คัดลอกแล้วค่า~
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
