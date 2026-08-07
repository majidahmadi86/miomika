import type { CSSProperties } from "react";
import Link from "next/link";
import { UserPlus, Users, Coins, Flame } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { THB_PER_USD, COST_ALERT_THB_7D } from "@/lib/admin/cost";
import { parseRange, withRange } from "@/lib/admin/time-range";
import { overviewMetrics } from "@/lib/admin/metrics";
import AdminPageHeader, { adminCard, adminPagePad } from "@/components/admin/AdminPageHeader";
import { AdminBarChart, AdminLineChart } from "@/components/admin/Chart";
import { KpiCard, StatusPill, adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

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

  const tierBar = (label: string, n: number, color: string) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3, fontFamily: FONT_DISPLAY }}>
        <span style={{ color: adminPalette.muted }}>{label}</span><span style={{ fontWeight: 700 }}>{n}</span>
      </div>
      <div style={{ height: 6, background: tint(color, 0.12), borderRadius: 99 }}>
        <div style={{ height: 6, width: `${attn.total > 0 ? Math.round((n / attn.total) * 100) : 0}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Overview" rangeLabel={range.label} />

      <div className="admin-kpi-grid">
        <KpiCard color={adminPalette.teal} icon={UserPlus} label="Signups" value={Math.round(metrics.signups.value).toLocaleString()} deltaPct={metrics.signups.deltaPct} spark={metrics.signups.spark} />
        <KpiCard color={adminPalette.mint} icon={Users} label="Active users" value={Math.round(metrics.active.value).toLocaleString()} deltaPct={metrics.active.deltaPct} spark={metrics.active.spark} />
        <KpiCard color={adminPalette.gold} icon={Coins} label="Pack revenue" value={`฿${Math.round(metrics.revenue.value).toLocaleString()}`} deltaPct={metrics.revenue.deltaPct} spark={metrics.revenue.spark} />
        <KpiCard color={adminPalette.amber} icon={Flame} label="AI cost" value={`฿${Math.round(metrics.cost.value).toLocaleString()}`} deltaPct={metrics.cost.deltaPct} invertDelta spark={metrics.cost.spark} />
      </div>

      <div style={{ ...section, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Cost vs pack revenue</div>
        <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 8 }}>AI cost (฿) · room-pack purchases (฿). Subscription charge amounts are not stored in webhook_events or credit_ledger.</div>
        <AdminLineChart
          data={dual}
          bucket={range.bucket}
          height={240}
          area
          glowDots
          series={[
            { key: "cost", name: "AI cost", color: adminPalette.amber },
            { key: "revenue", name: "Pack revenue", color: adminPalette.teal },
          ]}
        />
      </div>

      <div className="admin-two-col" style={{ marginBottom: 10 }}>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Signups</div>
          <AdminBarChart data={metrics.signupsSeries} bucket={range.bucket} name="Signups" color={adminPalette.teal} height={200} />
        </div>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Active users</div>
          <AdminLineChart
            data={metrics.activeSeries}
            bucket={range.bucket}
            height={200}
            area
            series={[{ key: "v", name: "Active", color: adminPalette.mint }]}
          />
        </div>
      </div>

      <div style={{ ...section, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Pipeline health</span>
          <span style={{ fontSize: 11, color: adminPalette.muted }}>last 24h · {attn.calls24.toLocaleString()} AI calls</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          {attn.providers.length === 0 ? (
            <span style={{ fontSize: 12.5, color: adminPalette.subtle }}>No AI calls in the last 24h.</span>
          ) : attn.providers.map((p) => {
            const up = p.okPct !== null && p.okPct >= 80;
            return (
              <StatusPill
                key={p.name}
                tone={up ? "ok" : "error"}
                label={`${p.name} · ${p.okPct}% · ${p.calls}`}
              />
            );
          })}
          <StatusPill tone={attn.errorRate24 > 10 ? "error" : "ok"} label={`error rate ${attn.errorRate24}%`} />
          {attn.lastWebhook ? (
            <StatusPill
              tone={attn.lastWebhook.ok ? (ago(attn.lastWebhook.created_at).includes("d") ? "warn" : "ok") : "error"}
              label={`Stripe · ${ago(attn.lastWebhook.created_at)}${attn.lastWebhook.ok ? "" : " · failed"}`}
            />
          ) : (
            <StatusPill tone="warn" label="Stripe · none yet" />
          )}
        </div>
        {attn.recentEvents.length > 0 && (
          <div style={{ marginTop: 6, borderTop: `0.5px solid ${adminPalette.lineSoft}`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
            {attn.recentEvents.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: adminPalette.muted }}>
                  <span style={{ color: e.ok ? adminPalette.teal : adminPalette.rose }}>●</span> {e.type || "·"}
                </span>
                <span style={{ color: adminPalette.subtle }}>{ago(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...section, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Needs attention</span>
          <span style={{ fontSize: 11, color: adminPalette.muted }}>
            {attn.failed.length + attn.drifted.length + attn.hotUsers.length} item
            {attn.failed.length + attn.drifted.length + attn.hotUsers.length === 1 ? "" : "s"}
          </span>
        </div>
        {attn.failed.length === 0 && attn.drifted.length === 0 && attn.hotUsers.length === 0 ? (
          <div style={{ fontSize: 12.5, color: adminPalette.teal, padding: "6px 0" }}>All clear · no payment failures or tier drift.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {attn.failed.map((f) => (
              <div key={`f-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: tint(adminPalette.rose, 0.1), borderLeft: `3px solid ${adminPalette.rose}`, borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: adminPalette.rose }}>
                  <b>{who(f)}</b> · payment {f.subscription_status} ({f.tier})
                </span>
                <Link href={withRange(`/admin/users?q=${encodeURIComponent(f.email ?? "")}`, range.queryString)} style={{ fontSize: 12, color: adminPalette.rose, fontWeight: 600 }}>Open</Link>
              </div>
            ))}
            {attn.drifted.map((f) => (
              <div key={`d-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: tint(adminPalette.amber, 0.12), borderLeft: `3px solid ${adminPalette.amber}`, borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#9A6A12" }}>
                  <b>{who(f)}</b> · sub {f.subscription_status} but tier is free (webhook drift)
                </span>
                <Link href={withRange(`/admin/users?q=${encodeURIComponent(f.email ?? "")}`, range.queryString)} style={{ fontSize: 12, color: "#9A6A12", fontWeight: 600 }}>Open</Link>
              </div>
            ))}
            {attn.hotUsers.map((h) => (
              <div key={`h-${h.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: tint(adminPalette.amber, 0.12), borderLeft: `3px solid ${adminPalette.amber}`, borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#9A6A12" }}>
                  <b>{h.display_name || h.email || h.id.slice(0, 8)}</b> · high AI cost ฿{h.thb} in 7d
                </span>
                <Link href={withRange(`/admin/users/${h.id}`, range.queryString)} style={{ fontSize: 12, color: "#9A6A12", fontWeight: 600 }}>Open</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-two-col">
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Users by tier</div>
          {tierBar("Free", attn.free, adminPalette.slate)}
          {tierBar("Pro", attn.proCount, adminPalette.teal)}
          {tierBar("Pro Max", attn.proMaxCount, adminPalette.violet)}
          <div style={{ fontSize: 11, color: adminPalette.muted, marginTop: 8 }}>MRR est. ฿{attn.mrr.toLocaleString()} · {attn.paid} paid</div>
        </div>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Quick links</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
            <Link href={withRange("/admin/users", range.queryString)} style={{ color: adminPalette.teal, fontWeight: 600 }}>Browse + manage users</Link>
            <Link href={withRange("/admin/usage", range.queryString)} style={{ color: adminPalette.teal, fontWeight: 600 }}>AI cost &amp; usage</Link>
            <Link href={withRange("/admin/revenue", range.queryString)} style={{ color: adminPalette.teal, fontWeight: 600 }}>Revenue</Link>
            <Link href={withRange("/admin/audit", range.queryString)} style={{ color: adminPalette.teal, fontWeight: 600 }}>Audit log</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
