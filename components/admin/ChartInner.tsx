"use client";

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

const TEAL = "#34A98F";
const INK = "#2A2A28";
const MUTED = "#9A8B73";
const LINE = "#EDE8E0";
const AMBER = "#C9A96E";

export type ChartRow = Record<string, string | number | null | undefined>;

type Common = {
  data: ChartRow[];
  xKey?: string;
  height?: number;
  bucket?: TimeBucket;
};

function axisTick(bucket: TimeBucket | undefined) {
  return (iso: string) => (bucket ? formatBucketLabel(iso, bucket) : iso.slice(5, 16));
}

const tipStyle = {
  background: "#fff",
  border: `0.5px solid ${LINE}`,
  borderRadius: 8,
  fontSize: 11,
  color: INK,
};

export function AdminLineChart({
  data,
  series,
  xKey = "t",
  height = 220,
  bucket,
}: Common & { series: { key: string; color?: string; name?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={axisTick(bucket)} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tipStyle} labelFormatter={(l) => (bucket ? formatBucketLabel(String(l), bucket) : String(l))} />
        {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name ?? s.key} stroke={s.color ?? TEAL} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        ))}
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
  color = TEAL,
  name,
}: Common & { dataKey?: string; color?: string; name?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={axisTick(bucket)} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tipStyle} labelFormatter={(l) => (bucket ? formatBucketLabel(String(l), bucket) : String(l))} />
        <Bar dataKey={dataKey} name={name ?? dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AdminAreaChart({
  data,
  dataKey = "v",
  xKey = "t",
  height = 120,
  color = TEAL,
}: Common & { dataKey?: string; color?: string }) {
  const id = `fill-${dataKey}-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${id})`} strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AdminSparkline({ data, color = TEAL }: { data: { t: string; v: number }[]; color?: string }) {
  if (!data.length) return <div style={{ height: 36 }} />;
  return <AdminAreaChart data={data} height={36} color={color} />;
}

export { TEAL, AMBER, INK, MUTED };
