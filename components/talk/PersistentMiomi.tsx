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
  thinking: { duration: 2.4, scale: [1, 1.01, 1] },
  speaking: { duration: 0.9, scale: [1, 1.05, 1] },
  happy: { duration: 0.6, scale: [1, 1.08, 1] },
};

export function PersistentMiomi({ mood, uiLang, subtitleTh, subtitleEn }: PersistentMiomiProps) {
  const anim = MOODS[mood];
  const ringColor =
    mood === "listening" ? "rgba(125,211,192,0.6)" :
    mood === "thinking" ? "rgba(201,169,110,0.5)" :
    mood === "speaking" ? "rgba(249,168,212,0.6)" :
    "rgba(232,199,122,0.3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 12px", flexShrink: 0, position: "relative" }}>
      <div style={{ position: "absolute", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 65%)", pointerEvents: "none", top: "0" }} />

      <motion.div
        animate={{
          scale: anim.scale,
          boxShadow: [`0 0 0 0px ${ringColor}`, `0 0 0 6px ${ringColor.replace(/[\d.]+\)$/, "0)")}`],
        }}
        transition={{ duration: anim.duration, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "96px",
          height: "96px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <Image
          src="/characters/miomi/full/idle.png"
          alt="Miomi"
          width={84}
          height={84}
          style={{ objectFit: "contain", borderRadius: "50%" }}
          priority
        />
      </motion.div>

      {(subtitleTh || subtitleEn) && (
        <div style={{ marginTop: "8px", textAlign: "center", padding: "0 20px", maxWidth: "300px", minHeight: "16px" }}>
          <p style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            color: "#9A8B73",
            margin: 0,
            opacity: 0.85,
            transition: "opacity 240ms ease",
          }}>
            {uiLang === "en" ? (subtitleEn ?? subtitleTh ?? "") : (subtitleTh ?? subtitleEn ?? "")}
          </p>
        </div>
      )}
    </div>
  );
}
