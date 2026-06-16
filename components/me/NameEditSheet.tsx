"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";

interface NameEditSheetProps {
  open: boolean;
  userId: string;
  currentName: string;
  onClose: () => void;
}

export function NameEditSheet({ open, userId, currentName, onClose }: NameEditSheetProps) {
  const uiLang = useUILanguage();
  const C = {
    th: { title: "ฉันควรเรียกคุณว่าอะไร?", save: "บันทึก", cancel: "ยกเลิก", placeholder: "ชื่อของคุณ", error: "บันทึกไม่สำเร็จ ลองอีกครั้ง" },
    en: { title: "What should I call you?", save: "Save", cancel: "Cancel", placeholder: "Your name", error: "Save failed. Please try again." },
  }[uiLang === "th" ? "th" : "en"];

  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
    }
  }, [open, currentName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: e } = await supabase.from("profiles").update({ display_name: trimmed.slice(0, 32) }).eq("id", userId);
      if (e) throw e;
      window.dispatchEvent(new Event("miomika:profile-refresh"));
      onClose();
    } catch {
      setError(C.error);
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
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 md:items-center"
          onClick={onClose}
        >
          <motion.div
            data-horizontal-scroll-zone
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[20px] bg-surface p-6 shadow-float md:max-w-[420px] md:rounded-[20px]"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <h2 className="mb-4 text-[17px] font-semibold text-ink">{C.title}</h2>
            <input
              type="text"
              value={name}
              maxLength={32}
              placeholder={C.placeholder}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 w-full rounded-[12px] border border-line bg-surface-2 px-4 py-3 text-[16px] text-ink outline-none focus:border-[var(--mk-accent)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={() => void handleSave()}
                className="h-12 flex-1 rounded-full text-[15px] font-semibold text-white shadow-cta disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--mk-accent-grad-from), var(--mk-accent-grad-to))" }}
              >
                {C.save}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="h-12 flex-1 rounded-full border border-line bg-surface-2 text-[14px] font-semibold text-ink-muted disabled:opacity-60"
              >
                {C.cancel}
              </button>
            </div>
            {error ? <p className="mt-3 text-center text-[13px] text-[#C4564A]">{error}</p> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
