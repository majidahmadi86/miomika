"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";

interface MiomiBubbleProps {
  text: string;
  visible: boolean;
  position?: "top-left" | "top-right";
  autoHideMs?: number;
  onHide?: () => void;
}

export function MiomiBubble({
  text,
  visible,
  position = "top-right",
  autoHideMs = 4000,
  onHide,
}: MiomiBubbleProps) {
  useEffect(() => {
    if (!visible || autoHideMs <= 0) return;
    const id = window.setTimeout(() => {
      onHide?.();
    }, autoHideMs);
    return () => window.clearTimeout(id);
  }, [visible, autoHideMs, onHide, text]);

  const isLeft = position === "top-left";

  return (
    <AnimatePresence>
      {visible && text ? (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{
            duration: 0.24,
            ease: [0, 0, 0.2, 1],
          }}
          style={{
            position: "absolute",
            top: "8px",
            ...(isLeft ? { left: "8px" } : { right: "8px" }),
            maxWidth: "220px",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid #EDE8E0",
              borderRadius: "16px",
              padding: "12px 16px",
              boxShadow: CARD_SHADOW,
            }}
          >
            <p
              style={{
                fontFamily: "'Kanit', 'Quicksand', sans-serif",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 500,
                color: "#1A1A18",
                margin: 0,
              }}
            >
              {text}
            </p>
            <span
              aria-hidden
              style={{
                position: "absolute",
                bottom: "-8px",
                ...(isLeft ? { left: "24px" } : { right: "24px" }),
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid rgba(255, 255, 255, 0.85)",
                filter: "drop-shadow(0 1px 0 #EDE8E0)",
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
