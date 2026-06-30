import type { CSSProperties } from "react";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { THB_PER_USD, COST_ALERT_THB_7D } from "@/lib/admin/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHLY_THB: Record<string, number> = { pro: 299, pro_max: 699 };
// Stripe statuses that mean "this subscription isn't healthy".
const BAD_STATUS = ["past_due", "unpaid", "incomplete", "incomplete_expired"];

function ago(d: string | null | undefined): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Flagged = { id: string; email: string | null; display_name: string | null; tier: string | null; subscription_status: string | null };

async function loadOverviewData() {
  const supabase = await createServiceClient();
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);

  const headCount = async (filter: (q: ReturnType<Awaited<ReturnType<typeof createServiceClient>>["from"]>) => unknown): Promise<number> => {
    const res = (await (filter(supabase.from("profiles")) as unknown as Promise<{ count: number | null }>));
    return res.count ?? 0;
  };

  const [total, proCount, proMaxCount, activeToday, signups7] = await Promise.all([
    headCount((t) => t.select("id", { count: "exact", head: true })),
    headCount((t) => t.select("id", { count: "exact", head: true }).eq("tier", "pro")),
    headCount((t) => t.select("id", { count: "exact", head: true }).eq("tier", "pro_max")),
    headCount((t) => t.select("id", { count: "exact", head: true }).gte("last_seen_at", todayStart.toISOString())),
    headCount((t) => t.select("id", { count: "exact", head: true }).gte("onboarding_completed_at", since7)),
  ]);
  const paid = proCount + proMaxCount;
  const free = Math.max(0, total - paid);
  const mrr = proCount * MONTHLY_THB.pro + proMaxCount * MONTHLY_THB.pro_max;
  const conversion = total > 0 ? ((paid / total) * 100).toFixed(1) : "0";

  // AI cost, last 7 days (same source as the cost tab) — totals + per-user, in one pass.
  let cost7 = 0;
  const perUser = new Map<string, number>();
  {
    const { data } = await supabase.from("llm_usage").select("est_cost_usd, user_id").gte("created_at", since7).limit(50000);
    for (const r of (data ?? []) as { est_cost_usd: number | string; user_id: string | null }[]) {
      const v = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
      if (!Number.isFinite(v)) continue;
      cost7 += v;
      if (r.user_id) perUser.set(r.user_id, (perUser.get(r.user_id) ?? 0) + v);
    }
  }
  const cost7Thb = Math.round(cost7 * THB_PER_USD);

  // (c) High AI cost: any user over the alert threshold in the window (catch money-burn early).
  const hot = [...perUser.entries()]
    .map(([id, usd]) => ({ id, thb: Math.round(usd * THB_PER_USD) }))
    .filter((u) => u.thb >= COST_ALERT_THB_7D)
    .sort((a, b) => b.thb - a.thb)
    .slice(0, 20);
  let hotUsers: { id: string; email: string | null; display_name: string | null; thb: number }[] = [];
  if (hot.length) {
    const { data: hp } = await supabase.from("profiles").select("id, email, display_name").in("id", hot.map((h) => h.id));
    const byId = new Map((((hp ?? []) as { id: string; email: string | null; display_name: string | null }[]).map((p) => [p.id, p])));
    hotUsers = hot.map((h) => ({ id: h.id, email: byId.get(h.id)?.email ?? null, display_name: byId.get(h.id)?.display_name ?? null, thb: h.thb }));
  }

  // NEEDS ATTENTION — cheaply + reliably detectable problems.
  // (a) Failed payments: a paid tier with an unhealthy subscription status.
  const { data: failedPay } = await supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status")
    .in("subscription_status", BAD_STATUS)
    .limit(50);
  // (b) Webhook drift: subscription looks active/past_due but tier is still free.
  const { data: drift } = await supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status")
    .eq("tier", "free")
    .in("subscription_status", ["active", "trialing", "past_due"])
    .limit(50);

  return {
    total, proCount, proMaxCount, activeToday, signups7, paid, free, mrr, conversion, cost7, cost7Thb,
    failed: (failedPay ?? []) as Flagged[],
    drifted: (drift ?? []) as Flagged[],
    hotUsers,
    ...(await loadPipelineHealth(supabase)),
  };
}

async function loadPipelineHealth(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const since24 = new Date(Date.now() - 864e5).toISOString();
  // Provider health from the last 24h of AI calls (real signal, not a synthetic ping).
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
  const providers = [...provider.entries()].map(([name, s]) => ({ name, calls: s.calls, okPct: s.calls ? Math.round(((s.calls - s.fails) / s.calls) * 100) : null })).sort((a, b) => b.calls - a.calls);
  const errorRate24 = calls24 ? Math.round((fails24 / calls24) * 100) : 0;

  // Stripe webhook log (may not exist yet until the SQL is run — fail soft).
  let lastWebhook: { created_at: string; type: string | null; ok: boolean } | null = null;
  let recentEvents: { created_at: string; type: string | null; ok: boolean }[] = [];
  try {
    const { data } = await supabase.from("webhook_events").select("created_at, type, ok").order("created_at", { ascending: false }).limit(8);
    recentEvents = (data ?? []) as typeof recentEvents;
    lastWebhook = recentEvents[0] ?? null;
  } catch { /* table not created yet */ }

  return { providers, calls24, errorRate24, lastWebhook, recentEvents };
}

