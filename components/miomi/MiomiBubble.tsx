"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";

interface MiomiBubbleProps {
  text: string;
  visible: boolean;
  autoHideMs?: number;
  onHide?: () => void;
  offsetTop?: number;
  offsetSide?: "left" | "right";
}

export function MiomiBubble({
  text,
  visible,
  autoHideMs = 4000,
  onHide,
  offsetTop = 24,
  offsetSide = "right",
}: MiomiBubbleProps) {
  useEffect(() => {
    if (!visible || autoHideMs <= 0) return;
    const id = window.setTimeout(() => onHide?.(), autoHideMs);
    return () => window.clearTimeout(id);
  }, [visible, autoHideMs, onHide, text]);

  const tailOnRight = offsetSide === "right";

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
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            position: "absolute",
            top: offsetTop,
            ...(tailOnRight ? { right: 0 } : { left: 0 }),
            maxWidth: 220,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid #EDE8E0",
              borderRadius: 16,
              padding: "10px 14px",
              boxShadow: CARD_SHADOW,
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 16,
                ...(tailOnRight ? { right: -8 } : { left: -8 }),
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                ...(tailOnRight
                  ? { borderLeft: "8px solid rgba(255, 255, 255, 0.88)" }
                  : { borderRight: "8px solid rgba(255, 255, 255, 0.88)" }),
              }}
            />
            <p
              style={{
                fontFamily: "'Kanit', 'Quicksand', sans-serif",
                fontSize: 14,
                lineHeight: "20px",
                fontWeight: 500,
                color: "#1A1A18",
                margin: 0,
              }}
            >
              {text}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
