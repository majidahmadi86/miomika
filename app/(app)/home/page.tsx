"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Coffee, Heart, Mic, Zap, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GUEST_SOFT_SIGNUP_COPY,
  GUEST_TAB_LOCK_COPY,
  useGuestExploration,
  useGuestHomeSoftNudgeTimer,
} from "@/components/guest/GuestExplorationContext";
import { AppShell } from "@/components/layout/AppShell";
import { PillButton } from "@/components/ui/PillButton";
import { cn } from "@/lib/utils";

const WELCOME_BUBBLE = {
  th: "สวัสดีค่า~ หนูรอคุณอยู่นะคะ",
  en: "I've been right here waiting for you~",
};

/** Five Thai-first lines, cycled on each tap (bounce + rotate). */
const TAP_BUBBLE_CYCLE = [
  { th: "วันนี้โพสต์อะไรดีคะ คิดถึงเลยค่า", en: "What are we posting today? I missed you~" },
  { th: "อยากให้หนูช่วยอะไร บอกได้เลยนะคะ", en: "Tell me what you need — I'm all ears~" },
  { th: "มาอยู่ข้างๆ แบบนี้ก็อบอุ่นดีนะคะ", en: "Having you here with me feels warm~" },
  { th: "หนูพร้อมฟังทุกเรื่องของคุณเลยค่า", en: "I'm ready to hear everything~" },
  { th: "พักสายตาแล้วมาคุยกับหนูหน่อยไหมคะ", en: "Rest your eyes and chat with me a bit~" },
] as const;

const SLEEP_BUBBLE = { th: "Zzz...", en: "Shhh... sweet dreams" };

const WALK_TRANSITION = {
  duration: 1.5,
  ease: "easeInOut" as const,
};