export default async function AdminOverviewPage() {
  const { total, proCount, proMaxCount, activeToday, signups7, paid, free, mrr, conversion, cost7, cost7Thb, failed, drifted, hotUsers, providers, calls24, errorRate24, lastWebhook, recentEvents } = await loadOverviewData();

  const card: CSSProperties = { background: "#fff", borderRadius: 8, padding: "12px 14px" };
  const lbl: CSSProperties = { fontSize: 12, color: "#9A8B73" };
  const big: CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 2 };
  const sub: CSSProperties = { fontSize: 11, marginTop: 1 };
  const section: CSSProperties = { background: "#fff", border: "0.5px solid #EDE8E0", borderRadius: 12, padding: 14 };

  const tierBar = (label: string, n: number, color: string) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#6b675f" }}>{label}</span><span>{n}</span>
      </div>
      <div style={{ height: 6, background: "#F2EEE7", borderRadius: 99 }}>
        <div style={{ height: 6, width: `${total > 0 ? Math.round((n / total) * 100) : 0}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );

  const who = (f: Flagged) => f.display_name || f.email || f.id.slice(0, 8);

  return (
    <div style={{ padding: "16px 18px 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={card}><div style={lbl}>Users</div><div style={big}>{total.toLocaleString()}</div><div style={{ ...sub, color: "#1F7A68" }}>+{signups7} in 7d</div></div>
        <div style={card}><div style={lbl}>Paid</div><div style={{ ...big, color: "#1F7A68" }}>{paid}</div><div style={{ ...sub, color: "#9A8B73" }}>{conversion}% conversion</div></div>
        <div style={card}><div style={lbl}>MRR (est.)</div><div style={big}>฿{mrr.toLocaleString()}</div><div style={{ ...sub, color: "#9A8B73" }}>monthly-equiv</div></div>
        <div style={card}><div style={lbl}>AI cost 7d</div><div style={big}>฿{cost7Thb.toLocaleString()}</div><div style={{ ...sub, color: "#9A8B73" }}>≈ ${cost7.toFixed(2)}</div></div>
        <div style={card}><div style={lbl}>Active today</div><div style={big}>{activeToday.toLocaleString()}</div><div style={{ ...sub, color: "#9A8B73" }}>{total > 0 ? Math.round((activeToday / total) * 100) : 0}% of base</div></div>
      </div>

      <div style={{ ...section, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Pipeline health</span>
          <span style={{ fontSize: 11, color: "#9A8B73" }}>last 24h · {calls24.toLocaleString()} AI calls</span>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          {providers.length === 0 ? <span style={{ fontSize: 12.5, color: "#B0A488" }}>No AI calls in the last 24h.</span> : providers.map((p) => {
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
            <b style={{ fontWeight: 600, color: errorRate24 > 10 ? "#A32D2D" : "#2A2A28" }}>{errorRate24}%</b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <span style={{ color: "#6b675f" }}>last Stripe webhook</span>
            {lastWebhook ? (
              <b style={{ fontWeight: 600, color: lastWebhook.ok ? "#2A2A28" : "#A32D2D" }}>{ago(lastWebhook.created_at)}{lastWebhook.ok ? "" : " · failed"}</b>
            ) : <span style={{ color: "#B0A488" }}>none yet</span>}
          </span>
        </div>
        {recentEvents.length > 0 && (
          <div style={{ marginTop: 10, borderTop: "0.5px solid #F2EEE7", paddingTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
            {recentEvents.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "#6b675f" }}><span style={{ color: e.ok ? "#1D9E75" : "#D8533D" }}>{e.ok ? "●" : "○"}</span> {e.type || "—"}</span>
                <span style={{ color: "#B0A488" }}>{ago(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...section, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Needs attention</span>
          <span style={{ fontSize: 11, color: "#9A8B73" }}>{failed.length + drifted.length + hotUsers.length} item{failed.length + drifted.length + hotUsers.length === 1 ? "" : "s"}</span>
        </div>

        {failed.length === 0 && drifted.length === 0 && hotUsers.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#1F7A68", padding: "6px 0" }}>All clear — no payment failures or tier drift.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {failed.map((f) => (
              <div key={`f-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FCEBEB", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#A32D2D" }}>
                  <b>{who(f)}</b> — payment {f.subscription_status} ({f.tier})
                </span>
                <Link href={`/admin/users?q=${encodeURIComponent(f.email ?? "")}`} style={{ fontSize: 12, color: "#A32D2D", fontWeight: 600 }}>Open →</Link>
              </div>
            ))}
            {drifted.map((f) => (
              <div key={`d-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FAEEDA", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#854F0B" }}>
                  <b>{who(f)}</b> — sub {f.subscription_status} but tier is free (webhook drift)
                </span>
                <Link href={`/admin/users?q=${encodeURIComponent(f.email ?? "")}`} style={{ fontSize: 12, color: "#854F0B", fontWeight: 600 }}>Open →</Link>
              </div>
            ))}
            {hotUsers.map((h) => (
              <div key={`h-${h.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FAEEDA", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#854F0B" }}>
                  <b>{h.display_name || h.email || h.id.slice(0, 8)}</b> — high AI cost ฿{h.thb} in 7d
                </span>
                <Link href={`/admin/users/${h.id}`} style={{ fontSize: 12, color: "#854F0B", fontWeight: 600 }}>Open →</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Users by tier</div>
          {tierBar("Free", free, "#B4B2A9")}
          {tierBar("Pro", proCount, "#1D9E75")}
          {tierBar("Pro Max", proMaxCount, "#7F77DD")}
        </div>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Quick links</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
            <Link href="/admin/users" style={{ color: "#2C8E76", fontWeight: 600 }}>Browse + manage users →</Link>
            <Link href="/admin/usage" style={{ color: "#2C8E76", fontWeight: 600 }}>AI cost &amp; usage breakdown →</Link>
            <span style={{ color: "#B0A488" }}>Revenue &amp; Audit tabs — coming in the next pass.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
