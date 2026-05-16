"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Gift, Mic, Send } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import type { MiomiContentPayload } from "@/types";

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

const INITIAL_MIOMI_TH =
  "วันนี้อยากฝึก English เรื่องอะไรดีคะ~ พูดหรือพิมพ์ได้เลยนะคะ ไม่ต้องเป็นทางการค่า";
const INITIAL_MIOMI_EN =
  "What would you like to practice in English today~? Just talk to me — no need to be formal";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

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
        th: "วันนี้อยากฝึก English เรื่องอะไรดีคะ~",
        en: "What would you like to practice in English today~?",
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

  const stageImage = (() => {
    switch (miomiExpression) {
      case "listening":
        return "/miomi/happy.png";
      case "thinking":
        return "/miomi/thinking.png";
      case "happy":
        return "/miomi/happy.png";
      default:
        return "/miomi/idle.png";
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

  const fetchMiomi = useCallback(
    async (topic: string, contentType: string) => {
      const res = await fetch("/api/miomi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          tone,
          language: outputLang,
          contentType,
        }),
      });
      const data = (await res.json()) as MiomiContentPayload & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          data?.error ?? "สร้างเนื้อหาไม่สำเร็จค่า ลองใหม่อีกครั้งนะคะ",
        );
      }
      return data;
    },
    [platform, tone, outputLang],
  );

  const deliverMainPackage = useCallback(
    async (data: MiomiContentPayload) => {
      setIsSpeaking(true);
      setStage("streaming_main");
      const introDelay = 320;
      const betweenDelay = 600;

      const steps: {
        th: string;
        en: string;
        card: Omit<Extract<ThreadMessage, { type: "card" }>, "id" | "type">;
      }[] = [
        {
          th: "หนูจัด Hook ให้ก่อนนะคะ เขียนมาจากใจให้เลยค่า~",
          en: "Here's a hook straight from the heart~",
          card: {
            cardType: "hook",
            label: "HOOK",
            th: data.hook_thai,
            en: data.hook_english,
          },
        },
        {
          th: `แคปชั่นสำหรับ ${platform} ค่า~`,
          en: `Here's a caption for ${platform}~`,
          card: {
            cardType: "caption",
            label: "CAPTION",
            th: data.caption_thai,
            en: data.caption_english,
          },
        },
        {
          th: "แฮชแท็กที่เหมาะสมค่า~",
          en: "Hashtags that fit the vibe~",
          card: {
            cardType: "hashtags",
            label: "HASHTAGS",
            th: data.hashtags_thai,
            en: data.hashtags_english,
          },
        },
        {
          th: "CTA ที่ดึงดูดค่า~",
          en: "A little CTA to pull them in~",
          card: {
            cardType: "cta",
            label: "CTA",
            th: data.cta,
            en: "",
          },
        },
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;
        pushMiomi(step.th, step.en);
        await sleep(introDelay);
        pushCard(step.card);
        if (i < steps.length - 1) await sleep(betweenDelay);
      }

      setIsSpeaking(false);
      setPostGiftMood(true);
      pushMiomi(
        "เสร็จแล้วค่า~ อยากให้ Miomi ช่วยอะไรเพิ่มอีกไหมคะ?",
        "All done~ Want Miomi to help with anything else?",
      );
      setFollowupChipsVisible(true);
      setStage("followup");
    },
    [platform, pushCard, pushMiomi],
  );

  const deliverCommentVariants = useCallback(
    async (data: MiomiContentPayload) => {
      setIsSpeaking(true);
      setStage("streaming_comments");
      await sleep(400);

      const variants: {
        label: string;
        th: string;
        en: string;
        cardType: CardType;
      }[] = [
        {
          label: "ตัวเลือกที่ 1 · REPLY 1",
          th:
            data.reply_variant_1_thai?.trim() ||
            data.comment_reply_thai ||
            "ขอบคุณมากนะคะ ยินดีต้อนรับเสมอเลยค่า",
          en: data.reply_variant_1_english?.trim() || "",
          cardType: "comment_reply_1",
        },
        {
          label: "ตัวเลือกที่ 2 · REPLY 2",
          th:
            data.reply_variant_2_thai?.trim() ||
            data.comment_reply_thai ||
            "ชอบที่มาคอมเมนต์แบบนี้มากเลยค่า",
          en: data.reply_variant_2_english?.trim() || "",
          cardType: "comment_reply_2",
        },
        {
          label: "ตัวเลือกที่ 3 · REPLY 3",
          th:
            data.reply_variant_3_thai?.trim() ||
            data.comment_reply_thai ||
            "แวะมาคุยกันใหม่ได้เสมอนะคะ",
          en: data.reply_variant_3_english?.trim() || "",
          cardType: "comment_reply_3",
        },
      ];

      pushMiomi(
        "เลือกแนวที่ชอบได้เลยค่า กดคัดลอกไปใช้ได้ทันทีนะคะ",
        "Pick a vibe — tap copy whenever you're ready~",
      );
      await sleep(500);

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]!;
        pushCard({
          cardType: v.cardType,
          label: v.label,
          th: v.th,
          en: v.en,
        });
        if (i < variants.length - 1) await sleep(600);
      }

      setIsSpeaking(false);
      setPostGiftMood(true);
      pushMiomi(
        "เสร็จแล้วค่า~ อยากให้ Miomi ช่วยอะไรเพิ่มอีกไหมคะ?",
        "All done~ Want Miomi to help with anything else?",
      );
      setFollowupChipsVisible(true);
      setStage("followup");
    },
    [pushCard, pushMiomi],
  );

  const runTopicPipeline = useCallback(
    async (topic: string, opts?: { skipUserBubble?: boolean }) => {
      if (processingLockRef.current) return;
      processingLockRef.current = true;
      const trimmed = topic.trim();
      if (!trimmed) {
        processingLockRef.current = false;
        return;
      }

      if (!opts?.skipUserBubble) {
        pushUser(trimmed);
      }
      lastTopicRef.current = trimmed;
      setInputText("");
      setStage("processing_topic");
      setApiLoading(true);
      pushMiomi(
        "โอเคค่า~ กำลังทำให้เลยนะคะ รอแป๊บนึงค่า~",
        "On it~ Give me just a moment~",
      );
      pushTyping();

      try {
        const data = await fetchMiomi(trimmed, "full_package");
        removeTyping();
        await deliverMainPackage(data);
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
    [deliverMainPackage, fetchMiomi, pushMiomi, pushTyping, pushUser, removeTyping],
  );

  const runCommentPipeline = useCallback(
    async (commentText: string) => {
      if (processingLockRef.current) return;
      processingLockRef.current = true;
      const trimmed = commentText.trim();
      if (!trimmed) {
        processingLockRef.current = false;
        return;
      }

      pushUser(trimmed);
      setInputText("");
      setStage("processing_comment");
      setApiLoading(true);
      pushMiomi(
        "โอเคค่า~ กำลังทำให้เลยนะคะ รอแป๊บนึงค่า~",
        "On it~ Give me just a moment~",
      );
      pushTyping();

      try {
        const data = await fetchMiomi(trimmed, "comment_reply_pack");
        removeTyping();
        await deliverCommentVariants(data);
      } catch (e) {
        removeTyping();
        pushMiomi(
          e instanceof Error ? e.message : "มีบางอย่างผิดพลาดค่า ลองใหม่นะคะ",
          "Something went wrong — want to try again?",
        );
        setStage("followup");
        setFollowupChipsVisible(true);
      } finally {
        setApiLoading(false);
        processingLockRef.current = false;
      }
    },
    [
      deliverCommentVariants,
      fetchMiomi,
      pushMiomi,
      pushTyping,
      pushUser,
      removeTyping,
    ],
  );

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t || isRecording) return;
    if (stage === "awaiting_topic") {
      void runTopicPipeline(t);
      return;
    }
    if (stage === "awaiting_comment") {
      void runCommentPipeline(t);
    }
  }, [inputText, isRecording, runCommentPipeline, runTopicPipeline, stage]);

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
      rec.lang = "th-TH";
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
          if (stageRef.current === "awaiting_topic") {
            void runTopicPipeline(finalText);
          } else if (stageRef.current === "awaiting_comment") {
            void runCommentPipeline(finalText);
          }
        }
      };
    },
    [runCommentPipeline, runTopicPipeline],
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
    <AppShell>
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
        {/* Fixed top: Miomi stage + pill controls (not scrollable) */}
        <div className="shrink-0 border-b border-[#EAD0DB] bg-white">
          <div className="relative h-[30vh] min-h-[140px] max-h-[260px] w-full shrink-0 overflow-hidden bg-white">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-b from-white to-[#fdf5f8]"
            aria-hidden
          />
          <div className="flex h-full items-end gap-2 px-3 pb-2 pt-8">
            <div className="miomi-login-float max-md:max-h-[200px] max-md:overflow-hidden w-[min(42%,140px)] shrink-0">
              <div className={cn(!reduceMotion && "miomi-breathe")}>
                <Image
                  src={stageImage}
                  alt="Miomi"
                  width={200}
                  height={200}
                  className="h-auto w-full min-w-[120px] max-h-[200px] object-contain md:max-h-none"
                  priority
                />
              </div>
            </div>
            <div className="min-w-0 max-w-[58%] self-center rounded-2xl rounded-tl-sm border border-[#EAD0DB] bg-[#FBEAF0] px-2.5 py-1.5 shadow-sm">
              <p className="line-clamp-3 whitespace-pre-line text-[10px] font-medium leading-snug text-neutral-800">
                {bubble.th}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-[#888888]">
                {bubble.en}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-white px-3 py-2">
          <p className="text-center text-[10px] leading-snug text-[#888888]">
            พูดคุยกับมิโอมิเป็นภาษาไทยหรืออังกฤษก็ได้นะคะ~
          </p>
        </div>
        </div>

        {/* Scrollable thread only */}
        <div
          ref={threadRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
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
                    <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-[#EAD0DB] bg-white">
                      <Image
                        src="/miomi/idle.png"
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 object-cover"
                      />
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-[#EAD0DB] bg-[#FBEAF0] px-3 py-2">
                      <p className="whitespace-pre-line text-[12px] font-medium leading-snug text-neutral-800">
                        {m.th}
                      </p>
                      <p className="mt-1 text-[9px] leading-snug text-[#888888]">
                        {m.en}
                      </p>
                    </div>
                  </div>
                ) : null}
                {m.type === "typing" ? (
                  <div className="flex justify-start gap-2">
                    <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-[#EAD0DB] bg-white">
                      <Image
                        src="/miomi/thinking.png"
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 object-cover"
                      />
                    </div>
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
                    <p className="mt-2 text-sm font-bold leading-snug text-neutral-900">
                      {m.th}
                    </p>
                    {m.en ? (
                      <p className="mt-1.5 text-xs leading-snug text-[#888888]">
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

        {/* ZONE 3 */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-t border-[#EAD0DB] bg-white px-3 py-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={onKeyDownInput}
            disabled={inputDisabled}
            placeholder="พิมพ์ที่นี่..."
            title="Type here..."
            className="min-w-0 flex-1 rounded-2xl border border-[#EAD0DB] bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none ring-0 placeholder:text-[#AAAAAA] focus:border-[#8B1A35] disabled:opacity-50"
          />
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
              "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAD0DB] transition-colors",
              isRecording
                ? "border-[#8B1A35] bg-[#8B1A35]"
                : "bg-[#FBEAF0]",
              (!speechSupported ||
                apiLoading ||
                isSpeaking ||
                (stage !== "awaiting_topic" && stage !== "awaiting_comment")) &&
                "cursor-not-allowed opacity-40",
            )}
            aria-pressed={isRecording}
            aria-label={isRecording ? "Stop recording" : "Voice input"}
          >
            {isRecording ? (
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-full bg-white/25"
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
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
            disabled={!inputText.trim() || inputDisabled || isRecording}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8B1A35] text-white transition-opacity",
              (!inputText.trim() || inputDisabled || isRecording) && "opacity-50",
            )}
            aria-label="Send"
          >
            <Send className="h-[18px] w-[18px]" strokeWidth={2} />
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
    </AppShell>
  );
}
