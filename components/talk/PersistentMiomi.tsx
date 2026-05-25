"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export type MiomiMood = "idle" | "listening" | "thinking" | "speaking" | "happy";

interface PersistentMiomiProps {
  mood: MiomiMood;
  uiLang: "th" | "en";
  subtitleTh?: string;
  subtitleEn?: string;
}

const MOODS: Record<MiomiMood, { duration: number; scale: number[] }> = {
  idle: { duration: 4, scale: [1, 1.02, 1] },
  listening: { duration: 1.6, scale: [1, 1.04, 1] },
  thinking: { duration: 2.4, scale: [1, 1.015, 1] },
  speaking: { duration: 0.9, scale: [1, 1.05, 1] },
  happy: { duration: 0.6, scale: [1, 1.08, 1] },
};

export function PersistentMiomi({ mood, uiLang, subtitleTh, subtitleEn }: PersistentMiomiProps) {
  const anim = MOODS[mood];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 10px", flexShrink: 0 }}>
      <motion.div
        animate={{ scale: anim.scale }}
        transition={{ duration: anim.duration, repeat: Infinity, ease: "easeInOut" }}
        style={{
          filter: "drop-shadow(0 4px 14px rgba(249,168,212,0.18))",
          lineHeight: 1,
        }}
      >
        <Image
          src="/characters/miomi/full/idle.png"
          alt="Miomi"
          width={96}
          height={96}
          style={{ objectFit: "contain", display: "block" }}
          priority
        />
      </motion.div>

      {(subtitleTh || subtitleEn) && (
        <p style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          color: "#9A8B73",
          margin: "8px 0 0",
          textAlign: "center",
          opacity: 0.9,
        }}>
          {uiLang === "en" ? (subtitleEn ?? subtitleTh ?? "") : (subtitleTh ?? subtitleEn ?? "")}
        </p>
      )}
    </div>
  );
}
