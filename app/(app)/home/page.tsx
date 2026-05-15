"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Coffee, Heart, Mic, Zap, type LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { AppShell } from "@/components/layout/AppShell";
import { MiomiCharacter } from "@/components/miomi/MiomiCharacter";
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

const FEED_BUBBLE = {
  th: "อิ่มแล้วค่า~",
  en: "All full now~",
};

const PLAY_BUBBLE = {
  th: "เย้~ สนุกจัง!",
  en: "Yay~ so fun~",
};

const GUEST_SIGNUP_BUBBLE = {
  th: "อยากให้หนูจำชื่อคุณได้ไหมคะ~ จะได้เรียกคุณว่าที่รักได้นะคะ",
  en: "Do you want me to remember your name? So I can call you my darling~",
};

const GUEST_SIGNUP_STORAGE_KEY = "miomika-guest-signup-moment-v1";

const LEVEL_UP_BUBBLE = {
  th: "เลเวลอัพแล้วค่า~!",
  en: "You leveled up~!",
};

const PET_STORAGE_KEY = "miomika-home-pet-v1";
const DECAY_INTERVAL_MS = 10 * 60 * 1000;
const DECAY_AMOUNT = 5;
const MIN_STAT = 10;

type PetStats = {
  mood: number;
  energy: number;
  hunger: number;
  level: number;
  xp: number;
  lastUpdated: number;
};

const DEFAULT_PET: PetStats = {
  mood: 82,
  energy: 65,
  hunger: 45,
  level: 3,
  xp: 40,
  lastUpdated: 0,
};

function clampStat(value: number) {
  return Math.min(100, Math.max(MIN_STAT, value));
}

function applyDecay(stats: PetStats): PetStats {
  const now = Date.now();
  if (!stats.lastUpdated) {
    return { ...stats, lastUpdated: now };
  }
  const ticks = Math.floor((now - stats.lastUpdated) / DECAY_INTERVAL_MS);
  if (ticks <= 0) {
    return stats;
  }
  return {
    mood: clampStat(stats.mood - ticks * DECAY_AMOUNT),
    energy: clampStat(stats.energy - ticks * DECAY_AMOUNT),
    hunger: clampStat(stats.hunger - ticks * DECAY_AMOUNT),
    level: stats.level,
    xp: stats.xp,
    lastUpdated: now,
  };
}

function loadPetStats(): PetStats {
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PET, lastUpdated: Date.now() };
    }
    const parsed = JSON.parse(raw) as Partial<PetStats>;
    return applyDecay({
      mood: clampStat(parsed.mood ?? DEFAULT_PET.mood),
      energy: clampStat(parsed.energy ?? DEFAULT_PET.energy),
      hunger: clampStat(parsed.hunger ?? DEFAULT_PET.hunger),
      level: parsed.level ?? DEFAULT_PET.level,
      xp: parsed.xp ?? DEFAULT_PET.xp,
      lastUpdated: parsed.lastUpdated ?? Date.now(),
    });
  } catch {
    return { ...DEFAULT_PET, lastUpdated: Date.now() };
  }
}

function addXp(
  stats: PetStats,
  amount: number,
): { stats: PetStats; leveledUp: boolean } {
  let { level, xp } = stats;
  let leveledUp = false;
  xp += amount;
  while (xp >= 100) {
    xp -= 100;
    level += 1;
    leveledUp = true;
  }
  return {
    stats: { ...stats, level, xp, lastUpdated: Date.now() },
    leveledUp,
  };
}

const WALK_TRANSITION = {
  duration: 1.5,
  ease: "easeInOut" as const,
};

