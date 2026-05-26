"use client";

import Image from "next/image";
import {
  motion,
  useAnimationControls,
} from "framer-motion";
import { Heart } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type MiomiMood =
  | "idle"
  | "happy"
  | "excited"
  | "low-fuel"
  | "missing-user";

const MOOD_PNG: Record<MiomiMood, string> = {
  idle: "/characters/miomi/companion/companion-idle.png",
  happy: "/characters/miomi/companion/companion-happy.png",
  excited: "/characters/miomi/companion/companion-celebration.png",
  "low-fuel": "/characters/miomi/companion/companion-idle.png",
  "missing-user": "/characters/miomi/companion/companion-idle.png",
};

const VARIANT_CANDIDATES = [
  "/characters/miomi/companion/companion-idle.png",
  "/characters/miomi/companion/companion-yawn.png",
  "/characters/miomi/companion/companion-tail-flick.png",
  "/characters/miomi/companion/companion-head-tilt.png",
];

const HAPPY_PNG = "/characters/miomi/companion/companion-happy.png";
const TAP_THRESHOLD_MS = 200;
const TAP_RESET_MS = 3200;

interface MiomiStageProps {
  size?: number;
  mood?: MiomiMood;
  onTap?: () => void;
  onDragEnd?: () => void;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
}

function HeartParticles({ particles }: { particles: HeartParticle[] }) {
  return (
    <>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: p.x, y: p.y, scale: 1 }}
          animate={{ opacity: 0, x: p.x + p.dx, y: p.y - 48, scale: 0.6 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            zIndex: 30,
            willChange: "transform, opacity",
          }}
        >
          <Heart size={6} fill="#F9A8D4" color="#F9A8D4" strokeWidth={0} />
        </motion.span>
      ))}
    </>
  );
}

