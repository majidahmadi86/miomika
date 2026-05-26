"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, useDragControls, useReducedMotion } from "framer-motion";
import { Coffee, Heart, Zap, type LucideIcon } from "lucide-react";
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
import { AppShell } from "@/components/layout/AppShell";
import { MiomiCharacter } from "@/components/miomi/MiomiCharacter";
import { useProfile } from "@/lib/auth/use-profile";
import { cn } from "@/lib/utils";
import { useCompanionStore } from "@/lib/companion/store";
import { home } from "@/lib/voice/warmth";
import { detectLang, speak } from "@/lib/voice/tts";
import type { Language } from "@/lib/i18n/server";
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
  meaning: 'แปลว่า "เอาล่ะ ทำได้" หรือ "ฉันพร้อมแล้ว" ไม่ใช่แค่ตื่นนอนนะคะ',
};

const tapFeedback =
  "transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A96E]";

const TAP_BUBBLE_CYCLE = [
  { th: "วันนี้โพสต์อะไรดีคะ คิดถึงเลยค่า", en: "What are we posting today? I missed you~" },
  { th: "อยากให้หนูช่วยอะไร บอกได้เลยนะคะ", en: "Tell me what you need — I'm all ears~" },
  { th: "มาอยู่ข้างๆ แบบนี้ก็อบอุ่นดีนะคะ", en: "Having you here with me feels warm~" },
  { th: "หนูพร้อมฟังทุกเรื่องของคุณเลยค่า", en: "I'm ready to hear everything~" },
  { th: "พักสายตาแล้วมาคุยกับหนูหน่อยไหมคะ", en: "Rest your eyes and chat with me a bit~" },
] as const;

const SLEEP_BUBBLE = { th: "Zzz...", en: "Shhh... sweet dreams" };
const FEED_BUBBLE = { th: "อิ่มแล้วค่า~", en: "All full now~" };
const PLAY_BUBBLE = { th: "เย้~ สนุกจัง!", en: "Yay~ so fun~" };
const GUEST_SIGNUP_STORAGE_KEY = "miomika-guest-signup-moment-v1";
const LEVEL_UP_BUBBLE = { th: "เลเวลอัพแล้วค่า~!", en: "You leveled up~!" };

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

const WALK_TRANSITION = { duration: 1.5, ease: "easeInOut" as const };
const BUBBLE_CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";

type MiomiMood = "idle" | "happy" | "thinking";
type HeartParticle = { id: number; x: number; y: number };

function readUiLang(): Language {
  if (typeof navigator !== "undefined" && navigator.language.startsWith("en")) return "en";
  return "th";
}

function maybeSpeak(text: string): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("miomika.tts_on") !== "1") return;
  void speak(text, detectLang(text));
}

