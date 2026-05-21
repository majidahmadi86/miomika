"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type MiomiState = "idle" | "listening" | "thinking" | "speaking" | "teaching" | "reacting";

const EXPRESSIONS: Record<MiomiState, string> = {
  idle: "/miomi/head-idle.png",
  listening: "/miomi/head-idle.png",
  thinking: "/miomi/head-thinking.png",
  speaking: "/miomi/head-speaking.png",
  teaching: "/miomi/head-happy.png",
  reacting: "/miomi/head-happy.png",
};

interface MiomiLiveProps {
  state: MiomiState;
  size?: number;
}

export function MiomiLive({ state, size = 180 }: MiomiLiveProps) {
  const [blinkVisible, setBlinkVisible] = useState(false);
  const [leftEarAngle, setLeftEarAngle] = useState(0);
  const [rightEarAngle, setRightEarAngle] = useState(0);
  const [goldParticles, setGoldParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const blinkTimerRef = useRef<number | null>(null);
  const earTimerRef = useRef<number | null>(null);
  const particleTimerRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);

  // Blink system
  useEffect(() => {
    if (state === "listening") return; // No blinks while listening

    const scheduleBlink = () => {
      const delay = 4200 + Math.random() * 2600;
      blinkTimerRef.current = window.setTimeout(() => {
        setBlinkVisible(true);
        window.setTimeout(() => {
          setBlinkVisible(false);
          scheduleBlink();
        }, 280);
      }, delay);
    };

    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [state]);

  // Ear flick system (idle only)
  useEffect(() => {
    if (state !== "idle") return;

    const scheduleEarFlick = () => {
      const delay = 8000 + Math.random() * 6000;
      earTimerRef.current = window.setTimeout(() => {
        const useLeft = Math.random() > 0.5;
        if (useLeft) {
          setLeftEarAngle(-8);
          window.setTimeout(() => setLeftEarAngle(0), 220);
        } else {
          setRightEarAngle(8);
          window.setTimeout(() => setRightEarAngle(0), 220);
        }
        scheduleEarFlick();
      }, delay);
    };

    scheduleEarFlick();
    return () => {
      if (earTimerRef.current) clearTimeout(earTimerRef.current);
    };
  }, [state]);

  // TODO(phase-3): refactor MiomiLive state to useReducer / derived state.
  /* eslint-disable react-hooks/set-state-in-effect */

  // Gold particles for thinking state
  useEffect(() => {
    if (state !== "thinking") {
      setGoldParticles([]);
      if (particleTimerRef.current) clearInterval(particleTimerRef.current);
      return;
    }

    particleTimerRef.current = window.setInterval(() => {
      const id = ++particleIdRef.current;
      const x = -20 + Math.random() * 40;
      const y = -size / 2 - 10;
      setGoldParticles(prev => [...prev.slice(-3), { id, x, y }]);
    }, 800);

    return () => {
      if (particleTimerRef.current) clearInterval(particleTimerRef.current);
    };
  }, [state, size]);

  // Listening: ears perk up
  useEffect(() => {
    if (state === "listening") {
      setLeftEarAngle(-12);
      setRightEarAngle(12);
    } else if (state === "reacting") {
      setLeftEarAngle(-14);
      setRightEarAngle(14);
      window.setTimeout(() => {
        setLeftEarAngle(0);
        setRightEarAngle(0);
      }, 800);
    } else {
      setLeftEarAngle(0);
      setRightEarAngle(0);
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Head tilt per state
  const headTilt = state === "thinking" ? -8
    : state === "listening" ? 0
    : 0;

  // Scale animation per state
  const scaleAnimate = (() => {
    if (state === "reacting") return [1, 1.10, 1.04, 1.06];
    if (state === "teaching") return [1, 1.08, 1.08];
    if (state === "speaking") return [1, 1.012, 1];
    return [1, 1.02, 1]; // idle breathing
  })();

  const scaleDuration = state === "reacting" ? 0.4
    : state === "teaching" ? 0.32
    : state === "speaking" ? 0.28
    : 3.2;

  const scaleRepeat = (state === "reacting" || state === "teaching") ? 0 : Infinity;

  // TranslateY for reacting
  const yAnimate = state === "reacting" ? [0, -6, 0] : [0];

  // Glow opacity
  const glowOpacity = state === "listening" ? 0.3
    : state === "teaching" ? 0.5
    : state === "reacting" ? 0.4
    : 0;

  const currentImage = EXPRESSIONS[state];

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Glow behind Miomi */}
      <motion.div
        animate={{ opacity: glowOpacity, scale: state === "listening" ? [1, 1.06, 1] : 1 }}
        transition={{ duration: state === "listening" ? 2.4 : 0.32, repeat: state === "listening" ? Infinity : 0, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,168,212,0.35) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Gold thinking particles */}
      <AnimatePresence>
        {goldParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0.8, scale: 1, x: p.x, y: 0 }}
            animate={{ opacity: 0, scale: 0.4, y: p.y }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              bottom: "50%",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#C9A96E",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main Miomi — scale + tilt + translateY */}
      <motion.div
        animate={{
          scale: scaleAnimate,
          rotate: headTilt,
          y: yAnimate,
        }}
        transition={{
          scale: { duration: scaleDuration, repeat: scaleRepeat, ease: "easeInOut" },
          rotate: { duration: 0.28, ease: "easeOut" },
          y: { duration: 0.4, ease: "easeInOut" },
        }}
        style={{
          position: "relative",
          width: size,
          height: size,
          zIndex: 1,
          transformOrigin: "center bottom",
        }}
      >
        {/* Expression image with crossfade */}
        <AnimatePresence mode="sync">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          >
            <Image
              src={currentImage}
              alt="Miomi"
              width={size}
              height={size}
              priority
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Eyelid blink overlay */}
        <AnimatePresence>
          {blinkVisible && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.14 }}
              style={{
                position: "absolute",
                top: "42%",
                left: "25%",
                width: "50%",
                height: "14%",
                background: "rgba(255,240,245,0.85)",
                borderRadius: "50%",
                transformOrigin: "center",
                zIndex: 3,
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
