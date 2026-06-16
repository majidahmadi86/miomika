"use client";

import { motion } from "framer-motion";
import { AudioWaveform } from "lucide-react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "locked";

interface VoiceOrbProps {
  state: OrbState;
  size?: number;
  onTap: () => void;
  ariaLabel: string;
}

export function VoiceOrb({ state, size = 88, onTap, ariaLabel }: VoiceOrbProps) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isLocked = state === "locked";

  const coreSize = Math.round(size * 0.7);

  return (
    <motion.button
      type="button"
      onClick={onTap}
      whileTap={{ scale: 0.94 }}
      aria-label={ariaLabel}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: "none",
        background: isListening
          ? "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)"
          : "linear-gradient(135deg, #FFFFFF 0%, #FFF8F2 100%)",
        boxShadow: isListening
          ? "0 8px 24px rgba(201,169,110,0.4), 0 0 0 2px rgba(232,199,122,0.5), 0 0 0 10px rgba(232,199,122,0.12)"
          : "0 8px 24px rgba(201,169,110,0.22), 0 0 0 1px rgba(232,199,122,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        transition: "background 240ms ease, box-shadow 240ms ease",
      }}
    >
      {state === "idle" && (
        <>
          <PulseRing delay={0} size={coreSize} />
          <PulseRing delay={1.1} size={coreSize} />
        </>
      )}

      {isSpeaking && <SpeakingWave size={coreSize} />}

      {isListening ? (
        <ListeningBars />
      ) : isThinking ? (
        <ThinkingDots />
      ) : (
        <div
          style={{
            width: `${coreSize}px`,
            height: `${coreSize}px`,
            borderRadius: "50%",
            background: isLocked
              ? "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)"
              : "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 2,
            boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <AudioWaveform size={Math.round(coreSize * 0.42)} color="#FFFFFF" strokeWidth={2} />
        </div>
      )}
    </motion.button>
  );
}

function PulseRing({ delay, size }: { delay: number; size: number }) {
  return (
    <motion.span
      animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, delay, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: `${size}px`,
        height: `${size}px`,
        marginTop: `-${size / 2}px`,
        marginLeft: `-${size / 2}px`,
        borderRadius: "50%",
        border: "2px solid rgba(232,199,122,0.6)",
        pointerEvents: "none",
      }}
    />
  );
}

function ListeningBars() {
  return (
    <div
      style={{
        display: "flex",
        gap: "3.5px",
        alignItems: "center",
        height: "36px",
        zIndex: 2,
      }}
    >
      {[14, 24, 32, 20, 12].map((h, i) => (
        <motion.span
          key={i}
          animate={{ scaleY: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          style={{
            width: "3.5px",
            height: `${h}px`,
            background: "#FFFFFF",
            borderRadius: "999px",
            display: "block",
          }}
        />
      ))}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", zIndex: 2 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#C9A96E",
            display: "block",
          }}
        />
      ))}
    </div>
  );
}

function SpeakingWave({ size }: { size: number }) {
  return (
    <motion.span
      animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      style={{
        position: "absolute",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: "2px solid rgba(201,169,110,0.5)",
        pointerEvents: "none",
      }}
    />
  );
}
