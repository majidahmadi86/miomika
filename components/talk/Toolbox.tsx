"use client";

import { Type, Globe, Volume2, VolumeX, Keyboard } from "lucide-react";

export type ResponseLength = "short" | "normal" | "detailed";
export type ResponseLang = "th" | "en" | "both";

interface ToolboxProps {
  length: ResponseLength;
  lang: ResponseLang;
  ttsOn: boolean;
  keyboardMode: boolean;
  uiLang: "th" | "en";
  onCycleLength: () => void;
  onCycleLang: () => void;
  onToggleTts: () => void;
  onToggleKeyboard: () => void;
}

export function Toolbox({
  length,
  lang,
  ttsOn,
  keyboardMode,
  uiLang,
  onCycleLength,
  onCycleLang,
  onToggleTts,
  onToggleKeyboard,
}: ToolboxProps) {
  return (
    <div
      style={{
        position: "absolute",
        right: "6px",
        bottom: "12px",
        display: "flex",
        flexDirection: "column-reverse",
        gap: "16px",
        zIndex: 4,
        alignItems: "center",
        background: "transparent",
        pointerEvents: "auto",
      }}
    >
      <ToolBtn
        Icon={Keyboard}
        active={keyboardMode}
        label=""
        title={uiLang === "en" ? "Keyboard" : "แป้นพิมพ์"}
        onClick={onToggleKeyboard}
      />
      <ToolBtn
        Icon={Type}
        active={length !== "normal"}
        label={length === "short" ? "S" : length === "detailed" ? "L" : "M"}
        title={uiLang === "en" ? `Length: ${length}` : "ความยาว"}
        onClick={onCycleLength}
      />
      <ToolBtn
        Icon={Globe}
        active={lang !== "both"}
        label={lang === "both" ? "T+E" : lang.toUpperCase()}
        title={uiLang === "en" ? `Lang: ${lang}` : "ภาษา"}
        onClick={onCycleLang}
      />
      <ToolBtn
        Icon={ttsOn ? Volume2 : VolumeX}
        active={ttsOn}
        label=""
        title={uiLang === "en" ? (ttsOn ? "Voice on" : "Voice off") : "เสียง"}
        onClick={onToggleTts}
      />
    </div>
  );
}

function ToolBtn({
  Icon,
  active,
  label,
  title,
  onClick,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        width: "40px",
        height: "40px",
        background: "transparent",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        position: "relative",
      }}
    >
      <Icon size={22} color={active ? "#C9A96E" : "#9A8B73"} strokeWidth={2} />
      {label && (
        <span
          style={{
            position: "absolute",
            bottom: "-4px",
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "8px",
            color: active ? "#C9A96E" : "#9A8B73",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
