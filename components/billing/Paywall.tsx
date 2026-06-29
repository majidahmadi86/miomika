"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { X, Check, Crown } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";
import {
  UPGRADE_PLANS,
  ANNUAL_SAVING_PCT,
  yearlyPriceTHB,
  type Bilingual,
  type Plan,
  type TierId,
} from "@/lib/billing/tiers";

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

// Session top-up packs beyond the monthly plan allowance. DISPLAY-ONLY for now —
// purchase (one-time checkout) + counting are wired when live voice (Gemini) returns.
const SESSION_PACKS: { count: number; price: number; tag?: Bilingual }[] = [
  { count: 10, price: 499 },
  { count: 30, price: 1399, tag: { en: "Best value", th: "คุ้มสุด" } },
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

          {/* billing toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div
              style={{
                display: "inline-flex",
                gap: 3,
                padding: 4,
                borderRadius: 99,
                background: "var(--mk-surface-2, #F7F4EE)",
                border: "1px solid var(--mk-border, #EDE8E0)",
              }}
            >
              <SegBtn active={billing === "monthly"} onClick={() => setBilling("monthly")}>
                {lang === "th" ? "รายเดือน" : "Monthly"}
              </SegBtn>
              <SegBtn active={billing === "yearly"} onClick={() => setBilling("yearly")}>
                {lang === "th" ? "รายปี" : "Yearly"}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 99,
                    background: billing === "yearly" ? "rgba(255,255,255,0.26)" : "#E9F8F4",
                    color: billing === "yearly" ? "#fff" : "#2C8E76",
                  }}
                >
                  {lang === "th" ? `ประหยัด ${ANNUAL_SAVING_PCT}%` : `Save ${ANNUAL_SAVING_PCT}%`}
                </span>
              </SegBtn>
            </div>
          </div>

          {/* plan cards — 2-up on desktop, stacks on mobile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
              gap: 14,
              alignItems: "start",
            }}
          >
            {UPGRADE_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                lang={lang}
                t={t}
                billing={billing}
                loading={loadingPlan === plan.id}
                onSelect={() => startCheckout(plan.id)}
              />
            ))}
          </div>

          {/* rooms: top-up packs preview (display-only until live sessions return) */}
          {reason === "rooms" ? (
            <div style={{ maxWidth: 460, margin: "20px auto 0" }}>
              <p style={{ ...sans, textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--mk-ink, #2A2A28)", margin: "0 0 3px" }}>
                {lang === "th" ? "ต้องการห้องเพิ่ม?" : "Need more sessions?"}
              </p>
              <p style={{ ...sans, textAlign: "center", fontSize: 12.5, color: "var(--mk-ink-muted, #9A8B73)", margin: "0 0 12px" }}>
                {lang === "th" ? "เติมเซสชันเพิ่มได้ทุกเมื่อ ทุกแพ็กเกจ" : "Top up anytime, on any plan"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                {SESSION_PACKS.map((pack) => {
                  const perSession = Math.round(pack.price / pack.count);
                  const featured = !!pack.tag;
                  return (
                    <div
                      key={pack.count}
                      style={{
                        position: "relative",
                        padding: featured ? "18px 12px 15px" : "16px 12px 15px",
                        borderRadius: 16,
                        border: featured
                          ? "1.5px solid rgba(52,169,143,0.55)"
                          : "1px solid var(--mk-border, #EDE8E0)",
                        background: featured
                          ? "linear-gradient(180deg, rgba(52,169,143,0.08), var(--mk-surface, #fff) 62%)"
                          : "var(--mk-surface, #fff)",
                        boxShadow: featured ? "0 6px 18px rgba(52,169,143,0.13)" : "0 2px 8px rgba(0,0,0,0.03)",
                        textAlign: "center",
                      }}
                    >
                      {pack.tag ? (
                        <span
                          style={{
                            position: "absolute",
                            top: -9,
                            left: "50%",
                            transform: "translateX(-50%)",
                            ...sans,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            padding: "3px 10px",
                            borderRadius: 99,
                            background: ACCENT_GRAD,
                            color: "#fff",
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 6px rgba(52,169,143,0.3)",
                          }}
                        >
                          {t(pack.tag)}
                        </span>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5 }}>
                        <span style={{ ...sans, fontSize: 30, fontWeight: 800, color: "var(--mk-ink, #2A2A28)", lineHeight: 1 }}>{pack.count}</span>
                        <span style={{ ...sans, fontSize: 12.5, fontWeight: 700, color: "var(--mk-ink-muted, #9A8B73)" }}>{lang === "th" ? "เซสชัน" : "sessions"}</span>
                      </div>
                      <div style={{ ...sans, fontSize: 11, fontWeight: 600, color: "var(--mk-ink-muted, #9A8B73)", marginTop: 4 }}>
                        {lang === "th" ? `฿${perSession} / เซสชัน` : `฿${perSession} each`}
                      </div>
                      <div style={{ height: 1, background: "var(--mk-border, #EDE8E0)", margin: "11px 8px" }} />
                      <div style={{ ...sans, fontSize: 18, fontWeight: 800, color: "#2C8E76", lineHeight: 1 }}>
                        ฿{pack.price.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

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

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...sans,
        display: "inline-flex",
        alignItems: "center",
        border: "none",
        borderRadius: 99,
        padding: "8px 16px",
        fontSize: 13.5,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? ACCENT_GRAD : "transparent",
        color: active ? "#fff" : "var(--mk-ink-muted, #9A8B73)",
        boxShadow: active ? "0 3px 10px -3px rgba(52,169,143,0.5)" : "none",
        transition: "color 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

function PlanCard({
  plan,
  lang,
  t,
  billing,
  loading,
  onSelect,
}: {
  plan: Plan;
  lang: "th" | "en";
  t: (b: Bilingual) => string;
  billing: Billing;
  loading: boolean;
  onSelect: () => void;
}) {
  const featured = !!plan.highlighted;
  const accent = "#34A98F";
  const yearly = yearlyPriceTHB(plan);
  const showYearly = billing === "yearly" && yearly != null && plan.priceTHB != null;
  const perMonth = showYearly ? Math.round((yearly as number) / 12) : plan.priceTHB;
  const saved = showYearly ? (plan.priceTHB as number) * 12 - (yearly as number) : 0;

  return (
    <div
      style={{
        position: "relative",
        background: "var(--mk-surface, #fff)",
        border: featured ? `2px solid ${accent}` : "1px solid var(--mk-border, #EDE8E0)",
        borderRadius: 18,
        padding: "18px 16px 16px",
        boxShadow: featured
          ? "0 10px 26px -10px rgba(52,169,143,0.30)"
          : "0 1px 2px rgba(74,65,54,.05), 0 8px 20px rgba(74,65,54,.05)",
      }}
    >
      {featured ? (
        <span
          style={{
            position: "absolute",
            top: -11,
            left: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: ACCENT_GRAD,
            color: "#fff",
            ...sans,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.2,
            padding: "3px 10px",
            borderRadius: 99,
          }}
        >
          <Crown style={{ width: 12, height: 12 }} strokeWidth={2.5} />
          {lang === "th" ? "ยอดนิยม" : "Most popular"}
        </span>
      ) : null}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
        <span style={{ ...sans, fontSize: 16, fontWeight: 800, color: "var(--mk-ink, #2A2A28)" }}>{t(plan.name)}</span>
        <span style={{ ...sans, color: "var(--mk-ink, #2A2A28)", textAlign: "right" }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>฿{perMonth}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-ink-muted, #9A8B73)" }}>{lang === "th" ? "/เดือน" : "/mo"}</span>
        </span>
      </div>

      {showYearly ? (
        <p style={{ ...sans, fontSize: 11.5, color: "#2C8E76", fontWeight: 700, textAlign: "right", margin: "0 0 10px" }}>
          {lang === "th"
            ? `฿${(yearly as number).toLocaleString()}/ปี · ประหยัด ฿${saved.toLocaleString()}`
            : `฿${(yearly as number).toLocaleString()}/yr · save ฿${saved.toLocaleString()}`}
        </p>
      ) : (
        <p style={{ ...sans, fontSize: 12.5, color: "var(--mk-ink-muted, #9A8B73)", margin: "0 0 12px" }}>{t(plan.tagline)}</p>
      )}

      <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
            <span
              aria-hidden
              style={{
                flex: "0 0 18px",
                width: 18,
                height: 18,
                borderRadius: 99,
                background: "#E9F8F4",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              <Check style={{ width: 12, height: 12, color: "#2C8E76" }} strokeWidth={3} />
            </span>
            <span style={{ ...sans, fontSize: 13, lineHeight: 1.4, color: "var(--mk-ink, #2A2A28)" }}>{t(f)}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={loading}
        style={{
          ...sans,
          width: "100%",
          padding: "12px 14px",
          borderRadius: 13,
          border: featured ? "none" : `1.5px solid ${accent}`,
          background: featured ? ACCENT_GRAD : "transparent",
          color: featured ? "#fff" : "#1F7A68",
          fontSize: 14.5,
          fontWeight: 800,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
          boxShadow: featured ? "0 4px 16px -4px rgba(52,169,143,0.45)" : "none",
        }}
      >
        {loading
          ? lang === "th"
            ? "กำลังพาไป…"
            : "Redirecting…"
          : lang === "th"
            ? `เลือก ${t(plan.name)}`
            : `Choose ${t(plan.name)}`}
      </button>
    </div>
  );
}
