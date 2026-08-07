"use client";

import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Admin-only semantic palette · dense cockpit. */
export const adminPalette = {
  teal: "#34A98F",
  mint: "#7BD4BE",
  gold: "#D9A441",
  amber: "#E8A23D",
  rose: "#E2606B",
  violet: "#8B7BD4",
  sky: "#5BA8D9",
  slate: "#8A8478",
  ink: "#2A2A28",
  muted: "#9A8B73",
  subtle: "#B0A488",
  line: "#EDE8E0",
  lineSoft: "#F2EEE7",
  surface: "#fff",
  canvas: "#FBFAF6",
} as const;

export type AdminColor = keyof typeof adminPalette;

export const PROVIDER_COLORS: Record<string, string> = {
  gemini: adminPalette.teal,
  groq: adminPalette.rose,
  groq_whisper: adminPalette.amber,
  google_tts: adminPalette.sky,
};

export const FONT_DISPLAY = "'Quicksand', ui-sans-serif, system-ui, sans-serif";

export function tint(hex: string, alpha = 0.12): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function hashHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 72%)`;
}

export const adminCard: CSSProperties = {
  background: adminPalette.surface,
  border: `0.5px solid ${adminPalette.line}`,
  borderRadius: 12,
  padding: "12px 14px",
};

export const adminTh: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 11,
  color: adminPalette.muted,
  fontWeight: 700,
  borderBottom: `0.5px solid ${adminPalette.line}`,
  whiteSpace: "nowrap",
  fontFamily: FONT_DISPLAY,
};

export const adminTd: CSSProperties = {
  padding: "8px 10px",
  fontSize: 12.5,
  borderBottom: `0.5px solid ${adminPalette.lineSoft}`,
  color: adminPalette.ink,
};

export const adminPagePad: CSSProperties = {
  padding: "14px 16px 56px",
};

export const filterPanel: CSSProperties = {
  ...adminCard,
  background: tint(adminPalette.teal, 0.04),
  border: `0.5px solid ${tint(adminPalette.teal, 0.18)}`,
};

export const applyBtn: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 12.5,
  fontWeight: 700,
  padding: "7px 14px",
  borderRadius: 8,
  border: "none",
  background: adminPalette.teal,
  color: "#fff",
  cursor: "pointer",
};

export const inputStyle: CSSProperties = {
  fontFamily: "inherit",
  fontSize: 12.5,
  padding: "7px 10px",
  borderRadius: 8,
  border: `0.5px solid ${adminPalette.line}`,
  background: "#fff",
  color: adminPalette.ink,
};

export function StatusPill({
  tone,
  label,
}: {
  tone: "ok" | "warn" | "error";
  label: string;
}) {
  const map = {
    ok: { bg: tint(adminPalette.teal, 0.14), fg: adminPalette.teal, dot: adminPalette.teal },
    warn: { bg: tint(adminPalette.amber, 0.16), fg: "#9A6A12", dot: adminPalette.amber },
    error: { bg: tint(adminPalette.rose, 0.14), fg: adminPalette.rose, dot: adminPalette.rose },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
        background: map.bg,
        color: map.fg,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: map.dot }} />
      {label}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string | null | undefined }) {
  const v = tier ?? "free";
  const styles: Record<string, { bg: string; fg: string }> = {
    free: { bg: tint(adminPalette.slate, 0.14), fg: adminPalette.slate },
    pro: { bg: tint(adminPalette.teal, 0.16), fg: "#1F7A68" },
    pro_max: { bg: tint(adminPalette.violet, 0.16), fg: "#5B4FA8" },
  };
  const s = styles[v] ?? styles.free;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
        padding: "2px 8px",
        borderRadius: 99,
      }}
    >
      {v}
    </span>
  );
}

export function Avatar({
  name,
  email,
  size = 28,
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const seed = (email || name || "?").toLowerCase();
  const initials =
    (name || email || "?")
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: hashHue(seed),
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontFamily: FONT_DISPLAY,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
      aria-hidden
    >
      {initials.slice(0, 2)}
    </div>
  );
}

export function IconChip({
  icon: Icon,
  color,
  size = 28,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: tint(color, 0.12),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} color={color} />
    </span>
  );
}

/** Lightweight edge-to-edge sparkline (no recharts · avoids client bundle cycles). */
function MiniSpark({ data, color }: { data: { t: string; v: number }[]; color: string }) {
  if (data.length < 2) return <div style={{ height: 40 }} />;
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 100;
  const h = 40;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d.v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const gid = `spk-${color.replace("#", "")}-${data.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={40} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiCard({
  color,
  icon: Icon,
  label,
  value,
  sub,
  deltaPct,
  invertDelta,
  spark,
}: {
  color: string;
  icon?: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number | null;
  invertDelta?: boolean;
  spark?: { t: string; v: number }[];
}) {
  let deltaNode: ReactNode = null;
  if (deltaPct !== undefined && deltaPct !== null) {
    const up = deltaPct > 0;
    const flat = deltaPct === 0;
    const good = invertDelta ? !up : up;
    const bg = flat ? tint(adminPalette.slate, 0.1) : good ? tint(adminPalette.teal, 0.14) : tint(adminPalette.rose, 0.14);
    const fg = flat ? adminPalette.slate : good ? "#1F7A68" : adminPalette.rose;
    const arrow = flat ? "·" : up ? "▲" : "▼";
    deltaNode = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: FONT_DISPLAY,
          background: bg,
          color: fg,
          padding: "2px 7px",
          borderRadius: 99,
        }}
      >
        {arrow} {flat ? "0%" : `${up ? "+" : ""}${deltaPct}%`}
      </span>
    );
  } else if (deltaPct === null) {
    deltaNode = (
      <span style={{ fontSize: 11, color: adminPalette.muted, fontFamily: FONT_DISPLAY }}>n/a vs prior</span>
    );
  }

  return (
    <div
      style={{
        background: adminPalette.surface,
        border: `0.5px solid ${adminPalette.line}`,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 1px 2px rgba(26,26,24,0.03)",
      }}
    >
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: "10px 12px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Icon ? <IconChip icon={Icon} color={color} size={26} /> : null}
            <span style={{ fontSize: 11.5, color: adminPalette.muted, fontWeight: 600, fontFamily: FONT_DISPLAY }}>{label}</span>
          </div>
          {deltaNode}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: FONT_DISPLAY,
            color: adminPalette.ink,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
        {sub ? <div style={{ fontSize: 11, color: adminPalette.muted, marginTop: 3 }}>{sub}</div> : null}
      </div>
      {spark && spark.length > 0 ? <MiniSpark data={spark} color={color} /> : <div style={{ height: 6 }} />}
    </div>
  );
}

