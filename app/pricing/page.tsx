"use client";

/**
 * Standalone, public pricing page (/pricing). Reuses the SAME PlanCard and
 * RoomPackCard the in-app paywall sheet uses, so the two surfaces never drift.
 * Plans and room packs read from lib/billing/tiers.ts.
 *
 * Auth: checkout requires sign-in. A logged-in visitor goes straight to Stripe
 * checkout; a logged-out visitor is sent to /signup (then back to upgrade).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUILanguage } from "@/lib/i18n/client";
import {
  UPGRADE_PLANS,
  PLANS,
  ROOM_PACKS,
  type TierId,
} from "@/lib/billing/tiers";
import { PlanCard, RoomPackCard, PricingSectionLabel, PricingToggle } from "@/components/billing/PricingCards";

type Billing = "monthly" | "yearly";

const sans = { fontFamily: "'Quicksand', sans-serif" } as const;

const COPY = {
  en: {
    title: "Speak from day one",
    sub: "Start free. Upgrade when you're ready to talk out loud with Miomi.",
    plans: "Plans",
    packs: "Room packs · top up any plan",
    note: "Prices in Thai baht. Cancel anytime — you keep access to the end of your paid period.",
  },
  th: {
    title: "พูดได้ตั้งแต่วันแรก",
    sub: "เริ่มฟรี อัปเกรดเมื่อพร้อมพูดออกเสียงกับมีโอมิ",
    plans: "แพ็กเกจ",
    packs: "แพ็กห้องพูดสด · เติมได้ทุกแพ็ก",
    note: "ราคาเป็นเงินบาท ยกเลิกได้ทุกเมื่อ ใช้งานได้จนจบรอบที่ชำระไว้",
  },
};

export default function PricingPage() {
  const lang = useUILanguage();
  const router = useRouter();
  const c = COPY[lang];

  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<TierId | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const freePlan = PLANS.find((p) => p.id === "free")!;

  async function startCheckout(planId: TierId) {
    if (planId === "free") {
      router.push("/signup");
      return;
    }
    setErr(null);
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval: billing }),
      });
      if (res.status === 401) {
        // Not signed in — send to signup, return to pricing afterwards.
        router.push(`/signup?next=${encodeURIComponent("/pricing")}`);
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(data.error ?? (lang === "th" ? "เริ่มการชำระเงินไม่สำเร็จ ลองอีกครั้งนะคะ" : "Couldn't start checkout. Please try again."));
    } catch {
      setErr(lang === "th" ? "เริ่มการชำระเงินไม่สำเร็จ ลองอีกครั้งนะคะ" : "Couldn't start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main style={{ ...sans, background: "#FBFAF6", minHeight: "100vh", padding: "18px 16px 22px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <header style={{ textAlign: "center", marginBottom: 12 }}>
          <h1 style={{ ...sans, fontSize: 21, fontWeight: 800, color: "#2A2A28", margin: 0 }}>{c.title}</h1>
          <p style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: "#9A8B73", margin: "4px auto 0", maxWidth: 460, lineHeight: 1.45 }}>{c.sub}</p>
          <div style={{ marginTop: 11 }}>
            <PricingToggle billing={billing} onChange={setBilling} lang={lang} />
          </div>
        </header>

        <PricingSectionLabel>{c.plans}</PricingSectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, alignItems: "stretch", marginBottom: 13 }}>
          <PlanCard plan={freePlan} lang={lang} billing={billing} onSelect={() => startCheckout("free")} />
          {UPGRADE_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              lang={lang}
              billing={billing}
              loading={loadingPlan === plan.id}
              onSelect={() => startCheckout(plan.id)}
            />
          ))}
        </div>

        <PricingSectionLabel>{c.packs}</PricingSectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, alignItems: "stretch" }}>
          {ROOM_PACKS.map((pack) => (
            <RoomPackCard key={pack.count} pack={pack} lang={lang} />
          ))}
        </div>

        {err ? (
          <p style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: "#C0392B", textAlign: "center", marginTop: 12 }}>{err}</p>
        ) : null}

        <p style={{ ...sans, fontSize: 10.5, fontWeight: 600, color: "#B0A488", textAlign: "center", marginTop: 12, lineHeight: 1.45 }}>{c.note}</p>

      </div>
    </main>
  );
}