function StatPill({ icon: Icon, percent, iconClass, ariaLabel }: {
  icon: LucideIcon; percent: number; iconClass: string; ariaLabel: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-1.5 rounded-full border border-[#EAD0DB] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#1A1A1A] shadow-sm backdrop-blur-sm", tapFeedback)}
      role="img"
      aria-label={ariaLabel}
    >
      <Icon className={cn("h-3.5 w-3.5", iconClass)} strokeWidth={2.5} />
      <span>{Math.round(percent)}%</span>
    </div>
  );
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

  const uiLang = useMemo<Language>(() => {
    if (profile?.ui_language === "en" || profile?.ui_language === "th") return profile.ui_language;
    return readUiLang();
  }, [profile?.ui_language]);

  const [miomiX, setMiomiX] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [bubble, setBubble] = useState({ th: "", en: "" });
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [miomiMood, setMiomiMood] = useState<MiomiMood>("idle");
  const [tapBouncing, setTapBouncing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [particles, setParticles] = useState<HeartParticle[]>([]);
  const [bubbleOnLeft, setBubbleOnLeft] = useState(false);
  const [feedAnimKey, setFeedAnimKey] = useState(0);
  const [playAnimKey, setPlayAnimKey] = useState(0);
  const [levelUpAnimKey, setLevelUpAnimKey] = useState(0);
  const [xpTick, setXpTick] = useState(0);
  const [pet, setPet] = useState<PetStats>(DEFAULT_PET);
  const [petReady, setPetReady] = useState(false);
  const [meaningExpanded, setMeaningExpanded] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });

  const openCompanion = useCompanionStore((s) => s.open);

  const tapCycleIndexRef = useRef(0);
  const lastActivityRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerDownAtRef = useRef(0);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const isDragModeRef = useRef(false);
  const bubbleHideTimeoutRef = useRef<number | null>(null);
  const greetingShownRef = useRef(false);
  const dragControls = useDragControls();

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
      setBubbleOnLeft(miomiX > w * 0.08);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [miomiX]);


  useEffect(() => {
    if (!petReady) return;
    localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(pet));
  }, [pet, petReady]);

  const happyUntilRef = useRef(0);
  const happyTimeoutRef = useRef<number | null>(null);
  const walkTimeoutRef = useRef<number | null>(null);

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
    setBubbleText(text);
    if (opts?.th !== undefined) setBubble({ th: opts.th, en: opts.en ?? "" });
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
    setMiomiMood("happy");
    maybeSpeak(text);
    scheduleHappyEnd(1600);
  }, [dismissGuestInvite, markActivity, wakeFromSleep, uiLang, showBubble, scheduleHappyEnd]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDragModeRef.current = false;
    const text = home.react.drag(uiLang);
    if (!isGuest) showBubble(text, { reactive: true, autoHideMs: 3200 });
    happyUntilRef.current = Date.now() + 1200;
    setMiomiMood("happy");
    maybeSpeak(text);
    scheduleHappyEnd(1200);
  }, [isGuest, uiLang, showBubble, scheduleHappyEnd]);

  const triggerLevelUpCelebration = useCallback(() => {
    window.setTimeout(() => {
      setLevelUpAnimKey((k) => k + 1);
      if (!isGuest) showBubble(LEVEL_UP_BUBBLE.th, { th: LEVEL_UP_BUBBLE.th, en: LEVEL_UP_BUBBLE.en });
      setMiomiMood("happy");
      happyUntilRef.current = Date.now() + 3000;
      scheduleHappyEnd(3000);
    }, 450);
  }, [isGuest, showBubble, scheduleHappyEnd]);

  const handleFeedPress = useCallback(() => {
    markActivity(); wakeFromSleep();
    const firstGuest = showGuestSignupIfFirst();
    setFeedAnimKey((k) => k + 1);
    window.setTimeout(() => {
      if (!firstGuest && !isGuest) showBubble(FEED_BUBBLE.th, { th: FEED_BUBBLE.th, en: FEED_BUBBLE.en });
      happyUntilRef.current = Date.now() + 2000;
      setMiomiMood("happy");
      scheduleHappyEnd();
    }, 400);
    setPet((prev) => {
      const withHunger = { ...prev, hunger: clampStat(prev.hunger + 15) };
      const { stats, leveledUp } = addXp(withHunger, 10);
      if (leveledUp) triggerLevelUpCelebration();
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [markActivity, wakeFromSleep, scheduleHappyEnd, triggerLevelUpCelebration, showGuestSignupIfFirst, isGuest, showBubble]);

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
      if (leveledUp) triggerLevelUpCelebration();
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [markActivity, wakeFromSleep, triggerLevelUpCelebration, showGuestSignupIfFirst, isGuest, showBubble, scheduleHappyEnd]);

  const handleGuestCreatePress = useCallback(() => {
    showGuestSignupIfFirst();
    window.location.href = "/create";
  }, [showGuestSignupIfFirst]);

  // Home "Talk to Miomi" CTA opens the ambient companion sheet rather than
  // routing to /talk. /talk is reachable from the Fullscreen button inside
  // the sheet OR the Learn tab in the bottom nav. Phase-2 §8 Block A5.
  const handleTalkCTA = useCallback(() => {
    markActivity();
    openCompanion();
  }, [markActivity, openCompanion]);

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
    if (!authReady || isGuest || greetingShownRef.current) return;
    greetingShownRef.current = true;
    const id = window.setTimeout(() => {
      const text = home.greeting.pick(uiLang, {
        streakDays: profile?.streak ?? 0,
        lastSeenAt: profile?.last_seen_at ?? null,
        isFirstDay: !profile?.last_seen_at,
      });
      showBubble(text, { autoHideMs: 4000 });
    }, reduceMotion ? 0 : 1200);
    return () => window.clearTimeout(id);
  }, [authReady, isGuest, reduceMotion, uiLang, profile?.streak, profile?.last_seen_at, showBubble]);

  useEffect(() => {
    if (reduceMotion || sleeping) {
      if (walkTimeoutRef.current) { window.clearTimeout(walkTimeoutRef.current); walkTimeoutRef.current = null; }
      return;
    }
    const scheduleWalk = () => {
      walkTimeoutRef.current = window.setTimeout(() => {
        setMiomiX(-60 + Math.random() * 120);
        scheduleWalk();
      }, 4000 + Math.random() * 2000);
    };
    scheduleWalk();
    return () => { if (walkTimeoutRef.current) window.clearTimeout(walkTimeoutRef.current); walkTimeoutRef.current = null; };
  }, [reduceMotion, sleeping]);

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
        setMiomiX(0);
      }
    }, 500);
    return () => clearInterval(id);
  }, [isGuest, showBubble]);

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

  const bubbleTh = bubbleText || bubble.th;
  const bubbleEn = bubbleText ? "" : bubble.en;
  const miomiExpression = sleeping ? "idle" : miomiMood;
  const resolvedFuelCaption = useMemo(() => home.fuel.caption(uiLang), [uiLang]);

  return (
    <>
      <Suspense fallback={null}><CelebrationTrigger /></Suspense>
      <WelcomeScreen />
      <AppShell>
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

          <div className="flex h-full flex-col overflow-hidden bg-white md:hidden">
            {/* Miomi stage */}
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
              style={{ background: "#FAFAF6" }}
              onPointerDown={handleStagePointerDown}
            >
              <AmbientBackground mode="ambient" />

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

              <motion.div className="absolute inset-0 bottom-12 z-10 flex min-h-0 items-end justify-center px-2">
                <motion.div
                  className="flex h-full max-h-full items-end justify-center"
                  initial={reduceMotion ? { y: 0, scale: 1, opacity: 1 } : { y: 96, scale: 0.88, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  <motion.div
                    className="flex h-full max-h-full items-end justify-center"
                    animate={reduceMotion ? { x: 0 } : { x: miomiX }}
                    transition={WALK_TRANSITION}
                  >
                    <motion.div
                      className={cn("origin-bottom", sleeping && "rotate-[6deg]")}
                      drag
                      dragControls={dragControls}
                      dragListener={false}
                      dragConstraints={dragConstraints}
                      dragElastic={0.2}
                      dragMomentum={false}
                      onDragEnd={handleDragEnd}
                      animate={!isDragging ? { x: 0, y: 0 } : undefined}
                      transition={{ type: "spring", stiffness: 280, damping: 13 }}
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
                                maxWidth: "200px",
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
                              feedAnimKey={feedAnimKey}
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
              </motion.div>

              {/* Fuel strip */}
              <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20">
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
                    borderRadius: "20px", padding: "8px 14px",
                    border: "1px solid rgba(232,229,223,0.8)",
                  }}
                >
                  <Heart style={{ width: "14px", height: "14px", color: "#D4537E", flexShrink: 0 }} strokeWidth={2} />
                  <div style={{ flex: 1, height: "6px", background: "#F0E0E8", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pet.mood}%`, background: "#D4537E", borderRadius: "999px", transition: "width 0.5s ease-out" }} />
                  </div>
                  <Zap style={{ width: "14px", height: "14px", color: "#C9A96E", flexShrink: 0, marginLeft: "6px" }} strokeWidth={2} />
                  <div style={{ flex: 1, height: "6px", background: "#F0E0E8", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pet.energy}%`, background: "#C9A96E", borderRadius: "999px", transition: "width 0.5s ease-out" }} />
                  </div>
                  <Coffee style={{ width: "14px", height: "14px", color: "#7DD3C0", flexShrink: 0, marginLeft: "6px" }} strokeWidth={2} />
                  <div style={{ flex: 1, height: "6px", background: "#F0E0E8", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pet.hunger}%`, background: "#7DD3C0", borderRadius: "999px", transition: "width 0.5s ease-out" }} />
                  </div>
                  <div style={{ marginLeft: "8px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
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
                <p
                  style={{
                    marginTop: "8px",
                    textAlign: "center",
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: "16px",
                    color: "#9A8B73",
                  }}
                >
                  {resolvedFuelCaption}
                </p>
              </div>
            </div>

            {/* MIOMI'S PICK — collapsed by default */}
            <button
              type="button"
              onClick={() => setMeaningExpanded((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                height: meaningExpanded ? "auto" : "44px", minHeight: "44px",
                flexShrink: 0, background: "#FDF8EE",
                borderLeft: "3px solid #C9A96E",
                padding: meaningExpanded ? "10px 16px" : "0 16px",
                textAlign: "left", cursor: "pointer",
                transition: "height 0.25s ease", width: "100%",
                borderTop: "none", borderRight: "none", borderBottom: "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.10em", color: "#C9A96E", textTransform: "uppercase", flexShrink: 0 }}>
                    ✦ MIOMI&apos;S PICK
                  </span>
                  <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A1A18", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {DAILY_CHALLENGE.phrase}
                  </span>
                  <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "12px", color: "#9A8B73", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 1 }}>
                    — {DAILY_CHALLENGE.th}
                  </span>
                </div>
                {meaningExpanded && (
                  <div style={{ marginTop: "8px" }}>
                    <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "12px", color: "#6B7280", lineHeight: 1.6, marginBottom: "10px" }}>
                      {DAILY_CHALLENGE.meaning}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {authReady && isGuest ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleGuestCreatePress(); }}
                          style={{ display: "inline-flex", alignItems: "center", height: "28px", borderRadius: "999px", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", color: "#FFFFFF", fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, padding: "0 12px", border: "none", cursor: "pointer" }}
                        >
                          ฝึกเลย
                        </button>
                      ) : (
                        <Link
                          href="/create"
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: "inline-flex", alignItems: "center", height: "28px", borderRadius: "999px", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", color: "#FFFFFF", fontFamily: "'Kanit', sans-serif", fontSize: "11px", fontWeight: 500, padding: "0 12px", textDecoration: "none" }}
                        >
                          ฝึกเลย
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "10px", color: "#C9A96E", flexShrink: 0, transition: "transform 0.25s ease", transform: meaningExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                ▾
              </span>
            </button>

            {/* Action row */}
            <div style={{ display: "grid", gridTemplateColumns: "48px 48px 1fr", gap: "10px", padding: "10px 16px 12px", flexShrink: 0, alignItems: "center" }}>
              <button
                type="button"
                onClick={handleFeedPress}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  triggerFuelParticle(e.currentTarget, "#D4537E");
                }}
                className={tapFeedback}
                style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1.5px solid #EAD0DB", background: "#FBEAF0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <motion.div
                  animate={pet.mood < 50 ? { y: [0,-5,0], scale: [1,1.2,1] } : {}}
                  transition={{ duration: 0.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 4, delay: 0 }}
                >
                  <Heart style={{ width: "20px", height: "20px", color: "#D4537E" }} strokeWidth={2} />
                </motion.div>
              </button>

              <button
                type="button"
                onClick={handlePlayPress}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  triggerFuelParticle(e.currentTarget, "#C9A96E");
                }}
                className={tapFeedback}
                style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1.5px solid #EAD0DB", background: "#FBEAF0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <motion.div
                  animate={pet.energy < 50 ? { y: [0,-5,0], scale: [1,1.2,1] } : {}}
                  transition={{ duration: 0.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 4, delay: 2 }}
                >
                  <Zap style={{ width: "20px", height: "20px", color: "#C9A96E" }} strokeWidth={2} />
                </motion.div>
              </button>

              <button
                type="button"
                onClick={handleTalkCTA}
                className={tapFeedback}
                style={{ height: "52px", borderRadius: "999px", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px", boxShadow: "0 4px 16px -4px rgba(201,169,110,0.40)" }}
              >
                <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "15px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.3 }}>คุยกับมิโอมิ</span>
                <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.80)", letterSpacing: "0.06em" }}>Talk to Miomi</span>
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden flex-col gap-4 md:flex">
            <motion.div className="rounded-2xl border border-[#EAD0DB] bg-white p-5">
              <p className="text-base font-medium leading-[1.6] text-[#1A1A1A]">{WELCOME_BUBBLE.th}</p>
              <p className="mt-1 text-xs leading-[1.6] text-[#666666]">{WELCOME_BUBBLE.en}</p>
            </motion.div>
            <motion.div className="rounded-2xl border-l-4 border-[#C9A96E] bg-[#FDF8EE] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#C9A96E]">MIOMI&apos;S PICK · วันนี้</p>
              <p className="mt-2 text-lg font-medium leading-[1.6] text-[#1A1A1A]">{DAILY_CHALLENGE.phrase}</p>
              <p className="mt-1 text-sm leading-[1.6] text-[#1A1A1A]">{DAILY_CHALLENGE.th}</p>
              <p className="mt-2 text-xs leading-[1.6] text-[#666666]">{DAILY_CHALLENGE.meaning}</p>
              <Link href="/create" className={cn("mt-4 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-white", tapFeedback)} style={{ background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)" }}>
                ฝึกเลย
              </Link>
            </motion.div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
