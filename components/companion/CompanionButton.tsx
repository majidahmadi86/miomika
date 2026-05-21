"use client";

/**
 * CompanionButton — 56px floating circle, bottom-right of every authenticated
 * screen except /talk. MIOMIKA.md §2.5.
 *
 * Specs:
 *   - 56px circle, white bg, 1px border #EDE8E0
 *   - soft shadow 0 4px 16px rgba(26,26,24,0.06)
 *   - Image: Miomi's head composed for 56px render. Asset spec calls for
 *     /characters/miomi/companion/{state}.png (Phase 1 deliverable in §7).
 *     Until those land, we fall back to /miomi/head-{idle,happy,thinking,speaking}.png.
 *   - Breath animation: scale 1.0 ↔ 1.02, 3.2s sine
 *   - Presence dot at bottom-right of button (6px), color per state
 *   - Position: 16px from right edge, 88px from bottom (above bottom nav)
 *   - Hidden on /talk; sheet/panel toggles on click
 */

import Image from "next/image";
import { useCompanion } from "@/components/companion/CompanionStateContext";

const COMPANION_IMG: Record<string, string> = {
  IDLE: "/miomi/head-idle.png",
  HAPPY: "/miomi/head-happy.png",
  LISTENING: "/miomi/head-idle.png",
  SPEAKING: "/miomi/head-speaking.png",
  CELEBRATION: "/miomi/head-happy.png",
  LOW_FUEL: "/miomi/head-idle.png",
  MISSING_USER: "/miomi/head-idle.png",
  PLAYFUL: "/miomi/head-idle.png",
};

const DOT_COLOR: Record<string, string | null> = {
  IDLE: null,
  HAPPY: "#F9A8D4",
  LISTENING: "#F9A8D4",
  SPEAKING: "#F9A8D4",
  CELEBRATION: "#C9A96E",
  LOW_FUEL: "#7DD3C0",
  MISSING_USER: null,
  PLAYFUL: null,
};

export function CompanionButton() {
  const { state, isOpen, open, hasUnread } = useCompanion();
  const src = COMPANION_IMG[state] ?? COMPANION_IMG.IDLE!;
  const dot = DOT_COLOR[state] ?? null;

  if (isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes miomi-companion-breath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.02); }
        }
        @keyframes miomi-companion-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.18); opacity: 0.65; }
        }
        .miomi-companion-breath { animation: miomi-companion-breath 3.2s ease-in-out infinite; }
        .miomi-companion-pulse  { animation: miomi-companion-pulse 1.4s ease-in-out infinite; }
      `}</style>

      <button
        type="button"
        onClick={open}
        aria-label="คุยกับมิโอมิ — Talk to Miomi"
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
          border: "1px solid #EDE8E0",
          boxShadow: "0 4px 16px rgba(26,26,24,0.06)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        <span
          className="miomi-companion-breath"
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
          <span
            className={hasUnread ? "miomi-companion-pulse" : undefined}
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
            }}
          />
        ) : null}
      </button>
    </>
  );
}