function PetStatusCircle({
  icon: Icon,
  percent,
  iconClass,
  textClass,
  ariaLabel,
}: {
  icon: LucideIcon;
  percent: number;
  iconClass: string;
  textClass: string;
  ariaLabel: string;
}) {
  const label = `${Math.round(percent)}%`;
  return (
    <div
      className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-[#8B1A35] bg-white shadow-sm"
      role="img"
      aria-label={ariaLabel}
    >
      <Icon className={cn("h-2.5 w-2.5", iconClass)} strokeWidth={2.5} />
      <span className={cn("text-[8px] font-bold leading-none", textClass)}>
        {label}
      </span>
    </div>
  );
}

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const {
    isGuest,
    authReady,
    openLockedTabPrompt,
    openSoftSignupPrompt,
    dismissGuestInvite,
  } = useGuestExploration();

  const [miomiX, setMiomiX] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [bubble, setBubble] = useState({ th: "", en: "" });
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [expressionFlip, setExpressionFlip] = useState<"idle" | "happy">(
    "idle",
  );
  const [tapBounceKey, setTapBounceKey] = useState(0);
  const [tapSpinKey, setTapSpinKey] = useState(0);
  const [feedAnimKey, setFeedAnimKey] = useState(0);
  const [playAnimKey, setPlayAnimKey] = useState(0);
  const [levelUpAnimKey, setLevelUpAnimKey] = useState(0);
  const [xpTick, setXpTick] = useState(0);
  const [pet, setPet] = useState<PetStats>(DEFAULT_PET);
  const [petReady, setPetReady] = useState(false);
  const [guestSignupMoment, setGuestSignupMoment] = useState(false);
  const tapCycleIndexRef = useRef(0);

  const lastActivityRef = useRef(0);

  useLayoutEffect(() => {
    lastActivityRef.current = Date.now();
    const loaded = loadPetStats();
    queueMicrotask(() => {
      setPet(loaded);
      setPetReady(true);
    });
  }, []);

  useEffect(() => {
    if (!petReady) return;
    localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(pet));
  }, [pet, petReady]);
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

  const showGuestSignupIfFirst = useCallback(() => {
    if (!authReady || !isGuest) return false;
    try {
      if (localStorage.getItem(GUEST_SIGNUP_STORAGE_KEY)) return false;
      localStorage.setItem(GUEST_SIGNUP_STORAGE_KEY, "1");
    } catch {
      return false;
    }
    setGuestSignupMoment(true);
    setBubble(GUEST_SIGNUP_BUBBLE);
    setBubbleVisible(true);
    return true;
  }, [authReady, isGuest]);

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

  const triggerLevelUpCelebration = useCallback(() => {
    window.setTimeout(() => {
      setLevelUpAnimKey((k) => k + 1);
      setBubble(LEVEL_UP_BUBBLE);
      setBubbleVisible(true);
      setExpressionFlip("happy");
      happyUntilRef.current = Date.now() + 3000;
      scheduleHappyEnd();
    }, 450);
  }, [scheduleHappyEnd]);

  const handleFeedPress = useCallback(() => {
    markActivity();
    wakeFromSleep();
    const firstGuest = showGuestSignupIfFirst();
    setFeedAnimKey((k) => k + 1);
    if (!firstGuest) {
      setBubble(FEED_BUBBLE);
      setBubbleVisible(true);
    }
    happyUntilRef.current = Date.now() + 2000;
    setExpressionFlip("happy");
    scheduleHappyEnd();
    setPet((prev) => {
      const withHunger = {
        ...prev,
        hunger: clampStat(prev.hunger + 15),
      };
      const { stats, leveledUp } = addXp(withHunger, 10);
      if (leveledUp) {
        triggerLevelUpCelebration();
      }
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [
    markActivity,
    wakeFromSleep,
    scheduleHappyEnd,
    triggerLevelUpCelebration,
    showGuestSignupIfFirst,
  ]);

  const handlePlayPress = useCallback(() => {
    markActivity();
    wakeFromSleep();
    const firstGuest = showGuestSignupIfFirst();
    setPlayAnimKey((k) => k + 1);
    if (!firstGuest) {
      setBubble(PLAY_BUBBLE);
      setBubbleVisible(true);
    }
    setPet((prev) => {
      const withEnergy = {
        ...prev,
        energy: clampStat(prev.energy + 15),
      };
      const { stats, leveledUp } = addXp(withEnergy, 10);
      if (leveledUp) {
        triggerLevelUpCelebration();
      }
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [
    markActivity,
    wakeFromSleep,
    triggerLevelUpCelebration,
    showGuestSignupIfFirst,
  ]);

  const handleGuestCreatePress = useCallback(() => {
    if (!showGuestSignupIfFirst()) {
      openSoftSignupPrompt();
    }
  }, [showGuestSignupIfFirst, openSoftSignupPrompt]);

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
    const id = window.setTimeout(() => {
      setBubble(WELCOME_BUBBLE);
      setBubbleVisible(true);
    }, reduceMotion ? 0 : 1200);
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
      setExpressionFlip(() => (Math.random() < 0.5 ? "idle" : "happy"));
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

  const bubbleTh = bubble.th;
  const bubbleEn = bubble.en;

  const miomiExpression = sleeping ? "idle" : expressionFlip;

  const floatTransition = sleeping
    ? { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const }
    : { duration: 3, repeat: Infinity, ease: "easeInOut" as const };

  const floatY = sleeping ? [0, -3, 0] : [0, -12, 0];
  const wagRotate = [-5, 5, -5];
  const wagDuration = 0.85;

  return (
    <AppShell>
      <style>{`
        @keyframes miomi-xp-tick {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .miomi-xp-tick {
          display: inline-block;
          animation: miomi-xp-tick 0.5s ease-out;
          transition: color 0.5s ease-out;
        }
      `}</style>
      <div className="flex h-svh max-h-svh min-h-0 w-full max-w-full flex-col overflow-hidden bg-white">
        {/* Miomi stage — flex-1, white canvas */}
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
          onPointerDown={handleStagePointerDown}
        >
          <div className="absolute left-3 top-3 z-20 rounded-full bg-rose-light px-3 py-1.5">
            <span className="text-[11px] font-semibold text-rose-deep">
              Miomi
            </span>
          </div>

          <motion.div className="pointer-events-none absolute inset-x-0 top-[8%] z-30 flex justify-center px-4">
            <motion.div
              className="pointer-events-auto w-full max-w-[min(92%,280px)] rounded-[14px] border border-rose-border bg-white px-3 py-2.5 shadow-sm"
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
              {bubbleEn ? (
                <p className="mt-1 text-[8px] leading-snug text-nav-muted">
                  {bubbleEn}
                </p>
              ) : null}
              {guestSignupMoment ? (
                <Link
                  href="/signup"
                  className="mt-2 flex w-full flex-col items-center rounded-full border border-rose-border bg-rose-light px-3 py-2 text-center transition-colors hover:bg-white"
                >
                  <span className="text-[10px] font-semibold text-rose-accent">
                    จำชื่อฉันนะคะ
                  </span>
                  <span className="text-[8px] font-normal text-nav-muted">
                    Remember my name
                  </span>
                </Link>
              ) : null}
            </motion.div>
          </motion.div>

          <motion.div className="absolute inset-x-0 bottom-12 top-0 z-10 flex h-full min-h-0 items-end justify-center px-2">
            <motion.div
              className="flex h-full max-h-full items-end justify-center"
              initial={
                reduceMotion
                  ? { y: 0, scale: 1, opacity: 1 }
                  : { y: 96, scale: 0.88, opacity: 0 }
              }
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <motion.div
                className="flex h-full max-h-full items-end justify-center"
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
                        <MiomiCharacter
                          expression={miomiExpression}
                          sleeping={sleeping}
                          feedAnimKey={feedAnimKey}
                          playAnimKey={playAnimKey}
                          levelUpAnimKey={levelUpAnimKey}
                          breathe={!reduceMotion}
                        />
                      </motion.div>
                    </motion.div>
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
            </motion.div>
          </motion.div>

          <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            <PetStatusCircle
              icon={Heart}
              percent={pet.mood}
              iconClass="text-[#D4537E]"
              textClass="text-[#D4537E]"
              ariaLabel={`Mood ${Math.round(pet.mood)} percent`}
            />
            <PetStatusCircle
              icon={Zap}
              percent={pet.energy}
              iconClass="text-[#B8860B]"
              textClass="text-[#B8860B]"
              ariaLabel={`Energy ${Math.round(pet.energy)} percent`}
            />
            <PetStatusCircle
              icon={Coffee}
              percent={pet.hunger}
              iconClass="text-[#639922]"
              textClass="text-[#639922]"
              ariaLabel={`Hunger ${Math.round(pet.hunger)} percent`}
            />
          </div>
          <div className="pointer-events-none absolute bottom-2 right-3 z-20 flex flex-col items-end gap-0.5">
            <motion.div className="flex items-baseline gap-1 text-[8px] font-medium leading-none text-[#B8860B]">
              <span>Lv.{pet.level}</span>
              <span
                key={`xp-${pet.xp}-${xpTick}`}
                className="miomi-xp-tick tabular-nums"
              >
                {pet.xp}/100 XP
              </span>
            </motion.div>
            <div className="h-[3px] w-14 overflow-hidden rounded-full bg-[#F0E0E8]">
              <div
                className="h-full rounded-full bg-[#B8860B] transition-all duration-500 ease-out"
                style={{ width: `${pet.xp}%` }}
              />
            </div>
          </div>
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
                onClick={handleGuestCreatePress}
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
            onClick={handleFeedPress}
            className="flex flex-1 flex-col items-center justify-center gap-0 rounded-xl border border-rose-border bg-rose-light leading-tight text-rose-accent transition-colors hover:bg-white"
          >
            <span className="text-xs font-medium">ฟีด</span>
            <span className="text-[8px] font-normal text-nav-muted">Feed</span>
          </button>
          <button
            type="button"
            onClick={handlePlayPress}
            className="flex flex-1 flex-col items-center justify-center gap-0 rounded-xl border border-rose-border bg-rose-light leading-tight text-rose-accent transition-colors hover:bg-white"
          >
            <span className="text-xs font-medium">เล่น</span>
            <span className="text-[8px] font-normal text-nav-muted">Play</span>
          </button>
          {authReady && isGuest ? (
            <button
              type="button"
              onClick={handleGuestCreatePress}
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

        {/* Mic */}
        <div className="flex shrink-0 items-center justify-center pb-2">
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
