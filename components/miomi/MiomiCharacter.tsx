"use client";

// components/miomi/MiomiCharacter.tsx
// Opus design spec — Framer Motion bridge implementation
// Layers: PNG expression base + BlinkOverlay + EarOverlay + TailOverlay
// All overlays are positioned as % of image so they scale with any container size.
// Positions tuned for the Miomi asset (white cat, front-facing, sitting).

import Image from "next/image";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export type MiomiExpression = "idle" | "happy" | "thinking" | "speaking";

type MiomiCharacterProps = {
  expression?: MiomiExpression;
  sleeping?: boolean;
  feedAnimKey?: number;
  playAnimKey?: number;
  levelUpAnimKey?: number;
  breathe?: boolean;
  className?: string;
};

// ─── EXPRESSION → PNG MAP ─────────────────────────────────────────────────────
// Opus spec: map states to existing assets

const EXPRESSION_SRC: Record<MiomiExpression, string> = {
  idle:     "/miomi/head-idle.png",
  happy:    "/miomi/head-happy.png",
  thinking: "/miomi/head-thinking.png",
  speaking: "/miomi/head-speaking.png",
};

const SLEEPING_SRC = "/miomi/idle.png"; // full body for sleeping

// ─── TIMING CONSTANTS (Opus spec) ────────────────────────────────────────────

const BLINK_INTERVAL_MIN = 4200;
const BLINK_INTERVAL_MAX = 6800;
const BLINK_CLOSE_MS     = 140;
const BLINK_HOLD_MS      = 60;
const BLINK_OPEN_MS      = 140;

const EAR_INTERVAL_MIN   = 8000;
const EAR_INTERVAL_MAX   = 14000;
const EAR_FLICK_MS       = 220;

const TAIL_PERIOD_MS     = 3600;

// ─── RANDOM JITTER ───────────────────────────────────────────────────────────

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ─── BLINK OVERLAY ────────────────────────────────────────────────────────────
// Two eyelid rectangles that scale down over the eyes on blink.
// Positioned as % of container — adjust top/left/width/height if asset changes.

function BlinkOverlay({ sleeping }: { sleeping: boolean }) {
  const leftLidControls  = useAnimationControls();
  const rightLidControls = useAnimationControls();

  const doBlink = useCallback(async () => {
    // Close both lids simultaneously
    await Promise.all([
      leftLidControls.start({
        scaleY: 1,
        transition: { duration: BLINK_CLOSE_MS / 1000, ease: "easeIn" },
      }),
      rightLidControls.start({
        scaleY: 1,
        transition: { duration: BLINK_CLOSE_MS / 1000, ease: "easeIn" },
      }),
    ]);
    // Hold closed
    await new Promise((r) => setTimeout(r, BLINK_HOLD_MS));
    // Open
    await Promise.all([
      leftLidControls.start({
        scaleY: 0,
        transition: { duration: BLINK_OPEN_MS / 1000, ease: "easeOut" },
      }),
      rightLidControls.start({
        scaleY: 0,
        transition: { duration: BLINK_OPEN_MS / 1000, ease: "easeOut" },
      }),
    ]);
  }, [leftLidControls, rightLidControls]);

  // Sleeping: lids stay closed permanently
  useEffect(() => {
    if (sleeping) {
      leftLidControls.start({ scaleY: 1, transition: { duration: 0.8, ease: "easeIn" } });
      rightLidControls.start({ scaleY: 1, transition: { duration: 0.8, ease: "easeIn" } });
      return;
    }

    leftLidControls.start({ scaleY: 0, transition: { duration: 0.3 } });
    rightLidControls.start({ scaleY: 0, transition: { duration: 0.3 } });

    // Schedule random blinks
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(async () => {
        await doBlink();
        schedule();
      }, randBetween(BLINK_INTERVAL_MIN, BLINK_INTERVAL_MAX));
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [sleeping, doBlink, leftLidControls, rightLidControls]);

  // Eye lid shapes — positioned over Miomi's eyes in the PNG
  // These percentages work for the current Miomi head asset.
  // The lids are scaleY from 0 (open) to 1 (closed), transformOrigin top.
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {/* Left eye lid (viewer's right) */}
      <motion.div
        animate={leftLidControls}
        initial={{ scaleY: 0 }}
        style={{
          position: "absolute",
          top: "42%",
          left: "30%",
          width: "16%",
          height: "10%",
          background: "#FDEEF5", // matches fur color closely
          borderRadius: "0 0 50% 50%",
          transformOrigin: "top center",
        }}
      />
      {/* Right eye lid (viewer's left) */}
      <motion.div
        animate={rightLidControls}
        initial={{ scaleY: 0 }}
        style={{
          position: "absolute",
          top: "42%",
          left: "54%",
          width: "16%",
          height: "10%",
          background: "#FDEEF5",
          borderRadius: "0 0 50% 50%",
          transformOrigin: "top center",
        }}
      />
    </div>
  );
}

// ─── EAR OVERLAY ─────────────────────────────────────────────────────────────
// Two ear highlight triangles that rotate on flick.
// Opacity 0 normally — just a subtle rotation on the existing ear in the PNG.
// We rotate the whole head wrapper slightly instead — simpler and more effective.

