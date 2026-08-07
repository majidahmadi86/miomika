import type { CSSProperties } from "react";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { THB_PER_USD, COST_ALERT_THB_7D } from "@/lib/admin/cost";
import { parseRange, withRange } from "@/lib/admin/time-range";
import { overviewMetrics } from "@/lib/admin/metrics";
import AdminPageHeader, { adminCard, adminKpi, adminPagePad } from "@/components/admin/AdminPageHeader";
import { AdminBarChart, AdminLineChart, AdminSparkline } from "@/components/admin/Chart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHLY_THB: Record<string, number> = { pro: 299, pro_max: 699 };
const BAD_STATUS = ["past_due", "unpaid", "incomplete", "incomplete_expired"];

function ago(d: string | null | undefined): string {
  if (!d) return "·";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function deltaLabel(pct: number | null): { text: string; color: string } {
  if (pct === null) return { text: "n/a vs prior", color: "#9A8B73" };
  if (pct === 0) return { text: "0% vs prior", color: "#9A8B73" };
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct}% vs prior`, color: pct > 0 ? "#1F7A68" : "#A32D2D" };
}

type Flagged = { id: string; email: string | null; display_name: string | null; tier: string | null; subscription_status: string | null };

async function loadAttentionAndHealth() {
  const supabase = await createServiceClient();
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const headCount = async (filter: (q: ReturnType<Awaited<ReturnType<typeof createServiceClient>>["from"]>) => unknown): Promise<number> => {
    const res = (await (filter(supabase.from("profiles")) as unknown as Promise<{ count: number | null }>));
    return res.count ?? 0;
  };

  const [total, proCount, proMaxCount] = await Promise.all([
    headCount((t) => t.select("id", { count: "exact", head: true })),
    headCount((t) => t.select("id", { count: "exact", head: true }).eq("tier", "pro")),
    headCount((t) => t.select("id", { count: "exact", head: true }).eq("tier", "pro_max")),
  ]);
  const paid = proCount + proMaxCount;
  const free = Math.max(0, total - paid);
  const mrr = proCount * MONTHLY_THB.pro + proMaxCount * MONTHLY_THB.pro_max;

  const perUser = new Map<string, number>();
  {
    const { data } = await supabase.from("llm_usage").select("est_cost_usd, user_id").gte("created_at", since7).limit(50000);
    for (const r of (data ?? []) as { est_cost_usd: number | string; user_id: string | null }[]) {
      const v = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
      if (!Number.isFinite(v) || !r.user_id) continue;
      perUser.set(r.user_id, (perUser.get(r.user_id) ?? 0) + v);
    }
  }

  const hot = [...perUser.entries()]
    .map(([id, usd]) => ({ id, thb: Math.round(usd * THB_PER_USD) }))
    .filter((u) => u.thb >= COST_ALERT_THB_7D)
    .sort((a, b) => b.thb - a.thb)
    .slice(0, 20);
  let hotUsers: { id: string; email: string | null; display_name: string | null; thb: number }[] = [];
  if (hot.length) {
    const { data: hp } = await supabase.from("profiles").select("id, email, display_name").in("id", hot.map((h) => h.id));
    const byId = new Map(((hp ?? []) as { id: string; email: string | null; display_name: string | null }[]).map((p) => [p.id, p]));
    hotUsers = hot.map((h) => ({ id: h.id, email: byId.get(h.id)?.email ?? null, display_name: byId.get(h.id)?.display_name ?? null, thb: h.thb }));
  }

  const { data: failedPay } = await supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status")
    .in("subscription_status", BAD_STATUS)
    .limit(50);
  const { data: drift } = await supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status")
    .eq("tier", "free")
    .in("subscription_status", ["active", "trialing", "past_due"])
    .limit(50);

  const since24 = new Date(Date.now() - 864e5).toISOString();
  const provider = new Map<string, { calls: number; fails: number }>();
  let calls24 = 0, fails24 = 0;
  {
    const { data } = await supabase.from("llm_usage").select("provider, ok").gte("created_at", since24).limit(50000);
    for (const r of (data ?? []) as { provider: string | null; ok: boolean }[]) {
      const p = r.provider || "unknown";
      const cur = provider.get(p) ?? { calls: 0, fails: 0 };
      cur.calls++; calls24++;
      if (r.ok === false) { cur.fails++; fails24++; }
      provider.set(p, cur);
    }
  }
  const providers = [...provider.entries()]
    .map(([name, s]) => ({ name, calls: s.calls, okPct: s.calls ? Math.round(((s.calls - s.fails) / s.calls) * 100) : null }))
    .sort((a, b) => b.calls - a.calls);
  const errorRate24 = calls24 ? Math.round((fails24 / calls24) * 100) : 0;

  let lastWebhook: { created_at: string; type: string | null; ok: boolean } | null = null;
  let recentEvents: { created_at: string; type: string | null; ok: boolean }[] = [];
  {
    const { data } = await supabase.from("webhook_events").select("created_at, type, ok").order("created_at", { ascending: false }).limit(8);
    recentEvents = (data ?? []) as typeof recentEvents;
    lastWebhook = recentEvents[0] ?? null;
  }

  return {
    total, proCount, proMaxCount, paid, free, mrr,
    failed: (failedPay ?? []) as Flagged[],
    drifted: (drift ?? []) as Flagged[],
    hotUsers,
    providers, calls24, errorRate24, lastWebhook, recentEvents,
  };
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const [metrics, attn] = await Promise.all([overviewMetrics(range), loadAttentionAndHealth()]);

  const dual = metrics.costSeries.map((c, i) => ({
    t: c.t,
    cost: Math.round(c.v * 100) / 100,
    revenue: Math.round((metrics.revenueSeries[i]?.v ?? 0) * 100) / 100,
  }));

  const section: CSSProperties = adminCard;
  const who = (f: Flagged) => f.display_name || f.email || f.id.slice(0, 8);

  const kpi = (
    label: string,
    display: string,
    kpiData: { deltaPct: number | null; spark: { t: string; v: number }[] },
    color?: string,
  ) => {
    const d = deltaLabel(kpiData.deltaPct);
    return (
      <div style={adminKpi}>
        <div style={{ fontSize: 11.5, color: "#9A8B73" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: color ?? "#2A2A28" }}>{display}</div>
        <div style={{ fontSize: 11, color: d.color, marginTop: 2 }}>{d.text}</div>
        <div style={{ marginTop: 4 }}>
          <AdminSparkline data={kpiData.spark} color={color ?? "#34A98F"} />
        </div>
      </div>
    );
  };

  const tierBar = (label: string, n: number, color: string) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#6b675f" }}>{label}</span><span>{n}</span>
      </div>
      <div style={{ height: 6, background: "#F2EEE7", borderRadius: 99 }}>
        <div style={{ height: 6, width: `${attn.total > 0 ? Math.round((n / attn.total) * 100) : 0}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Overview" rangeLabel={range.label} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
        {kpi("Signups", Math.round(metrics.signups.value).toLocaleString(), metrics.signups)}
        {kpi("Active users", Math.round(metrics.active.value).toLocaleString(), metrics.active)}
        {kpi("Pack revenue", `฿${Math.round(metrics.revenue.value).toLocaleString()}`, metrics.revenue, "#1F7A68")}
        {kpi("AI cost", `฿${Math.round(metrics.cost.value).toLocaleString()}`, metrics.cost, "#854F0B")}
      </div>

      <div style={{ ...section, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Cost vs pack revenue</div>
        <div style={{ fontSize: 11, color: "#9A8B73", marginBottom: 8 }}>AI cost (฿) · room-pack purchases (฿). Subscription charge amounts are not stored in webhook_events or credit_ledger.</div>
        <AdminLineChart
          data={dual}
          bucket={range.bucket}
          height={240}
          series={[
            { key: "cost", name: "AI cost", color: "#C9A96E" },
            { key: "revenue", name: "Pack revenue", color: "#34A98F" },
          ]}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Signups</div>
          <AdminBarChart data={metrics.signupsSeries} bucket={range.bucket} name="Signups" height={200} />
        </div>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Active users</div>
          <AdminLineChart
            data={metrics.activeSeries}
            bucket={range.bucket}
            height={200}
            series={[{ key: "v", name: "Active", color: "#34A98F" }]}
          />
        </div>
      </div>

      <div style={{ ...section, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Pipeline health</span>
          <span style={{ fontSize: 11, color: "#9A8B73" }}>last 24h · {attn.calls24.toLocaleString()} AI calls</span>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          {attn.providers.length === 0 ? (
            <span style={{ fontSize: 12.5, color: "#B0A488" }}>No AI calls in the last 24h.</span>
          ) : attn.providers.map((p) => {
            const up = p.okPct !== null && p.okPct >= 80;
            return (
              <span key={p.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: up ? "#1D9E75" : "#D8533D" }} />
                <b style={{ fontWeight: 600 }}>{p.name}</b>
                <span style={{ color: "#9A8B73" }}>{p.okPct}% ok · {p.calls}</span>
              </span>
            );
          })}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <span style={{ color: "#6b675f" }}>error rate</span>
            <b style={{ fontWeight: 600, color: attn.errorRate24 > 10 ? "#A32D2D" : "#2A2A28" }}>{attn.errorRate24}%</b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <span style={{ color: "#6b675f" }}>last Stripe webhook</span>
            {attn.lastWebhook ? (
              <b style={{ fontWeight: 600, color: attn.lastWebhook.ok ? "#2A2A28" : "#A32D2D" }}>
                {ago(attn.lastWebhook.created_at)}{attn.lastWebhook.ok ? "" : " · failed"}
              </b>
            ) : <span style={{ color: "#B0A488" }}>none yet</span>}
          </span>
        </div>
        {attn.recentEvents.length > 0 && (
          <div style={{ marginTop: 10, borderTop: "0.5px solid #F2EEE7", paddingTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
            {attn.recentEvents.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "#6b675f" }}>
                  <span style={{ color: e.ok ? "#1D9E75" : "#D8533D" }}>{e.ok ? "●" : "○"}</span> {e.type || "·"}
                </span>
                <span style={{ color: "#B0A488" }}>{ago(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...section, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Needs attention</span>
          <span style={{ fontSize: 11, color: "#9A8B73" }}>
            {attn.failed.length + attn.drifted.length + attn.hotUsers.length} item
            {attn.failed.length + attn.drifted.length + attn.hotUsers.length === 1 ? "" : "s"}
          </span>
        </div>
        {attn.failed.length === 0 && attn.drifted.length === 0 && attn.hotUsers.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#1F7A68", padding: "6px 0" }}>All clear · no payment failures or tier drift.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {attn.failed.map((f) => (
              <div key={`f-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FCEBEB", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#A32D2D" }}>
                  <b>{who(f)}</b> · payment {f.subscription_status} ({f.tier})
                </span>
                <Link href={withRange(`/admin/users?q=${encodeURIComponent(f.email ?? "")}`, range.queryString)} style={{ fontSize: 12, color: "#A32D2D", fontWeight: 600 }}>Open</Link>
              </div>
            ))}
            {attn.drifted.map((f) => (
              <div key={`d-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FAEEDA", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#854F0B" }}>
                  <b>{who(f)}</b> · sub {f.subscription_status} but tier is free (webhook drift)
                </span>
                <Link href={withRange(`/admin/users?q=${encodeURIComponent(f.email ?? "")}`, range.queryString)} style={{ fontSize: 12, color: "#854F0B", fontWeight: 600 }}>Open</Link>
              </div>
            ))}
            {attn.hotUsers.map((h) => (
              <div key={`h-${h.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FAEEDA", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#854F0B" }}>
                  <b>{h.display_name || h.email || h.id.slice(0, 8)}</b> · high AI cost ฿{h.thb} in 7d
                </span>
                <Link href={withRange(`/admin/users/${h.id}`, range.queryString)} style={{ fontSize: 12, color: "#854F0B", fontWeight: 600 }}>Open</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Users by tier</div>
          {tierBar("Free", attn.free, "#B4B2A9")}
          {tierBar("Pro", attn.proCount, "#1D9E75")}
          {tierBar("Pro Max", attn.proMaxCount, "#7F77DD")}
          <div style={{ fontSize: 11, color: "#9A8B73", marginTop: 8 }}>MRR est. ฿{attn.mrr.toLocaleString()} · {attn.paid} paid</div>
        </div>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Quick links</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
            <Link href={withRange("/admin/users", range.queryString)} style={{ color: "#2C8E76", fontWeight: 600 }}>Browse + manage users</Link>
            <Link href={withRange("/admin/usage", range.queryString)} style={{ color: "#2C8E76", fontWeight: 600 }}>AI cost &amp; usage</Link>
            <Link href={withRange("/admin/revenue", range.queryString)} style={{ color: "#2C8E76", fontWeight: 600 }}>Revenue</Link>
            <Link href={withRange("/admin/audit", range.queryString)} style={{ color: "#2C8E76", fontWeight: 600 }}>Audit log</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
