"use client";

/**
 * DesktopHoldBanner — sticky top notice on desktop (≥1024px) telling users
 * the mobile experience is the canonical one. Dismissible per browser.
 *
 * Phase 7 ships the proper desktop redesign. Until then we are honest about
 * which platform Miomika was built for.
 *
 * MIOMIKA.md §8 Phase 2 (Block E).
 */

import { useState } from "react";
import { X } from "lucide-react";
import { useIsLargeDesktop, useHasMounted } from "@/lib/hooks/use-media-query";
import { useUILanguage } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/strings";

const STORAGE_KEY = "miomika-desktop-banner-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function DesktopHoldBanner() {
  const mounted = useHasMounted();
  const isLargeDesktop = useIsLargeDesktop();
  const lang = useUILanguage();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  if (!mounted || !isLargeDesktop || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private mode — banner won't return until next session anyway
    }
  };

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 90,
        background: "#FFF4E0",
        borderBottom: "1px solid #EDE8E0",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          fontWeight: 500,
          color: "#9A8B73",
          fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
          textAlign: "center",
        }}
      >
        {tr("desktop_hold_banner", lang)}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={tr("companion_dismiss", lang)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          padding: "4px",
          borderRadius: "999px",
        }}
      >
        <X size={16} color="#9A8B73" strokeWidth={1.75} />
      </button>
    </div>
  );
}
