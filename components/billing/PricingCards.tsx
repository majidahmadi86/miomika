"use client";

/**
 * Shared pricing cards — the SINGLE design used by both the standalone /pricing
 * page and the in-app paywall sheet, so the two never drift. A plan card and a
 * room-pack card, plus the small "what's inside a Confident Speaking room"
 * descriptor that sits inside both. Copy + prices come from lib/billing/tiers.ts.
 *
 * Brand: warm cream surface, mint/teal accent, Quicksand. Featured cards lift
 * with a mint border + badge. Cards are tier-agnostic about layout: drop them in
 * a grid (page) or a stacked column (sheet) and they fill their column.
 */

import { Check, Lock, Mic } from "lucide-react";
import {
  perRoomTHB,
  yearlyPriceTHB,
  ANNUAL_SAVING_PCT,
  ROOM_INSIDE,
  type Bilingual,
  type Plan,
  type RoomPack,
} from "@/lib/billing/tiers";

type Billing = "monthly" | "yearly";
type Lang = "en" | "th";

const sans = { fontFamily: "'Quicksand', sans-serif" } as const;

// Palette (kept local so cards are self-contained).
const INK = "#2A2A28";
const INK_SOFT = "#4a4540";
const MUTED = "#9A8B73";
const BORDER = "#EDE8E0";
const TEAL = "#34A98F";
const TEAL_DEEP = "#1f6b57";
const TEAL_INK = "#2C8E76";
const ACCENT_GRAD = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";

const t = (b: Bilingual, lang: Lang) => (lang === "th" ? b.th : b.en);
const baht = (n: number) => `฿${n.toLocaleString()}`;

