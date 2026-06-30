import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { ROOM_PACKS } from "@/lib/billing/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHLY_THB: Record<string, number> = { pro: 299, pro_max: 699 };
const PACK_PRICE = new Map(ROOM_PACKS.map((p) => [p.count, p.priceTHB]));

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminRevenuePage() {
  const supabase = await createServiceClient();

  const headCount = async (filter: (q: ReturnType<Awaited<ReturnType<typeof createServiceClient>>["from"]>) => unknown): Promise<number> => {
    const res = await (filter(supabase.from("profiles")) as unknown as Promise<{ count: number | null }>);
    return res.count ?? 0;
  };

  const [proCount, proMaxCount, payingRes, subStatusRes, packRes, earnedRes, outstandingRes] = await Promise.all([
    headCount((t) => t.select("id", { count: "exact", head: true }).eq("tier", "pro")),
    headCount((t) => t.select("id", { count: "exact", head: true }).eq("tier", "pro_max")),
    supabase.from("profiles").select("id, email, display_name, tier, subscription_status, onboarding_completed_at").in("tier", ["pro", "pro_max"]).order("onboarding_completed_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("subscription_status").not("subscription_status", "is", null).limit(50000),
    supabase.from("room_credit_ledger").select("delta, reason").eq("reason", "purchase").limit(50000),
    supabase.from("credit_ledger").select("delta, reason").limit(50000),
    supabase.from("profiles").select("referral_credit_baht").gt("referral_credit_baht", 0).limit(50000),
  ]);

  const paid = proCount + proMaxCount;
  const mrr = proCount * MONTHLY_THB.pro + proMaxCount * MONTHLY_THB.pro_max;

  const statusCounts = new Map<string, number>();
  for (const r of (subStatusRes.data ?? []) as { subscription_status: string | null }[]) {
    const s = r.subscription_status ?? "";
    if (s) statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const statuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]);

  let packRevenue = 0;
  for (const r of (packRes.data ?? []) as { delta: number }[]) {
    packRevenue += PACK_PRICE.get(r.delta) ?? 0;
  }

  let referralGranted = 0, referralSpent = 0;
  for (const r of (earnedRes.data ?? []) as { delta: number; reason: string }[]) {
    if (r.reason === "referral_earned") referralGranted += r.delta;
    else if (r.reason === "spent") referralSpent += Math.abs(r.delta);
  }
  let referralOutstanding = 0;
  for (const r of (outstandingRes.data ?? []) as { referral_credit_baht: number }[]) {
    referralOutstanding += r.referral_credit_baht ?? 0;
  }

  const paying = (payingRes.data ?? []) as { id: string; email: string | null; display_name: string | null; tier: string | null; subscription_status: string | null; onboarding_completed_at: string | null }[];

  const card: React.CSSProperties = { background: "#fff", borderRadius: 8, padding: "12px 14px" };
  const lbl: React.CSSProperties = { fontSize: 12, color: "#9A8B73" };
  const big: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 2 };
  const subStyle: React.CSSProperties = { fontSize: 11, marginTop: 1, color: "#9A8B73" };
  const section: React.CSSProperties = { background: "#fff", border: "0.5px solid #EDE8E0", borderRadius: 12, padding: 14 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#9A8B73", fontWeight: 600, borderBottom: "0.5px solid #EDE8E0", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 12.5, borderBottom: "0.5px solid #F2EEE7" };

  const tierPill = (t: string | null) => {
    const m: Record<string, { bg: string; fg: string }> = { pro: { bg: "#E3F4EE", fg: "#1D7A63" }, pro_max: { bg: "#CECBF6", fg: "#3C3489" } };
    const c = m[t ?? ""] ?? { bg: "#F2EEE7", fg: "#6b675f" };
    return <span style={{ background: c.bg, color: c.fg, fontSize: 11, padding: "1px 8px", borderRadius: 99 }}>{t ?? "—"}</span>;
  };

  const danger = (s: string | null | undefined) => ["past_due", "unpaid", "incomplete"].includes(s ?? "");

  return (
    <div style={{ padding: "16px 18px 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={card}><div style={lbl}>MRR (est.)</div><div style={big}>฿{mrr.toLocaleString()}</div><div style={subStyle}>paid tiers × monthly</div></div>
        <div style={card}><div style={lbl}>Paying users</div><div style={{ ...big, color: "#1F7A68" }}>{paid}</div><div style={subStyle}>{proCount} pro · {proMaxCount} pro max</div></div>
        <div style={card}><div style={lbl}>Pack revenue</div><div style={big}>฿{packRevenue.toLocaleString()}</div><div style={subStyle}>one-time, to date</div></div>
        <div style={card}><div style={lbl}>Referral credit out</div><div style={big}>฿{referralOutstanding.toLocaleString()}</div><div style={subStyle}>unspent liability</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Subscription status</div>
          {statuses.length === 0 ? <div style={{ fontSize: 12.5, color: "#B0A488" }}>No subscriptions yet.</div> :
            statuses.map(([s, n]) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}>
                <span style={{ color: danger(s) ? "#A32D2D" : "#6b675f" }}>{s}</span>
                <span style={{ fontWeight: 600 }}>{n}</span>
              </div>
            ))}
        </div>
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Referral program</div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}><span style={{ color: "#6b675f" }}>Granted (all-time)</span><span style={{ color: "#1F7A68", fontWeight: 600 }}>฿{referralGranted.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}><span style={{ color: "#6b675f" }}>Spent on checkouts</span><span style={{ fontWeight: 600 }}>฿{referralSpent.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}><span style={{ color: "#6b675f" }}>Outstanding</span><span style={{ fontWeight: 600 }}>฿{referralOutstanding.toLocaleString()}</span></div>
          <div style={{ fontSize: 11, color: "#B0A488", marginTop: 6 }}>Granted = ฿30 x 2 per converted referral. Spent reduces real charge revenue.</div>
        </div>
      </div>

      <div style={section}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Paying users ({paid})</div>
        {paying.length === 0 ? <div style={{ fontSize: 12.5, color: "#B0A488" }}>No paying users yet.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>User</th><th style={th}>Tier</th><th style={th}>Status</th><th style={th}>Joined</th></tr></thead>
              <tbody>
                {paying.map((u) => (
                  <tr key={u.id}>
                    <td style={td}><Link href={`/admin/users/${u.id}`} style={{ textDecoration: "none" }}><span style={{ fontWeight: 600, color: "#2C8E76" }}>{u.display_name || "—"}</span><span style={{ color: "#9A8B73", fontSize: 11 }}> · {u.email || u.id.slice(0, 8)}</span></Link></td>
                    <td style={td}>{tierPill(u.tier)}</td>
                    <td style={{ ...td, color: danger(u.subscription_status) ? "#A32D2D" : "#2A2A28" }}>{u.subscription_status || "—"}</td>
                    <td style={td}>{fmtDate(u.onboarding_completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#B0A488", marginTop: 10 }}>MRR assumes monthly billing (annual plans bill 10 months/yr, so MRR slightly overstates them). Pack &amp; referral totals are all-time.</div>
    </div>
  );
}
