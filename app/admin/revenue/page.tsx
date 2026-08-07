import Link from "next/link";
import { Coins, Users, Package, Wallet } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { ROOM_PACKS } from "@/lib/billing/tiers";
import { parseRange, withRange } from "@/lib/admin/time-range";
import AdminPageHeader, { adminCard, adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";
import { KpiCard, TierBadge, Avatar, adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHLY_THB: Record<string, number> = { pro: 299, pro_max: 699 };
const PACK_PRICE = new Map(ROOM_PACKS.map((p) => [p.count, p.priceTHB]));

function fmtDate(d: string | null | undefined) {
  if (!d) return "·";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
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

  const danger = (s: string | null | undefined) => ["past_due", "unpaid", "incomplete"].includes(s ?? "");

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Revenue" rangeLabel={range.label} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
        <KpiCard color={adminPalette.gold} icon={Coins} label="MRR (est.)" value={`฿${mrr.toLocaleString()}`} sub="paid tiers × monthly" />
        <KpiCard color={adminPalette.violet} icon={Users} label="Paying users" value={String(paid)} sub={`${proCount} pro · ${proMaxCount} pro max`} />
        <KpiCard color={adminPalette.gold} icon={Package} label="Pack revenue" value={`฿${packRevenue.toLocaleString()}`} sub="one-time, to date" />
        <KpiCard color={adminPalette.amber} icon={Wallet} label="Referral credit out" value={`฿${referralOutstanding.toLocaleString()}`} sub="unspent liability" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={adminCard}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Subscription status</div>
          {statuses.length === 0 ? <div style={{ fontSize: 12.5, color: adminPalette.subtle }}>No subscriptions yet.</div> :
            statuses.map(([s, n]) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}>
                <span style={{ color: danger(s) ? adminPalette.rose : adminPalette.muted }}>{s}</span>
                <span style={{ fontWeight: 700, fontFamily: FONT_DISPLAY }}>{n}</span>
              </div>
            ))}
        </div>
        <div style={adminCard}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Referral program</div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}><span style={{ color: adminPalette.muted }}>Granted (all-time)</span><span style={{ color: adminPalette.gold, fontWeight: 700, fontFamily: FONT_DISPLAY }}>฿{referralGranted.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}><span style={{ color: adminPalette.muted }}>Spent on checkouts</span><span style={{ color: adminPalette.teal, fontWeight: 700, fontFamily: FONT_DISPLAY }}>฿{referralSpent.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}><span style={{ color: adminPalette.muted }}>Outstanding</span><span style={{ color: adminPalette.amber, fontWeight: 700, fontFamily: FONT_DISPLAY }}>฿{referralOutstanding.toLocaleString()}</span></div>
          <div style={{ fontSize: 11, color: adminPalette.subtle, marginTop: 6 }}>Granted = ฿30 x 2 per converted referral. Spent reduces real charge revenue.</div>
        </div>
      </div>

      <div style={adminCard}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Paying users ({paid})</div>
        {paying.length === 0 ? <div style={{ fontSize: 12.5, color: adminPalette.subtle }}>No paying users yet.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={adminTh}>User</th><th style={adminTh}>Tier</th><th style={adminTh}>Status</th><th style={adminTh}>Joined</th></tr></thead>
              <tbody>
                {paying.map((u, idx) => (
                  <tr key={u.id} style={{ background: idx % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined }}>
                    <td style={adminTd}>
                      <Link href={withRange(`/admin/users/${u.id}`, range.queryString)} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={u.display_name} email={u.email} />
                        <div>
                          <span style={{ fontWeight: 700, color: adminPalette.teal, fontFamily: FONT_DISPLAY }}>{u.display_name || "·"}</span>
                          <div style={{ color: adminPalette.muted, fontSize: 11 }}>{u.email || u.id.slice(0, 8)}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={adminTd}><TierBadge tier={u.tier} /></td>
                    <td style={{ ...adminTd, color: danger(u.subscription_status) ? adminPalette.rose : adminPalette.ink }}>{u.subscription_status || "·"}</td>
                    <td style={adminTd}>{fmtDate(u.onboarding_completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: adminPalette.subtle, marginTop: 10 }}>MRR assumes monthly billing. Pack &amp; referral totals are all-time (range filter lands in a later pass).</div>
    </div>
  );
}
