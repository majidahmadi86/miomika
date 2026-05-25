"use client";

import { Wand2, GraduationCap, Sparkles, Languages, Heart, type LucideIcon } from "lucide-react";
import type { TalkMode } from "@/lib/talk/modes";

interface ModeStripBarProps {
  current: TalkMode;
  uiLang: "th" | "en";
  onChange: (m: TalkMode) => void;
  onOpenAdjust: () => void;
}

const MODES: { key: TalkMode; Icon: LucideIcon; labelTh: string; labelEn: string }[] = [
  { key: "auto", Icon: Wand2, labelTh: "อัตโนมัติ", labelEn: "Auto" },
  { key: "teach", Icon: GraduationCap, labelTh: "สอน", labelEn: "Teach" },
  { key: "social", Icon: Sparkles, labelTh: "โซเชียล", labelEn: "Social" },
  { key: "translate", Icon: Languages, labelTh: "แปล", labelEn: "Translate" },
  { key: "chat", Icon: Heart, labelTh: "คุย", labelEn: "Chat" },
];

export function ModeStripBar({ current, uiLang, onChange, onOpenAdjust }: ModeStripBarProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        gap: "10px",
        padding: "8px 14px 4px",
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
              gap: "4px",
              background: "transparent",
              border: "none",
              padding: "4px 2px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: active
                  ? "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)"
                  : "rgba(255,255,255,0.7)",
                border: active ? "1.5px solid #C9A96E" : "0.5px solid #EDE8E0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: active ? "0 2px 8px rgba(201,169,110,0.2)" : "none",
                transition: "all 220ms ease",
              }}
            >
              <Icon size={19} strokeWidth={2} color={active ? "#C9A96E" : "#9A8B73"} />
            </span>
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "9.5px",
                fontWeight: active ? 600 : 500,
                color: active ? "#B8985C" : "#9A8B73",
              }}
            >
              {uiLang === "en" ? labelEn : labelTh}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onOpenAdjust}
        aria-label="Open adjust"
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "transparent",
          border: "0.5px dashed #C4BDB5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginLeft: "2px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "18px", color: "#9A8B73", lineHeight: 1 }}>···</span>
      </button>
    </div>
  );
}
