"use client";

import { ChevronRight } from "lucide-react";
import type { TalkMode } from "@/lib/talk/modes";
import { MODE_META } from "@/lib/talk/modes";

interface ModeStripProps {
  mode: TalkMode;
  isLive: boolean;
  uiLang: "th" | "en";
  onTap: () => void;
}

export function ModeStrip({ mode, isLive, uiLang, onTap }: ModeStripProps) {
  const label =
    mode === "auto"
      ? uiLang === "en"
        ? "Auto · listening to you"
        : "อัตโนมัติ · กำลังฟังคุณ"
      : `${MODE_META[mode][uiLang]} · ${uiLang === "en" ? "locked" : "ล็อค"}`;

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        background:
          mode === "auto"
            ? "linear-gradient(180deg, rgba(255,248,242,0.6) 0%, rgba(250,250,246,0) 100%)"
            : "linear-gradient(180deg, rgba(232,199,122,0.12) 0%, rgba(250,250,246,0) 100%)",
        border: "none",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
      }}
      aria-label="Adjust mode"
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: isLive ? "#7DD3C0" : "#C9A96E",
          boxShadow: `0 0 0 3px ${isLive ? "rgba(125,211,192,0.2)" : "rgba(232,199,122,0.2)"}`,
          animation: isLive ? "modeDotPulse 1.6s ease-in-out infinite" : "none",
        }}
      />
      <span
        style={{
          flex: 1,
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          color: "#3D352B",
        }}
      >
        {label}
      </span>
      <ChevronRight size={14} color="#9A8B73" strokeWidth={2} />
      <style>{`
        @keyframes modeDotPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(125,211,192,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(125,211,192,0); }
        }
      `}</style>
    </button>
  );
}
