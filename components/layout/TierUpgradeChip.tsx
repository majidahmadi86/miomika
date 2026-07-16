"use client";

import { Crown } from "lucide-react";
import { usePaywall } from "@/components/billing/Paywall";

const COPY = {
  free: { th: "อัปเกรดเป็น Pro", en: "Upgrade to Pro" },
  pro: { th: "อัปเกรดเป็น Pro Max", en: "Upgrade to Pro Max" },
};

/**
 * Home-only. GuideEntry (the "?" button) already positions itself reliably
 * with `absolute right-3 top-3` inside Home's own layout. Two earlier
 * attempts to coexist with it via position:fixed + runtime measurement both
 * failed on real devices. This mirrors GuideEntry's own proven scheme
 * exactly instead: a plain sibling with the same absolute positioning,
 * sitting BESIDE the "?" (right-14 clears its 36px + gap) so the top band
 * is one calm row, not a stack. No portal, no polling, nothing to sync.
 */
export function TierUpgradeChip({ tier, lang }: { tier: "free" | "pro" | "pro_max" | "guest" | undefined; lang: "th" | "en" }) {
  const { open } = usePaywall();
  if (tier !== "free" && tier !== "pro") return null; // pro_max / signed-out → nothing to sell

  const text = COPY[tier][lang];
  return (
    <button
      onClick={() => open("generic")}
      aria-label={text}
      className="pointer-events-auto absolute right-14 top-3 z-40 flex h-9 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold shadow-sm backdrop-blur-[14px] transition active:scale-[0.96]"
      style={{ fontFamily: "'Quicksand', sans-serif", borderColor: "#E8D8A8", background: "rgba(251, 243, 220, 0.92)", color: "#8A6D1F" }}
    >
      <Crown className="h-3.5 w-3.5" style={{ color: "#B8860B" }} strokeWidth={2} />
      {text}
    </button>
  );
}
