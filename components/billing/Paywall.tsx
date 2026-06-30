"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { X, Check } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";
import {
  UPGRADE_PLANS,
  ROOM_PACKS,
  type Bilingual,
  type TierId,
} from "@/lib/billing/tiers";
import { PlanCard, RoomPackCard, PlanRow, PricingToggle } from "@/components/billing/PricingCards";

export type PaywallReason = "daily_limit" | "custom_course" | "rooms" | "generic";
type Billing = "monthly" | "yearly";

type PaywallContextValue = {
  /** Open the upgrade sheet, optionally themed to why it appeared. */
  open: (reason?: PaywallReason) => void;
  close: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

const sans = { fontFamily: "'Quicksand', sans-serif" } as const;
const ACCENT_GRAD = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";

const HEADERS: Record<PaywallReason, { title: Bilingual; subtitle: Bilingual }> = {
  daily_limit: {
    title: { en: "Loving the chats?", th: "ชอบคุยกับมีโอมิไหม?" },
    subtitle: {
      en: "Upgrade to keep talking with Miomi — and unlock voice and live sessions.",
      th: "อัปเกรดเพื่อคุยกับมีโอมิต่อ พร้อมปลดล็อกเสียงและห้องพูดสด",
    },
  },
  custom_course: {
    title: { en: "Make it yours", th: "สร้างในแบบของคุณ" },
    subtitle: {
      en: "Create your own courses on any topic with Pro.",
      th: "สร้างคอร์สของคุณเองในทุกหัวข้อด้วยแพ็กโปร",
    },
  },
  rooms: {
    title: { en: "Speak live with Miomi", th: "พูดสดกับมีโอมิ" },
    subtitle: {
      en: "Unlock live speaking sessions — real-time practice, just you and Miomi.",
      th: "ปลดล็อกห้องพูดสด ฝึกแบบเรียลไทม์กับมีโอมิ",
    },
  },
  generic: {
    title: { en: "Unlock more with Miomi", th: "ปลดล็อกเพิ่มเติมกับมีโอมิ" },
    subtitle: {
      en: "More chats, voice, and live sessions await.",
      th: "คุยได้มากขึ้น เสียง และห้องพูดสดรออยู่",
    },
  },
};

// Rooms upsell — the experience pitch shown when the paywall opens for live sessions.
// Sells what a session *feels* like, not just that it's gated.
const ROOMS_PITCH: Bilingual[] = [
  { en: "Talk out loud, in real time — not typing, actually speaking", th: "พูดออกเสียงแบบเรียลไทม์ ไม่ใช่พิมพ์ แต่พูดจริง ๆ" },
  { en: "Real scenes: order street food, ace an interview, make a friend", th: "สถานการณ์จริง: สั่งอาหารริมทาง สัมภาษณ์งาน หาเพื่อนใหม่" },
  { en: "Miomi plays the other person — patient, in character, all yours", th: "มีโอมิรับบทอีกฝ่าย ใจเย็น อินบท เป็นของคุณคนเดียว" },
  { en: "Build real speaking confidence, one session at a time", th: "สร้างความมั่นใจในการพูดจริง ทีละห้อง" },
];


export function PaywallProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const open = useCallback((r: PaywallReason = "generic") => setReason(r), []);
  const close = useCallback(() => setReason(null), []);

  return (
    <PaywallContext.Provider value={{ open, close }}>
      {children}
      {reason ? <PaywallSheet reason={reason} onClose={close} /> : null}
    </PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall must be used within PaywallProvider");
  return ctx;
}

function PaywallSheet({ reason, onClose }: { reason: PaywallReason; onClose: () => void }) {
  const lang = useUILanguage();
  const t = (b: Bilingual) => (lang === "th" ? b.th : b.en);
  const [loadingPlan, setLoadingPlan] = useState<TierId | null>(null);
  const [loadingPack, setLoadingPack] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing>("monthly");
  const header = HEADERS[reason] ?? HEADERS.generic;

  const startCheckout = async (planId: TierId) => {
    if (loadingPlan) return;
    setError(null);
    setLoadingPlan(planId);
    const fallback =
      lang === "th" ? "เริ่มการชำระเงินไม่สำเร็จ ลองอีกครั้งนะคะ" : "Couldn't start checkout. Please try again.";
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval: billing }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.assign(json.url); // leaving the page — keep the spinner
        return;
      }
      setError(json.error ?? fallback);
      setLoadingPlan(null);
    } catch {
      setError(fallback);
      setLoadingPlan(null);
    }
  };

  const buyPack = async (count: number) => {
    if (loadingPack !== null) return;
    setError(null);
    setLoadingPack(count);
    const fallback =
      lang === "th" ? "เริ่มการชำระเงินไม่สำเร็จ ลองอีกครั้งนะคะ" : "Couldn't start checkout. Please try again.";
    try {
      const res = await fetch("/api/billing/checkout-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.assign(json.url); // leaving the page — keep the spinner
        return;
      }
      setError(json.error ?? fallback);
      setLoadingPack(null);
    } catch {
      setError(fallback);
      setLoadingPack(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--mk-canvas, #FAFAF6)",
        overflowY: "auto",
        animation: "mk-paywall-fade 200ms ease",
      }}
    >
      <style>{`
        @keyframes mk-paywall-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mk-paywall-rise { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* close — floats top-right, always reachable */}
      <button
        onClick={onClose}
        aria-label={lang === "th" ? "ปิด" : "Close"}
        style={{
          position: "fixed",
          top: 16,
          right: 18,
          zIndex: 1001,
          width: 38,
          height: 38,
          borderRadius: 99,
          border: "1px solid var(--mk-border, #EDE8E0)",
          background: "var(--mk-surface, #fff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(40,36,32,0.08)",
        }}
      >
        <X style={{ width: 18, height: 18, color: "var(--mk-ink-muted, #9A8B73)" }} />
      </button>

      {/* centering frame: centers when it fits, scrolls from top when it doesn't */}
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 18px 32px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 700,
            animation: "mk-paywall-rise 260ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          {/* header */}
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <Image
              src="/miomi/head-happy.png"
              alt="Miomi"
              width={78}
              height={78}
              style={{
                objectFit: "contain",
                display: "block",
                margin: "0 auto 8px",
                filter: "drop-shadow(0 6px 14px rgba(52,169,143,0.22))",
              }}
            />
            <h2 style={{ ...sans, fontSize: 23, fontWeight: 800, color: "var(--mk-ink, #2A2A28)", margin: "0 0 6px" }}>
              {t(header.title)}
            </h2>
            <p style={{ ...sans, fontSize: 14, lineHeight: 1.5, color: "var(--mk-ink-muted, #9A8B73)", margin: "0 auto", maxWidth: 420 }}>
              {t(header.subtitle)}
            </p>
          </div>

          {/* rooms: sell the experience before the plans */}
          {reason === "rooms" ? (
            <div style={{ maxWidth: 460, margin: "0 auto 18px", display: "grid", gap: 9 }}>
              {ROOMS_PITCH.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      background: "rgba(52,169,143,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check style={{ width: 13, height: 13, color: "#1F7A68" }} />
                  </span>
                  <span style={{ ...sans, fontSize: 14, color: "var(--mk-ink, #2A2A28)" }}>{t(line)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {reason === "rooms" ? (
            /* ROOMS CONTEXT — the user wants a room now. Packs are the hero;
               subscriptions collapse to compact rows as the "or ongoing" path. */
            <>
              {/* primary: room packs, with working buy buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 11, alignItems: "stretch", marginBottom: 18 }}>
                {ROOM_PACKS.map((pack) => (
                  <RoomPackCard
                    key={pack.count}
                    pack={pack}
                    lang={lang}
                    loading={loadingPack === pack.count}
                    onSelect={() => buyPack(pack.count)}
                  />
                ))}
              </div>

              {/* secondary: subscriptions, compact one-line rows */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
                <span style={{ ...sans, fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--mk-ink-muted, #B0A488)" }}>
                  {lang === "th" ? "หรือสมัครสมาชิก · ห้องทุกเดือน + ทุกอย่าง" : "Or go Pro · rooms every month + all of Miomi"}
                </span>
                <PricingToggle billing={billing} onChange={setBilling} lang={lang} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {UPGRADE_PLANS.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    lang={lang}
                    billing={billing}
                    loading={loadingPlan === plan.id}
                    onSelect={() => startCheckout(plan.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            /* SUBSCRIPTION CONTEXT — plans are the answer; no packs. */
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <PricingToggle billing={billing} onChange={setBilling} lang={lang} />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 12,
                  alignItems: "stretch",
                }}
              >
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
            </>
          )}

          {/* checkout error (if any) */}
          {error ? (
            <p
              style={{
                ...sans,
                textAlign: "center",
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "#B4453C",
                background: "#FCEEEC",
                border: "1px solid #F3D2CD",
                borderRadius: 12,
                padding: "10px 12px",
                margin: "16px auto 0",
                maxWidth: 460,
              }}
            >
              {error}
            </p>
          ) : null}

          <p style={{ ...sans, textAlign: "center", fontSize: 11.5, color: "var(--mk-ink-subtle, #A89C88)", margin: "18px 0 0" }}>
            {lang === "th"
              ? `ยกเลิกได้ทุกเมื่อ · เรียกเก็บ${billing === "yearly" ? "รายปี" : "รายเดือน"}`
              : `Cancel anytime · Billed ${billing === "yearly" ? "annually" : "monthly"}`}
          </p>
          <p style={{ ...sans, textAlign: "center", fontSize: 11, color: "var(--mk-ink-subtle, #A89C88)", margin: "6px 0 0" }}>
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
              {lang === "th" ? "ข้อกำหนดและนโยบายการคืนเงิน" : "Terms & refund policy"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


