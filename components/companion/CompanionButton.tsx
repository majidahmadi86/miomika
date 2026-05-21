"use client";

/**
 * CompanionButton — 56px floating circle bottom-right.
 *
 * Phase-2 refinements (MIOMIKA.md §8 Phase 2 — Block A4):
 *   - True "floating" elevation: triple-layer shadow + 1px white ring
 *   - Subtle Y-axis breath in addition to scale, reinforcing detachment
 *   - GPU-composited via transform: translateZ(0)
 *   - Press feedback via framer-motion whileTap (scale 0.94, y:1)
 *
 * Hidden on /talk (handled by AmbientCompanion wrapper) and while the sheet
 * or panel is open.
 */

import Image from "next/image";
import { motion } from "framer-motion";
import { useCompanionStore } from "@/lib/companion/store";
import { useUILanguage } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/strings";
import type { MiomiAnimationState } from "@/lib/companion/types";

const COMPANION_IMG: Record<MiomiAnimationState, string> = {
  idle: "/characters/miomi/companion/companion-idle.png",
  happy: "/characters/miomi/companion/companion-happy.png",
  listening: "/characters/miomi/companion/companion-listening.png",
  speaking: "/characters/miomi/companion/companion-happy.png",
  thinking: "/characters/miomi/companion/companion-idle.png",
  excited: "/characters/miomi/companion/companion-celebration.png",
  low_fuel: "/characters/miomi/companion/companion-idle.png",
  missing_user: "/characters/miomi/companion/companion-idle.png",
  playful: "/characters/miomi/companion/companion-happy.png",
};

const DOT_COLOR: Partial<Record<MiomiAnimationState, string>> = {
  happy: "#F9A8D4",
  listening: "#F9A8D4",
  speaking: "#F9A8D4",
  excited: "#C9A96E",
  low_fuel: "#7DD3C0",
};

export function CompanionButton() {
  const state = useCompanionStore((s) => s.state);
  const isOpen = useCompanionStore((s) => s.isOpen);
  const open = useCompanionStore((s) => s.open);
  const hasUnread = useCompanionStore((s) => s.hasUnread);
  const lang = useUILanguage();

  if (isOpen) return null;

  const src = COMPANION_IMG[state] ?? COMPANION_IMG.idle;
  const dot = DOT_COLOR[state];

  return (
    <motion.button
      type="button"
      onClick={open}
      aria-label={tr("companion_aria", lang)}
      whileTap={{ scale: 0.94, y: 1 }}
      animate={{
        scale: [1, 1.02, 1],
        y: [0, -1, 0],
      }}
      transition={{
        duration: 3.2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "fixed",
        right: "16px",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
        zIndex: 60,
        width: "56px",
        height: "56px",
        padding: 0,
        borderRadius: "50%",
        background: "#FFFFFF",
        border: "none",
        boxShadow: `
          0 10px 24px -4px rgba(26,26,24,0.18),
          0 4px 8px -2px rgba(26,26,24,0.08),
          0 0 0 1px rgba(255,255,255,0.85),
          inset 0 0 0 1px rgba(237,232,224,0.6)
        `,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        transform: "translateZ(0)",
      }}
    >
      <span
        style={{
          display: "flex",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          src={src}
          alt="Miomi"
          width={128}
          height={128}
          priority={false}
          style={{ width: "44px", height: "44px", objectFit: "contain" }}
        />
      </span>
      {dot ? (
        <>
          {hasUnread && (
            <style>{`
              @keyframes miomi-companion-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50%      { transform: scale(1.18); opacity: 0.65; }
              }
            `}</style>
          )}
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: "4px",
              bottom: "4px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: dot,
              border: "1.5px solid #FFFFFF",
              animation: hasUnread ? "miomi-companion-pulse 1.4s ease-in-out infinite" : undefined,
            }}
          />
        </>
      ) : null}
    </motion.button>
  );
}
