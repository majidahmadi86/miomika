"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";
import { CTA_GRADIENT, COLORS } from "@/lib/design/colors";
import { me } from "@/lib/voice/warmth";

const SHEET_SHADOW =
  "0 -8px 32px rgba(26, 26, 24, 0.08), 0 -2px 8px rgba(26, 26, 24, 0.04)";
const FONT = "'Kanit', 'Quicksand', sans-serif";

interface AvatarEditSheetProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

export function AvatarEditSheet({ open, userId, onClose }: AvatarEditSheetProps) {
  const uiLang = useUILanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);
      if (updateError) throw updateError;

      window.dispatchEvent(new Event("miomika:profile-refresh"));
      onClose();
    } catch {
      /* Miomi delivers errors warmly — stub for now */
    } finally {
      setUploading(false);
    }
  };

  const handleUseMiomi = async () => {
    setUploading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (error) throw error;
      window.dispatchEvent(new Event("miomika:profile-refresh"));
      onClose();
    } catch {
      /* noop */
    } finally {
      setUploading(false);
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
              {me.avatar.title(uiLang)}
            </h2>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                style={{
                  height: "52px",
                  borderRadius: "999px",
                  background: CTA_GRADIENT,
                  color: COLORS.ctaTextColor,
                  border: "none",
                  fontFamily: FONT,
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: uploading ? "wait" : "pointer",
                }}
              >
                {me.avatar.upload(uiLang)}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUseMiomi()}
                style={{
                  height: "44px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.6)",
                  border: `1px solid ${COLORS.borderMedium}`,
                  color: COLORS.textPrimary,
                  fontFamily: FONT,
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: uploading ? "wait" : "pointer",
                }}
              >
                {me.avatar.useMiomi(uiLang)}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={onClose}
                style={{
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
                {me.avatar.cancel(uiLang)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
