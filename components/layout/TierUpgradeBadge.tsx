"use client";

import { usePathname } from "next/navigation";
import { Crown, UserPlus } from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { usePaywall } from "@/components/billing/Paywall";

// Only these four screens — never /me (it already has its own upgrade row)
// and never auth/admin/legal surfaces.
const SHOW_ON = ["/home", "/learn", "/dashboard", "/talk"];

const COPY = {
  guest: { th: "สมัครฟรี", en: "Sign up free" },
  free: { th: "อัปเกรดเป็น Pro", en: "Upgrade to Pro" },
  pro: { th: "อัปเกรดเป็น Pro Max", en: "Upgrade to Pro Max" },
};

/**
 * A quiet, always-in-the-same-spot corner badge — app chrome, not something
 * Miomi says. Deliberately top-right (out of easy thumb reach) and static
 * (no pulse/motion) so it's findable when wanted and easy to tune out
 * otherwise. Disappears entirely for Pro Max — nothing left to offer.
 */
export function TierUpgradeBadge() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { isGuest, openSoftSignupPrompt } = useGuestExploration();
  const { open } = usePaywall();

  if (!SHOW_ON.includes(pathname)) return null;

  const lang = profile?.ui_language === "en" ? "en" : "th";

  if (isGuest) {
    return (
      <button
        onClick={openSoftSignupPrompt}
        aria-label={COPY.guest.en}
        className="fixed z-30 flex items-center gap-1 rounded-full border border-line bg-surface/95 px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-sm"
        style={{ fontFamily: "'Quicksand', sans-serif", top: "calc(env(safe-area-inset-top, 0px) + 10px)", right: 12 }}
      >
        <UserPlus className="h-3.5 w-3.5" style={{ color: "#2C8E76" }} strokeWidth={2} />
        {COPY.guest[lang]}
      </button>
    );
  }

  const tier = profile?.tier;
  if (tier !== "free" && tier !== "pro") return null; // pro_max (or unknown) → hidden

  const text = COPY[tier][lang];
  return (
    <button
      onClick={() => open("generic")}
      aria-label={text}
      className="fixed z-30 flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm"
      style={{
        fontFamily: "'Quicksand', sans-serif",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        right: 12,
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
