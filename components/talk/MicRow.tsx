"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Wand2, GraduationCap, Sparkles, Languages, Heart, type LucideIcon } from "lucide-react";
import { VoiceOrb, type OrbState } from "@/components/talk/VoiceOrb";
import type { TalkMode } from "@/lib/talk/modes";

interface MicRowProps {
  current: TalkMode;
  orbState: OrbState;
  uiLang: "th" | "en";
  onModeChange: (m: TalkMode) => void;
  onOrbTap: () => void;
  orbAriaLabel: string;
}

const MODES: { key: TalkMode; Icon: LucideIcon; labelTh: string; labelEn: string }[] = [
  { key: "auto", Icon: Wand2, labelTh: "อัตโนมัติ", labelEn: "Auto" },
  { key: "teach", Icon: GraduationCap, labelTh: "สอน", labelEn: "Teach" },
  { key: "social", Icon: Sparkles, labelTh: "โซเชียล", labelEn: "Social" },
  { key: "translate", Icon: Languages, labelTh: "แปล", labelEn: "Translate" },
  { key: "chat", Icon: Heart, labelTh: "คุย", labelEn: "Chat" },
];

export function MicRow({ current, orbState, uiLang, onModeChange, onOrbTap, orbAriaLabel }: MicRowProps) {
  const idx = Math.max(0, MODES.findIndex((m) => m.key === current));
  const [centerIdx, setCenterIdx] = useState(idx);

  // Keep centerIdx in sync if mode is changed externally (e.g. from Adjust sheet)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setCenterIdx(idx); }, [idx]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeIntent = useRef<"horizontal" | "vertical" | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    swipeIntent.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (swipeIntent.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      swipeIntent.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (swipeIntent.current === "horizontal") {
      e.stopPropagation();
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeIntent.current !== "horizontal" || touchStartX.current === null) {
      touchStartX.current = null;
      touchStartY.current = null;
      swipeIntent.current = null;
      return;
    }
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStartX.current;
    touchStartX.current = null;
    touchStartY.current = null;
    swipeIntent.current = null;
    if (Math.abs(dx) < 30) return;
    const dir = dx < 0 ? 1 : -1;
    const next = Math.max(0, Math.min(MODES.length - 1, centerIdx + dir));
    if (next !== centerIdx) {
      setCenterIdx(next);
      onModeChange(MODES[next].key);
    }
  }, [centerIdx, onModeChange]);

  // Compute the 4 modes around the center (2 left, 2 right). If at edges, slide window.
  const leftModes: typeof MODES = [];
  const rightModes: typeof MODES = [];
  for (let offset = 1; offset <= 2; offset++) {
    const li = centerIdx - offset;
    const ri = centerIdx + offset;
    if (li >= 0) leftModes.unshift(MODES[li]);
    if (ri < MODES.length) rightModes.push(MODES[ri]);
  }
  const centerMode = MODES[centerIdx];

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px 14px",
        gap: "2px",
        background: "transparent",
        touchAction: "pan-y",
        position: "relative",
        zIndex: 6,
      }}
    >
      {[...leftModes, centerMode].slice(-2).map((m) => (
        <ModeIcon
          key={`l-${m.key}`}
          mode={m}
          active={m.key === current}
          uiLang={uiLang}
          onClick={() => { setCenterIdx(MODES.findIndex((x) => x.key === m.key)); onModeChange(m.key); }}
        />
      ))}

      <div style={{ margin: "0 6px" }}>
        <VoiceOrb state={orbState} size={72} onTap={onOrbTap} ariaLabel={orbAriaLabel} />
      </div>

      {rightModes.slice(0, 2).map((m) => (
        <ModeIcon
          key={`r-${m.key}`}
          mode={m}
          active={m.key === current}
          uiLang={uiLang}
          onClick={() => { setCenterIdx(MODES.findIndex((x) => x.key === m.key)); onModeChange(m.key); }}
        />
      ))}

      {/* Fill empty slots so layout doesn't shift at edges */}
      {leftModes.length < 2 && Array.from({ length: 2 - leftModes.length }).map((_, i) => (
        <div key={`fl-${i}`} style={{ width: "52px", height: "52px", flexShrink: 0 }} aria-hidden="true" />
      ))}
      {rightModes.length < 2 && Array.from({ length: 2 - rightModes.length }).map((_, i) => (
        <div key={`fr-${i}`} style={{ width: "52px", height: "52px", flexShrink: 0 }} aria-hidden="true" />
      ))}
    </div>
  );
}

function ModeIcon({ mode, active, uiLang, onClick }: { mode: typeof MODES[number]; active: boolean; uiLang: "th" | "en"; onClick: () => void }) {
  const { Icon, labelTh, labelEn } = mode;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mode: ${labelEn}`}
      aria-pressed={active}
      style={{
        width: "52px",
        flexShrink: 0,
        background: "transparent",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
        padding: "4px 0",
        cursor: "pointer",
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} color={active ? "#C9A96E" : "#9A8B73"} />
      <span
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "9.5px",
          fontWeight: active ? 600 : 500,
          color: active ? "#C9A96E" : "#9A8B73",
        }}
      >
        {uiLang === "en" ? labelEn : labelTh}
      </span>
    </button>
  );
}
