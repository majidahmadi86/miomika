"use client";

import { useEffect, useState } from "react";
import {
  openSmartGuide,
  SMART_GUIDE_LOCAL_STORAGE_KEY,
} from "@/components/onboarding/SmartGuide";
import type { Language } from "@/lib/i18n/server";

// Set once the newcomer taps the entry — the first-run dot then goes quiet.
const NUDGE_DISMISSED_KEY = "miomika-guide-nudge-v1";

const LABEL = { th: "ดูคู่มือ", en: "Take the tour" } as const;

type Mode = "fresh" | "returning" | null;

/**
 * Opt-in entry into the Smart Guide: a small top-right "?" that opens the
 * (now opt-in) guide. First-time users get a gentle pulsing dot to draw the
 * eye; once tapped — or once they've seen the guide — it goes quiet. It lives
 * in the top-right corner so it never competes with the centered top banner.
 * Renders for everyone, guests included — they're who needs the tour most.
 */
export function GuideEntry({ lang }: { lang: Language }) {
  // null until localStorage is read, so we never flash the wrong state.
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const seenGuide = !!window.localStorage.getItem(SMART_GUIDE_LOCAL_STORAGE_KEY);
        const dismissed = !!window.localStorage.getItem(NUDGE_DISMISSED_KEY);
        setMode(seenGuide || dismissed ? "returning" : "fresh");
      } catch {
        // private mode — default to the quiet entry.
        setMode("returning");
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const openTour = () => {
    try {
      window.localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
    } catch {
      // best effort
    }
    setMode("returning");
    openSmartGuide();
  };

  if (mode === null) return null;
  const isFresh = mode === "fresh";

  return (
    <button
      type="button"
      onClick={openTour}
      aria-label={LABEL[lang]}
      className="pointer-events-auto absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-[14px] transition active:scale-[0.94]"
      style={{
        borderColor: isFresh ? "#E7C9E4" : "#EAE4DD",
        background: isFresh ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.82)",
        boxShadow: isFresh
          ? "0 4px 14px rgba(169,139,190,0.26)"
          : "0 3px 10px rgba(0,0,0,0.05)",
      }}
    >
      <span
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "15px",
          fontWeight: 700,
          color: isFresh ? "#8A5AA0" : "#9B8C98",
          lineHeight: 1,
        }}
      >
        ?
      </span>
      {isFresh ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
          style={{
            background: "#C9A0D8",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.92)",
            animation: "mk-guide-dot 1.8s ease-in-out infinite",
          }}
        />
      ) : null}
      <style>{`
        @keyframes mk-guide-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.65; }
        }
      `}</style>
    </button>
  );
}
