import { createServiceClient } from "@/lib/supabase/service";
import { ROOM_PACKS } from "@/lib/billing/tiers";
import { THB_PER_USD } from "@/lib/admin/cost";
import {
  bucketStart,
  emptyBuckets,
  previousPeriod,
  rangeIso,
  type ParsedRange,
  type TimeBucket,
} from "@/lib/admin/time-range";

export type SeriesPoint = { t: string; v: number };

const PACK_PRICE = new Map(ROOM_PACKS.map((p) => [p.count, p.priceTHB]));

function fillSeries(
  raw: { t: string; v: number }[],
  from: Date,
  to: Date,
  bucket: TimeBucket,
): SeriesPoint[] {
  const base = emptyBuckets(from, to, bucket);
  const map = new Map(raw.map((p) => [bucketStart(new Date(p.t), bucket).toISOString(), p.v]));
  return base.map((b) => ({ t: b.t, v: map.get(b.t) ?? 0 }));
}

function sumSeries(s: SeriesPoint[]): number {
  return s.reduce((a, p) => a + p.v, 0);
}

function deltaPct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Paginate auth.admin.listUsers and collect created_at in [from, to]. */
async function listAuthCreatedAts(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  from: Date,
  to: Date,
): Promise<Date[]> {
  const out: Date[] = [];
  const fromMs = from.getTime();
  const toMs = to.getTime();
  // listUsers is newest-first; stop once we pass `from`.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    let olderThanWindow = false;
    for (const u of data.users) {
      if (!u.created_at) continue;
      const t = new Date(u.created_at).getTime();
      if (t > toMs) continue;
      if (t < fromMs) {
        olderThanWindow = true;
        continue;
      }
      out.push(new Date(u.created_at));
    }
    if (data.users.length < 1000) break;
    // If the oldest user on this page is still newer than `from`, keep going.
    const oldest = data.users[data.users.length - 1]?.created_at;
    if (oldest && new Date(oldest).getTime() < fromMs && olderThanWindow) break;
  }
  return out;
}

function bucketCounts(dates: Date[], from: Date, to: Date, bucket: TimeBucket): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = bucketStart(d, bucket).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return fillSeries(
    [...counts.entries()].map(([t, v]) => ({ t, v })),
    from,
    to,
    bucket,
  );
}

export async function signupsSeries(range: ParsedRange): Promise<SeriesPoint[]> {
  const supabase = await createServiceClient();
  const dates = await listAuthCreatedAts(supabase, range.from, range.to);
  return bucketCounts(dates, range.from, range.to, range.bucket);
}

export async function activeUsersSeries(range: ParsedRange): Promise<SeriesPoint[]> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  const { data } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .gte("last_seen_at", fromIso)
    .lte("last_seen_at", toIso)
    .limit(50000);
  const dates = ((data ?? []) as { last_seen_at: string }[])
    .map((r) => new Date(r.last_seen_at))
    .filter((d) => Number.isFinite(d.getTime()));
  return bucketCounts(dates, range.from, range.to, range.bucket);
}

/**
 * Pack purchase revenue in THB, derived from room_credit_ledger purchase rows
 * × ROOM_PACKS prices. credit_ledger / webhook_events do NOT store payment amounts.
 */
export async function revenueSeries(range: ParsedRange): Promise<SeriesPoint[]> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  const { data } = await supabase
    .from("room_credit_ledger")
    .select("delta, created_at, reason")
    .eq("reason", "purchase")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .limit(50000);
  const byBucket = new Map<string, number>();
  for (const r of (data ?? []) as { delta: number; created_at: string }[]) {
    const thb = PACK_PRICE.get(r.delta) ?? 0;
    if (!thb) continue;
    const key = bucketStart(new Date(r.created_at), range.bucket).toISOString();
    byBucket.set(key, (byBucket.get(key) ?? 0) + thb);
  }
  return fillSeries(
    [...byBucket.entries()].map(([t, v]) => ({ t, v })),
    range.from,
    range.to,
    range.bucket,
  );
}

