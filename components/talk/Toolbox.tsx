"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Type } from "lucide-react";

export type ResponseLength = "short" | "normal" | "detailed";

interface ToolboxProps {
  length: ResponseLength;
  uiLang: "th" | "en";
  onCycleLength: () => void;
}

const iconVariants = {
  inactive: { scale: 1, y: 0, opacity: 0.7 },
  active: { scale: 1, y: -2, opacity: 1 },
};

export function Toolbox({
  length,
  uiLang,
  onCycleLength,
}: ToolboxProps) {
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);

  const markPressed = (id: string) => {
    setLastPressedId(id);
    window.setTimeout(() => setLastPressedId((prev) => (prev === id ? null : prev)), 200);
  };

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
        id="length"
        Icon={Type}
        active={length !== "normal"}
        isPressed={lastPressedId === "length"}
        label={length === "short" ? "S" : length === "detailed" ? "L" : "M"}
        title={uiLang === "en" ? `Length: ${length}` : "ความยาว"}
        onClick={() => { markPressed("length"); onCycleLength(); }}
      />
    </div>
  );
}

function ToolBtn({
  Icon,
  active,
  isPressed,
  label,
  title,
  onClick,
}: {
  id: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  active: boolean;
  isPressed: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  const isActive = active || isPressed;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      variants={iconVariants}
      animate={active ? "active" : "inactive"}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      whileHover={isActive ? { scale: 1.05 } : undefined}
      whileTap={isActive ? { scale: 0.95 } : { scale: 1.0 }}
      style={{
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        background: "#FFFFFF",
        border: "0.5px solid rgba(237,232,224,0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        position: "relative",
        boxShadow: "0 6px 16px rgba(26,26,24,0.08), 0 2px 4px rgba(26,26,24,0.05), 0 0 0 0.5px rgba(255,255,255,0.8) inset",
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
    </motion.button>
  );
}
