"use client";

import { Type, Globe, Volume2, VolumeX } from "lucide-react";

export type ResponseLength = "short" | "normal" | "detailed";
export type ResponseLang = "th" | "en" | "both";

interface ToolboxProps {
  length: ResponseLength;
  lang: ResponseLang;
  ttsOn: boolean;
  uiLang: "th" | "en";
  onCycleLength: () => void;
  onCycleLang: () => void;
  onToggleTts: () => void;
}

export function Toolbox({ length, lang, ttsOn, uiLang, onCycleLength, onCycleLang, onToggleTts }: ToolboxProps) {
  return (
    <div
      style={{
        position: "absolute",
        right: "10px",
        top: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        zIndex: 4,
      }}
    >
      <ToolBtn label={length === "short" ? "S" : length === "detailed" ? "L" : "M"} title={uiLang === "en" ? `Length: ${length}` : "ความยาว"} Icon={Type} onClick={onCycleLength} />
      <ToolBtn label={lang === "both" ? "T+E" : lang.toUpperCase()} title={uiLang === "en" ? `Lang: ${lang}` : "ภาษา"} Icon={Globe} onClick={onCycleLang} />
      <ToolBtn label="" title={ttsOn ? "Voice on" : "Voice off"} Icon={ttsOn ? Volume2 : VolumeX} onClick={onToggleTts} />
    </div>
  );
}

function ToolBtn({ label, title, Icon, onClick }: { label: string; title: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.92)",
        border: "0.5px solid #EDE8E0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(26,26,24,0.04)",
        gap: "1px",
        padding: 0,
      }}
    >
      <Icon size={14} color="#9A8B73" strokeWidth={2} />
      {label && (
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "7.5px", color: "#9A8B73", fontWeight: 700, lineHeight: 1 }}>{label}</span>
      )}
    </button>
  );
}
