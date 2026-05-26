"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Coffee, Heart, Zap, type LucideIcon } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";
import { home } from "@/lib/voice/warmth";
import { detectLang, speak } from "@/lib/voice/tts";
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
import { useCompanionStore } from "@/lib/companion/store";
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

const SLEEP_BUBBLE = { th: "Zzz...", en: "Shhh... sweet dreams" };
const FEED_BUBBLE = { th: "อิ่มแล้วค่า~", en: "All full now~" };
const PLAY_BUBBLE = { th: "เย้~ สนุกจัง!", en: "Yay~ so fun~" };
const GUEST_SIGNUP_BUBBLE = {
  th: "อยากให้หนูจำชื่อคุณได้ไหมคะ~ จะได้เรียกคุณว่าที่รักได้นะคะ",
  en: "Do you want me to remember your name? So I can call you my darling~",
};
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

type HeartParticle = { id: number; x: number };

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const uiLang = useUILanguage();
  const { isGuest, authReady, dismissGuestInvite } = useGuestExploration();

  const [miomiX, setMiomiX] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [bubble, setBubble] = useState({ th: "", en: "" });
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [expressionFlip, setExpressionFlip] = useState<"idle" | "happy">("idle");
  const [tapBounceKey, setTapBounceKey] = useState(0);
  const [tapSpinKey, setTapSpinKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const [feedAnimKey, setFeedAnimKey] = useState(0);
  const [playAnimKey, setPlayAnimKey] = useState(0);
  const [levelUpAnimKey, setLevelUpAnimKey] = useState(0);
  const [xpTick, setXpTick] = useState(0);
  const [pet, setPet] = useState<PetStats>(DEFAULT_PET);
  const [petReady, setPetReady] = useState(false);
  const [guestSignupMoment, setGuestSignupMoment] = useState(false);
  const [meaningExpanded, setMeaningExpanded] = useState(false);

  // Welcome screen self-gates via the WelcomeScreen component (Phase 2,
  // Block A1 — hydration-safe mounted guard + shouldShowWelcome decision).
  const openCompanion = useCompanionStore((s) => s.open);

  const lastActivityRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const bubbleHideRef = useRef<number | null>(null);
  const reactMoodTimeoutRef = useRef<number | null>(null);
  const [dragConstraints, setDragConstraints] = useState({
    left: -120,
    right: 120,
    top: -40,
    bottom: 40,
  });

  useLayoutEffect(() => {
    lastActivityRef.current = Date.now();
    const loaded = loadPetStats();
    queueMicrotask(() => { setPet(loaded); setPetReady(true); });
  }, []);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setDragConstraints({
      left: -w * 0.3,
      right: w * 0.3,
      top: -h * 0.15,
      bottom: h * 0.15,
    });
  }, [petReady]);


  useEffect(() => {
    if (!petReady) return;
    localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(pet));
  }, [pet, petReady]);

  const happyUntilRef = useRef(0);
  const happyTimeoutRef = useRef<number | null>(null);
  const walkTimeoutRef = useRef<number | null>(null);

  const markActivity = useCallback(() => { lastActivityRef.current = Date.now(); }, []);

  const wakeFromSleep = useCallback(() => {
    setSleeping((s) => {
      if (s) { setBubble(WELCOME_BUBBLE); setBubbleVisible(true); return false; }
      return s;
    });
  }, []);

  const showGuestSignupIfFirst = useCallback(() => {
    if (!authReady || !isGuest) return false;
    try {
      if (localStorage.getItem(GUEST_SIGNUP_STORAGE_KEY)) return false;
      localStorage.setItem(GUEST_SIGNUP_STORAGE_KEY, "1");
    } catch { return false; }
    setGuestSignupMoment(true);
    setBubble(GUEST_SIGNUP_BUBBLE);
    setBubbleVisible(true);
    return true;
  }, [authReady, isGuest]);

  const scheduleHappyEnd = useCallback((ms = 2000) => {
    if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
    happyTimeoutRef.current = window.setTimeout(() => {
      happyTimeoutRef.current = null;
      if (Date.now() >= happyUntilRef.current && !isDragging) setExpressionFlip("idle");
    }, ms);
  }, [isDragging]);

  const showReactBubble = useCallback(
    (phrase: string, autoHideMs = 3200) => {
      setBubble(
        uiLang === "th" ? { th: phrase, en: "" } : { th: "", en: phrase },
      );
      setBubbleVisible(true);
      if (bubbleHideRef.current) window.clearTimeout(bubbleHideRef.current);
      bubbleHideRef.current = window.setTimeout(() => {
        bubbleHideRef.current = null;
        setBubbleVisible(false);
      }, autoHideMs);
    },
    [uiLang],
  );

  const maybeSpeakPhrase = useCallback((phrase: string) => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("miomika.tts_on") !== "1") return;
    void speak(phrase, detectLang(phrase));
  }, []);

  const scheduleReactMoodEnd = useCallback(
    (ms: number) => {
      if (reactMoodTimeoutRef.current) window.clearTimeout(reactMoodTimeoutRef.current);
      reactMoodTimeoutRef.current = window.setTimeout(() => {
        reactMoodTimeoutRef.current = null;
        if (!isDragging) setExpressionFlip("idle");
      }, ms);
    },
    [isDragging],
  );

  const spawnHeartParticles = useCallback(() => {
    const batch: HeartParticle[] = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 60,
    }));
    setHeartParticles((prev) => [...prev, ...batch]);
  }, []);

  const handleMiomiTap = useCallback(() => {
    dismissGuestInvite();
    markActivity();
    wakeFromSleep();
    const phrase = home.react.tap(uiLang);
    showReactBubble(phrase, 3200);
    maybeSpeakPhrase(phrase);
    setTapBounceKey((k) => k + 1);
    setTapSpinKey((k) => k + 1);
    spawnHeartParticles();
    happyUntilRef.current = Date.now() + 1600;
    setExpressionFlip("happy");
    scheduleHappyEnd(1600);
    scheduleReactMoodEnd(1600);
  }, [
    dismissGuestInvite,
    markActivity,
    wakeFromSleep,
    uiLang,
    showReactBubble,
    maybeSpeakPhrase,
    spawnHeartParticles,
    scheduleHappyEnd,
    scheduleReactMoodEnd,
  ]);

  const handleDragRelease = useCallback(() => {
    const phrase = home.react.drag(uiLang);
    showReactBubble(phrase, 3200);
    maybeSpeakPhrase(phrase);
    happyUntilRef.current = Date.now() + 1200;
    setExpressionFlip("happy");
    scheduleHappyEnd(1200);
    scheduleReactMoodEnd(1200);
  }, [
    uiLang,
    showReactBubble,
    maybeSpeakPhrase,
    scheduleHappyEnd,
    scheduleReactMoodEnd,
  ]);

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
    markActivity(); wakeFromSleep();
    const firstGuest = showGuestSignupIfFirst();
    setFeedAnimKey((k) => k + 1);
    // Delay reaction to sync with particle arrival at Miomi (420ms)
    window.setTimeout(() => {
      if (!firstGuest) { setBubble(FEED_BUBBLE); setBubbleVisible(true); }
      happyUntilRef.current = Date.now() + 2000;
      setExpressionFlip("happy");
      scheduleHappyEnd();
    }, 400);
    setPet((prev) => {
      const withHunger = { ...prev, hunger: clampStat(prev.hunger + 15) };
      const { stats, leveledUp } = addXp(withHunger, 10);
      if (leveledUp) triggerLevelUpCelebration();
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [markActivity, wakeFromSleep, scheduleHappyEnd, triggerLevelUpCelebration, showGuestSignupIfFirst]);

  const handlePlayPress = useCallback(() => {
    markActivity(); wakeFromSleep();
    const firstGuest = showGuestSignupIfFirst();
    setPlayAnimKey((k) => k + 1);
    // Delay reaction to sync with particle arrival at Miomi (420ms)
    window.setTimeout(() => {
      if (!firstGuest) { setBubble(PLAY_BUBBLE); setBubbleVisible(true); }
      happyUntilRef.current = Date.now() + 2000;
      setExpressionFlip("happy");
      scheduleHappyEnd();
    }, 400);
    setPet((prev) => {
      const withEnergy = { ...prev, energy: clampStat(prev.energy + 15) };
      const { stats, leveledUp } = addXp(withEnergy, 10);
      if (leveledUp) triggerLevelUpCelebration();
      return stats;
    });
    setXpTick((t) => t + 1);
  }, [markActivity, wakeFromSleep, scheduleHappyEnd, triggerLevelUpCelebration, showGuestSignupIfFirst]);

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
      handleMiomiTap();
    }
  }, [dismissGuestInvite, markActivity, sleeping, wakeFromSleep, handleMiomiTap]);

  useEffect(() => {
    if (!authReady || isGuest) return;
    const showDelay = reduceMotion ? 0 : 1200;
    const showId = window.setTimeout(() => {
      setBubble(WELCOME_BUBBLE);
      setBubbleVisible(true);
    }, showDelay);
    const hideId = window.setTimeout(() => {
      setBubbleVisible(false);
    }, showDelay + 4000);
    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(hideId);
    };
  }, [reduceMotion, isGuest, authReady]);

  const handleMiomiPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      pointerDownRef.current = { t: Date.now(), x: e.clientX, y: e.clientY };
      didDragRef.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleMiomiPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const down = pointerDownRef.current;
      if (!down || didDragRef.current) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) < 8) return;
      if (Date.now() - down.t < 300) return;
      didDragRef.current = true;
      setIsDragging(true);
      markActivity();
      wakeFromSleep();
    },
    [markActivity, wakeFromSleep],
  );

  const handleMiomiPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!down) return;

      if (isDragging || didDragRef.current) return;

      handleMiomiTap();
    },
    [handleMiomiTap, isDragging],
  );

  const handleMiomiPointerCancel = useCallback(() => {
    pointerDownRef.current = null;
    if (isDragging) {
      setIsDragging(false);
      didDragRef.current = true;
      handleDragRelease();
    }
  }, [handleDragRelease, isDragging]);

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
      setExpressionFlip(() => (Math.random() < 0.15 ? "happy" : "idle"));
    }, 8000);
    return () => clearInterval(id);
  }, [reduceMotion, sleeping]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= 60000) {
        setSleeping(true); setBubble(SLEEP_BUBBLE); setBubbleVisible(true); setMiomiX(0);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
      if (bubbleHideRef.current) window.clearTimeout(bubbleHideRef.current);
      if (reactMoodTimeoutRef.current) window.clearTimeout(reactMoodTimeoutRef.current);
    };
  }, []);

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

  const bubbleTh = bubble.th;
  const bubbleEn = bubble.en;
  const miomiExpression = sleeping
    ? "idle"
    : isDragging
      ? "thinking"
      : expressionFlip;
  const guestPillCopy = home.guest.pill(uiLang);

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
                <div className="pointer-events-none absolute inset-x-4 top-4 z-40 flex justify-center">
                  <Link
                    href="/signup"
                    className={cn(
                      "pointer-events-auto max-w-[92%] rounded-full border border-[#EDE8E0] bg-white/92 px-4 py-2 text-center text-sm font-medium leading-[1.6] text-[#1A1A18] shadow-sm backdrop-blur-sm",
                      tapFeedback,
                    )}
                  >
                    {guestPillCopy}
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
                    animate={reduceMotion || isDragging ? { x: 0 } : { x: miomiX }}
                    transition={WALK_TRANSITION}
                  >
                    <motion.div
                      className={cn("origin-bottom", sleeping && "rotate-[6deg]")}
                      drag={isDragging}
                      dragConstraints={dragConstraints}
                      dragElastic={0.2}
                      dragMomentum={false}
                      onDragEnd={() => {
                        if (!didDragRef.current) {
                          didDragRef.current = true;
                          handleDragRelease();
                        }
                        setIsDragging(false);
                      }}
                      animate={
                        isDragging
                          ? undefined
                          : { x: 0, y: 0 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 13,
                      }}
                    >
                      <motion.button
                        key={`tap-bounce-${tapBounceKey}`}
                        type="button"
                        aria-label="Tap Miomi"
                        onPointerDown={handleMiomiPointerDown}
                        onPointerMove={handleMiomiPointerMove}
                        onPointerUp={handleMiomiPointerUp}
                        onPointerCancel={handleMiomiPointerCancel}
                        initial={false}
                        animate={tapBounceKey > 0 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
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
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>

              {heartParticles.map((p) => (
                <motion.div
                  key={p.id}
                  className="pointer-events-none absolute left-1/2 z-20"
                  style={{ bottom: "42%", marginLeft: p.x }}
                  initial={{ y: 0, opacity: 1, scale: 0.8 }}
                  animate={{ y: -40, opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  onAnimationComplete={() => {
                    setHeartParticles((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                >
                  <Heart
                    size={14}
                    fill="#F9A8D4"
                    stroke="#DB2777"
                    strokeWidth={2}
                  />
                </motion.div>
              ))}

              {/* Speech bubble — greeting suppressed for guests (guest pill only) */}
              <motion.div
                className={cn(
                  "pointer-events-none absolute right-4 z-30 max-w-[65%]",
                  authReady && isGuest ? "top-16" : "top-4",
                )}
              >
                <motion.div
                  className="pointer-events-auto rounded-2xl border border-[#EAD0DB] bg-white/92 px-3 py-2.5 shadow-sm backdrop-blur-sm"
                  initial={false}
                  animate={{ opacity: bubbleVisible ? 1 : 0, y: bubbleVisible ? 0 : 6 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <p className="text-sm font-medium leading-[1.6] text-[#1A1A1A]">{bubbleTh}</p>
                  {bubbleEn ? (
                    <p className="mt-1 text-[11px] leading-[1.6] text-[#666666]">{bubbleEn}</p>
                  ) : null}
                  {guestSignupMoment ? (
                    <Link
                      href="/signup"
                      className={cn("mt-2 flex w-full flex-col items-center rounded-full border border-[#EDE8E0] bg-[#FFF8F2] px-3 py-2 text-center", tapFeedback)}
                    >
                      <span className="text-[10px] font-medium text-[#C9A96E]">จำชื่อฉันนะคะ</span>
                      <span className="text-[11px] font-normal leading-[1.6] text-[#666666]">Remember my name</span>
                    </Link>
                  ) : null}
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
                </div>
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
