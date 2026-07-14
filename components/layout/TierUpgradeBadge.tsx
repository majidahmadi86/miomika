"use client";

import { usePathname } from "next/navigation";
import { Crown } from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { usePaywall } from "@/components/billing/Paywall";
import { useUILanguage } from "@/lib/i18n/client";

// Home is handled separately (components/layout/TierUpgradeChip.tsx, inline
// in app/(app)/home/page.tsx) — Home already has its own guide button
// ("?") that this needs to coexist with, so it's positioned inline there
// instead of as a global fixed overlay. Learn and Talk already have their
// own native guest-signup entry points, so this component only ever
// handles the TIER-upgrade case (never guests) — see the collision history
// in checkpoints before changing this.
const SHOW_ON = ["/dashboard", "/talk"];

const COPY = {
  free: { th: "อัปเกรดเป็น Pro", en: "Upgrade to Pro" },
  pro: { th: "อัปเกรดเป็น Pro Max", en: "Upgrade to Pro Max" },
};

/**
 * A quiet, always-findable corner badge — app chrome, not something Miomi
 * says. Only on screens with nothing else occupying their top-right
 * (verified directly, not assumed) so a plain `fixed` position is safe
 * with no measurement or coexistence logic needed.
 */
export function TierUpgradeBadge() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { open } = usePaywall();
  const lang = useUILanguage();

  if (!SHOW_ON.includes(pathname)) return null;

  const tier = profile?.tier;
  if (tier !== "free" && tier !== "pro") return null; // pro_max (or guest) → hidden

  const text = COPY[tier][lang];
  return (
    <button
      onClick={() => open("generic")}
      aria-label={text}
      className="fixed z-40 flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm"
      style={{
        fontFamily: "'Quicksand', sans-serif",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        right: 12,
        pointerEvents: "auto",
        borderColor: "#E8D8A8",
        background: "rgba(251, 243, 220, 0.95)",
        color: "#8A6D1F",
      }}
    >
      <Crown className="h-3.5 w-3.5" style={{ color: "#B8860B" }} strokeWidth={2} />
      {text}
    </button>
  );
}