export function ActionChip({ action }: { action: string }) {
  const map: Record<string, string> = {
    set_tier: adminPalette.violet,
    grant_room_credits: adminPalette.gold,
    grant_referral_credit: adminPalette.gold,
    adjust_room_credits: adminPalette.gold,
    adjust_referral_credit_baht: adminPalette.gold,
    add_note: adminPalette.sky,
    reward_referral: adminPalette.teal,
  };
  const c = map[action] ?? adminPalette.slate;
  return (
    <span
      style={{
        background: tint(c, 0.14),
        color: c,
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
      }}
    >
      {action}
    </span>
  );
}

export function ActivityDot({ tone }: { tone: "today" | "recent" | "old" }) {
  const color =
    tone === "today" ? adminPalette.teal : tone === "recent" ? adminPalette.amber : adminPalette.slate;
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

export function activityTone(lastSeen: string | null, nowMs: number): "today" | "recent" | "old" {
  if (!lastSeen) return "old";
  const days = (nowMs - new Date(lastSeen).getTime()) / 864e5;
  if (days < 1) return "today";
  if (days <= 3) return "recent";
  return "old";
}

export function CostBar({ value, max, color = adminPalette.amber }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: tint(color, 0.15), borderRadius: 99, minWidth: 40, maxWidth: 72 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontVariantNumeric: "tabular-nums", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 12.5 }}>
        ฿{Math.round(value).toLocaleString()}
      </span>
    </div>
  );
}

export function GuestChip() {
  return (
    <span
      style={{
        background: tint(adminPalette.slate, 0.14),
        color: adminPalette.slate,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
        padding: "1px 7px",
        borderRadius: 99,
        marginLeft: 6,
      }}
    >
      guest
    </span>
  );
}

export const adminTokens = {
  ...adminPalette,
  tealStrong: "#1F7A68",
  tealSoft: tint(adminPalette.teal, 0.12),
  tealBorder: tint(adminPalette.teal, 0.35),
  danger: adminPalette.rose,
  dangerSoft: tint(adminPalette.rose, 0.12),
  warn: "#9A6A12",
  warnSoft: tint(adminPalette.amber, 0.14),
  ok: adminPalette.teal,
} as const;

export const adminKpi: CSSProperties = {
  background: adminPalette.surface,
  border: `0.5px solid ${adminPalette.line}`,
  borderRadius: 12,
  padding: "10px 12px",
};
