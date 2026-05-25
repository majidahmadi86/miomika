"use client";

import { Wand2, GraduationCap, Sparkles, Languages, Heart, type LucideIcon } from "lucide-react";
import type { TalkMode } from "@/lib/talk/modes";

interface ModeStripBarProps {
  current: TalkMode;
  uiLang: "th" | "en";
  onChange: (m: TalkMode) => void;
}

const MODES: { key: TalkMode; Icon: LucideIcon; labelTh: string; labelEn: string }[] = [
  { key: "auto", Icon: Wand2, labelTh: "อัตโนมัติ", labelEn: "Auto" },
  { key: "teach", Icon: GraduationCap, labelTh: "สอน", labelEn: "Teach" },
  { key: "social", Icon: Sparkles, labelTh: "โซเชียล", labelEn: "Social" },
  { key: "translate", Icon: Languages, labelTh: "แปล", labelEn: "Translate" },
  { key: "chat", Icon: Heart, labelTh: "คุย", labelEn: "Chat" },
];

export function ModeStripBar({ current, uiLang, onChange }: ModeStripBarProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        gap: "8px",
        padding: "10px 16px 4px",
        overflowX: "auto",
        scrollbarWidth: "none",
        background: "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {MODES.map(({ key, Icon, labelTh, labelEn }) => {
        const active = current === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={`Mode: ${labelEn}`}
            aria-pressed={active}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              padding: "4px 6px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "all 220ms ease",
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    inset: "-2px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(232,199,122,0.25) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} color={active ? "#C9A96E" : "#9A8B73"} />
            </span>
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "9.5px",
                fontWeight: active ? 600 : 500,
                color: active ? "#B8985C" : "#9A8B73",
                transition: "color 220ms ease",
              }}
            >
              {uiLang === "en" ? labelEn : labelTh}
            </span>
          </button>
        );
      })}
    </div>
  );
}
