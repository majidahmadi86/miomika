"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Sparkle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const MIOMI_SRC = "/characters/miomi/companion/companion-idle.png";
const TAP_THRESHOLD_MS = 200;

interface MiomiAliveProps {
  size?: number;
  onTap?: () => void;
  onDragEnd?: () => void;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
}

const SPARKLE_SLOTS = [
  { left: "18%", delay: 0, duration: 10 },
  { left: "52%", delay: 3.2, duration: 12 },
  { left: "78%", delay: 6.4, duration: 9 },
];

export function MiomiAlive({
  size: sizeProp = 280,
  onTap,
  onDragEnd,
}: MiomiAliveProps) {
  const size = Math.min(Math.max(sizeProp, 280), 320);
  const stageH = Math.round(size * 1.08);

  const pressStartRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const blinkTimerRef = useRef<number | null>(null);
  const tiltTimerRef = useRef<number | null>(null);
  const scheduleBlinkRef = useRef<() => void>(() => {});
  const scheduleTiltRef = useRef<() => void>(() => {});
  const interactingRef = useRef(false);

  const [canDrag, setCanDrag] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [tapFlash, setTapFlash] = useState(false);
  const [blinkVisible, setBlinkVisible] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);
  const [tapScale, setTapScale] = useState(1);
  const [willChange, setWillChange] = useState(true);

  const driftActive = !motionPaused && !isDragging && !canDrag;

  useEffect(() => {
    const id = window.setTimeout(() => setWillChange(false), 200);
    return () => window.clearTimeout(id);
  }, []);

  const scheduleBlink = useCallback(() => {
    if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
    const delay = 4000 + Math.random() * 3000;
    blinkTimerRef.current = window.setTimeout(() => {
      if (interactingRef.current || isDragging) {
        scheduleBlinkRef.current();
        return;
      }
      setBlinkVisible(true);
      window.setTimeout(() => setBlinkVisible(false), 140);
      scheduleBlinkRef.current();
    }, delay);
  }, [isDragging]);

  const scheduleTilt = useCallback(() => {
    if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
    const delay = 20000 + Math.random() * 20000;
    tiltTimerRef.current = window.setTimeout(() => {
      if (interactingRef.current || isDragging) {
        scheduleTiltRef.current();
        return;
      }
      setHeadTilt(2);
      window.setTimeout(() => setHeadTilt(0), 600);
      scheduleTiltRef.current();
    }, delay);
  }, [isDragging]);

  useEffect(() => {
    scheduleBlinkRef.current = scheduleBlink;
    scheduleTiltRef.current = scheduleTilt;
  }, [scheduleBlink, scheduleTilt]);

  useEffect(() => {
    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
    };
  }, [scheduleBlink]);

  useEffect(() => {
    scheduleTilt();
    return () => {
      if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
    };
  }, [scheduleTilt]);

  const spawnHearts = useCallback(() => {
    const next: HeartParticle[] = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: size * 0.35 + Math.random() * size * 0.3,
      y: size * 0.38,
      dx: (Math.random() - 0.5) * 40,
    }));
    setHearts(next);
    window.setTimeout(() => setHearts([]), 650);
  }, [size]);

  const runTapReaction = useCallback(() => {
    interactingRef.current = true;
    setMotionPaused(true);
    setTapFlash(true);
    setTapScale(1.12);
    window.setTimeout(() => {
      setTapFlash(false);
      setTapScale(1);
    }, 600);
    window.setTimeout(() => setTapScale(1), 280);
    spawnHearts();
    onTap?.();
    window.setTimeout(() => {
      interactingRef.current = false;
      setMotionPaused(false);
    }, 700);
  }, [onTap, spawnHearts]);

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
      setMotionPaused(true);
    }, TAP_THRESHOLD_MS);
  }, [clearHoldTimer]);

  const handlePointerUp = useCallback(() => {
    clearHoldTimer();
    if (canDrag || isDragging) {
      if (!isDragging) setCanDrag(false);
      return;
    }
    if (Date.now() - pressStartRef.current < TAP_THRESHOLD_MS) {
      runTapReaction();
    }
  }, [canDrag, clearHoldTimer, isDragging, runTapReaction]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    interactingRef.current = true;
    setMotionPaused(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setCanDrag(false);
    onDragEnd?.();
    window.setTimeout(() => {
      interactingRef.current = false;
      setMotionPaused(false);
    }, 400);
  }, [onDragEnd]);

  useEffect(() => {
    return () => clearHoldTimer();
  }, [clearHoldTimer]);

  const dragConstraints = {
    left: -size * 0.55,
    right: size * 0.55,
    top: -stageH * 0.18,
    bottom: stageH * 0.12,
  };

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: stageH,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes miomi-sparkle-rise {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 0.6; }
          100% { transform: translateY(-120px); opacity: 0; }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 0.7,
          height: 14,
          background:
            "radial-gradient(ellipse at center, rgba(154, 139, 115, 0.18) 0%, transparent 70%)",
          filter: "blur(6px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {SPARKLE_SLOTS.map((slot, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: slot.left,
            bottom: size * 0.25,
            zIndex: 1,
            pointerEvents: "none",
            animation: `miomi-sparkle-rise ${slot.duration}s linear ${slot.delay}s infinite`,
          }}
        >
          <Sparkle size={8} color="rgba(201, 169, 110, 0.35)" strokeWidth={2} />
        </span>
      ))}

      <motion.div
        drag={canDrag || isDragging}
        dragConstraints={dragConstraints}
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        animate={
          driftActive
            ? { x: [-6, 6, -6], y: [-3, 3, -3] }
            : { x: 0, y: 0 }
        }
        transition={
          driftActive
            ? {
                x: { duration: 14, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 18, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
              }
            : { type: "spring", stiffness: 280, damping: 13 }
        }
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          cursor: isDragging ? "grabbing" : "pointer",
          willChange: willChange ? "transform" : undefined,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            transformOrigin: "50% 100%",
            willChange: willChange ? "transform" : undefined,
          }}
        >
          <motion.div
            animate={{ rotate: headTilt }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 100%" }}
          >
            <motion.div
              animate={{ scale: tapScale }}
              transition={{ type: "spring", stiffness: 320, damping: 14 }}
              style={{ transformOrigin: "50% 100%" }}
            >
              <Image
                src={MIOMI_SRC}
                alt="Miomi"
                width={size}
                height={size}
                priority
                draggable={false}
                style={{
                  display: "block",
                  objectFit: "contain",
                  filter: tapFlash
                    ? "brightness(1.04) saturate(1.05)"
                    : "brightness(1) saturate(1)",
                  transition: "filter 600ms ease",
                  pointerEvents: "none",
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        animate={{ opacity: blinkVisible ? 1 : 0 }}
        transition={{ duration: 0.07 }}
        style={{
          position: "absolute",
          top: size * 0.32,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 0.55,
          height: 4,
          borderRadius: 2,
          background:
            "linear-gradient(180deg, transparent, #FDFAF2 40%, #FDFAF2 60%, transparent)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {hearts.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: p.x, y: p.y, scale: 0.8 }}
          animate={{ opacity: 0, x: p.x + p.dx, y: p.y - 40, scale: 1.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          <Heart size={14} fill="#F9A8D4" color="#DB2777" strokeWidth={2} />
        </motion.span>
      ))}
    </div>
  );
}
