"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, useDragControls, useMotionValue, useReducedMotion, animate } from "framer-motion";
import { Flame, Heart, Sparkles } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { SmartGuide } from "@/components/onboarding/SmartGuide";
import { MiomiCharacter } from "@/components/miomi/MiomiCharacter";
import { useProfile } from "@/lib/auth/use-profile";
import { cn } from "@/lib/utils";
import { home } from "@/lib/voice/warmth";
import { detectLang, speak } from "@/lib/voice/tts";
import type { Language } from "@/lib/i18n/server";
import { useUILanguage } from "@/lib/i18n/client";
import { awardDailyBond, deriveBond, STAGE_UP_KEY, stageUpLine } from "@/lib/companion/bond";
import { ClosenessCard } from "@/components/home/ClosenessCard";
import { RemembersCard } from "@/components/home/RemembersCard";
import { MemoryLine } from "@/components/home/MemoryLine";
const HOME_T = {
  th: { greetCta: "เริ่มฝึกเลย", greetSub: "มาฝึกพูดด้วยกันไหมคะ", bubbleDefault: "พร้อมคุยกับหนูรึยังคะ", talkCta: "เริ่มคุยกับมิโอมิ", talkSub: "พร้อมเมื่อไหร่ กดได้เลยค่า", today: "วันนี้กับมิโอมิ", pickEyebrow: "✦ คำของมิโอมิ", listen: "ฟังเสียง", practice: "ฝึกเลย", streakUnit: "วันต่อกัน", level: "เลเวล", review: "ทบทวนคำศัพท์", reviewSub: "5 คำกำลังรอให้ทวน" },
  en: { greetCta: "Let's practice", greetSub: "let's get a little practice in", bubbleDefault: "I'm right here whenever you are", talkCta: "Talk with Miomi", talkSub: "tap whenever you're ready", today: "Today with Miomi", pickEyebrow: "✦ Miomi's word", listen: "Listen", practice: "Practice", streakUnit: "day streak", level: "Level", review: "Review words", reviewSub: "5 words to review" },
} as const;

function buildHomeGreeting(
  lang: "th" | "en",
  targetName: string | null,
  streak: number,
  hour: number,
  lastSeenAt: string | null,
): string {
  const tod =
    hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "night";

  const hoursSince =
    lastSeenAt ? (Date.now() - new Date(lastSeenAt).getTime()) / 3_600_000 : null;

  type Situation = "first" | "today" | "back" | "long_away" | "streak";
  let situation: Situation;
  if (!lastSeenAt) situation = "first";
  else if (streak >= 2) situation = "streak";
  else if (hoursSince != null && hoursSince >= 24 * 7) situation = "long_away";
  else if (hoursSince != null && hoursSince >= 24) situation = "back";
  else situation = "today";

  // Deterministic seed (stable server/client → no hydration flicker) that still
  // varies day to day and as the streak grows, so it never repeats the same line.
  const seed = Math.floor(Date.now() / 86_400_000) + streak;
  const pick = (arr: string[]) => arr[seed % arr.length];

  if (lang === "en") {
    const topic = targetName ?? "practice";
    const tw =
      tod === "morning" ? "Good morning" : tod === "afternoon" ? "Good afternoon" : tod === "evening" ? "Good evening" : "Up late";
    const bodies: Record<Situation, string[]> = {
      first: [
        `Welcome! I'm so happy you're here — want to start with a little ${topic}?`,
        `Hi shall we get to know each other over some ${topic}?`,
        `You made it let's take your first step into ${topic} together.`,
      ],
      today: [
        `${tw}! Ready for a little ${topic}?`,
        `${tw}! Got a few minutes for some ${topic}?`,
        `${tw}! Let's pick up where we left off — ${topic}?`,
      ],
      back: [
        `${tw}! Good to see you back — more ${topic}?`,
        `${tw}! It's been a couple of days — shall we get back to ${topic}?`,
        `${tw}! Missed you ready to ease back into ${topic}?`,
      ],
      long_away: [
        `${tw}! It's been a while — I really missed you. Want to start gently with ${topic}?`,
        `${tw}! You're back! Let's dust off your ${topic}, no rush`,
        `${tw}! So glad you came back — shall we pick ${topic} up again together?`,
      ],
      streak: [
        `${tw}! Day ${streak} — let's keep it going!`,
        `${tw}! ${streak} days strong I'm proud of you. More ${topic}?`,
        `${tw}! ${streak} days in a row — let's not break it now!`,
      ],
    };
    return pick(bodies[situation]);
  }

  const topic = targetName ?? "ฝึกซ้อม";
  const tw =
    tod === "morning" ? "อรุณสวัสดิ์ค่ะ" : tod === "afternoon" ? "สวัสดีตอนบ่ายค่ะ" : tod === "evening" ? "สวัสดีตอนเย็นค่ะ" : "ดึกแล้วนะคะ";
  const bodies: Record<Situation, string[]> = {
    first: [
      `ยินดีต้อนรับค่ะ หนูดีใจมากเลยที่คุณมา มาเริ่ม${topic}กันสักนิดไหมคะ?`,
      `สวัสดีค่ะ มาทำความรู้จักกันผ่าน${topic}ไหมคะ`,
      `คุณมาแล้ว มาก้าวแรกสู่${topic}ไปด้วยกันนะคะ`,
    ],
    today: [
      `${tw} พร้อมฝึก${topic}สักนิดไหมคะ?`,
      `${tw} มีเวลาสักหน่อยไหมคะ มาฝึก${topic}กัน`,
      `${tw} มาฝึก${topic}ต่อจากเมื่อก่อนกันค่ะ`,
    ],
    back: [
      `${tw} ดีใจที่ได้เจอกันอีกนะคะ มาฝึก${topic}กันต่อไหมคะ?`,
      `${tw} หายไปสองสามวันเลยนะคะ กลับมาฝึก${topic}กันค่ะ`,
      `${tw} คิดถึงคุณนะคะ พร้อมกลับมาฝึก${topic}กันรึยังคะ?`,
    ],
    long_away: [
      `${tw} หายไปนานเลยนะคะ หนูคิดถึงมากเลย มาเริ่ม${topic}เบาๆ กันก่อนไหมคะ?`,
      `${tw} คุณกลับมาแล้ว! มาปัดฝุ่น${topic}กันใหม่ ไม่ต้องรีบนะคะ`,
      `${tw} ดีใจมากที่คุณกลับมา มาเริ่ม${topic}ด้วยกันอีกครั้งนะคะ`,
    ],
    streak: [
      `${tw} วันที่ ${streak} แล้ว มารักษาสตรีคกันต่อนะคะ!`,
      `${tw} ${streak} วันติดแล้ว หนูภูมิใจในตัวคุณเลยค่ะ ฝึก${topic}ต่อไหมคะ?`,
      `${tw} ครบ ${streak} วันติดกันแล้วนะคะ อย่าเพิ่งหยุดนะ มาฝึก${topic}กันค่ะ`,
    ],
  };
  return pick(bodies[situation]);
}

