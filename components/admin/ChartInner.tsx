"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBucketLabel, type TimeBucket } from "@/lib/admin/time-range";
import { adminPalette, PROVIDER_COLORS, tint, FONT_DISPLAY } from "@/components/admin/ui";

const INK = adminPalette.ink;
const MUTED = adminPalette.muted;
const GRID = tint(adminPalette.ink, 0.06);

export type ChartRow = Record<string, string | number | null | undefined>;

type Common = {
  data: ChartRow[];
  xKey?: string;
  height?: number;
  bucket?: TimeBucket;
};

function useChartHeight(preferred = 220): number {
  const [h, setH] = useState(preferred);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setH(mq.matches ? Math.min(preferred, 200) : preferred);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [preferred]);
  return h;
}

function axisTick(bucket: TimeBucket | undefined) {
  return (iso: string) => (bucket ? formatBucketLabel(iso, bucket) : iso.slice(5, 16));
}

function CustomTooltip({
  active,
  payload,
  label,
  bucket,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  bucket?: TimeBucket;
}) {
  if (!active || !payload?.length) return null;
  const title = bucket && label ? formatBucketLabel(String(label), bucket) : String(label ?? "");
  return (
    <div
      style={{
        background: "#fff",
        border: `0.5px solid ${adminPalette.line}`,
        borderRadius: 10,
        padding: "8px 10px",
        boxShadow: "0 4px 16px rgba(26,26,24,0.08)",
        fontFamily: FONT_DISPLAY,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 6, fontWeight: 600 }}>{title}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 12, marginBottom: 2 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: INK }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color ?? adminPalette.teal }} />
            {p.name}
          </span>
          <span style={{ fontWeight: 700, color: p.color ?? INK }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function LegendChips({ payload }: { payload?: { value?: string; color?: string }[] }) {
  if (!payload?.length) return null;
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", paddingTop: 4 }}>
      {payload.map((p, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            color: MUTED,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          {p.value}
        </span>
      ))}
    </div>
  );
}

const xAxisProps = (bucket: TimeBucket | undefined) => ({
  tickFormatter: axisTick(bucket),
  tick: { fontSize: 11, fill: MUTED },
  axisLine: false as const,
  tickLine: false as const,
  minTickGap: 28,
  interval: "preserveStartEnd" as const,
});

export function AdminLineChart({
  data,
  series,
  xKey = "t",
  height = 220,
  bucket,
  area,
  glowDots,
}: Common & {
  series: { key: string; color?: string; name?: string }[];
  area?: boolean;
  glowDots?: boolean;
}) {
  const h = useChartHeight(height);
  if (area) {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => {
              const c = s.color ?? adminPalette.teal;
              const id = `area-${s.key}-${c.replace("#", "")}`;
              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey={xKey} {...xAxisProps(bucket)} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip bucket={bucket} />} />
          {series.length > 1 ? <Legend content={<LegendChips />} /> : null}
          {series.map((s) => {
            const c = s.color ?? adminPalette.teal;
            const id = `area-${s.key}-${c.replace("#", "")}`;
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name ?? s.key}
                stroke={c}
                strokeWidth={2.5}
                fill={`url(#${id})`}
                dot={glowDots ? { r: 3, fill: c, stroke: "#fff", strokeWidth: 1.5 } : false}
                activeDot={{ r: 4, fill: c, stroke: "#fff", strokeWidth: 2 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={xKey} {...xAxisProps(bucket)} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<CustomTooltip bucket={bucket} />} />
        {series.length > 1 ? <Legend content={<LegendChips />} /> : null}
        {series.map((s) => {
          const c = s.color ?? PROVIDER_COLORS[s.key] ?? adminPalette.teal;
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name ?? s.key}
              stroke={c}
              strokeWidth={2.5}
              dot={glowDots ? { r: 3, fill: c, stroke: "#fff", strokeWidth: 1.5 } : false}
              activeDot={{ r: 4, fill: c, stroke: "#fff", strokeWidth: 2 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AdminBarChart({
  data,
  dataKey = "v",
  xKey = "t",
  height = 200,
  bucket,
  color = adminPalette.teal,
  name,
}: Common & { dataKey?: string; color?: string; name?: string }) {
  const h = useChartHeight(height);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={xKey} {...xAxisProps(bucket)} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<CustomTooltip bucket={bucket} />} />
        <Bar dataKey={dataKey} name={name ?? dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AdminAreaChart({
  data,
  dataKey = "v",
  xKey = "t",
  height = 120,
  color = adminPalette.teal,
}: Common & { dataKey?: string; color?: string }) {
  const id = `fill-${dataKey}-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${id})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AdminSparkline({ data, color = adminPalette.teal }: { data: { t: string; v: number }[]; color?: string }) {
  if (!data.length) return <div style={{ height: 40 }} />;
  return <AdminAreaChart data={data} height={40} color={color} />;
}

export { adminPalette as TEAL_PALETTE };
export const TEAL = adminPalette.teal;
export const AMBER = adminPalette.amber;
export const INK_C = INK;
export const MUTED_C = MUTED;
