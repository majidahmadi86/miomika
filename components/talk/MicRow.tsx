"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, GraduationCap, Sparkles, Languages, Heart, AudioWaveform, type LucideIcon } from "lucide-react";
import type { TalkMode } from "@/lib/talk/modes";
import type { OrbState } from "@/components/talk/VoiceOrb";

interface MicRowProps {
  current: TalkMode;
  orbState: OrbState;
  uiLang: "th" | "en";
  showModes?: boolean;
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

export function MicRow({ current, orbState, uiLang, showModes = false, onModeChange, onOrbTap, orbAriaLabel }: MicRowProps) {
  const activeIdx = Math.max(0, MODES.findIndex((m) => m.key === current));
  const activeMode = MODES[activeIdx];

  const ring = MODES.filter((_, i) => i !== activeIdx);
  const leftSlots = ring.slice(0, 2);
  const rightSlots = ring.slice(2, 4);
  while (leftSlots.length < 2) leftSlots.push(null as never);
  while (rightSlots.length < 2) rightSlots.push(null as never);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const intentRef = useRef<"h" | "v" | null>(null);
  const activeIdxRef = useRef(activeIdx);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const onChangeRef = useRef(onModeChange);
  useEffect(() => { onChangeRef.current = onModeChange; }, [onModeChange]);

  // Native touch listeners with passive: false so we can stopPropagation/preventDefault
  // BEFORE the swipe is hijacked by parent scroll containers.
  useEffect(() => {
    if (!showModes) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      intentRef.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startXRef.current === null || startYRef.current === null) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startXRef.current;
      const dy = t.clientY - startYRef.current;
      if (intentRef.current === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        intentRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (intentRef.current === "h") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (intentRef.current !== "h" || startXRef.current === null) {
        startXRef.current = null;
        startYRef.current = null;
        intentRef.current = null;
        return;
      }
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startXRef.current;
      startXRef.current = null;
      startYRef.current = null;
      intentRef.current = null;
      if (Math.abs(dx) < 36) return;
      const dir = dx < 0 ? 1 : -1;
      const next = (activeIdxRef.current + dir + MODES.length) % MODES.length;
      onChangeRef.current(MODES[next].key);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [showModes]);

  const OrbIcon =
    orbState === "listening" || orbState === "thinking" || orbState === "speaking"
      ? AudioWaveform
      : showModes
        ? activeMode.Icon
        : Heart;

  return (
    <div
      ref={containerRef}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "14px 14px 12px",
        gap: "8px",
        background: "transparent",
        touchAction: "pan-y",
        position: "relative",
        zIndex: 6,
        userSelect: "none",
      }}
    >
      {showModes &&
        leftSlots.map((m, i) => (
          <ModePill key={`l-${i}-${m?.key ?? "empty"}`} mode={m} uiLang={uiLang} onClick={m ? () => onModeChange(m.key) : undefined} />
        ))}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, margin: showModes ? "0 4px" : 0 }}>
        <button
          type="button"
          onClick={onOrbTap}
          aria-label={orbAriaLabel}
          style={{ width: "88px", height: "88px", borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", padding: 0 }}
        >
          {orbState === "idle" && (
            <>
              <PulseRing delay={0} />
              <PulseRing delay={1.1} />
            </>
          )}
          <motion.div
            animate={orbState === "listening" ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "68px", height: "68px", borderRadius: "50%", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 22px rgba(201,169,110,0.45), 0 0 0 1px rgba(255,255,255,0.5)", position: "relative", zIndex: 2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={(showModes ? activeMode.key : "companion") + (orbState === "listening" || orbState === "thinking" || orbState === "speaking" ? "-active" : "-idle")}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <OrbIcon size={26} color="#FFFFFF" strokeWidth={2} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </button>
        {showModes && (
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 600, color: "#B8985C", letterSpacing: "0.03em", marginTop: "4px" }}>
            {uiLang === "en" ? activeMode.labelEn : activeMode.labelTh}
          </span>
        )}
      </div>

      {showModes &&
        rightSlots.map((m, i) => (
          <ModePill key={`r-${i}-${m?.key ?? "empty"}`} mode={m} uiLang={uiLang} onClick={m ? () => onModeChange(m.key) : undefined} />
        ))}
    </div>
  );
}

function PulseRing({ delay }: { delay: number }) {
  return (
    <motion.span
      animate={{ scale: [1, 2], opacity: [0.7, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, delay, ease: "easeOut" }}
      style={{ position: "absolute", top: "50%", left: "50%", width: "66px", height: "66px", marginTop: "-33px", marginLeft: "-33px", borderRadius: "50%", border: "2px solid rgba(232,199,122,0.55)", pointerEvents: "none" }}
    />
  );
}

function ModePill({ mode, uiLang, onClick }: { mode: { key: TalkMode; Icon: LucideIcon; labelTh: string; labelEn: string } | null; uiLang: "th" | "en"; onClick: (() => void) | undefined }) {
  if (!mode) {
    return <div style={{ width: "50px", minHeight: "60px", flexShrink: 0 }} aria-hidden="true" />;
  }
  const { Icon, labelTh, labelEn } = mode;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Mode: ${labelEn}`}
      whileTap={{ scale: 0.92 }}
      layout
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{ width: "50px", minHeight: "60px", background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", padding: 0, flexShrink: 0 }}
    >
      <span style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#FFFFFF", border: "0.5px solid rgba(237,232,224,0.7)", boxShadow: "0 4px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color="#9A8B73" strokeWidth={2} />
      </span>
      <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "9.5px", fontWeight: 500, color: "#9A8B73" }}>
        {uiLang === "en" ? labelEn : labelTh}
      </span>
    </motion.button>
  );
}