const tapFeedback =
  "transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34A98F]";

const TAP_BUBBLE_CYCLE = [
  { th: "วันนี้โพสต์อะไรดีคะ คิดถึงเลยค่า", en: "What are we posting today? I missed you" },
  { th: "อยากให้หนูช่วยอะไร บอกได้เลยนะคะ", en: "Tell me what you need — I'm all ears" },
  { th: "มาอยู่ข้างๆ แบบนี้ก็อบอุ่นดีนะคะ", en: "Having you here with me feels warm" },
  { th: "หนูพร้อมฟังทุกเรื่องของคุณเลยค่า", en: "I'm ready to hear everything" },
  { th: "พักสายตาแล้วมาคุยกับหนูหน่อยไหมคะ", en: "Rest your eyes and chat with me a bit" },
] as const;

const SLEEP_BUBBLE = { th: "Zzz...", en: "Shhh... sweet dreams" };
const PLAY_BUBBLE = { th: "เย้ สนุกจัง!", en: "Yay, so fun!" };
const GUEST_SIGNUP_STORAGE_KEY = "miomika-guest-signup-moment-v1";
const LEVEL_UP_LINES: { th: string; en: string }[] = [
  { th: "เลเวล {level} แล้วนะคะ หนูรู้เลยว่าคุณเก่งขึ้นเรื่อยๆ", en: "Level {level} together I can tell you're getting it." },
  { th: "ถึงเลเวล {level} แล้ว! ทุกวันที่อยู่ด้วยกัน เราโตขึ้นทีละนิดเลยค่ะ", en: "That's level {level}! Every day with you, we grow a little." },
  { th: "เลเวล {level} แล้วค่า หนูภูมิใจในตัวคุณมากเลยนะคะ", en: "Level {level} I'm so proud of how far you've come." },
  { th: "เราขึ้นเลเวล {level} แล้ว! ขอบคุณที่อยู่เป็นเพื่อนหนูนะคะ", en: "We hit level {level}! Thanks for keeping me company" },
];

function pickLevelUpBubble(level: number): { th: string; en: string } {
  const v = LEVEL_UP_LINES[Math.floor(Math.random() * LEVEL_UP_LINES.length)];
  return {
    th: v.th.replace("{level}", String(level)),
    en: v.en.replace("{level}", String(level)),
  };
}

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
  if (!stats.lastUpdated) return { ...stats, lastUpdated: now };
  const ticks = Math.floor((now - stats.lastUpdated) / DECAY_INTERVAL_MS);
  if (ticks <= 0) return stats;
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
    if (!raw) return { ...DEFAULT_PET, lastUpdated: Date.now() };
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

function addXp(stats: PetStats, amount: number): { stats: PetStats; leveledUp: boolean } {
  let { level, xp } = stats;
  let leveledUp = false;
  xp += amount;
  while (xp >= 100) { xp -= 100; level += 1; leveledUp = true; }
  return { stats: { ...stats, level, xp, lastUpdated: Date.now() }, leveledUp };
}

const BUBBLE_CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";
const WANDER_EASE = [0.42, 0, 0.58, 1] as const;
const MIOMI_ANCHOR_TOP = "36%";
const PLACED_LINGER_MS = 5000;
const WANDER_RESUME_AFTER_REACTION_MS = 2000;

type MiomiMood = "idle" | "happy" | "thinking";
type HeartParticle = { id: number; x: number; y: number };

function readUiLang(): Language {
  if (typeof navigator !== "undefined" && navigator.language.startsWith("en")) return "en";
  return "th";
}

function stripTildes(s: string): string {
  return s.replace(/~/g, "");
}

function maybeSpeak(text: string): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("miomika.tts_on") !== "1") return;
  void speak(text, detectLang(text));
}