function EarFlickWrapper({ children }: { children: React.ReactNode }) {
  const controls = useAnimationControls();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const doFlick = async () => {
      if (!isMountedRef.current) return;
      // Pick left or right ear randomly — manifest as slight head tilt
      const direction = Math.random() > 0.5 ? 1 : -1;
      await controls.start({
        rotate: direction * 4,
        transition: { duration: EAR_FLICK_MS / 1000 / 2, ease: "easeOut" },
      });
      await controls.start({
        rotate: 0,
        transition: { duration: EAR_FLICK_MS / 1000 / 2, ease: "easeIn" },
      });
    };

    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      if (!isMountedRef.current) return;
      timeout = setTimeout(async () => {
        await doFlick();
        schedule();
      }, randBetween(EAR_INTERVAL_MIN, EAR_INTERVAL_MAX));
    };
    schedule();

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeout);
    };
  }, [controls]);

  return (
    <motion.div animate={controls} style={{ transformOrigin: "bottom center" }}>
      {children}
    </motion.div>
  );
}

// ─── TAIL SWAY ────────────────────────────────────────────────────────────────
// Continuous gentle rotation on body — only for full-body images (idle sleeping).
// For head-only images we skip tail since it's not visible.

function TailSwayWrapper({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  if (!active) return <>{children}</>;
  return (
    <motion.div
      animate={{ rotate: [0, 3, 0, -3, 0] }}
      transition={{
        duration: TAIL_PERIOD_MS / 1000,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
      }}
      style={{ transformOrigin: "bottom center" }}
    >
      {children}
    </motion.div>
  );
}

// ─── BREATHING ────────────────────────────────────────────────────────────────
// Opus spec: scale 1.000 ↔ 1.018 at 3200ms sine

function BreathingWrapper({
  children,
  active,
  sleeping,
}: {
  children: React.ReactNode;
  active: boolean;
  sleeping: boolean;
}) {
  const period = sleeping ? 4200 : 3200;
  const amplitude = sleeping ? 1.012 : 1.018;

  if (!active) return <>{children}</>;
  return (
    <motion.div
      animate={{ scale: [1, amplitude, 1] }}
      transition={{
        duration: period / 1000,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
      }}
      style={{ transformOrigin: "bottom center" }}
    >
      {children}
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function MiomiCharacter({
  expression = "idle",
  sleeping = false,
  feedAnimKey = 0,
  playAnimKey = 0,
  levelUpAnimKey = 0,
  breathe = true,
  className,
}: MiomiCharacterProps) {
  // Full body images for celebrations and sleeping — no blink overlay needed
  const isFullBody = sleeping
    || levelUpAnimKey > 0;

  const src = sleeping
    ? SLEEPING_SRC
    : isFullBody
      ? "/miomi/happy.png"
      : EXPRESSION_SRC[expression];

  // Animation class for one-shot events (feed, play, level-up)
  const animClass =
    levelUpAnimKey > 0
      ? "miomi-anim-level-up"
      : feedAnimKey > 0
        ? "miomi-anim-feed"
        : playAnimKey > 0
          ? "miomi-anim-play"
          : undefined;

  const animKey = levelUpAnimKey
    ? `level-${levelUpAnimKey}`
    : feedAnimKey
      ? `feed-${feedAnimKey}`
      : playAnimKey
        ? `play-${playAnimKey}`
        : "idle";

  return (
    <>
      <style>{`
        @keyframes miomi-feed-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40%       { transform: translateY(-20px) scale(1.06); }
          65%       { transform: translateY(-8px) scale(1.03); }
        }
        @keyframes miomi-play-wiggle {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-10deg) scale(1.04); }
          45%  { transform: rotate(10deg) scale(1.04); }
          70%  { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes miomi-level-up-bounce {
          0%   { transform: translateY(0) scale(1); }
          25%  { transform: translateY(-28px) scale(1.08); }
          50%  { transform: translateY(-12px) scale(1.04); }
          70%  { transform: translateY(-20px) scale(1.06); }
          100% { transform: translateY(0) scale(1); }
        }
        .miomi-anim-feed {
          animation: miomi-feed-bounce 0.45s cubic-bezier(0.34,1.56,0.64,1);
        }
        .miomi-anim-play {
          animation: miomi-play-wiggle 0.55s ease-in-out;
        }
        .miomi-anim-level-up {
          animation: miomi-level-up-bounce 0.7s cubic-bezier(0.34,1.56,0.64,1);
        }
        .miomi-breathe-global {
          animation: miomi-breathe-base 3.2s ease-in-out infinite;
        }
        @keyframes miomi-breathe-base {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.018); }
        }
      `}</style>

      {/* Outer: breathing wrapper */}
      <BreathingWrapper active={breathe && !animClass} sleeping={sleeping}>
        {/* Middle: ear flick wrapper (head tilt) */}
        <EarFlickWrapper>
          {/* Inner: one-shot animation container */}
          <div
            className={cn("relative origin-bottom", className)}
            style={{ display: "inline-block" }}
          >
            {/* Tail sway — wraps the image, only on full-body */}
            <TailSwayWrapper active={!isFullBody && breathe && !animClass}>
              <div key={animKey} className={cn("origin-bottom", animClass)}>
                <Image
                  src={src}
                  alt="Miomi"
                  width={560}
                  height={560}
                  priority
                  className="pointer-events-none h-full max-h-full w-auto max-w-[min(92vw,100%)] select-none object-contain object-bottom"
                />
              </div>
            </TailSwayWrapper>

            {/* Blink overlay — only on head images, not full body */}
            {!isFullBody && (
              <BlinkOverlay sleeping={sleeping} />
            )}
          </div>
        </EarFlickWrapper>
      </BreathingWrapper>
    </>
  );
}