async function probePng(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export function MiomiStage({
  size = 280,
  mood = "idle",
  onTap,
  onDragEnd,
}: MiomiStageProps) {
  const driftControls = useAnimationControls();
  const scaleControls = useAnimationControls();
  const pressStartRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const interactionUntilRef = useRef(0);
  const moodSwapTimerRef = useRef<number | null>(null);
  const tapResetTimerRef = useRef<number | null>(null);
  const availableVariantsRef = useRef<string[]>([MOOD_PNG.idle]);
  const moodRef = useRef(mood);
  const scheduleMoodSwapRef = useRef<() => void>(() => {});

  const [currentPng, setCurrentPng] = useState(MOOD_PNG[mood]);
  const [canDrag, setCanDrag] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [animating, setAnimating] = useState(false);

  const crossfadeTo = useCallback((next: string) => {
    setCurrentPng((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        VARIANT_CANDIDATES.map(async (url) => ((await probePng(url)) ? url : null)),
      );
      if (cancelled) return;
      const ok = results.filter((u): u is string => u != null);
      availableVariantsRef.current = ok.length > 0 ? ok : [MOOD_PNG.idle];
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- mood prop drives PNG when idle */
  useEffect(() => {
    if (Date.now() < interactionUntilRef.current) return;
    if (isDragging) return;
    crossfadeTo(MOOD_PNG[mood]);
  }, [mood, isDragging, crossfadeTo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const startDrift = useCallback(async () => {
    if (isDragging) return;
    setAnimating(true);
    await driftControls.start({
      x: [0, -10, 10, -10, 10, 0],
      y: [0, -5, 5, -5, 5, 0],
      transition: {
        duration: 14,
        repeat: Infinity,
        repeatType: "mirror",
        ease: [0.45, 0.05, 0.55, 0.95],
      },
    });
  }, [driftControls, isDragging]);

  const scheduleMoodSwap = useCallback(() => {
    if (moodSwapTimerRef.current) window.clearTimeout(moodSwapTimerRef.current);
    const delay = 18000 + Math.random() * 17000;
    moodSwapTimerRef.current = window.setTimeout(() => {
      if (Date.now() < interactionUntilRef.current || isDragging) {
        scheduleMoodSwapRef.current();
        return;
      }
      const pool = availableVariantsRef.current;
      const next = pool[Math.floor(Math.random() * pool.length)] ?? MOOD_PNG.idle;
      crossfadeTo(next);
      scheduleMoodSwapRef.current();
    }, delay);
  }, [crossfadeTo, isDragging]);

  useEffect(() => {
    scheduleMoodSwapRef.current = scheduleMoodSwap;
  }, [scheduleMoodSwap]);

  /* eslint-disable react-hooks/set-state-in-effect -- drift loop lifecycle */
  useEffect(() => {
    if (isDragging || canDrag) {
      driftControls.stop();
      return;
    }
    void startDrift();
    return () => {
      driftControls.stop();
    };
  }, [isDragging, canDrag, driftControls, startDrift]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    scheduleMoodSwap();
    return () => {
      if (moodSwapTimerRef.current) window.clearTimeout(moodSwapTimerRef.current);
    };
  }, [scheduleMoodSwap]);

  const spawnHearts = useCallback(() => {
    const count = 3 + Math.floor(Math.random() * 2);
    const next: HeartParticle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: size / 2 + (Math.random() - 0.5) * 24,
      y: size * 0.42,
      dx: (Math.random() - 0.5) * 32,
    }));
    setHearts(next);
    window.setTimeout(() => setHearts([]), 650);
  }, [size]);

  const handleTap = useCallback(() => {
    interactionUntilRef.current = Date.now() + TAP_RESET_MS;
    crossfadeTo(HAPPY_PNG);
    void scaleControls.start({
      scale: [1, 1.08, 1],
      transition: { duration: 0.28, type: "spring", stiffness: 280, damping: 13 },
    });
    spawnHearts();
    onTap?.();
    if (tapResetTimerRef.current) window.clearTimeout(tapResetTimerRef.current);
    tapResetTimerRef.current = window.setTimeout(() => {
      interactionUntilRef.current = 0;
      crossfadeTo(MOOD_PNG[moodRef.current]);
    }, TAP_RESET_MS);
  }, [crossfadeTo, onTap, scaleControls, spawnHearts]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    pressStartRef.current = Date.now();
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      setCanDrag(true);
      setAnimating(true);
      driftControls.stop();
    }, TAP_THRESHOLD_MS);
  }, [clearHoldTimer, driftControls]);

  const handlePointerUp = useCallback(() => {
    clearHoldTimer();
    if (canDrag || isDragging) {
      setCanDrag(false);
      setIsDragging(false);
      return;
    }
    if (Date.now() - pressStartRef.current < TAP_THRESHOLD_MS) {
      handleTap();
    }
  }, [canDrag, clearHoldTimer, handleTap, isDragging]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setAnimating(true);
    driftControls.stop();
  }, [driftControls]);

  const handleDragEnd = useCallback(
    () => {
      setIsDragging(false);
      setCanDrag(false);
      void driftControls.start({
        x: 0,
        y: 0,
        transition: { type: "spring", stiffness: 280, damping: 13 },
      });
      interactionUntilRef.current = Date.now() + 1200;
      crossfadeTo(HAPPY_PNG);
      onDragEnd?.();
      window.setTimeout(() => {
        if (Date.now() >= interactionUntilRef.current - 100) {
          crossfadeTo(MOOD_PNG[moodRef.current]);
        }
      }, 1200);
      void startDrift();
    },
    [crossfadeTo, driftControls, onDragEnd, startDrift],
  );

  useEffect(() => {
    return () => {
      clearHoldTimer();
      if (moodSwapTimerRef.current) window.clearTimeout(moodSwapTimerRef.current);
      if (tapResetTimerRef.current) window.clearTimeout(tapResetTimerRef.current);
      driftControls.stop();
    };
  }, [clearHoldTimer, driftControls]);

  const stageW = size;
  const stageH = Math.round(size * 1.05);
  const dragConstraints = {
    left: -stageW * 0.6,
    right: stageW * 0.6,
    top: -stageH * 0.2,
    bottom: stageH * 0.2,
  };

  return (
    <div
      style={{
        position: "relative",
        width: stageW,
        height: stageH,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <motion.div
        drag={canDrag || isDragging}
        dragConstraints={dragConstraints}
        dragElastic={0.12}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        animate={driftControls}
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          x: "-50%",
          cursor: isDragging ? "grabbing" : "pointer",
          willChange: animating ? "transform" : undefined,
        }}
      >
        <motion.div animate={scaleControls} style={{ originX: 0.5, originY: 1 }}>
          <div style={{ position: "relative", width: size, height: size }}>
            <Image
              key={currentPng}
              src={currentPng}
              alt="Miomi"
              width={size}
              height={size}
              priority
              style={{
                objectFit: "contain",
                display: "block",
                transition: "opacity 400ms ease",
                pointerEvents: "none",
              }}
            />
            <HeartParticles particles={hearts} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