export async function costSeries(range: ParsedRange, userId?: string): Promise<SeriesPoint[]> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  let q = supabase
    .from("llm_usage")
    .select("est_cost_usd, created_at")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .limit(50000);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  const byBucket = new Map<string, number>();
  for (const r of (data ?? []) as { est_cost_usd: number | string; created_at: string }[]) {
    const raw = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
    if (!Number.isFinite(raw)) continue;
    const thb = raw * THB_PER_USD;
    const key = bucketStart(new Date(r.created_at), range.bucket).toISOString();
    byBucket.set(key, (byBucket.get(key) ?? 0) + thb);
  }
  return fillSeries(
    [...byBucket.entries()].map(([t, v]) => ({ t, v })),
    range.from,
    range.to,
    range.bucket,
  );
}

export type KpiWithSpark = {
  value: number;
  prev: number;
  deltaPct: number | null;
  spark: SeriesPoint[];
};

async function kpiFromSeries(
  curFn: (r: ParsedRange) => Promise<SeriesPoint[]>,
  range: ParsedRange,
): Promise<KpiWithSpark> {
  const prev = previousPeriod(range);
  const prevRange: ParsedRange = { ...range, from: prev.from, to: prev.to };
  const [spark, prevSpark] = await Promise.all([curFn(range), curFn(prevRange)]);
  const value = sumSeries(spark);
  const prevVal = sumSeries(prevSpark);
  return { value, prev: prevVal, deltaPct: deltaPct(value, prevVal), spark };
}

export async function overviewMetrics(range: ParsedRange) {
  const [signups, active, revenue, cost] = await Promise.all([
    kpiFromSeries(signupsSeries, range),
    kpiFromSeries(activeUsersSeries, range),
    kpiFromSeries(revenueSeries, range),
    kpiFromSeries(costSeries, range),
  ]);
  return {
    signups,
    active,
    revenue,
    cost,
    signupsSeries: signups.spark,
    activeSeries: active.spark,
    revenueSeries: revenue.spark,
    costSeries: cost.spark,
  };
}

/** Provider ok-rate over time from llm_usage.ok. */
export async function providerOkSeries(range: ParsedRange): Promise<{ t: string; provider: string; okPct: number; calls: number }[]> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  const { data } = await supabase
    .from("llm_usage")
    .select("provider, ok, created_at")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .limit(50000);
  type Acc = { ok: number; total: number };
  const map = new Map<string, Acc>();
  for (const r of (data ?? []) as { provider: string | null; ok: boolean; created_at: string }[]) {
    const provider = r.provider || "unknown";
    const key = `${bucketStart(new Date(r.created_at), range.bucket).toISOString()}|${provider}`;
    const cur = map.get(key) ?? { ok: 0, total: 0 };
    cur.total++;
    if (r.ok !== false) cur.ok++;
    map.set(key, cur);
  }
  const out: { t: string; provider: string; okPct: number; calls: number }[] = [];
  for (const [k, v] of map) {
    const [t, provider] = k.split("|");
    out.push({ t, provider, okPct: v.total ? Math.round((v.ok / v.total) * 100) : 0, calls: v.total });
  }
  return out.sort((a, b) => (a.t < b.t ? -1 : 1));
}

export async function rateLimitSeries(range: ParsedRange): Promise<SeriesPoint[]> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  const { data } = await supabase
    .from("rate_limit_hits")
    .select("count, updated_at")
    .gte("updated_at", fromIso)
    .lte("updated_at", toIso)
    .limit(50000);
  const byBucket = new Map<string, number>();
  for (const r of (data ?? []) as { count: number; updated_at: string }[]) {
    const key = bucketStart(new Date(r.updated_at), range.bucket).toISOString();
    byBucket.set(key, (byBucket.get(key) ?? 0) + (r.count ?? 0));
  }
  return fillSeries(
    [...byBucket.entries()].map(([t, v]) => ({ t, v })),
    range.from,
    range.to,
    range.bucket,
  );
}

export async function costByUserInRange(
  range: ParsedRange,
): Promise<Map<string, number>> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  const { data } = await supabase
    .from("llm_usage")
    .select("user_id, est_cost_usd")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .not("user_id", "is", null)
    .limit(50000);
  const map = new Map<string, number>();
  for (const r of (data ?? []) as { user_id: string; est_cost_usd: number | string }[]) {
    const raw = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
    if (!Number.isFinite(raw) || !r.user_id) continue;
    map.set(r.user_id, (map.get(r.user_id) ?? 0) + raw * THB_PER_USD);
  }
  return map;
}