const CELEBRATION_STORAGE_KEY = "miomika-signup-celebrated-v1";
const CELEBRATION_DURATION_MS = 2400;

/** Reads ?celebrate=signup from URL and fires the burst animation. Only fires once per signup.
 *  Storage flag is set AFTER the burst completes so a failed render never blocks a future replay. */
function CelebrationTrigger() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("celebrate") !== "signup") return;
    try {
      if (localStorage.getItem(CELEBRATION_STORAGE_KEY) === "1") return;
    } catch {
      // private mode — proceed anyway
    }

    console.log("[home] celebration trigger detected");

    const url = new URL(window.location.href);
    url.searchParams.delete("celebrate");
    window.history.replaceState({}, "", url.toString());

    import("@/lib/celebration/burst")
      .then(({ triggerCelebration }) => {
        triggerCelebration({
          intensity: "high",
          miomi_state: "excited",
          duration_ms: CELEBRATION_DURATION_MS,
        });
      })
      .catch(() => {
        // Burst module failed to load — don't set flag so next visit retries.
      });

    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(CELEBRATION_STORAGE_KEY, "1");
      } catch {
        // private mode — best effort only
      }
    }, CELEBRATION_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [searchParams]);
  return null;
}

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const { isGuest, authReady, dismissGuestInvite } = useGuestExploration();
  const { profile } = useProfile();
  const [homeRevealReady, setHomeRevealReady] = useState(false);
  const handleHomeReady = useCallback(() => setHomeRevealReady(true), []);
  // The closeness reveal plays on a VISIBLE home — once the welcome splash is
  // done. The Smart Guide no longer gates first run (it's opt-in now), so the bar
  // reveals as soon as home is ready. A long fallback prevents a stuck-empty bar
  // if the ready signal never lands. Re-runs each home mount so it replays on refresh.
  const [revealFallback, setRevealFallback] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRevealFallback(true), 20000);
    return () => window.clearTimeout(t);
  }, []);
  const revealReady = homeRevealReady || revealFallback;

  const uiLang = useMemo<Language>(() => {
    if (profile?.ui_language === "en" || profile?.ui_language === "th") return profile.ui_language;
    return readUiLang();
  }, [profile?.ui_language]);
  const lang = useUILanguage();
  const [greetHour] = useState(() => new Date().getHours());
  const targetLang = profile?.learning_target_language ?? null;
  // Name whatever the user is learning, localized to the UI language. The target is
  // cross-resolved upstream, so a target matching the UI language only happens by
  // explicit choice (e.g. improving one's own English) — and naming it is correct.
  const targetName =
    targetLang === "en"
      ? lang === "th"
        ? "ภาษาอังกฤษ"
        : "English"
      : targetLang === "th"
        ? lang === "en"
          ? "Thai"
          : "ภาษาไทย"
        : null;
  const greeting = buildHomeGreeting(lang, targetName, profile?.streak ?? 0, greetHour, profile?.last_seen_at ?? null).replace(/~/g, "");

  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const [sleeping, setSleeping] = useState(false);
  const [bubble, setBubble] = useState({ th: "", en: "" });
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [miomiMood, setMiomiMood] = useState<MiomiMood>("idle");
  const [tapBouncing, setTapBouncing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [placedAt, setPlacedAt] = useState<number | null>(null);
  const [isWandering, setIsWandering] = useState(false);
  const [particles, setParticles] = useState<HeartParticle[]>([]);
  const [bubbleOnLeft, setBubbleOnLeft] = useState(false);
  const [playAnimKey, setPlayAnimKey] = useState(0);
  const [levelUpAnimKey, setLevelUpAnimKey] = useState(0);
  const [xpTick, setXpTick] = useState(0);
  const [pet, setPet] = useState<PetStats>(DEFAULT_PET);
  const [petReady, setPetReady] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });

  const tapCycleIndexRef = useRef(0);
  const lastActivityRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerDownAtRef = useRef(0);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const isDragModeRef = useRef(false);
  const bubbleHideTimeoutRef = useRef<number | null>(null);
  const dragControls = useDragControls();
  const wanderTimeoutRef = useRef<number | null>(null);
  const wanderPausedUntilRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPlacedRef = useRef(false);
  const placedAtRef = useRef<number | null>(null);
  const miomiMoodRef = useRef<MiomiMood>("idle");
  const wanderAnimStopRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    lastActivityRef.current = Date.now();
    const loaded = loadPetStats();
    queueMicrotask(() => { setPet(loaded); setPetReady(true); });
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const w = stage.offsetWidth;
      const h = stage.offsetHeight;
      setDragConstraints({
        left: -w * 0.3,
        right: w * 0.3,
        top: -h * 0.15,
        bottom: h * 0.15,
      });
      setBubbleOnLeft(posX.get() > w * 0.08);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    const unsubX = posX.on("change", (v) => {
      const w = stage.offsetWidth;
      setBubbleOnLeft(v > w * 0.08);
    });
    return () => {
      ro.disconnect();
      unsubX();
    };
  }, [posX]);


  useEffect(() => {
    if (!petReady) return;
    localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(pet));
  }, [pet, petReady]);

  const happyUntilRef = useRef(0);
  const happyTimeoutRef = useRef<number | null>(null);

  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { isPlacedRef.current = isPlaced; }, [isPlaced]);
  useEffect(() => { placedAtRef.current = placedAt; }, [placedAt]);
  useEffect(() => { miomiMoodRef.current = miomiMood; }, [miomiMood]);

  const pickWanderTarget = useCallback((stageW: number, stageH: number) => ({
    x: (Math.random() - 0.5) * stageW * 0.5,
    y: (Math.random() - 0.5) * stageH * 0.3,
  }), []);

  const runWanderTo = useCallback((targetX: number, targetY: number) => {
    wanderAnimStopRef.current?.();
    setIsWandering(true);
    const duration = 3 + Math.random();
    const cx = animate(posX, targetX, { duration, ease: WANDER_EASE });
    const cy = animate(posY, targetY, { duration, ease: WANDER_EASE });
    wanderAnimStopRef.current = () => {
      cx.stop();
      cy.stop();
    };
    void Promise.all([cx, cy]).finally(() => {
      wanderAnimStopRef.current = null;
      setIsWandering(false);
    });
  }, [posX, posY]);

  const markActivity = useCallback(() => { lastActivityRef.current = Date.now(); }, []);

  const clearBubbleHide = useCallback(() => {
    if (bubbleHideTimeoutRef.current) {
      window.clearTimeout(bubbleHideTimeoutRef.current);
      bubbleHideTimeoutRef.current = null;
    }
  }, []);

  const scheduleBubbleHide = useCallback((ms: number) => {
    clearBubbleHide();
    bubbleHideTimeoutRef.current = window.setTimeout(() => {
      bubbleHideTimeoutRef.current = null;
      setBubbleVisible(false);
    }, ms);
  }, [clearBubbleHide]);

  const showBubble = useCallback((
    text: string,
    opts?: { th?: string; en?: string; reactive?: boolean; autoHideMs?: number },
  ) => {
    setBubble({ th: opts?.th ?? text, en: opts?.en ?? text });
    setBubbleVisible(true);
    scheduleBubbleHide(opts?.autoHideMs ?? (opts?.reactive ? 3200 : 4000));
  }, [scheduleBubbleHide]);

  const wakeFromSleep = useCallback(() => {
    setSleeping((s) => {
      if (s) {
        if (!isGuest) {
          const text = home.greeting.pick(uiLang, {
            streakDays: profile?.streak ?? 0,
            lastSeenAt: profile?.last_seen_at ?? null,
            isFirstDay: !profile?.last_seen_at,
          });
          showBubble(text, { autoHideMs: 4000 });
        }
        return false;
      }
      return s;
    });
  }, [isGuest, uiLang, profile?.streak, profile?.last_seen_at, showBubble]);

  const showGuestSignupIfFirst = useCallback(() => {
    if (!authReady || !isGuest) return false;
    try {
      if (localStorage.getItem(GUEST_SIGNUP_STORAGE_KEY)) return false;
      localStorage.setItem(GUEST_SIGNUP_STORAGE_KEY, "1");
    } catch { return false; }
    return true;
  }, [authReady, isGuest]);

  const scheduleHappyEnd = useCallback((delayMs = 2000) => {
    if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
    happyTimeoutRef.current = window.setTimeout(() => {
      happyTimeoutRef.current = null;
      if (Date.now() >= happyUntilRef.current) setMiomiMood("idle");
    }, delayMs);
  }, []);

  const handleMiomiTap = useCallback(() => {
    dismissGuestInvite();
    markActivity();
    wakeFromSleep();
    const text = home.react.tap(uiLang);
    showBubble(text, { reactive: true, autoHideMs: 3200 });
    setTapBouncing(true);
    window.setTimeout(() => setTapBouncing(false), 280);
    setParticles((prev) => [
      ...prev,
      ...Array.from({ length: 3 }, (_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 50,
        y: 0,
      })),
    ]);
    happyUntilRef.current = Date.now() + 1600;
    wanderPausedUntilRef.current = Date.now() + 1600 + WANDER_RESUME_AFTER_REACTION_MS;
    setMiomiMood("happy");
    maybeSpeak(text);
    scheduleHappyEnd(1600);
  }, [dismissGuestInvite, markActivity, wakeFromSleep, uiLang, showBubble, scheduleHappyEnd]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDragModeRef.current = false;
    setIsPlaced(true);
    const now = Date.now();
    setPlacedAt(now);
    placedAtRef.current = now;
    isPlacedRef.current = true;
    const text = home.react.drag(uiLang);
    if (!isGuest) showBubble(text, { reactive: true, autoHideMs: 3200 });
    happyUntilRef.current = now + 1200;
    wanderPausedUntilRef.current = now + 1200 + WANDER_RESUME_AFTER_REACTION_MS;
    setMiomiMood("happy");
    maybeSpeak(text);
    scheduleHappyEnd(1200);
  }, [isGuest, uiLang, showBubble, scheduleHappyEnd]);

  const triggerLevelUpCelebration = useCallback((level: number) => {
    window.setTimeout(() => {
      setLevelUpAnimKey((k) => k + 1);
      if (!isGuest) {
        const line = pickLevelUpBubble(level);
        showBubble(line.th, { th: line.th, en: line.en, autoHideMs: 4600 });
      }
      setMiomiMood("happy");
      happyUntilRef.current = Date.now() + 3000;
      scheduleHappyEnd(3000);
    }, 450);
  }, [isGuest, showBubble, scheduleHappyEnd]);

  useEffect(() => {
    if (isGuest || !profile) return;
    let cancelled = false;
    void (async () => {
      await awardDailyBond();
      if (cancelled) return;
      try {
        const pending = window.localStorage.getItem(STAGE_UP_KEY);
        if (pending != null) {
          window.localStorage.removeItem(STAGE_UP_KEY);
          const line = stageUpLine(Number(pending));
          window.setTimeout(() => {
            if (!cancelled) showBubble(line.th, { th: line.th, en: line.en, autoHideMs: 5000 });
          }, 1400);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => { cancelled = true; };
  }, [isGuest, profile, showBubble]);

  const handlePlayPress = useCallback(() => {
    markActivity(); wakeFromSleep();
    const firstGuest = showGuestSignupIfFirst();
    setPlayAnimKey((k) => k + 1);
    window.setTimeout(() => {
      if (!firstGuest && !isGuest) showBubble(PLAY_BUBBLE.th, { th: PLAY_BUBBLE.th, en: PLAY_BUBBLE.en });
      happyUntilRef.current = Date.now() + 2000;
      setMiomiMood("happy");
      scheduleHappyEnd();
    }, 400);
    setPet((prev) => {
      const withEnergy = { ...prev, energy: clampStat(prev.energy + 15) };
      const { stats, leveledUp } = addXp(withEnergy, 10);
      if (leveledUp) triggerLevelUpCelebration(stats.level);
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [markActivity, wakeFromSleep, triggerLevelUpCelebration, showGuestSignupIfFirst, isGuest, showBubble, scheduleHappyEnd]);

  const handleStagePointerDown = useCallback(() => {
    markActivity();
    if (sleeping) {
      dismissGuestInvite();
      wakeFromSleep();
      setTapBouncing(true);
      window.setTimeout(() => setTapBouncing(false), 280);
      happyUntilRef.current = Date.now() + 2000;
      setMiomiMood("happy");
      if (!isGuest) {
        const i = tapCycleIndexRef.current % TAP_BUBBLE_CYCLE.length;
        tapCycleIndexRef.current += 1;
        const phrase = TAP_BUBBLE_CYCLE[i]!;
        showBubble(phrase.th, { th: phrase.th, en: phrase.en, reactive: true });
      }
      scheduleHappyEnd();
    }
  }, [dismissGuestInvite, markActivity, sleeping, wakeFromSleep, scheduleHappyEnd, isGuest, showBubble]);

  const handleMiomiPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    pointerDownAtRef.current = Date.now();
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDragModeRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleMiomiPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (sleeping) return;
    const elapsed = Date.now() - pointerDownAtRef.current;
    const dx = e.clientX - pointerStartPosRef.current.x;
    const dy = e.clientY - pointerStartPosRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8 && elapsed > 300 && !isDragModeRef.current) {
      wanderAnimStopRef.current?.();
      wanderAnimStopRef.current = null;
      setIsWandering(false);
      isDragModeRef.current = true;
      setIsDragging(true);
      setMiomiMood("thinking");
      dragControls.start(e);
    }
  }, [sleeping, dragControls]);

  const handleMiomiPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const elapsed = Date.now() - pointerDownAtRef.current;
    const dx = e.clientX - pointerStartPosRef.current.x;
    const dy = e.clientY - pointerStartPosRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (isDragModeRef.current) return;
    if (elapsed < 300 && dist < 8) handleMiomiTap();
  }, [handleMiomiTap]);

  useEffect(() => {
    if (reduceMotion || sleeping) {
      if (wanderTimeoutRef.current) {
        window.clearTimeout(wanderTimeoutRef.current);
        wanderTimeoutRef.current = null;
      }
      return;
    }

    const scheduleNextWander = () => {
      const delay = 6000 + Math.random() * 6000;
      wanderTimeoutRef.current = window.setTimeout(() => {
        wanderTimeoutRef.current = null;
        const stage = stageRef.current;
        if (!stage || reduceMotion || sleeping) {
          scheduleNextWander();
          return;
        }
        if (isDraggingRef.current) {
          scheduleNextWander();
          return;
        }
        if (Date.now() < wanderPausedUntilRef.current) {
          scheduleNextWander();
          return;
        }
        if (miomiMoodRef.current !== "idle" && Date.now() < happyUntilRef.current) {
          scheduleNextWander();
          return;
        }
        const placed = placedAtRef.current;
        if (isPlacedRef.current && placed !== null && Date.now() - placed < PLACED_LINGER_MS) {
          scheduleNextWander();
          return;
        }
        if (isPlacedRef.current && placed !== null && Date.now() - placed >= PLACED_LINGER_MS) {
          setIsPlaced(false);
          isPlacedRef.current = false;
          setPlacedAt(null);
          placedAtRef.current = null;
        }

        const w = stage.offsetWidth;
        const h = stage.offsetHeight;
        const target = pickWanderTarget(w, h);
        runWanderTo(target.x, target.y);
        scheduleNextWander();
      }, delay);
    };

    scheduleNextWander();
    return () => {
      if (wanderTimeoutRef.current) {
        window.clearTimeout(wanderTimeoutRef.current);
        wanderTimeoutRef.current = null;
      }
    };
  }, [reduceMotion, sleeping, pickWanderTarget, runWanderTo]);

  useEffect(() => {
    if (reduceMotion || sleeping) return;
    const id = window.setInterval(() => {
      if (Date.now() < happyUntilRef.current) return;
      setMiomiMood(() => (Math.random() < 0.15 ? "happy" : "idle"));
    }, 8000);
    return () => clearInterval(id);
  }, [reduceMotion, sleeping]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= 60000) {
        setSleeping(true);
        if (!isGuest) showBubble(SLEEP_BUBBLE.th, { th: SLEEP_BUBBLE.th, en: SLEEP_BUBBLE.en });
        posX.set(0);
        posY.set(0);
        setIsPlaced(false);
        isPlacedRef.current = false;
        setPlacedAt(null);
        placedAtRef.current = null;
      }
    }, 500);
    return () => clearInterval(id);
  }, [isGuest, showBubble, posX, posY]);

  useEffect(() => {
    return () => {
      if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
      clearBubbleHide();
    };
  }, [clearBubbleHide]);

  const triggerFuelParticle = useCallback((buttonEl: HTMLElement, color: string) => {
    const buttonRect = buttonEl.getBoundingClientRect();
    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;

    // Find Miomi center — roughly center-top of viewport
    const targetX = window.innerWidth / 2;
    const targetY = window.innerHeight * 0.38;

    // Create particle element
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) scale(1);
      transition: none;
      box-shadow: 0 0 8px ${color};
    `;
    document.body.appendChild(particle);

    // Animate along bezier curve toward Miomi
    const duration = 420;
    const start = performance.now();
    const dx = targetX - startX;
    const dy = targetY - startY;
    // Control point for arc (goes up and toward center)
    const cpX = startX + dx * 0.3;
    const cpY = startY + dy * 0.1 - 80;

    function animate(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Quadratic bezier
      const x = (1 - ease) * (1 - ease) * startX + 2 * (1 - ease) * ease * cpX + ease * ease * targetX;
      const y = (1 - ease) * (1 - ease) * startY + 2 * (1 - ease) * ease * cpY + ease * ease * targetY;
      const scale = 1 - ease * 0.4;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.transform = `translate(-50%, -50%) scale(${scale})`;
      particle.style.opacity = `${1 - ease * 0.3}`;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Burst at Miomi — create 5 small burst particles
        particle.remove();
        for (let i = 0; i < 5; i++) {
          const burst = document.createElement("div");
          const angle = (i / 5) * Math.PI * 2;
          const distance = 20 + Math.random() * 20;
          burst.style.cssText = `
            position: fixed;
            left: ${targetX}px;
            top: ${targetY}px;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${color};
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%);
            transition: all 0.4s ease-out;
            opacity: 1;
          `;
          document.body.appendChild(burst);
          requestAnimationFrame(() => {
            burst.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`;
            burst.style.opacity = "0";
          });
          setTimeout(() => burst.remove(), 400);
        }
      }
    }

    requestAnimationFrame(animate);
  }, []);

  const bubbleTh = stripTildes(uiLang === "en" ? bubble.en : bubble.th);
  const bubbleEn = "";
  const miomiExpression = sleeping ? "idle" : miomiMood;
  const bond = deriveBond(profile?.bond_points ?? 0);

  return (
    <>
      <Suspense fallback={null}><CelebrationTrigger /></Suspense>
      <WelcomeScreen onComplete={handleHomeReady} />
      <SmartGuide autoShow={false} />
      <div className="relative flex h-svh max-h-svh flex-col overflow-hidden bg-transparent md:h-screen md:max-h-screen md:overflow-hidden">
        <main className="min-h-0 flex-1 overflow-hidden pb-[12px]">
        <div className="flex h-full max-h-full flex-col overflow-hidden">
          <style>{`
            @keyframes miomi-xp-tick {
              0% { transform: scale(1); opacity: 1; }
              40% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            .miomi-xp-tick {
              display: inline-block;
              animation: miomi-xp-tick 0.5s ease-out;
              transition: color 0.5s ease-out;
            }
          `}</style>

          <div className="flex h-full flex-col overflow-hidden md:hidden">
            {/* Miomi stage */}
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
              style={{ background: "transparent" }}
              onPointerDown={handleStagePointerDown}
            >

              {authReady && isGuest ? (
                <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex justify-center">
                  <Link
                    href="/signup"
                    className={cn(
                      "pointer-events-auto max-w-[90%] rounded-full border border-[#EDE8E0] px-4 py-2 text-center backdrop-blur-[14px]",
                      tapFeedback,
                    )}
                    style={{
                      background: "rgba(255,255,255,0.88)",
                      boxShadow: BUBBLE_CARD_SHADOW,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: uiLang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "20px",
                        color: "#1A1A18",
                      }}
                    >
                      {home.guest.pill(uiLang)}
                    </span>
                  </Link>
                </div>
              ) : null}

              <motion.div
                className="absolute inset-x-0 z-10 px-2"
                style={{ top: 0, bottom: 48 }}
              >
                <motion.div
                  className="absolute left-1/2"
                  style={{ top: MIOMI_ANCHOR_TOP, x: "-50%" }}
                  initial={reduceMotion ? { y: 0, scale: 1, opacity: 1 } : { y: 96, scale: 0.88, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  <motion.div
                    className={cn("origin-bottom", sleeping && "rotate-[6deg]")}
                    style={{
                      x: posX,
                      y: posY,
                      willChange: isDragging || isWandering ? "transform" : undefined,
                    }}
                    drag
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={dragConstraints}
                    dragElastic={0.2}
                    dragMomentum={false}
                    onDragEnd={handleDragEnd}
                  >
                      <motion.div
                        animate={tapBouncing ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={
                          tapBouncing
                            ? { duration: 0.28, type: "spring", stiffness: 280, damping: 13 }
                            : undefined
                        }
                        className="origin-bottom"
                      >
                        <div className="relative">
                          {!isGuest && bubbleVisible ? (
                            <motion.div
                              className="pointer-events-none absolute z-20"
                              style={{
                                top: "8%",
                                ...(bubbleOnLeft
                                  ? { right: "100%", marginRight: "12px" }
                                  : { left: "100%", marginLeft: "12px" }),
                                maxWidth: "min(200px, 60vw)",
                                width: "max-content",
                              }}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{
                                opacity: bubbleVisible ? 1 : 0,
                                y: bubbleVisible ? 0 : -4,
                              }}
                              transition={{
                                duration: bubbleVisible ? 0.24 : 0.36,
                                ease: bubbleVisible ? [0.4, 0, 0.2, 1] : "easeIn",
                              }}
                            >
                              <div
                                className="relative rounded-2xl border border-[#EDE8E0] px-[14px] py-[10px] backdrop-blur-[14px]"
                                style={{
                                  background: "rgba(255,255,255,0.88)",
                                  boxShadow: BUBBLE_CARD_SHADOW,
                                }}
                              >
                                <p
                                  style={{
                                    fontFamily: uiLang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    lineHeight: "20px",
                                    color: "#1A1A18",
                                  }}
                                >
                                  {bubbleTh}
                                </p>
                                {bubbleEn ? (
                                  <p
                                    style={{
                                      marginTop: "4px",
                                      fontFamily: "'Quicksand', sans-serif",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                      lineHeight: "16px",
                                      color: "#9A8B73",
                                    }}
                                  >
                                    {bubbleEn}
                                  </p>
                                ) : null}
                                <div
                                  aria-hidden
                                  style={{
                                    position: "absolute",
                                    top: "24px",
                                    ...(bubbleOnLeft
                                      ? { right: "-8px", borderLeft: "8px solid rgba(255,255,255,0.88)" }
                                      : { left: "-8px", borderRight: "8px solid rgba(255,255,255,0.88)" }),
                                    width: 0,
                                    height: 0,
                                    borderTop: "8px solid transparent",
                                    borderBottom: "8px solid transparent",
                                  }}
                                />
                              </div>
                            </motion.div>
                          ) : null}

                          <div className="pointer-events-none absolute inset-0 z-10">
                            {particles.map((p) => (
                              <motion.div
                                key={p.id}
                                className="absolute left-1/2 top-[20%]"
                                style={{ marginLeft: p.x }}
                                initial={{ y: p.y, opacity: 1, scale: 0.8 }}
                                animate={{ y: p.y - 40, opacity: 0, scale: 1.2 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                onAnimationComplete={() =>
                                  setParticles((prev) => prev.filter((x) => x.id !== p.id))
                                }
                              >
                                <Heart
                                  size={14}
                                  fill="#F9A8D4"
                                  stroke="#DB2777"
                                  strokeWidth={2}
                                />
                              </motion.div>
                            ))}
                          </div>

                          <motion.button
                            type="button"
                            aria-label="Tap Miomi"
                            onPointerDown={handleMiomiPointerDown}
                            onPointerMove={handleMiomiPointerMove}
                            onPointerUp={handleMiomiPointerUp}
                            onPointerCancel={handleMiomiPointerUp}
                            className="relative block cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-accent"
                          >
                            <MiomiCharacter
                              expression={miomiExpression}
                              sleeping={sleeping}
                              playAnimKey={playAnimKey}
                              levelUpAnimKey={levelUpAnimKey}
                              breathe={!reduceMotion && !sleeping && !isDragging}
                            />
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
              </motion.div>

              {/* Closeness strip */}
              <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20">
                <div
                  style={{
                    background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
                    borderRadius: "20px", padding: "10px 14px",
                    border: "1px solid rgba(232,229,223,0.8)",
                    pointerEvents: "auto",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Heart style={{ width: "16px", height: "16px", color: "#E06B9A", flexShrink: 0 }} fill="#F9C2DC" strokeWidth={2} />
                  <div style={{ flex: 1, height: "7px", background: "#F3E6EC", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: revealReady ? `${Math.round(bond.heartPct * 100)}%` : "0%", background: "#D4537E", borderRadius: "999px", transition: "width 0.8s cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0, color: "#993556" }}>
                    <Heart style={{ width: "13px", height: "13px", color: "#E06B9A" }} fill="#F9C2DC" strokeWidth={2} />
                    <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "13px", fontWeight: 700, lineHeight: 1 }}>{bond.hearts}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0, color: "#A66A12" }}>
                    <Flame style={{ width: "13px", height: "13px", color: "#EFA94A" }} fill="#FCE6C2" strokeWidth={2} />
                    <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "13px", fontWeight: 700, lineHeight: 1 }}>{profile?.streak ?? 0}</span>
                  </span>
                  <div style={{ marginLeft: "6px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 700, color: "#C9A96E", lineHeight: 1 }}>
                      Lv.{pet.level}
                    </span>
                    <div style={{ width: "32px", height: "3px", background: "#F0E0E8", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        key={`xp-${pet.xp}-${xpTick}`}
                        className="miomi-xp-tick"
                        style={{ height: "100%", width: `${pet.xp}%`, background: "#C9A96E", borderRadius: "999px", transition: "width 0.5s ease-out" }}
                      />
                    </div>
                  </div>
                  </div>
                  <MemoryLine lang={lang} />
                </div>
              </div>
            </div>

            {/* Action row */}
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: "10px", padding: "10px 16px 12px", flexShrink: 0, alignItems: "center" }}>
              <button
                type="button"
                onClick={handlePlayPress}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  triggerFuelParticle(e.currentTarget, "#D4537E");
                }}
                className={tapFeedback}
                style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1.5px solid #EAD0DB", background: "#FBEAF0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <Sparkles style={{ width: "20px", height: "20px", color: "#D4537E" }} strokeWidth={2} />
              </button>

              <Link
                href="/talk"
                onClick={() => markActivity()}
                className={tapFeedback}
                style={{ height: "52px", borderRadius: "999px", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px", boxShadow: "0 4px 16px -4px rgba(52,169,143,0.40)", textDecoration: "none" }}
              >
                <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "15px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.3 }}>คุยกับมิโอมิ</span>
                <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.80)", letterSpacing: "0.06em" }}>Talk to Miomi</span>
              </Link>
            </div>
          </div>

          {/* Desktop — Miomi-centered home (alive) */}
          <div className="hidden h-full md:flex md:flex-col md:overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-[1120px] flex-col px-8 py-6">
              <div className="mb-6">
                <h1 className="text-[23px] font-medium leading-snug text-ink">{greeting}</h1>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
                <section
                  className="relative flex flex-col items-center justify-center overflow-hidden rounded-[24px] border border-[#E4EFE9] px-7 pb-6 pt-6"
                  style={{ background: "linear-gradient(180deg, #F2FAF7 0%, #FCFBF6 70%)" }}
                >
                  <div className="mb-1 max-w-[72%] self-start">
                    <div className="rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-card">
                      <p className="text-sm font-medium text-ink" style={{ fontFamily: "'Kanit', sans-serif" }}>
                        {bubbleVisible && bubbleTh ? bubbleTh : HOME_T[lang].bubbleDefault}
                      </p>
                      {bubbleVisible && bubbleEn ? (
                        <p className="mt-0.5 text-[11px] text-ink-muted" style={{ fontFamily: "'Quicksand', sans-serif" }}>{bubbleEn}</p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleMiomiTap}
                    aria-label="Tap Miomi"
                    className="relative my-1 block cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline-none"
                    style={{ width: "min(300px, 34vh)" }}
                  >
                    <MiomiCharacter
                      expression={miomiMood}
                      sleeping={false}
                      playAnimKey={playAnimKey}
                      levelUpAnimKey={levelUpAnimKey}
                      breathe={!reduceMotion}
                    />
                  </button>

                  <Link
                    href="/talk"
                    className={cn("mt-4 flex w-full max-w-[460px] items-center justify-center gap-2.5 rounded-[18px] p-4 shadow-cta", tapFeedback)}
                    style={{ background: "linear-gradient(135deg, var(--mk-accent-grad-from) 0%, var(--mk-accent-grad-to) 100%)" }}
                  >
                    <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-[17px] font-medium text-white">{HOME_T[lang].talkCta}</span>
                      <span className="text-[11px] font-semibold tracking-wide text-white/80" style={{ fontFamily: "'Quicksand', sans-serif" }}>{HOME_T[lang].talkSub}</span>
                    </span>
                  </Link>
                </section>

                <section className="flex flex-col gap-3">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-subtle" style={{ fontFamily: "'Quicksand', sans-serif" }}>{HOME_T[lang].today}</p>

                  <ClosenessCard points={profile?.bond_points ?? 0} lang={lang} active={revealReady} />

                  <RemembersCard lang={lang} />

                  <div className="rounded-card border border-line bg-surface p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1 0-2-.5-3 2 1.5 3.5 4 3.5 7a7 7 0 0 1-14 0c0-4 3-6 6-10z" /></svg>
                        <span className="text-[14px] font-semibold text-earned-strong" style={{ fontFamily: "'Quicksand', sans-serif" }}>{profile?.streak ?? 0}</span>
                        <span className="text-[12px] text-ink-muted">{HOME_T[lang].streakUnit}</span>
                      </span>
                      <span className="text-[12.5px] font-medium text-ink-muted">{HOME_T[lang].level} {pet.level}</span>
                    </div>
                    <div className="mt-3 h-[7px] overflow-hidden rounded-full" style={{ background: "#F1EAD9" }}>
                      <div className="h-full rounded-full" style={{ width: `${pet.xp}%`, background: "linear-gradient(90deg, #E3C98B, var(--mk-earned))" }} />
                    </div>
                    <p className="mt-2 text-[11px] text-ink-muted">{lang === "en" ? `${Math.max(0, 100 - Math.round(pet.xp))} XP to next level` : `อีก ${Math.max(0, 100 - Math.round(pet.xp))} XP ถึงเลเวลถัดไป`}</p>
                  </div>

                  <Link href="/learn" className={cn("flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card", tapFeedback)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ background: "var(--mk-warm-soft)" }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#993556" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-ink">{HOME_T[lang].review}</span>
                      <span className="block text-[11.5px] text-ink-muted">{HOME_T[lang].reviewSub}</span>
                    </span>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                </section>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </>
  );
}