/** The mint "what's inside a room" block shared by plan + pack cards. */
function RoomInside({
  lang,
  heading,
  lines = ROOM_INSIDE,
}: {
  lang: Lang;
  heading: string;
  lines?: Bilingual[];
}) {
  return (
    <div
      style={{
        background: "#E8F7F0",
        border: "1px solid #C9EBDD",
        borderRadius: 11,
        padding: "9px 10px",
        marginTop: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <Mic style={{ width: 14, height: 14, color: TEAL_INK }} strokeWidth={2.3} aria-hidden />
        <span style={{ ...sans, fontSize: 11.5, fontWeight: 800, color: TEAL_DEEP }}>{heading}</span>
      </div>
      <div style={{ ...sans, fontSize: 11, fontWeight: 600, color: "#46544e", lineHeight: 1.5 }}>
        {lines.map((l, i) => (
          <div key={i}>{t(l, lang)}</div>
        ))}
      </div>
    </div>
  );
}

/** Locked variant of the room block — shown on Free to create upgrade pull. */
function RoomLocked({ lang }: { lang: Lang }) {
  return (
    <div
      style={{
        background: "#F7F5F0",
        border: "1px dashed #DDD6CC",
        borderRadius: 11,
        padding: "9px 10px",
        marginTop: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Lock style={{ width: 13, height: 13, color: "#B0A488" }} strokeWidth={2.3} aria-hidden />
        <span style={{ ...sans, fontSize: 11, fontWeight: 700, color: MUTED }}>
          {lang === "th" ? "ห้องพูดสด" : "Confident Speaking"}
        </span>
      </div>
      <div style={{ ...sans, fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>
        {lang === "th" ? "ล็อกอยู่ — อัปเกรดเพื่อพูดสดกับมีโอมิ" : "Locked — upgrade to talk live with Miomi"}
      </div>
    </div>
  );
}

/** How many live rooms a plan includes per month (parsed from features, fallback by id). */
function roomsPerMonth(plan: Plan): number {
  if (plan.id === "free") return 0;
  if (plan.id === "pro") return 1;
  if (plan.id === "pro_max") return 3;
  return 0;
}

export function PlanCard({
  plan,
  lang,
  billing,
  loading,
  onSelect,
  ctaLabel,
}: {
  plan: Plan;
  lang: Lang;
  billing: Billing;
  loading?: boolean;
  onSelect?: () => void;
  /** Override the button text (e.g. "Current plan"). */
  ctaLabel?: string;
}) {
  const featured = !!plan.highlighted;
  const isFree = plan.priceTHB == null;
  const yearly = yearlyPriceTHB(plan);
  const rooms = roomsPerMonth(plan);

  const priceNode = isFree ? (
    <span style={{ ...sans, fontSize: 17, fontWeight: 800, color: INK }}>฿0</span>
  ) : billing === "yearly" && yearly != null ? (
    <span>
      <b style={{ ...sans, fontSize: 17, fontWeight: 800, color: INK }}>{baht(yearly)}</b>
      <span style={{ ...sans, fontSize: 11, color: MUTED, fontWeight: 600 }}>{lang === "th" ? "/ปี" : "/yr"}</span>
    </span>
  ) : (
    <span>
      <b style={{ ...sans, fontSize: 17, fontWeight: 800, color: INK }}>{baht(plan.priceTHB!)}</b>
      <span style={{ ...sans, fontSize: 11, color: MUTED, fontWeight: 600 }}>{lang === "th" ? "/เดือน" : "/mo"}</span>
    </span>
  );

  return (
    <div
      style={{
        position: "relative",
        background: featured ? "linear-gradient(180deg,#F0FAF6,#fff 45%)" : "#fff",
        border: featured ? `2px solid ${TEAL}` : `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "13px 12px",
        boxShadow: featured ? "0 5px 16px rgba(52,169,143,.13)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {featured ? (
        <span
          style={{
            position: "absolute",
            top: -9,
            left: 12,
            ...sans,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: ".03em",
            textTransform: "uppercase",
            color: "#fff",
            background: TEAL,
            borderRadius: 99,
            padding: "3px 9px",
            boxShadow: "0 2px 6px rgba(52,169,143,.3)",
          }}
        >
          {lang === "th" ? "ยอดนิยม" : "Most popular"}
        </span>
      ) : null}

      <div style={{ ...sans, fontSize: 14, fontWeight: featured ? 800 : 700, color: featured ? TEAL_DEEP : INK, marginTop: featured ? 2 : 0 }}>
        {t(plan.name, lang)}
      </div>
      <div style={{ ...sans, fontSize: 11, fontWeight: featured ? 700 : 600, color: featured ? TEAL_INK : MUTED, margin: "1px 0 6px" }}>
        {t(plan.tagline, lang)}
      </div>
      {priceNode}
      {billing === "yearly" && !isFree ? (
        <div style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: TEAL_INK, marginTop: 2 }}>
          {lang === "th" ? `ประหยัด ${ANNUAL_SAVING_PCT}%` : `Save ${ANNUAL_SAVING_PCT}%`}
        </div>
      ) : null}

      <div style={{ height: 1, background: featured ? "#E1F0EA" : "#F0EBE3", margin: "9px 0" }} />

      <div style={{ ...sans, fontSize: 11.5, color: isFree ? "#5a5550" : INK_SOFT, lineHeight: 1.75 }}>
        {plan.features.map((f, i) => (
          <div key={i}>
            <Check style={{ width: 13, height: 13, color: TEAL_INK, verticalAlign: -1, marginRight: 5 }} strokeWidth={2.6} aria-hidden />
            {t(f, lang)}
          </div>
        ))}
      </div>

      {rooms > 0 ? (
        <RoomInside
          lang={lang}
          heading={lang === "th" ? `ห้องพูดสด · ${rooms}/เดือน` : `Confident Speaking · ${rooms}/mo`}
        />
      ) : (
        <RoomLocked lang={lang} />
      )}

      {onSelect ? (
        <button
          onClick={onSelect}
          disabled={loading}
          style={{
            ...sans,
            marginTop: 12,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 11,
            border: featured ? "none" : `1.5px solid ${TEAL}`,
            background: featured ? ACCENT_GRAD : "transparent",
            color: featured ? "#fff" : TEAL_INK,
            fontSize: 13,
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: featured ? "0 4px 12px rgba(52,169,143,.25)" : "none",
          }}
        >
          {ctaLabel ?? (loading ? (lang === "th" ? "กำลังเปิด…" : "Starting…") : isFree ? (lang === "th" ? "เริ่มฟรี" : "Start free") : (lang === "th" ? "เลือกแพ็กนี้" : "Choose plan"))}
        </button>
      ) : null}
    </div>
  );
}

export function RoomPackCard({
  pack,
  lang,
  loading,
  onSelect,
}: {
  pack: RoomPack;
  lang: Lang;
  loading?: boolean;
  onSelect?: () => void;
}) {
  const featured = !!pack.tag;
  const per = perRoomTHB(pack);

  return (
    <div
      style={{
        position: "relative",
        background: featured ? "linear-gradient(180deg,#F0FAF6,#fff 45%)" : "#fff",
        border: featured ? `2px solid ${TEAL}` : `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "13px 13px",
        boxShadow: featured ? "0 5px 16px rgba(52,169,143,.13)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {pack.tag ? (
        <span
          style={{
            position: "absolute",
            top: -9,
            left: 13,
            ...sans,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: ".03em",
            textTransform: "uppercase",
            color: "#fff",
            background: TEAL,
            borderRadius: 99,
            padding: "3px 9px",
            boxShadow: "0 2px 6px rgba(52,169,143,.3)",
          }}
        >
          {t(pack.tag, lang)}
        </span>
      ) : null}

      <div style={{ ...sans, fontSize: 14, fontWeight: featured ? 800 : 700, color: featured ? TEAL_DEEP : INK, marginTop: featured ? 2 : 0 }}>
        {lang === "th" ? `${pack.count} ห้อง` : `${pack.count} rooms`}
      </div>
      <div style={{ ...sans, fontSize: 11, fontWeight: featured ? 700 : 600, color: featured ? TEAL_INK : MUTED, margin: "1px 0 6px" }}>
        {lang === "th" ? "ซื้อครั้งเดียว ใช้ได้ตลอด" : "Buy once, use anytime"}
      </div>
      <div>
        <b style={{ ...sans, fontSize: 17, fontWeight: 800, color: INK }}>{baht(pack.priceTHB)}</b>
        <span style={{ ...sans, fontSize: 11, color: MUTED, fontWeight: 600 }}>
          {lang === "th" ? ` · ฿${per} ต่อห้อง` : ` · ฿${per} a room`}
        </span>
      </div>

      <div style={{ height: 1, background: featured ? "#E1F0EA" : "#F0EBE3", margin: "9px 0" }} />

      <RoomInside lang={lang} heading={lang === "th" ? "แต่ละห้องกับมีโอมิ" : "Each room with Miomi"} />

      {onSelect ? (
        <button
          onClick={onSelect}
          disabled={loading}
          style={{
            ...sans,
            marginTop: 12,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 11,
            border: featured ? "none" : `1.5px solid ${TEAL}`,
            background: featured ? ACCENT_GRAD : "transparent",
            color: featured ? "#fff" : TEAL_INK,
            fontSize: 13,
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: featured ? "0 4px 12px rgba(52,169,143,.25)" : "none",
          }}
        >
          {loading ? (lang === "th" ? "กำลังเปิด…" : "Starting…") : lang === "th" ? "ซื้อแพ็กนี้" : "Get this pack"}
        </button>
      ) : null}
    </div>
  );
}

/** Small uppercase section label ("Plans", "Room packs"). */
export function PricingSectionLabel({ children }: { children: ReactNodeText }) {
  return (
    <div
      style={{
        ...sans,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        color: "#B0A488",
        margin: "0 2px 8px",
      }}
    >
      {children}
    </div>
  );
}

type ReactNodeText = string | number;
