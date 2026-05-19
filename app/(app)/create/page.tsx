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
    };

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
    createSessionState(true)
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
      const instruction = getExchangeInstruction(sessionState, trimmed);
  
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
          }),
        });
  
        const data = (await res.json()) as {
          content?: string;
          error?: string;
          wasFailover?: boolean;
        };
  
        const content = data.content ?? "";
        removeTyping();
        const { th, en } = parseMiomiResponse(content);
  
        // If there's a celebration, prepend it
        const finalTh = instruction.shouldCelebrate && instruction.celebrationText
          ? `${instruction.celebrationText}\n\n${th}`
          : th;
  
        pushMiomi(finalTh, en);
  
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white md:h-[calc(100dvh-8rem)] md:max-h-none">
        <Link
          href="/home"
          className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full text-[#8B1A35] transition-transform active:scale-[0.97] md:hidden"
          aria-label="Back to home"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
        <div className="flex h-[100px] shrink-0 items-center gap-3 border-b border-[#EAD0DB] bg-white px-4 pl-12 md:hidden md:pl-4">
          <motion.div className={cn("shrink-0", !reduceMotion && "miomi-breathe")}>
            <Image
              src={headImage}
              alt="Miomi"
              width={72}
              height={72}
              className="h-[72px] w-[72px] object-contain"
              priority
            />
          </motion.div>
          <div className="min-w-0 flex-1">
            {authReady && isGuest ? (
              <span className="mb-1.5 inline-block rounded-full border border-[#8B1A35] bg-white px-2 py-0.5 text-[10px] font-medium text-[#8B1A35]">
                เหลืออีก {guestExchangesRemaining} ครั้ง
              </span>
            ) : null}
            <motion.div className="rounded-2xl rounded-tl-sm border border-[#EAD0DB] bg-[#FBEAF0] px-3 py-2 shadow-sm">
              <p className="line-clamp-2 text-[13px] font-medium leading-[1.6] text-[#1A1A1A]">
                {bubble.th}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.6] text-[#666666]">
                {bubble.en}
              </p>
            </motion.div>
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-center border-b border-[#EAD0DB] bg-white px-6 py-5 md:flex">
          <motion.div className={cn("shrink-0", !reduceMotion && "miomi-breathe")}>
            <Image
              src={headImage}
              alt="Miomi"
              width={120}
              height={120}
              className="h-[120px] w-[120px] object-contain"
              priority
            />
          </motion.div>
          <div className="mt-3 max-w-md rounded-2xl border border-[#EAD0DB] bg-[#FBEAF0] px-4 py-3 text-center shadow-sm">
            <p className="text-base font-medium leading-[1.6] text-[#1A1A1A]">
              {bubble.th}
            </p>
            <p className="mt-1 text-xs leading-[1.6] text-[#666666]">{bubble.en}</p>
          </div>
        </div>

        <div className="hidden shrink-0 bg-white px-3 py-1">
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 self-center text-[9px] font-medium text-[#888888]">
              แพลตฟอร์ม
            </span>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={pillClass(platform === p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 self-center text-[9px] font-medium text-[#888888]">
              โทน
            </span>
            {FREE_TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={pillClass(tone === t)}
              >
                {t}
              </button>
            ))}
            {PAID_TONES.map((t) => (
              <button
                key={t}
                type="button"
                disabled
                aria-disabled
                className={paidTonePillClass()}
              >
                <span>{t}</span>
                <span className="rounded border border-[#B8860B]/50 bg-[#fdf5e0] px-0.5 text-[7px] font-semibold leading-none text-[#B8860B]">
                  Pro
                </span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-1.5 pb-0.5">
            <span className="text-[9px] font-medium text-[#888888]">ภาษา</span>
            {(["thai", "english", "both"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setOutputLang(lang)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors",
                  outputLang === lang
                    ? "bg-[#8B1A35] text-white"
                    : "border border-[#EAD0DB] bg-[#FAFAFA] text-neutral-700",
                )}
              >
                {lang === "thai" ? "ไทย" : lang === "english" ? "EN" : "ทั้งคู่"}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable thread only */}
        <div
          ref={threadRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="mb-2"
              >
                {m.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#8B1A35] px-3 py-2">
                      <p className="whitespace-pre-wrap text-sm font-medium leading-snug text-white">
                        {m.text}
                      </p>
                    </div>
                  </div>
                ) : null}
                {m.type === "miomi" ? (
                  <div className="flex justify-start gap-2">
                    <Image
                      src="/miomi/head-idle.png"
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-[#EAD0DB] bg-[#FBEAF0] px-3 py-2">
                      <p className="whitespace-pre-line text-[13px] font-medium leading-[1.6] text-[#1A1A1A]">
                        {m.th}
                      </p>
                      <p className="mt-1 text-[11px] leading-[1.6] text-[#666666]">
                        {m.en}
                      </p>
                    </div>
                  </div>
                ) : null}
                {m.type === "typing" ? (
                  <div className="flex justify-start gap-2">
                    <Image
                      src="/miomi/head-thinking.png"
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                    <div className="rounded-2xl rounded-tl-sm border border-[#EAD0DB] bg-[#FBEAF0] px-3 py-2">
                      <TypingDots />
                    </div>
                  </div>
                ) : null}
                {m.type === "card" ? (
                  <div
                    className={cn(
                      "w-full rounded-2xl border bg-white p-3",
                      m.cardType === "hook"
                        ? "border-[#EAD0DB] shadow-md shadow-[#8B1A35]/[0.07] ring-1 ring-[#8B1A35]/10"
                        : "border-[#EAD0DB]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {m.cardType === "hook" ? (
                          <Gift
                            className="h-3.5 w-3.5 shrink-0 text-[#B8860B]"
                            strokeWidth={2}
                            aria-hidden
                          />
                        ) : null}
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#B8860B]">
                          {m.label}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyThai(m.th)}
                        className="shrink-0 rounded-lg p-1 text-[#8B1A35] transition-colors hover:bg-[#FBEAF0]"
                        aria-label="Copy"
                      >
                        <Copy className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                    <p className="mt-2 text-[15px] font-medium leading-[1.6] text-[#1A1A1A]">
                      {m.th}
                    </p>
                    {m.en ? (
                      <p className="mt-1.5 text-xs leading-[1.6] text-[#666666]">
                        {m.en}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>

          {followupChipsVisible ? (
            <div className="mt-1 flex flex-wrap gap-2 pb-2">
              <button
                type="button"
                onClick={onChipComment}
                className="rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-3 py-1.5 text-left text-[10px] font-medium text-neutral-800 transition-colors hover:bg-[#FBEAF0]"
              >
                <span className="block">ตอบคอมเมนต์</span>
                <span className="block text-[9px] text-[#888888]">
                  Comment replies
                </span>
              </button>
              <button
                type="button"
                onClick={onChipRegenerate}
                className="rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-3 py-1.5 text-left text-[10px] font-medium text-neutral-800 transition-colors hover:bg-[#FBEAF0]"
              >
                <span className="block">ทำใหม่อีกครั้ง</span>
                <span className="block text-[9px] text-[#888888]">
                  Make another version
                </span>
              </button>
              <button
                type="button"
                onClick={onChipDone}
                className="rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-3 py-1.5 text-left text-[10px] font-medium text-neutral-800 transition-colors hover:bg-[#FBEAF0]"
              >
                <span className="block">เสร็จแล้ว</span>
                <span className="block text-[9px] text-[#888888]">
                  I&apos;m done
                </span>
              </button>
            </div>
          ) : null}

          {stage === "finished" ? (
            <div className="pb-3 pt-1">
              <Link
                href="/home"
                className="inline-flex w-full flex-col items-center justify-center rounded-full bg-[#8B1A35] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#D4537E]"
              >
                กลับหน้าหลัก
              </Link>
              <p className="mt-1 text-center text-[9px] text-[#888888]">Go home</p>
            </div>
          ) : null}

          {!speechSupported ? (
            <p className="pb-2 text-center text-[10px] text-[#8B1A35]">
              เบราว์เซอร์นี้ยังไม่รองรับการรู้จำเสียงค่า
              <span className="mt-0.5 block text-[9px] text-[#888888]">
                This browser does not support speech recognition
              </span>
            </p>
          ) : null}
        </div>

        {/* Input bar — always visible */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-t border-[#E8E5DF] bg-white px-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={onKeyDownInput}
            disabled={inputDisabled}
            placeholder="พูดหรือพิมพ์กับมิโอมิ..."
            title="พูดหรือพิมพ์กับมิโอมิ"
            className="min-w-0 flex-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-3.5 py-2 text-sm text-[#1A1A1A] outline-none ring-0 placeholder:text-[#AAAAAA] focus:border-[#8B1A35] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setVoiceLang(v => v === "en-US" ? "th-TH" : "en-US")}
            className="shrink-0 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1.5 text-[10px] font-semibold text-[#8B1A35]"
            title="Switch voice language"
          >
            {voiceLang === "en-US" ? "EN" : "ไทย"}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            disabled={
              !speechSupported ||
              apiLoading ||
              isSpeaking ||
              (stage !== "awaiting_topic" && stage !== "awaiting_comment")
            }
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform",
              tapFeedback,
              isRecording ? "bg-[#8B1A35]" : "bg-[#FBEAF0]",
              (!speechSupported ||
                apiLoading ||
                isSpeaking ||
                (stage !== "awaiting_topic" && stage !== "awaiting_comment")) &&
                "cursor-not-allowed opacity-40",
            )}
            aria-pressed={isRecording}
            aria-label={isRecording ? "Stop recording" : "Voice input"}
          >
            {isRecording && !reduceMotion ? (
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-full bg-[#8B1A35]"
                animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0.15, 0.55] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ) : null}
            <Mic
              className={cn(
                "relative z-10 h-[18px] w-[18px]",
                isRecording ? "text-white" : "text-[#8B1A35]",
              )}
              strokeWidth={2}
            />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={
              !inputText.trim() ||
              inputDisabled ||
              isRecording ||
              (isGuest && guestExchangesRemaining <= 0)
            }
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8B1A35] text-white",
              tapFeedback,
              (!inputText.trim() ||
                inputDisabled ||
                isRecording ||
                (isGuest && guestExchangesRemaining <= 0)) &&
                "opacity-50",
            )}
            aria-label="Send"
          >
            <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </button>
        </div>

        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none fixed bottom-20 left-1/2 z-[60] max-w-[min(90vw,320px)] -translate-x-1/2 rounded-full bg-[#8B1A35] px-4 py-2 text-center text-xs font-medium text-white shadow-lg"
            >
              คัดลอกแล้วค่า~
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
