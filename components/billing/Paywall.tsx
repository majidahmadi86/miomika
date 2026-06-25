"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { X, Check, Crown, Sparkles } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";
import { UPGRADE_PLANS, type Bilingual, type Plan, type TierId } from "@/lib/billing/tiers";

export type PaywallReason = "daily_limit" | "custom_course" | "rooms" | "generic";

type PaywallContextValue = {
  /** Open the upgrade sheet, optionally themed to why it appeared. */
  open: (reason?: PaywallReason) => void;
  close: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

const sans = { fontFamily: "'Quicksand', sans-serif" } as const;

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

const SOON: Bilingual = {
  en: "Checkout opens here very soon — thank you for being early.",
  th: "ระบบชำระเงินกำลังจะเปิดที่นี่เร็วๆ นี้ ขอบคุณที่อยู่กับเราตั้งแต่แรกนะคะ",
};

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
  const [selected, setSelected] = useState<TierId | null>(null);
  const header = HEADERS[reason] ?? HEADERS.generic;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(28,24,20,0.46)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "mk-paywall-fade 180ms ease",
      }}
    >
      <style>{`
        @keyframes mk-paywall-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mk-paywall-rise { from { transform: translateY(26px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "94svh",
          overflowY: "auto",
          background: "var(--mk-canvas, #FAFAF6)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: "0 -10px 44px rgba(40,36,32,0.22)",
          padding: "10px 18px 26px",
          animation: "mk-paywall-rise 240ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        {/* grabber */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 6 }}>
          <span style={{ width: 38, height: 4, borderRadius: 99, background: "var(--mk-border, #EDE8E0)" }} />
        </div>

        {/* close */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            aria-label={lang === "th" ? "ปิด" : "Close"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 99,
              border: "none",
              background: "var(--mk-surface-2, #F7F4EE)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 17, height: 17, color: "var(--mk-ink-muted, #9A8B73)" }} />
          </button>
        </div>

        {/* header */}
        <div style={{ textAlign: "center", padding: "2px 6px 18px" }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)",
              boxShadow: "0 6px 18px -6px rgba(52,169,143,0.55)",
              marginBottom: 12,
            }}
          >
            <Sparkles style={{ width: 26, height: 26, color: "#fff" }} strokeWidth={2.2} />
          </span>
          <h2 style={{ ...sans, fontSize: 21, fontWeight: 800, color: "var(--mk-ink, #2A2A28)", margin: "0 0 6px" }}>
            {t(header.title)}
          </h2>
          <p style={{ ...sans, fontSize: 13.5, lineHeight: 1.5, color: "var(--mk-ink-muted, #9A8B73)", margin: 0 }}>
            {t(header.subtitle)}
          </p>
        </div>

        {/* plan cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {UPGRADE_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              lang={lang}
              t={t}
              selected={selected === plan.id}
              onSelect={() => setSelected(plan.id)}
            />
          ))}
        </div>

        {/* coming-soon note (until Stripe lands) */}
        {selected ? (
          <p
            style={{
              ...sans,
              textAlign: "center",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--mk-accent-press, #1F7A68)",
              background: "#EAF7F2",
              border: "1px solid #CDEBE1",
              borderRadius: 12,
              padding: "10px 12px",
              margin: "14px 2px 0",
            }}
          >
            {t(SOON)}
          </p>
        ) : null}

        <p style={{ ...sans, textAlign: "center", fontSize: 11.5, color: "var(--mk-ink-subtle, #A89C88)", margin: "16px 0 0" }}>
          {lang === "th" ? "ยกเลิกได้ทุกเมื่อ · เรียกเก็บรายเดือน" : "Cancel anytime · Billed monthly"}
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  lang,
  t,
  selected,
  onSelect,
}: {
  plan: Plan;
  lang: "th" | "en";
  t: (b: Bilingual) => string;
  selected: boolean;
  onSelect: () => void;
}) {
  const featured = !!plan.highlighted;
  const accent = "#34A98F";
  return (
    <div
      style={{
        position: "relative",
        background: "var(--mk-surface, #fff)",
        border: featured ? `2px solid ${accent}` : "1px solid var(--mk-border, #EDE8E0)",
        borderRadius: 18,
        padding: "16px 16px 15px",
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
            background: "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)",
            color: "#fff",
            fontFamily: "'Quicksand', sans-serif",
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
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 16, fontWeight: 800, color: "var(--mk-ink, #2A2A28)" }}>
          {t(plan.name)}
        </span>
        <span style={{ fontFamily: "'Quicksand', sans-serif", color: "var(--mk-ink, #2A2A28)" }}>
          <span style={{ fontSize: 21, fontWeight: 800 }}>฿{plan.priceTHB}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-ink-muted, #9A8B73)" }}>{lang === "th" ? "/เดือน" : "/mo"}</span>
        </span>
      </div>
      <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 12.5, color: "var(--mk-ink-muted, #9A8B73)", margin: "0 0 12px" }}>
        {t(plan.tagline)}
      </p>

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
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 13, lineHeight: 1.4, color: "var(--mk-ink, #2A2A28)" }}>
              {t(f)}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 13,
          border: featured ? "none" : `1.5px solid ${accent}`,
          background: featured ? "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)" : "transparent",
          color: featured ? "#fff" : "#1F7A68",
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 14.5,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: featured ? "0 4px 16px -4px rgba(52,169,143,0.45)" : "none",
        }}
      >
        {selected
          ? lang === "th"
            ? "เลือกแล้ว"
            : "Selected"
          : lang === "th"
            ? `เลือก ${t(plan.name)}`
            : `Choose ${t(plan.name)}`}
      </button>
    </div>
  );
}
