"use client";

/**
 * GuidancePill — inline soft pill (NOT a modal) that surfaces a Miomi message
 * + one next action. Renders globally near the top of the viewport.
 *
 * MIOMIKA.md §8 Phase 2 (Block D).
 */

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGuidanceStore } from "@/lib/guidance/store";
import { useCompanionStore } from "@/lib/companion/store";
import { useUILanguage } from "@/lib/i18n/client";

export function GuidancePill() {
  const moment = useGuidanceStore((s) => s.currentMoment);
  const clearMoment = useGuidanceStore((s) => s.clearMoment);
  const openCompanion = useCompanionStore((s) => s.open);
  const lang = useUILanguage();
  const router = useRouter();

  const handleAction = () => {
    if (!moment) return;
    const { kind, payload } = moment.next_action;
    switch (kind) {
      case "open_signup":
        router.push("/signup");
        break;
      case "open_pricing":
        router.push("/me");
        break;
      case "open_sheet":
        openCompanion();
        break;
      case "navigate":
        if (typeof payload?.to === "string") router.push(payload.to);
        break;
      case "share_now":
        if (typeof navigator !== "undefined" && "share" in navigator) {
          void navigator
            .share({ title: "Miomika", text: "I'm learning English with Miomi — try it~", url: "https://miomika.com" })
            .catch(() => {});
        }
        break;
      case "continue":
      case "skip_for_now":
      case "try_again":
      case "unlock_with_stars":
      default:
        break;
    }
    clearMoment();
  };

  const says = moment ? (lang === "th" ? moment.miomi_says_th : moment.miomi_says_en) : "";
  const actionLabel = moment
    ? lang === "th"
      ? moment.next_action.label_th
      : moment.next_action.label_en
    : "";

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          key={moment.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "12px 16px",
            background: "#FFFFFF",
            border: "1px solid #EDE8E0",
            borderLeft: "3px solid #C9A96E",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(26,26,24,0.05)",
            maxWidth: "400px",
            margin: "0 16px",
            pointerEvents: "auto",
          }}
        >
          <p
            style={{
              fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: "#1A1A18",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {says}
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {moment.dismissible && (
              <button
                type="button"
                onClick={clearMoment}
                aria-label={lang === "th" ? "ปิด" : "Dismiss"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "999px",
                }}
              >
                <X size={16} color="#9A8B73" strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={handleAction}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
                cursor: "pointer",
              }}
            >
              {actionLabel}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