function PetStatusCircle({
  icon: Icon,
  percentLabel,
  iconClass,
  textClass,
  ariaLabel,
}: {
  icon: LucideIcon;
  percentLabel: string;
  iconClass: string;
  textClass: string;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-[#8B1A35] bg-white shadow-sm"
      role="img"
      aria-label={ariaLabel}
    >
      <Icon className={cn("h-2.5 w-2.5", iconClass)} strokeWidth={2.5} />
      <span className={cn("text-[8px] font-bold leading-none", textClass)}>
        {percentLabel}
      </span>
    </div>
  );
}

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const {
    isGuest,
    authReady,
    guestInvitePhase,
    openLockedTabPrompt,
    openSoftSignupPrompt,
    dismissGuestInvite,
  } = useGuestExploration();

  useGuestHomeSoftNudgeTimer(
    authReady && isGuest,
    openSoftSignupPrompt,
  );

  const [miomiX, setMiomiX] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [bubble, setBubble] = useState({ th: "", en: "" });
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [expressionFlip, setExpressionFlip] = useState<"idle" | "happy">(
    "idle",
  );
  const [tapBounceKey, setTapBounceKey] = useState(0);
  const [tapSpinKey, setTapSpinKey] = useState(0);
  const tapCycleIndexRef = useRef(0);

  const lastActivityRef = useRef(Date.now());
  const happyUntilRef = useRef(0);
  const happyTimeoutRef = useRef<number | null>(null);
  const walkTimeoutRef = useRef<number | null>(null);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const wakeFromSleep = useCallback(() => {
    setSleeping((s) => {
      if (s) {
        setBubble(WELCOME_BUBBLE);
        setBubbleVisible(true);
        return false;
      }
      return s;
    });
  }, []);

  const scheduleHappyEnd = useCallback(() => {
    if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
    happyTimeoutRef.current = window.setTimeout(() => {
      happyTimeoutRef.current = null;
      if (Date.now() >= happyUntilRef.current) {
        setExpressionFlip("idle");
      }
    }, 2000);
  }, []);

  const triggerPetTap = useCallback(() => {
    dismissGuestInvite();
    markActivity();
    wakeFromSleep();
    const i = tapCycleIndexRef.current % TAP_BUBBLE_CYCLE.length;
    tapCycleIndexRef.current += 1;
    const phrase = TAP_BUBBLE_CYCLE[i]!;
    setBubble({ th: phrase.th, en: phrase.en });
    setBubbleVisible(true);
    setTapBounceKey((k) => k + 1);
    setTapSpinKey((k) => k + 1);
    happyUntilRef.current = Date.now() + 2000;
    setExpressionFlip("happy");
    scheduleHappyEnd();
  }, [dismissGuestInvite, markActivity, wakeFromSleep, scheduleHappyEnd]);

  const handleStagePointerDown = useCallback(() => {
    markActivity();
    if (sleeping) {
      dismissGuestInvite();
      wakeFromSleep();
      setTapBounceKey((k) => k + 1);
      happyUntilRef.current = Date.now() + 2000;
      setExpressionFlip("happy");
      const i = tapCycleIndexRef.current % TAP_BUBBLE_CYCLE.length;
      tapCycleIndexRef.current += 1;
      const phrase = TAP_BUBBLE_CYCLE[i]!;
      setBubble({ th: phrase.th, en: phrase.en });
      setBubbleVisible(true);
      setTapSpinKey((k) => k + 1);
      scheduleHappyEnd();
    }
  }, [dismissGuestInvite, markActivity, sleeping, wakeFromSleep, scheduleHappyEnd]);

  useEffect(() => {
    if (reduceMotion) {
      setBubble(WELCOME_BUBBLE);
      setBubbleVisible(true);
      return;
    }
    const id = window.setTimeout(() => {
      setBubble(WELCOME_BUBBLE);
      setBubbleVisible(true);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || sleeping) {
      if (walkTimeoutRef.current) {
        window.clearTimeout(walkTimeoutRef.current);
        walkTimeoutRef.current = null;
      }
      return;
    }
    const scheduleWalk = () => {
      walkTimeoutRef.current = window.setTimeout(() => {
        setMiomiX(-60 + Math.random() * 120);
        scheduleWalk();
      }, 4000 + Math.random() * 2000);
    };
    scheduleWalk();
    return () => {
      if (walkTimeoutRef.current) window.clearTimeout(walkTimeoutRef.current);
      walkTimeoutRef.current = null;
    };
  }, [reduceMotion, sleeping]);

  useEffect(() => {
    if (reduceMotion || sleeping) return;
    const id = window.setInterval(() => {
      if (Date.now() < happyUntilRef.current) return;
      setExpressionFlip((prev) => {
        const next = Math.random() < 0.5 ? "idle" : "happy";
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [reduceMotion, sleeping]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= 30000) {
        setSleeping(true);
        setBubble(SLEEP_BUBBLE);
        setBubbleVisible(true);
        setMiomiX(0);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (sleeping) {
      setExpressionFlip("idle");
    }
  }, [sleeping]);

  useEffect(() => {
    if (!isGuest || guestInvitePhase === "none") return;
    setBubbleVisible(true);
  }, [isGuest, guestInvitePhase]);

  const guestInviteCopy = useMemo(() => {
    if (!isGuest) return null;
    if (guestInvitePhase === "tab_lock") return GUEST_TAB_LOCK_COPY;
    if (guestInvitePhase === "soft_nudge") return GUEST_SOFT_SIGNUP_COPY;
    return null;
  }, [isGuest, guestInvitePhase]);

  const bubbleTh = guestInviteCopy?.th ?? bubble.th;
  const bubbleEn = guestInviteCopy?.en ?? bubble.en;

  const imageSrc =
    expressionFlip === "happy" ? "/miomi/happy.png" : "/miomi/idle.png";

  const floatTransition = sleeping
    ? { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const }
    : { duration: 3, repeat: Infinity, ease: "easeInOut" as const };

  const floatY = sleeping ? [0, -3, 0] : [0, -12, 0];
  const wagRotate = [-5, 5, -5];
  const wagDuration = 0.85;

  return (
    <AppShell>
      <div className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-white">
        {/* Miomi stage — Miomi ~55vh, white canvas */}
        <div
          className="relative h-[55vh] w-full shrink-0 overflow-hidden bg-white"
          onPointerDown={handleStagePointerDown}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-b from-white to-[#fdf5f8]"
            aria-hidden
          />

          <div className="absolute left-3 top-3 z-20 rounded-full bg-rose-light px-3 py-1.5">
            <span className="text-[11px] font-semibold text-rose-deep">
              Miomi
            </span>
          </div>

          <div className="absolute right-3 top-3 z-20 flex max-w-[58%] flex-col items-end gap-2">
            <motion.div
              key={guestInvitePhase}
              className="w-full rounded-[14px] border border-rose-border bg-white px-3 py-2.5 shadow-sm"
              initial={false}
              animate={{
                opacity: bubbleVisible ? 1 : 0,
                y: bubbleVisible ? 0 : 6,
              }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <p className="text-[11px] font-medium leading-snug text-neutral-800">
                {bubbleTh}
              </p>
              <p className="mt-1 text-[8px] leading-snug text-nav-muted">
                {bubbleEn}
              </p>
            </motion.div>
            {isGuest && guestInvitePhase !== "none" ? (
              <Link
                href="/signup"
                className="shrink-0 rounded-full border border-rose-border bg-rose-light px-3 py-1.5 text-center text-[10px] font-semibold text-rose-accent shadow-sm transition-colors hover:bg-white"
              >
                สมัครฟรี
                <span className="mt-0.5 block text-[8px] font-normal text-nav-muted">
                  Sign up free
                </span>
              </Link>
            ) : null}
          </div>

          <div className="absolute bottom-[52px] left-1/2 z-10 min-w-0 max-w-full -translate-x-1/2 px-2">
            <motion.div
              initial={
                reduceMotion
                  ? { y: 0, scale: 1, opacity: 1 }
                  : { y: 96, scale: 0.88, opacity: 0 }
              }
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <motion.div
                className="flex justify-center"
                animate={reduceMotion ? { x: 0 } : { x: miomiX }}
                transition={WALK_TRANSITION}
              >
              <motion.div
                animate={reduceMotion ? { y: 0 } : { y: floatY }}
                transition={floatTransition}
              >
                <motion.div
                  className="origin-bottom"
                  animate={
                    reduceMotion
                      ? { rotate: sleeping ? 14 : 0 }
                      : sleeping
                        ? { rotate: 14 }
                        : { rotate: wagRotate }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0.35, ease: "easeInOut" }
                      : sleeping
                        ? { duration: 2.4, ease: "easeInOut" }
                        : {
                            duration: wagDuration,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }
                  }
                >
                  <motion.button
                    type="button"
                    aria-label="Tap Miomi"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={triggerPetTap}
                    className="relative block cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-accent"
                  >
                    <motion.div
                      key={tapBounceKey}
                      initial={false}
                      animate={
                        reduceMotion || tapBounceKey === 0
                          ? { y: 0 }
                          : { y: [0, -20, 0] }
                      }
                      transition={{
                        duration: 0.45,
                        times: [0, 0.35, 1],
                        ease: "easeOut",
                      }}
                    >
                      <motion.div
                        key={tapSpinKey}
                        initial={false}
                        animate={
                          reduceMotion || tapSpinKey === 0
                            ? { rotate: 0 }
                            : { rotate: [0, -10, 10, -6, 0] }
                        }
                        transition={{ duration: 0.55, ease: "easeOut" }}
                        className="origin-bottom"
                      >
                        <div
                          className={cn(
                            "origin-bottom",
                            !reduceMotion && "miomi-breathe",
                          )}
                        >
                          <Image
                            key={imageSrc}
                            src={imageSrc}
                            alt="Miomi"
                            width={560}
                            height={560}
                            priority
                            className="pointer-events-none h-[55vh] w-auto max-w-[min(92vw,100%)] select-none object-contain object-bottom"
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
          </div>

          <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            <PetStatusCircle
              icon={Heart}
              percentLabel="82%"
              iconClass="text-[#D4537E]"
              textClass="text-[#D4537E]"
              ariaLabel="Mood 82 percent"
            />
            <PetStatusCircle
              icon={Zap}
              percentLabel="65%"
              iconClass="text-[#B8860B]"
              textClass="text-[#B8860B]"
              ariaLabel="Energy 65 percent"
            />
            <PetStatusCircle
              icon={Coffee}
              percentLabel="45%"
              iconClass="text-[#639922]"
              textClass="text-[#639922]"
              ariaLabel="Hunger 45 percent"
            />
          </div>
          <p className="pointer-events-none absolute bottom-2 right-3 z-20 text-[8px] font-medium leading-none text-[#B8860B]">
            Lv.3
          </p>
        </div>

        {/* Daily topic — fixed band, no vertical growth */}
        <section className="mx-2 mt-1 flex h-[68px] shrink-0 flex-col justify-center overflow-hidden rounded-xl border border-gold-border bg-gold-light px-2 py-1">
          <p className="text-[7px] font-semibold uppercase tracking-wide text-gold">
            หยิบมาให้วันนี้ · MIOMI&apos;S PICK
          </p>
          <p
            className="mt-0.5 truncate text-[10px] font-bold leading-tight text-neutral-900"
            title="คาเฟ่ใหม่ย่านทองหล่อ กำลังเทรนด์ค่า"
          >
            คาเฟ่ใหม่ย่านทองหล่อ กำลังเทรนด์ค่า
          </p>
          <div className="mt-1 flex shrink-0 flex-nowrap gap-2">
            <PillButton
              variant="ghost"
              title="Save topic"
              onClick={
                authReady && isGuest
                  ? () => openLockedTabPrompt()
                  : undefined
              }
              className="h-7 shrink-0 rounded-full border-rose-border bg-rose-light px-3 py-0 text-[10px] font-medium leading-none text-rose-deep hover:bg-white"
            >
              บันทึกหัวข้อ
            </PillButton>
            {authReady && isGuest ? (
              <button
                type="button"
                title="Create now"
                onClick={() => openSoftSignupPrompt()}
                className="inline-flex h-7 shrink-0 items-center justify-center rounded-full bg-rose-accent px-3 text-[10px] font-medium leading-none text-white transition-colors hover:bg-rose-mid"
              >
                สร้างเลย
              </button>
            ) : (
              <Link
                href="/create"
                title="Create now"
                className="inline-flex h-7 shrink-0 items-center justify-center rounded-full bg-rose-accent px-3 text-[10px] font-medium leading-none text-white transition-colors hover:bg-rose-mid"
              >
                สร้างเลย
              </Link>
            )}
          </div>
        </section>

        {/* Actions — 48px */}
        <div className="flex h-12 shrink-0 gap-2 px-2 pt-1">
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0 rounded-xl border border-rose-border bg-rose-light leading-tight text-rose-accent transition-colors hover:bg-white"
          >
            <span className="text-xs font-medium">ฟีด</span>
            <span className="text-[8px] font-normal text-nav-muted">Feed</span>
          </button>
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0 rounded-xl border border-rose-border bg-rose-light leading-tight text-rose-accent transition-colors hover:bg-white"
          >
            <span className="text-xs font-medium">เล่น</span>
            <span className="text-[8px] font-normal text-nav-muted">Play</span>
          </button>
          {authReady && isGuest ? (
            <button
              type="button"
              onClick={() => openSoftSignupPrompt()}
              className="flex flex-[2] flex-col items-center justify-center gap-0 rounded-xl bg-rose-accent leading-tight text-white transition-colors hover:bg-rose-mid"
            >
              <span className="text-xs font-medium">สร้างกันเลย</span>
              <span className="text-[8px] font-normal text-white/85">
                Let&apos;s create
              </span>
            </button>
          ) : (
            <Link
              href="/create"
              className="flex flex-[2] flex-col items-center justify-center gap-0 rounded-xl bg-rose-accent leading-tight text-white transition-colors hover:bg-rose-mid"
            >
              <span className="text-xs font-medium">สร้างกันเลย</span>
              <span className="text-[8px] font-normal text-white/85">
                Let&apos;s create
              </span>
            </Link>
          )}
        </div>

        {/* Mic — 56px row */}
        <div className="flex h-14 shrink-0 items-center justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-rose-mid/50"
              initial={false}
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <button
              type="button"
              onClick={
                authReady && isGuest ? () => openLockedTabPrompt() : undefined
              }
              className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-rose-border bg-rose-light transition-colors hover:bg-white"
              aria-label="Hold to speak"
            >
              <Mic className="h-6 w-6 text-rose-accent" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
