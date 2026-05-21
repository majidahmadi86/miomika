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
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);
import { WordCard } from "@/components/WordCard";
import { CaptionCard } from "@/components/create/CaptionCard";
import { MiomiInvitationCard } from "@/components/conversion/MiomiInvitationCard";
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
  | { id: string; type: "word_card"; variant: "intro" | "celebration"; word: SessionVocabWord; timestamp: Date }
  | {
      id: string;
      type: "caption_card";
      platform: "Instagram" | "TikTok" | "Facebook" | "YouTube" | "LINE OA" | "general";
      caption: { body: string; hashtags?: string[]; hook?: string };
      timestamp: Date;
    }
  | {
      id: string;
      type: "pro_invitation";
      variant: "pro" | "pro_yearly";
      timestamp: Date;
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

const MODE_PALETTES: Record<string, { r: number; g: number; b: number }[]> = {
  learn: [
    { r: 249, g: 168, b: 212 },
    { r: 255, g: 229, b: 180 },
    { r: 255, g: 244, b: 224 },
    { r: 201, g: 169, b: 110 },
  ],
  translate: [
    { r: 125, g: 211, b: 192 },
    { r: 197, g: 200, b: 224 },
    { r: 184, g: 216, b: 232 },
    { r: 224, g: 242, b: 240 },
  ],
  create: [
    { r: 201, g: 169, b: 110 },
    { r: 255, g: 138, b: 128 },
    { r: 255, g: 107, b: 184 },
    { r: 255, g: 229, b: 180 },
  ],
  roleplay: [
    { r: 197, g: 200, b: 224 },
    { r: 181, g: 229, b: 200 },
    { r: 232, g: 199, b: 127 },
    { r: 244, g: 241, b: 250 },
  ],
};

const MODE_EXPRESSION_BIAS: Record<string, string> = {
  learn: "/miomi/head-happy.png",
  translate: "/miomi/head-thinking.png",
  create: "/miomi/head-speaking.png",
  roleplay: "/miomi/head-idle.png",
};

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
    createSessionState(isGuest ?? true)
  );
  const threadRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecLike | null>(null);
  const transcriptLiveRef = useRef("");
  const speechCommittedRef = useRef("");
  const lastTopicRef = useRef("");
  const stageRef = useRef<ConversationStage>("awaiting_topic");
  const processingLockRef = useRef(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputPlaceholder, setInputPlaceholder] = useState("พิมพ์อะไรก็ได้ค่า~ หนูจะช่วยเองค่า");
  const [sessionStartTime] = useState(() => Date.now());
  const [lastUserActivity, setLastUserActivity] = useState(Date.now());
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const [showConversionSheet, setShowConversionSheet] = useState(false);
  const [showPullHandle, setShowPullHandle] = useState(false);
  const [ambientPalette] = useState(MODE_PALETTES["learn"]!);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    queueMicrotask(() => {
      setSpeechSupported(!!getSpeechRecognitionCtor());
    });
    setSuggestions([
      "สอนคำศัพท์ใหม่ให้หน่อยค่า",
      "ช่วยเขียนแคปชั่น Instagram ให้หน่อย",
      "แปลประโยคนี้เป็นภาษาอังกฤษ",
      "อยากฝึกการทักทายเป็นภาษาอังกฤษ",
    ]);
  }, []);

  useEffect(() => {
    const userExchanges = messages.filter(m => m.type === "user").length;
    if (userExchanges === 0) {
      setInputPlaceholder("พิมพ์อะไรก็ได้ค่า~ หนูจะช่วยเองค่า");
    } else if (userExchanges >= 2) {
      // After 2 exchanges, placeholder reflects detected session mode
      const lastIntent = (sessionState as { lastIntentFamily?: string }).lastIntentFamily ?? "";
      if (lastIntent === "creating") {
        setInputPlaceholder("บอกหนูเกี่ยวกับโพสต์นี้เพิ่ม...");
      } else if (lastIntent === "translating") {
        setInputPlaceholder("พิมพ์ข้อความที่อยากแปล...");
      } else if (lastIntent === "learning") {
        setInputPlaceholder("พูดต่อกับมิโอมิ...");
      }
    }
  }, [messages, sessionState]);

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

  useEffect(() => {
    const userMessages = messages.filter(m => m.type === "user").length;
    if (userMessages < 8) { setShowPullHandle(false); return; }
    const id = window.setInterval(() => {
      if (Date.now() - lastUserActivity > 30000) {
        setShowPullHandle(true);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [messages, lastUserActivity]);

  useEffect(() => {
    // Fetch engine-driven opener
    const fetchOpener = async () => {
      try {
        const res = await fetch("/api/miomi/session-init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: sessionState.userId ?? null }),
        });
        if (!res.ok) return;
        const opener = await res.json() as { th: string; en: string };
        if (opener.th && opener.en) {
          setMessages([{
            id: `${Date.now()}-init`,
            type: "miomi" as const,
            th: opener.th,
            en: opener.en,
          }]);
        }
      } catch {
        // Silently fail — fallback message already showing
      }
    };
    void fetchOpener();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

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
      case "idle": {
        const biasKey =
          sessionState.sessionMode === "creating"
            ? "create"
            : sessionState.sessionMode === "translating"
              ? "translate"
              : "learn";
        return MODE_EXPRESSION_BIAS[biasKey] ?? "/miomi/head-idle.png";
      }
      default: {
        const biasKey =
          sessionState.sessionMode === "creating"
            ? "create"
            : sessionState.sessionMode === "translating"
              ? "translate"
              : "learn";
        return MODE_EXPRESSION_BIAS[biasKey] ?? "/miomi/head-idle.png";
      }
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
          intent?: string;
        };
  
        const content = data.content ?? "";
        removeTyping();
        const { th, en } = parseMiomiResponse(content);
  
        // If there's a celebration, prepend it
        const finalTh = instruction.shouldCelebrate && instruction.celebrationText
          ? `${instruction.celebrationText}\n\n${th}`
          : th;
  
        pushMiomi(finalTh, en);

        // Update suggestions based on detected intent
        const intentFromResponse = (data as { intent?: string }).intent ?? "";
        if (intentFromResponse.startsWith("creator_")) {
          setSuggestions([
            "ทำเวอร์ชั่นใหม่อีกครั้ง",
            "เพิ่ม Hashtag ให้หน่อย",
            "แปลเป็นภาษาอังกฤษด้วย",
            "ทำสำหรับ TikTok ด้วยได้ไหม",
          ]);
        } else if (intentFromResponse.startsWith("translate_")) {
          setSuggestions([
            "อธิบายความหมายเพิ่มเติมหน่อย",
            "มีคำที่เป็นทางการกว่านี้ไหม",
            "ใช้ในชีวิตประจำวันได้ไหม",
            "ช่วยออกเสียงให้หน่อยได้ไหม",
          ]);
        } else if (intentFromResponse.startsWith("learning_")) {
          setSuggestions([
            "ลองใช้คำนี้ในประโยคให้หน่อย",
            "มีคำที่คล้ายกันไหมคะ",
            "อยากฝึกใช้คำนี้",
            "สอนคำศัพท์ใหม่อีกคำได้ไหม",
          ]);
        } else {
          setSuggestions([
            "สอนคำศัพท์ใหม่ให้หน่อยค่า",
            "ช่วยเขียนแคปชั่นให้หน่อย",
            "แปลประโยคนี้ให้หน่อย",
            "อยากฝึกภาษาอังกฤษ",
          ]);
        }

        if (data.wordCard) {
          const wordCard = data.wordCard;
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: "word_card" as const,
            variant: "intro" as const,
            word: wordCard,
            timestamp: new Date(),
          }]);
          if (instruction.shouldCelebrate && instruction.celebrationText && data.wordCard) {
            setTimeout(() => {
              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                type: "word_card" as const,
                variant: "celebration" as const,
                word: data.wordCard!,
                timestamp: new Date(),
              }]);
            }, 800);
          }
        }

        // Handle creator asset — extract caption from content
        const creatorAssetFromResponse = (data as { creatorAsset?: { text: string; platform: string } }).creatorAsset;
        if (creatorAssetFromResponse && creatorAssetFromResponse.text) {
          const platformRaw = creatorAssetFromResponse.platform as string;
          const validPlatforms = ["Instagram", "TikTok", "Facebook", "YouTube", "LINE OA"];
          const platform = validPlatforms.includes(platformRaw)
            ? (platformRaw as "Instagram" | "TikTok" | "Facebook" | "YouTube" | "LINE OA")
            : "general" as const;

          // Extract hashtags from content
          const hashtagMatches = creatorAssetFromResponse.text.match(/#\w+/g) ?? [];
          const bodyText = creatorAssetFromResponse.text.replace(/#\w+/g, "").trim();

          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: "caption_card" as const,
            platform,
            caption: {
              body: bodyText,
              hashtags: hashtagMatches,
            },
            timestamp: new Date(),
          }]);
        }

        // Handle Pro invitation signal from engine
        const proInvitation = (data as { pro_invitation?: boolean }).pro_invitation;
        if (proInvitation && !isGuest) {
          window.setTimeout(() => {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              type: "pro_invitation" as const,
              variant: "pro" as const,
              timestamp: new Date(),
            }]);
          }, 1200);
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
    setGuestExchangesRemaining((n) => {
      const next = Math.max(0, n - 1);
      if (next === 0) {
        // Trigger Miomi's warm conversion invitation after response
        window.setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: "miomi" as const,
            th: "หนูชอบคุยกับคุณมากเลยค่า~ อยากให้หนูจำคุณและความก้าวหน้าของคุณได้ไหมคะ? สมัครฟรีได้เลยนะคะ ไม่มีค่าใช้จ่ายค่า~",
            en: "I love talking with you~ Want me to remember you and your progress? Sign up free — no cost at all~",
          }]);
          setShowConversionSheet(true);
        }, 1200);
      }
      return next;
    });
  }, [isGuest]);

  const handleSend = useCallback(() => {
    setLastUserActivity(Date.now());
    setSuggestions([]);
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

  const guestLimitReached = isGuest && guestExchangesRemaining <= 0;

  const renderMiomiTh = useCallback((text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <span
          key={i}
          style={{
            background: "rgba(249,168,212,0.18)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontWeight: 600,
            color: "#DB2777",
          }}
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }, []);

  const sessionData = {
    wordsLearned: sessionState.wordsIntroduced,
    wordsMastered: sessionState.wordsUsedCorrectly,
    durationMin: Math.round((Date.now() - sessionStartTime) / 60000),
    exchangeCount: messages.filter(m => m.type === "user").length,
    xpEarned: sessionState.wordsUsedCorrectly.length * 10 + messages.filter(m => m.type === "user").length * 5,
    level: 1,
    xpToNext: 100,
    praise: sessionState.wordsUsedCorrectly.length > 0
      ? `คุณใช้คำว่า '${sessionState.wordsUsedCorrectly[0]}' ได้ถูกต้องมากเลยนะคะ~`
      : "วันนี้คุยกับมิโอมิได้ดีมากเลยค่า~",
  };

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
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <AmbientBackground mode="ambient" />
        </div>

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
        data-thread=""
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "16px 20px",
          background: "#FAFAF6",
          borderTop: "1px solid #F0ECE8",
          position: "relative",
          zIndex: 1,
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
                    {sessionState.sessionMode === "translating" && m.en && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "8px 12px",
                          background: "rgba(125,211,192,0.10)",
                          borderRadius: "8px",
                          borderLeft: "2px solid #7DD3C0",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Quicksand', sans-serif",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#7DD3C0",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Translation
                        </span>
                        <p
                          style={{
                            fontFamily: "'Quicksand', sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#1A1A18",
                            margin: 0,
                            lineHeight: 1.6,
                          }}
                        >
                          {m.en}
                        </p>
                      </div>
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
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    margin: "12px 0",
                    borderLeft: m.variant === "celebration"
                      ? "3px solid #DB2777"
                      : "3px solid #C9A96E",
                    paddingLeft: "12px",
                  }}
                >
                  <WordCard word={m.word} variant={m.variant} />
                </motion.div>
              )}

              {m.type === "caption_card" && (
                <CaptionCard
                  platform={m.platform}
                  caption={m.caption}
                  onCopy={() => {
                    const text = [
                      m.caption.hook,
                      m.caption.body,
                      m.caption.hashtags?.join(" "),
                    ].filter(Boolean).join("\n\n");
                    void navigator.clipboard.writeText(text);
                    showCopyToast();
                  }}
                  onRegenerate={() => {
                    const lastUserMsg = messages.filter(m => m.type === "user").pop();
                    if (lastUserMsg && lastUserMsg.type === "user") {
                      void runConversationTurn(lastUserMsg.text, { skipUserBubble: true });
                    }
                  }}
                  onSave={() => {
                    // Phase 2: save to dashboard
                    showCopyToast();
                  }}
                />
              )}

              {m.type === "pro_invitation" && (
                <MiomiInvitationCard
                  variant={m.variant}
                  benefits={[
                    { th: "พูดทุกอย่างให้ฟัง", en: "Say everything aloud" },
                    { th: "จำคุณได้นานขึ้น", en: "Remember you longer" },
                    { th: "สร้างคอนเทนต์ไม่จำกัด", en: "Unlimited content creation" },
                  ]}
                  price={{ thb: 299, period: "month" }}
                  onPrimaryAction={() => {
                    window.location.href = "/upgrade";
                  }}
                  onSecondaryAction={() => {
                    // Dismiss — card stays in thread per spec
                    // Just scroll past it
                    const thread = document.querySelector('[data-thread]');
                    if (thread) thread.scrollTop = thread.scrollHeight;
                  }}
                />
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

        {showPullHandle && !showSummarySheet && (
          <motion.button
            type="button"
            onClick={() => setShowSummarySheet(true)}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "36px",
              background: "rgba(201,169,110,0.10)",
              border: "1px solid rgba(201,169,110,0.25)",
              borderRadius: "999px",
              margin: "8px 0",
              cursor: "pointer",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#C9A96E",
            }}
          >
            ดูสรุปวันนี้กับมิโอมิ~ ↑
          </motion.button>
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

      {suggestions.length > 0 && !inputText && (
        <div
          style={{
            flexShrink: 0,
            padding: "6px 12px 0",
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            background: "rgba(255,255,255,0.96)",
          }}
        >
          {suggestions.slice(0, 4).map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInputText(s);
                setSuggestions([]);
              }}
              style={{
                flexShrink: 0,
                height: "30px",
                borderRadius: "999px",
                border: "1px solid #EDE8E0",
                background: "#FAFAF6",
                padding: "0 12px",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "12px",
                fontWeight: 400,
                color: "#9A8B73",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

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
        {sessionState.sessionMode === "translating" && (
          <button
            type="button"
            onClick={() => {}}
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
              whiteSpace: "nowrap",
            }}
          >
            ไทย → EN
          </button>
        )}
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (e.target.value.length > 0) setSuggestions([]);
          }}
          onKeyDown={onKeyDownInput}
          disabled={inputDisabled}
          placeholder={inputPlaceholder}
          title={inputPlaceholder}
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
          disabled={!inputText.trim() || inputDisabled || isRecording || guestLimitReached}
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

      {showSummarySheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,26,24,0.3)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowSummarySheet(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "80vh",
              background: "#FFFFFF",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -8px 32px rgba(26,26,24,0.12)",
              overflowY: "auto",
              paddingBottom: "32px",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px" }}>
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
            </div>

            {/* Miomi */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
              <Image src="/miomi/happy.png" alt="Miomi" width={120} height={120} style={{ objectFit: "contain" }} />
            </div>

            {/* Praise */}
            <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
              <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "16px", fontWeight: 500, color: "#1A1A18", margin: 0 }}>
                {sessionData.praise}
              </p>
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "12px", color: "#9A8B73", marginTop: "4px" }}>
                Great work today~
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#E8E5DF", margin: "16px 24px" }} />

            {/* Words learned */}
            <div style={{ padding: "0 24px" }}>
              <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 600, color: "#9A8B73", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>
                ✦ เรียนรู้ใหม่ · {sessionData.wordsLearned.length} คำ
              </p>
              {sessionData.wordsLearned.length === 0 ? (
                <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#C4BDB5" }}>ยังไม่มีคำศัพท์ใหม่วันนี้ค่า~</p>
              ) : (
                sessionData.wordsLearned.map((w, i) => (
                  <p key={i} style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", color: "#1A1A18", margin: "4px 0" }}>{w}</p>
                ))
              )}

              <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 600, color: "#9A8B73", letterSpacing: "0.08em", textTransform: "uppercase", margin: "16px 0 8px" }}>
                ✓ ใช้ถูกแล้ว · {sessionData.wordsMastered.length} คำ
              </p>
              {sessionData.wordsMastered.length === 0 ? (
                <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#C4BDB5" }}>ลองใช้คำศัพท์ในการสนทนาด้วยนะคะ~</p>
              ) : (
                sessionData.wordsMastered.map((w, i) => (
                  <p key={i} style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", color: "#1A1A18", margin: "4px 0" }}>{w}</p>
                ))
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", padding: "16px 24px", borderTop: "1px solid #E8E5DF", borderBottom: "1px solid #E8E5DF", margin: "16px 0" }}>
              <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#9A8B73" }}>
                ⏱ {sessionData.durationMin} นาที
              </span>
              <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#9A8B73" }}>
                💬 {sessionData.exchangeCount} แลกเปลี่ยน
              </span>
              <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", color: "#C9A96E", fontWeight: 600 }}>
                +{sessionData.xpEarned} XP
              </span>
            </div>

            {/* CTAs */}
            <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowSummarySheet(false)}
                style={{
                  height: "48px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  boxShadow: "0 4px 16px -4px rgba(219,39,119,0.40)",
                }}
              >
                บันทึก & แชร์
              </button>
              <button
                type="button"
                onClick={() => setShowSummarySheet(false)}
                style={{
                  height: "36px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#9A8B73",
                }}
              >
                คุยต่อกับมิโอมิ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showConversionSheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,26,24,0.4)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowConversionSheet(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "#FFFFFF",
              borderRadius: "24px 24px 0 0",
              padding: "24px 24px 40px",
              boxShadow: "0 -8px 32px rgba(26,26,24,0.12)",
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
            </div>

            {/* Miomi */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Image src="/miomi/happy.png" alt="Miomi" width={120} height={120} style={{ objectFit: "contain" }} />
            </div>

            {/* Message */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "18px", fontWeight: 500, color: "#1A1A18", margin: "0 0 6px" }}>
                หนูอยากจำคุณได้ค่า~
              </p>
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "13px", color: "#9A8B73", margin: 0 }}>
                Sign up free — I'll remember everything we learned together~
              </p>
            </div>

            {/* Benefits */}
            <div style={{ background: "#FAFAF6", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px" }}>
              {[
                { th: "หนูจำชื่อและความก้าวหน้าของคุณได้", en: "I remember your name and progress" },
                { th: "คำศัพท์ที่เรียนไม่หายไปไหน", en: "Your vocabulary stays saved" },
                { th: "ชวนเพื่อนได้รับสิทธิ์พิเศษ", en: "Invite friends for bonus rewards" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: i < 2 ? "8px" : 0 }}>
                  <span style={{ color: "#F9A8D4", fontSize: "14px", marginTop: "1px" }}>✦</span>
                  <div>
                    <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1A1A18", margin: 0 }}>{b.th}</p>
                    <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px", color: "#9A8B73", margin: 0 }}>{b.en}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <Link
              href="/signup"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "52px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "16px",
                fontWeight: 500,
                color: "#FFFFFF",
                textDecoration: "none",
                boxShadow: "0 4px 16px -4px rgba(219,39,119,0.40)",
                marginBottom: "12px",
              }}
            >
              สมัครฟรีเลยค่า~
            </Link>
            <button
              type="button"
              onClick={() => setShowConversionSheet(false)}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "13px",
                color: "#C4BDB5",
                cursor: "pointer",
                padding: "8px",
              }}
            >
              ไว้ทีหลังนะคะ~ · Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
