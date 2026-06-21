"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  openSmartGuide,
  SMART_GUIDE_LOCAL_STORAGE_KEY,
} from "@/components/onboarding/SmartGuide";
import type { Language } from "@/lib/i18n/server";

// Set once the newcomer either takes the tour or dismisses the nudge.
const NUDGE_DISMISSED_KEY = "miomika-guide-nudge-v1";

const TEXT = {
  nudge: {
    th: "เพิ่งมาใหม่ใช่ไหมคะ มาชมรอบ ๆ กัน",
    en: "New here? Take a quick tour",
  },
  dismiss: { th: "ปิด", en: "Dismiss" },
  tour: { th: "ดูคู่มืออีกครั้ง", en: "Take the tour" },
} as const;

type Mode = "fresh" | "returning" | null;

/**
 * The opt-in entry into the Smart Guide on home.
 *  - Brand-new users (guide unseen, nudge not dismissed) see a one-time, gentle
 *    nudge inviting them to the tour. Taking it or dismissing it retires it.
 *  - Everyone else sees a small, quiet, always-available "?".
 * Both simply open the (now opt-in) Smart Guide already mounted on home.
 */
export function GuideEntry({ lang }: { lang: Language }) {
  // null until localStorage is read, so we never flash the wrong entry.
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const seenGuide = !!window.localStorage.getItem(SMART_GUIDE_LOCAL_STORAGE_KEY);
        const nudgeDismissed = !!window.localStorage.getItem(NUDGE_DISMISSED_KEY);
        setMode(seenGuide || nudgeDismissed ? "returning" : "fresh");
      } catch {
        // private mode — fall back to the quiet persistent entry.
        setMode("returning");
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const retireNudge = () => {
    try {
      window.localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
    } catch {
      // best effort
    }
    setMode("returning");
  };

  const openTour = () => {
    retireNudge();
    openSmartGuide();
  };

  if (mode === null) return null;

  if (mode === "fresh") {
    return (
      <div className="pointer-events-none absolute right-3 top-3 z-40 flex items-center gap-1.5">
        <button
          type="button"
          onClick={openTour}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#EFE2EF] py-2 pl-3 pr-3.5 backdrop-blur-[14px] transition active:scale-[0.97]"
          style={{
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 6px 18px rgba(169,139,190,0.20)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#A98BBE" }} strokeWidth={2.4} />
          <span
            style={{
              fontFamily: lang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#6E5A7E",
              lineHeight: "16px",
            }}
          >
            {TEXT.nudge[lang]}
          </span>
        </button>
        <button
          type="button"
          onClick={retireNudge}
          aria-label={TEXT.dismiss[lang]}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-[#EFE2EF] backdrop-blur-[14px] transition active:scale-[0.94]"
          style={{ background: "rgba(255,255,255,0.92)" }}
        >
          <X className="h-3.5 w-3.5" style={{ color: "#B7A7B6" }} strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  // returning — a quiet, always-available "?"
  return (
    <button
      type="button"
      onClick={openTour}
      aria-label={TEXT.tour[lang]}
      className="pointer-events-auto absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE4DD] backdrop-blur-[14px] transition active:scale-[0.94]"
      style={{
        background: "rgba(255,255,255,0.82)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
      }}
    >
      <span
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "15px",
          fontWeight: 700,
          color: "#9B8C98",
          lineHeight: 1,
        }}
      >
        ?
      </span>
    </button>
  );
}
