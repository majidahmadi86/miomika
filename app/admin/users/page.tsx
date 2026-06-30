import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";

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
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

function ago(s: string | null): string {
  if (!s) return "—";
  const ms = Date.now() - new Date(s).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
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
  const profile = await getServerProfile();
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? "";
  const isAdmin = (email !== "" && allow.includes(email)) || process.env.NODE_ENV === "development";
  if (!profile || !isAdmin) notFound();

  const sp = await searchParams;
  const qRaw = (typeof sp.q === "string" ? sp.q : "").trim();
  // Strip characters that have meaning in a PostgREST .or() filter so a stray
  // comma/paren/% can't break the query.
  const q = qRaw.replace(/[,()%*]/g, "").slice(0, 80);
  const tierFilter = typeof sp.tier === "string" && (TIERS as readonly string[]).includes(sp.tier) ? sp.tier : "";

  const supabase = await createServiceClient();
  let query = supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status, room_credits, referral_credit_baht, onboarding_completed_at, last_seen_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (q) {
    // Universal search: email / name / referral code / Stripe customer + subscription id,
    // plus an exact match if the query looks like a user id (uuid).
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

  // Headline counts (over the loaded set).
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

  const wrap: React.CSSProperties = { fontFamily: "'Quicksand', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "24px 18px 60px", color: "#2A2A28" };
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #EDE8E0", borderRadius: 12, padding: "12px 14px", textAlign: "center" };
  const th: React.CSSProperties = { textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "#9A8B73", padding: "8px 10px", borderBottom: "1px solid #EDE8E0", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { fontSize: 12.5, padding: "9px 10px", borderBottom: "1px solid #F2EEE7", whiteSpace: "nowrap" };

  const tierPill = (t: string | null) => {
    const v = t ?? "free";
    const bg = v === "pro_max" ? "#EAD9F6" : v === "pro" ? "#D8F0E8" : "#F0EBE3";
    const fg = v === "pro_max" ? "#7A3FA0" : v === "pro" ? "#1F7A68" : "#9A8B73";
    return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 99 }}>{v}</span>;
  };

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Users</h1>
        <a href="/admin/usage" style={{ fontSize: 12.5, fontWeight: 700, color: "#2C8E76" }}>Usage &amp; cost →</a>
      </div>
      <p style={{ fontSize: 12.5, color: "#9A8B73", margin: "0 0 16px" }}>
        Showing {rows.length} (most recently seen first, capped at 500).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
        <div style={card}><div style={{ fontSize: 22, fontWeight: 800 }}>{rows.length}</div><div style={{ fontSize: 11, color: "#9A8B73", fontWeight: 700 }}>loaded</div></div>
        <div style={card}><div style={{ fontSize: 22, fontWeight: 800, color: "#1F7A68" }}>{paid}</div><div style={{ fontSize: 11, color: "#9A8B73", fontWeight: 700 }}>paid (Pro + Max)</div></div>
        <div style={card}><div style={{ fontSize: 22, fontWeight: 800 }}>{counts.pro} / {counts.pro_max}</div><div style={{ fontSize: 11, color: "#9A8B73", fontWeight: 700 }}>Pro / Pro Max</div></div>
        <div style={card}><div style={{ fontSize: 22, fontWeight: 800 }}>{withRoomCredits}</div><div style={{ fontSize: 11, color: "#9A8B73", fontWeight: 700 }}>have room credits</div></div>
        <div style={card}><div style={{ fontSize: 22, fontWeight: 800 }}>{withReferralCredit}</div><div style={{ fontSize: 11, color: "#9A8B73", fontWeight: 700 }}>have ฿ credit</div></div>
      </div>

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search email, name, referral code, Stripe id, or user id"
          style={{ flex: "1 1 220px", fontFamily: "inherit", fontSize: 13, padding: "9px 12px", borderRadius: 10, border: "1px solid #EDE8E0", outline: "none" }}
        />
        <select name="tier" defaultValue={tierFilter} style={{ fontFamily: "inherit", fontSize: 13, padding: "9px 12px", borderRadius: 10, border: "1px solid #EDE8E0", background: "#fff" }}>
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="pro_max">Pro Max</option>
        </select>
        <button type="submit" style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6ECDB8,#34A98F)", color: "#fff", cursor: "pointer" }}>Search</button>
      </form>

      {error ? (
        <p style={{ color: "#C0392B", fontSize: 13 }}>Couldn&apos;t load users: {error.message}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#9A8B73", fontSize: 13 }}>No users match.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #EDE8E0", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={th}>User</th>
                <th style={th}>Tier</th>
                <th style={th}>Sub status</th>
                <th style={th}>Rooms</th>
                <th style={th}>฿ credit</th>
                <th style={th}>Joined</th>
                <th style={th}>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>
                    <Link href={`/admin/users/${r.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 700, color: "#2C8E76" }}>{r.display_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#9A8B73" }}>{r.email || r.id.slice(0, 8)}</div>
                    </Link>
                  </td>
                  <td style={td}>{tierPill(r.tier)}</td>
                  <td style={td}>{r.subscription_status || "—"}</td>
                  <td style={td}>{r.room_credits ?? 0}</td>
                  <td style={td}>{r.referral_credit_baht ? `฿${r.referral_credit_baht}` : "—"}</td>
                  <td style={td}>{fmtDate(r.onboarding_completed_at)}</td>
                  <td style={td}>{ago(r.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
