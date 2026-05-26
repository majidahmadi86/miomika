"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";
import { CTA_GRADIENT, COLORS } from "@/lib/design/colors";
import { me } from "@/lib/voice/warmth";

const SHEET_SHADOW =
  "0 -8px 32px rgba(26, 26, 24, 0.08), 0 -2px 8px rgba(26, 26, 24, 0.04)";
const FONT = "'Kanit', 'Quicksand', sans-serif";

interface NameEditSheetProps {
  open: boolean;
  userId: string;
  currentName: string;
  onClose: () => void;
}

export function NameEditSheet({
  open,
  userId,
  currentName,
  onClose,
}: NameEditSheetProps) {
  const uiLang = useUILanguage();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed.slice(0, 32) })
        .eq("id", userId);
      if (error) throw error;
      window.dispatchEvent(new Event("miomika:profile-refresh"));
      onClose();
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26, 26, 24, 0.5)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "16px 16px 0 0",
              padding: "24px 24px calc(24px + env(safe-area-inset-bottom, 0px))",
              boxShadow: SHEET_SHADOW,
            }}
          >
            <h2
              style={{
                fontFamily: FONT,
                fontSize: "17px",
                lineHeight: "24px",
                fontWeight: 600,
                color: COLORS.textPrimary,
                margin: "0 0 16px",
              }}
            >
              {me.name.title(uiLang)}
            </h2>

            <input
              type="text"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                fontFamily: FONT,
                fontSize: "16px",
                padding: "12px 16px",
                border: `1px solid ${COLORS.borderMedium}`,
                borderRadius: "12px",
                outline: "none",
                color: COLORS.textPrimary,
                marginBottom: "16px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.ctaSolid;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.borderMedium;
              }}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={() => void handleSave()}
                style={{
                  flex: 1,
                  height: "52px",
                  borderRadius: "999px",
                  background: CTA_GRADIENT,
                  color: COLORS.ctaTextColor,
                  border: "none",
                  fontFamily: FONT,
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {me.name.save(uiLang)}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                style={{
                  flex: 1,
                  height: "44px",
                  borderRadius: "999px",
                  background: "transparent",
                  border: `1px solid ${COLORS.borderMedium}`,
                  color: COLORS.textMuted,
                  fontFamily: FONT,
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {me.name.cancel(uiLang)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
