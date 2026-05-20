// @ts-ignore
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Coffee, Heart, Zap, type LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { AppShell } from "@/components/layout/AppShell";
import { MiomiCharacter } from "@/components/miomi/MiomiCharacter";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false }
);

const WELCOME_BUBBLE = {
  th: "สวัสดีค่า~ วันนี้อยากพูด English เก่งขึ้นไหมคะ?",
  en: "Hi~ Want to speak better English today?",
};

const DAILY_CHALLENGE = {
  phrase: "I'm up for it",
  th: "ฉันพร้อมแล้ว — ใช้ตอบตกลงทำอะไรด้วยกัน",
  meaning:
    'แปลว่า "เอาล่ะ ทำได้" หรือ "ฉันพร้อมแล้ว" ไม่ใช่แค่ตื่นนอนนะคะ',
};

const tapFeedback =
  "transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1A35]";

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
  mood: 45,
  energy: 30,
  hunger: 20,
  level: 1,
  xp: 0,
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

function StatPill({
  icon: Icon,
  percent,
  iconClass,
  ariaLabel,
}: {
  icon: LucideIcon;
  percent: number;
  iconClass: string;
  ariaLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-[#EAD0DB] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#1A1A1A] shadow-sm backdrop-blur-sm",
        tapFeedback,
      )}
      role="img"
      aria-label={ariaLabel}
    >
      <Icon className={cn("h-3.5 w-3.5", iconClass)} strokeWidth={2.5} />
      <span>{Math.round(percent)}%</span>
    </div>
  );
}

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const {
    isGuest,
    authReady,
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
  const [meaningExpanded, setMeaningExpanded] = useState(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const seen = localStorage.getItem("miomika-welcomed-v1");
    if (seen) return false;
    return true;
  });
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
      setExpressionFlip(() => (Math.random() < 0.15 ? "happy" : "idle"));
    }, 8000);
    return () => clearInterval(id);
  }, [reduceMotion, sleeping]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= 60000) {
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

  return (
    <>
    {showWelcome && <WelcomeScreen onComplete={() => setShowWelcome(false)} />}
    <AppShell>
      <div className="flex h-full max-h-full flex-col overflow-hidden">
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
      <div className="flex h-full flex-col overflow-hidden bg-white md:hidden">
        {/* Miomi stage — flex-1, white canvas */}
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ background: "#FAFAF6" }}
          onPointerDown={handleStagePointerDown}
        >
          <AmbientBackground mode="ambient" />
          <motion.div className="absolute inset-0 bottom-12 z-10 flex min-h-0 items-end justify-center px-2">
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
                  className={cn(
                    "origin-bottom",
                    sleeping && "rotate-[6deg]",
                  )}
                >
                  <motion.button
                    type="button"
                    aria-label="Tap Miomi"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={triggerPetTap}
                    className="relative block cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-accent"
                  >
                    <MiomiCharacter
                      expression={miomiExpression}
                      sleeping={sleeping}
                      feedAnimKey={feedAnimKey}
                      playAnimKey={playAnimKey}
                      levelUpAnimKey={levelUpAnimKey}
                      breathe={!reduceMotion && !sleeping}
                    />
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="pointer-events-none absolute right-4 top-4 z-30 max-w-[65%]">
            <motion.div
              className="pointer-events-auto rounded-2xl border border-[#EAD0DB] bg-white/92 px-3 py-2.5 shadow-sm backdrop-blur-sm"
              initial={false}
              animate={{
                opacity: bubbleVisible ? 1 : 0,
                y: bubbleVisible ? 0 : 6,
              }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <p className="text-sm font-medium leading-[1.6] text-[#1A1A1A]">
                {bubbleTh}
              </p>
              {bubbleEn ? (
                <p className="mt-1 text-[11px] leading-[1.6] text-[#666666]">
                  {bubbleEn}
                </p>
              ) : null}
              {guestSignupMoment ? (
                <Link
                  href="/signup"
                  className={cn(
                    "mt-2 flex w-full flex-col items-center rounded-full border border-[#EAD0DB] bg-[#FBEAF0] px-3 py-2 text-center",
                    tapFeedback,
                  )}
                >
                  <span className="text-[10px] font-medium text-[#8B1A35]">
                    จำชื่อฉันนะคะ
                  </span>
                  <span className="text-[11px] font-normal leading-[1.6] text-[#666666]">
                    Remember my name
                  </span>
                </Link>
              ) : null}
            </motion.div>
          </motion.div>

          <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(8px)",
                borderRadius: "20px",
                padding: "8px 14px",
                border: "1px solid rgba(232,229,223,0.8)",
              }}
            >
              {/* Heart fuel bar */}
              <Heart
                style={{ width: "14px", height: "14px", color: "#D4537E", flexShrink: 0 }}
                strokeWidth={2}
              />
              <div
                style={{
                  flex: 1,
                  height: "6px",
                  background: "#F0E0E8",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pet.mood}%`,
                    background: "#D4537E",
                    borderRadius: "999px",
                    transition: "width 0.5s ease-out",
                  }}
                />
              </div>

              {/* Zap fuel bar */}
              <Zap
                style={{ width: "14px", height: "14px", color: "#C9A96E", flexShrink: 0, marginLeft: "6px" }}
                strokeWidth={2}
              />
              <div
                style={{
                  flex: 1,
                  height: "6px",
                  background: "#F0E0E8",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pet.energy}%`,
                    background: "#C9A96E",
                    borderRadius: "999px",
                    transition: "width 0.5s ease-out",
                  }}
                />
              </div>

              {/* Brain fuel bar */}
              <Coffee
                style={{ width: "14px", height: "14px", color: "#7DD3C0", flexShrink: 0, marginLeft: "6px" }}
                strokeWidth={2}
              />
              <div
                style={{
                  flex: 1,
                  height: "6px",
                  background: "#F0E0E8",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pet.hunger}%`,
                    background: "#7DD3C0",
                    borderRadius: "999px",
                    transition: "width 0.5s ease-out",
                  }}
                />
              </div>

              {/* Level + XP */}
              <div
                style={{
                  marginLeft: "8px",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#C9A96E",
                    lineHeight: 1,
                  }}
                >
                  Lv.{pet.level}
                </span>
                <div
                  style={{
                    width: "32px",
                    height: "3px",
                    background: "#F0E0E8",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    key={`xp-${pet.xp}-${xpTick}`}
                    className="miomi-xp-tick"
                    style={{
                      height: "100%",
                      width: `${pet.xp}%`,
                      background: "#C9A96E",
                      borderRadius: "999px",
                      transition: "width 0.5s ease-out",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMeaningExpanded((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: meaningExpanded ? "auto" : "44px",
            minHeight: "44px",
            flexShrink: 0,
            background: "#FDF8EE",
            borderLeft: "3px solid #C9A96E",
            padding: meaningExpanded ? "10px 16px" : "0 16px",
            textAlign: "left",
            cursor: "pointer",
            transition: "height 0.25s ease",
            width: "100%",
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  color: "#C9A96E",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                ✦ MIOMI&apos;S PICK
              </span>
              <span
                style={{
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1A1A18",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {DAILY_CHALLENGE.phrase}
              </span>
              <span
                style={{
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "12px",
                  color: "#9A8B73",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexShrink: 1,
                }}
              >
                — {DAILY_CHALLENGE.th}
              </span>
            </div>
            {meaningExpanded && (
              <div style={{ marginTop: "8px" }}>
                <p
                  style={{
                    fontFamily: "'Kanit', sans-serif",
                    fontSize: "12px",
                    color: "#6B7280",
                    lineHeight: 1.6,
                    marginBottom: "10px",
                  }}
                >
                  {DAILY_CHALLENGE.meaning}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  {authReady && isGuest ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleGuestCreatePress(); }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: "28px",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                        color: "#FFFFFF",
                        fontFamily: "'Kanit', sans-serif",
                        fontSize: "11px",
                        fontWeight: 500,
                        padding: "0 12px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ฝึกเลย
                    </button>
                  ) : (
                    <Link
                      href="/create"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: "28px",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                        color: "#FFFFFF",
                        fontFamily: "'Kanit', sans-serif",
                        fontSize: "11px",
                        fontWeight: 500,
                        padding: "0 12px",
                        textDecoration: "none",
                      }}
                    >
                      ฝึกเลย
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "10px",
              color: "#C9A96E",
              flexShrink: 0,
              transition: "transform 0.25s ease",
              transform: meaningExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 48px 1fr",
            gap: "10px",
            padding: "10px 16px 12px",
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          {/* Heart fuel button — icon only */}
          <button
            type="button"
            onClick={handleFeedPress}
            className={tapFeedback}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1.5px solid #EAD0DB",
              background: "#FBEAF0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <motion.div
              animate={pet.mood < 50 ? { y: [0,-5,0], scale: [1,1.2,1] } : {}}
              transition={{ duration: 0.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 4, delay: 0 }}
            >
              <Heart style={{ width: "20px", height: "20px", color: "#D4537E" }} strokeWidth={2} />
            </motion.div>
          </button>

          {/* Zap fuel button — icon only */}
          <button
            type="button"
            onClick={handlePlayPress}
            className={tapFeedback}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1.5px solid #EAD0DB",
              background: "#FBEAF0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <motion.div
              animate={pet.energy < 50 ? { y: [0,-5,0], scale: [1,1.2,1] } : {}}
              transition={{ duration: 0.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 4, delay: 2 }}
            >
              <Zap style={{ width: "20px", height: "20px", color: "#C9A96E" }} strokeWidth={2} />
            </motion.div>
          </button>

          {/* Primary CTA — Talk to Miomi */}
          {authReady && isGuest ? (
            <button
              type="button"
              onClick={handleGuestCreatePress}
              className={tapFeedback}
              style={{
                height: "52px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1px",
                boxShadow: "0 4px 16px -4px rgba(219,39,119,0.40)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  lineHeight: 1.3,
                }}
              >
                คุยกับมิโอมิ
              </span>
              <span
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.80)",
                  letterSpacing: "0.06em",
                }}
              >
                Talk to Miomi
              </span>
            </button>
          ) : (
            <Link
              href="/create"
              style={{
                height: "52px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1px",
                boxShadow: "0 4px 16px -4px rgba(219,39,119,0.40)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  lineHeight: 1.3,
                }}
              >
                คุยกับมิโอมิ
              </span>
              <span
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.80)",
                  letterSpacing: "0.06em",
                }}
              >
                Talk to Miomi
              </span>
            </Link>
          )}
        </div>
      </div>

      <div className="hidden flex-col gap-4 md:flex">
        <motion.div className="rounded-2xl border border-[#EAD0DB] bg-white p-5">
          <p className="text-base font-medium leading-[1.6] text-[#1A1A1A]">
            {WELCOME_BUBBLE.th}
          </p>
          <p className="mt-1 text-xs leading-[1.6] text-[#666666]">
            {WELCOME_BUBBLE.en}
          </p>
        </motion.div>
        <motion.div className="rounded-2xl border-l-4 border-[#B8860B] bg-[#FDF5E0] p-5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#B8860B]">
            MIOMI&apos;S PICK · วันนี้
          </p>
          <p className="mt-2 text-lg font-medium leading-[1.6] text-[#1A1A1A]">
            {DAILY_CHALLENGE.phrase}
          </p>
          <p className="mt-1 text-sm leading-[1.6] text-[#1A1A1A]">
            {DAILY_CHALLENGE.th}
          </p>
          <p className="mt-2 text-xs leading-[1.6] text-[#666666]">
            {DAILY_CHALLENGE.meaning}
          </p>
          <Link
            href="/create"
            className={cn(
              "mt-4 inline-flex h-9 items-center rounded-full bg-[#8B1A35] px-4 text-sm font-medium text-white",
              tapFeedback,
            )}
          >
            ฝึกเลย
          </Link>
        </motion.div>
        <motion.div>
          <p className="text-sm font-medium text-[#1A1A1A]">เซสชันล่าสุด</p>
          <p className="text-xs text-[#666666]">Recent sessions</p>
          <ul className="mt-3 space-y-2">
            {[
              "คาเฟ่ใหม่ย่านทองหล่อ",
              "รีวิวสกินแคร์ตัวโปรด",
              "คลิปสั้น TikTok 30 วิ",
            ].map((title) => (
              <li
                key={title}
                className="rounded-xl border border-[#EAD0DB] bg-white px-4 py-3 text-sm leading-[1.6] text-[#1A1A1A]"
              >
                {title}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div className="rounded-2xl border border-[#B8860B]/35 bg-[#FDF5E0] p-4">
          <p className="text-[8px] font-medium uppercase tracking-wide text-[#B8860B]">
            Miomi tip
          </p>
          <p className="mt-2 text-sm font-medium leading-[1.6] text-[#1A1A1A]">
            ลองใช้ &quot;I&apos;m up for it&quot; ตอบตกลงทำอะไรด้วยกัน ฟังเป็นธรรมชาติมากค่า
          </p>
          <p className="mt-1 text-xs leading-[1.6] text-[#666666]">
            Use &quot;I&apos;m up for it&quot; when you agree to join something — sounds natural.
          </p>
        </motion.div>
      </div>
      </div>
    </AppShell>
    </>
  );
}
