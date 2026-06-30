import type { CSSProperties } from "react";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THB_PER_USD = 36;
const MONTHLY_THB: Record<string, number> = { pro: 299, pro_max: 699 };
// Stripe statuses that mean "this subscription isn't healthy".
const BAD_STATUS = ["past_due", "unpaid", "incomplete", "incomplete_expired"];

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

  // AI cost, last 7 days (same source as the cost tab).
  let cost7 = 0;
  {
    const { data } = await supabase.from("llm_usage").select("est_cost_usd").gte("created_at", since7).limit(50000);
    for (const r of (data ?? []) as { est_cost_usd: number | string }[]) {
      const v = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
      if (Number.isFinite(v)) cost7 += v;
    }
  }
  const cost7Thb = Math.round(cost7 * THB_PER_USD);

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
  };
}

export default async function AdminOverviewPage() {
  const { total, proCount, proMaxCount, activeToday, signups7, paid, free, mrr, conversion, cost7, cost7Thb, failed, drifted } = await loadOverviewData();

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
          <span style={{ fontSize: 13, fontWeight: 700 }}>Needs attention</span>
          <span style={{ fontSize: 11, color: "#9A8B73" }}>{failed.length + drifted.length} item{failed.length + drifted.length === 1 ? "" : "s"}</span>
        </div>

        {failed.length === 0 && drifted.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#1F7A68", padding: "6px 0" }}>All clear — no payment failures or tier drift.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {failed.map((f) => (
              <div key={`f-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FCEBEB", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#A32D2D" }}>
                  <b>{who(f)}</b> — payment {f.subscription_status} ({f.tier})
                </span>
                <a href={`/admin/users?q=${encodeURIComponent(f.email ?? "")}`} style={{ fontSize: 12, color: "#A32D2D", fontWeight: 600 }}>Open →</a>
              </div>
            ))}
            {drifted.map((f) => (
              <div key={`d-${f.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FAEEDA", borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "#854F0B" }}>
                  <b>{who(f)}</b> — sub {f.subscription_status} but tier is free (webhook drift)
                </span>
                <a href={`/admin/users?q=${encodeURIComponent(f.email ?? "")}`} style={{ fontSize: 12, color: "#854F0B", fontWeight: 600 }}>Open →</a>
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
            <a href="/admin/usage" style={{ color: "#2C8E76", fontWeight: 600 }}>AI cost &amp; usage breakdown →</a>
            <span style={{ color: "#B0A488" }}>Revenue &amp; Audit tabs — coming in the next pass.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
