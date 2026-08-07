import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, withRange } from "@/lib/admin/time-range";
import AdminPageHeader, { adminCard, adminKpi, adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: string | null;
  subscription_status: string | null;
  room_credits: number | null;
  referral_credit_baht: number | null;
  onboarding_completed_at: string | null;
  last_seen_at: string | null;
};

const TIERS = ["free", "pro", "pro_max"] as const;

function fmtDate(s: string | null): string {
  if (!s) return "·";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "·" : d.toISOString().slice(0, 10);
}

function ago(s: string | null): string {
  if (!s) return "·";
  const ms = Date.now() - new Date(s).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "·";
  const d = Math.floor(ms / 864e5);
  if (d === 0) return "today";
  if (d === 1) return "1d";
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const qRaw = (typeof sp.q === "string" ? sp.q : "").trim();
  const q = qRaw.replace(/[,()%*]/g, "").slice(0, 80);
  const tierFilter = typeof sp.tier === "string" && (TIERS as readonly string[]).includes(sp.tier) ? sp.tier : "";

  const supabase = await createServiceClient();
  let query = supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status, room_credits, referral_credit_baht, onboarding_completed_at, last_seen_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (q) {
    const ors = [
      `email.ilike.%${q}%`,
      `display_name.ilike.%${q}%`,
      `referral_code.ilike.%${q}%`,
      `stripe_customer_id.ilike.%${q}%`,
      `stripe_subscription_id.ilike.%${q}%`,
    ];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) ors.push(`id.eq.${q}`);
    query = query.or(ors.join(","));
  }
  if (tierFilter) query = query.eq("tier", tierFilter);
  const { data, error } = await query;
  const rows = (data ?? []) as ProfileRow[];

  const counts: Record<string, number> = { free: 0, pro: 0, pro_max: 0 };
  let paid = 0;
  let withRoomCredits = 0;
  let withReferralCredit = 0;
  for (const r of rows) {
    const t = r.tier ?? "free";
    counts[t] = (counts[t] ?? 0) + 1;
    if (t === "pro" || t === "pro_max") paid++;
    if ((r.room_credits ?? 0) > 0) withRoomCredits++;
    if ((r.referral_credit_baht ?? 0) > 0) withReferralCredit++;
  }

  const tierPill = (t: string | null) => {
    const v = t ?? "free";
    const bg = v === "pro_max" ? "#EAD9F6" : v === "pro" ? "#D8F0E8" : "#F0EBE3";
    const fg = v === "pro_max" ? "#7A3FA0" : v === "pro" ? "#1F7A68" : "#9A8B73";
    return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{v}</span>;
  };

  const hiddenRange = <input type="hidden" name="range" value={range.preset === "custom" ? "custom" : range.preset} />;
  const hiddenFromTo =
    range.preset === "custom" ? (
      <>
        <input type="hidden" name="from" value={range.from.toISOString()} />
        <input type="hidden" name="to" value={range.to.toISOString()} />
      </>
    ) : null;

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Users" rangeLabel={range.label} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{rows.length}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>loaded</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700, color: "#1F7A68" }}>{paid}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>paid</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{counts.pro} / {counts.pro_max}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>Pro / Max</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{withRoomCredits}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>room credits</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{withReferralCredit}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>฿ credit</div></div>
      </div>

      <form method="get" style={{ ...adminCard, display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {hiddenRange}
        {hiddenFromTo}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search email, name, referral code, Stripe id, or user id"
          style={{ flex: "1 1 220px", fontFamily: "inherit", fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "0.5px solid #EDE8E0", outline: "none" }}
        />
        <select name="tier" defaultValue={tierFilter} style={{ fontFamily: "inherit", fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "0.5px solid #EDE8E0", background: "#fff" }}>
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="pro_max">Pro Max</option>
        </select>
        <button type="submit" style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #C9E5DC", background: "#EAF6F1", color: "#1F7A68", cursor: "pointer" }}>Search</button>
      </form>

      {error ? (
        <p style={{ color: "#A32D2D", fontSize: 13 }}>Couldn&apos;t load users: {error.message}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#9A8B73", fontSize: 13 }}>No users match.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "0.5px solid #EDE8E0", borderRadius: 10, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={adminTh}>User</th>
                <th style={adminTh}>Tier</th>
                <th style={adminTh}>Sub status</th>
                <th style={adminTh}>Rooms</th>
                <th style={adminTh}>฿ credit</th>
                <th style={adminTh}>Joined</th>
                <th style={adminTh}>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={adminTd}>
                    <Link href={withRange(`/admin/users/${r.id}`, range.queryString)} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 700, color: "#2C8E76" }}>{r.display_name || "·"}</div>
                      <div style={{ fontSize: 11, color: "#9A8B73" }}>{r.email || r.id.slice(0, 8)}</div>
                    </Link>
                  </td>
                  <td style={adminTd}>{tierPill(r.tier)}</td>
                  <td style={adminTd}>{r.subscription_status || "·"}</td>
                  <td style={adminTd}>{r.room_credits ?? 0}</td>
                  <td style={adminTd}>{r.referral_credit_baht ? `฿${r.referral_credit_baht}` : "·"}</td>
                  <td style={adminTd}>{fmtDate(r.onboarding_completed_at)}</td>
                  <td style={adminTd}>{ago(r.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
