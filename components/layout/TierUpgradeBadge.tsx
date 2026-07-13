"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Crown, UserPlus } from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { usePaywall } from "@/components/billing/Paywall";
import { useUILanguage } from "@/lib/i18n/client";

// Only these four screens — never /me (it already has its own upgrade row)
// and never auth/admin/legal surfaces.
const SHOW_ON = ["/home", "/learn", "/dashboard", "/talk"];

// The pre-existing "?" Smart Guide button — Home-only, id added purely so
// it can be measured (see components/onboarding/GuideEntry.tsx).
const GUIDE_ENTRY_ID = "mk-guide-entry";

const COPY = {
  guest: { th: "สมัครฟรี", en: "Sign up free" },
  free: { th: "อัปเกรดเป็น Pro", en: "Upgrade to Pro" },
  pro: { th: "อัปเกรดเป็น Pro Max", en: "Upgrade to Pro Max" },
};

const DEFAULT_POS = { top: "calc(env(safe-area-inset-top, 0px) + 10px)", right: 12 };

/**
 * A quiet, always-findable corner badge — app chrome, not something Miomi
 * says. Rendered via a portal directly to document.body (not inside any
 * ancestor layout div) so no parent's overflow/transform/stacking context
 * can ever clip it or steal its taps — that was the root cause of two
 * earlier "not clickable" reports. On Home, its position is MEASURED from
 * the real, already-existing "?" guide button at runtime (not guessed),
 * so it always sits directly below it with a clean gap, on any device.
 */
export function TierUpgradeBadge() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { isGuest, openSoftSignupPrompt } = useGuestExploration();
  const { open } = usePaywall();
  const lang = useUILanguage(); // guest-safe: reads the ui-language cookie, not profile

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number | string; right: number | string }>(DEFAULT_POS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname !== "/home") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(DEFAULT_POS);
      return;
    }
    // GuideEntry mounts one tick after Home does (it waits on a localStorage
    // read) — poll briefly for the real element rather than guess its size.
    let tries = 0;
    const measure = () => {
      const el = document.getElementById(GUIDE_ENTRY_ID);
      if (el) {
        const r = el.getBoundingClientRect();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
        return true;
      }
      return false;
    };
    if (measure()) return;
    const id = window.setInterval(() => {
      tries += 1;
      if (measure() || tries > 15) window.clearInterval(id); // ~1.5s max wait
    }, 100);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", onResize);
    };
  }, [pathname]);

  if (!mounted || !SHOW_ON.includes(pathname)) return null;

  const style = {
    fontFamily: "'Quicksand', sans-serif",
    position: "fixed" as const,
    top: pos.top,
    right: pos.right,
    zIndex: 50,
    pointerEvents: "auto" as const,
  };

  if (isGuest) {
    return createPortal(
      <button
        onClick={openSoftSignupPrompt}
        aria-label={COPY.guest.en}
        className="flex items-center gap-1 rounded-full border border-line bg-surface/95 px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-sm"
        style={style}
      >
        <UserPlus className="h-3.5 w-3.5" style={{ color: "#2C8E76" }} strokeWidth={2} />
        {COPY.guest[lang]}
      </button>,
      document.body,
    );
  }

  const tier = profile?.tier;
  if (tier !== "free" && tier !== "pro") return null; // pro_max (or unknown) → hidden

  const text = COPY[tier][lang];
  return createPortal(
    <button
      onClick={() => open("generic")}
      aria-label={text}
      className="flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm"
      style={{ ...style, borderColor: "#E8D8A8", background: "rgba(251, 243, 220, 0.95)", color: "#8A6D1F" }}
    >
      <Crown className="h-3.5 w-3.5" style={{ color: "#B8860B" }} strokeWidth={2} />
      {text}
    </button>,
    document.body,
  );
}
