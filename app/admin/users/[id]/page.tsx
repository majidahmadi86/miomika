import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import UserActions from "@/components/admin/UserActions";
import { THB_PER_USD, COST_ALERT_THB_7D } from "@/lib/admin/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BAD_STATUS = ["past_due", "unpaid", "incomplete", "incomplete_expired"];

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function UserCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: u } = await supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status, stripe_customer_id, stripe_subscription_id, room_credits, referral_credit_baht, referral_code, onboarding_completed_at, last_seen_at")
    .eq("id", id)
    .maybeSingle();

  if (!u) {
    return <div style={{ padding: "40px 18px", color: "#9A8B73" }}>User not found. <Link href="/admin/users" style={{ color: "#2C8E76" }}>← back to users</Link></div>;
  }

  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 864e5).toISOString();
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [usageRes, roomsRes, refAsReferrer, refAsReferred, roomLedger, baktLedger] = await Promise.all([
    supabase.from("llm_usage").select("est_cost_usd, ok").eq("user_id", id).gte("created_at", since7).limit(20000),
    supabase.from("speaking_sessions").select("id", { count: "exact", head: true }).eq("user_id", id).gte("created_at", monthStart.toISOString()),
    supabase.from("referral_conversions").select("id", { count: "exact", head: true }).eq("referrer_id", id),
    supabase.from("referral_conversions").select("rewarded").eq("referred_id", id).maybeSingle(),
    supabase.from("room_credit_ledger").select("delta, reason, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(6),
    supabase.from("credit_ledger").select("delta, reason, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(6),
  ]);

  const usage = (usageRes.data ?? []) as { est_cost_usd: number | string; ok: boolean }[];
  let cost = 0, fails = 0;
  for (const r of usage) {
    const v = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
    if (Number.isFinite(v)) cost += v;
    if (r.ok === false) fails++;
  }
  const costThb = Math.round(cost * THB_PER_USD);
  const roomsThisMonth = roomsRes.count ?? 0;
  const invitedCount = refAsReferrer.count ?? 0;
  const paid = (u.tier ?? "free") !== "free" || ["active", "trialing", "past_due"].includes(u.subscription_status ?? "");
  const pendingReferral = refAsReferred.data ? refAsReferred.data.rewarded === false && paid : false;

  // Health flags
  type Flag = { sev: "danger" | "warning"; text: string };
  const flags: Flag[] = [];
  if (BAD_STATUS.includes(u.subscription_status ?? "")) flags.push({ sev: "danger", text: `Payment ${u.subscription_status} — last charge failed. Check Stripe; manual set-tier if needed.` });
  if ((u.tier ?? "free") === "free" && ["active", "trialing", "past_due"].includes(u.subscription_status ?? "")) flags.push({ sev: "danger", text: "Subscription looks active but tier is free — webhook drift. Set the correct tier below." });
  if (pendingReferral) flags.push({ sev: "warning", text: "Referral unrewarded — this user paid but the ฿30 reward never fired. Use \u201cReward\u201d below." });
  if (costThb > COST_ALERT_THB_7D) flags.push({ sev: "warning", text: `High AI cost: \u0e3f${costThb} in 7 days. Worth a look for abuse or a loop.` });

  const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #EDE8E0", borderRadius: 12, padding: 14 };
  const kv = (k: string, v: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12.5 }}>
      <span style={{ color: "#6b675f" }}>{k}</span><span style={{ color: "#2A2A28", textAlign: "right" }}>{v}</span>
    </div>
  );
  const stripeBase = "https://dashboard.stripe.com";

  return (
    <div style={{ padding: "16px 18px 60px" }}>
      <Link href="/admin/users" style={{ fontSize: 12.5, color: "#9A8B73", textDecoration: "none" }}>← all users</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 16px" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E7F3EF", color: "#1F7A68", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>
          {(u.display_name || u.email || "?").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{u.display_name || "—"}</div>
          <div style={{ fontSize: 12, color: "#9A8B73" }}>{u.email || u.id}</div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Account health</div>
        {flags.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#1F7A68" }}>All clear — no problems detected on this account.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {flags.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, background: f.sev === "danger" ? "#FCEBEB" : "#FAEEDA", color: f.sev === "danger" ? "#A32D2D" : "#854F0B" }}>
                {f.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Account</div>
          {kv("Tier", u.tier ?? "free")}
          {kv("Sub status", <span style={{ color: BAD_STATUS.includes(u.subscription_status ?? "") ? "#A32D2D" : "#2A2A28" }}>{u.subscription_status || "—"}</span>)}
          {kv("Room credits", u.room_credits ?? 0)}
          {kv("฿ credit", `฿${u.referral_credit_baht ?? 0}`)}
          {kv("Referral code", u.referral_code || "—")}
          {kv("Invited", invitedCount)}
          {kv("Joined", fmt(u.onboarding_completed_at))}
          {kv("Last seen", fmt(u.last_seen_at))}
          {u.stripe_customer_id ? kv("Stripe", <a href={`${stripeBase}/customers/${u.stripe_customer_id}`} target="_blank" rel="noreferrer" style={{ color: "#2C8E76" }}>open customer →</a>) : null}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Last 7 days</div>
          {kv("AI cost", <span style={{ color: costThb > COST_ALERT_THB_7D ? "#854F0B" : "#2A2A28" }}>฿{costThb} (${cost.toFixed(2)})</span>)}
          {kv("AI calls", usage.length)}
          {kv("Failed calls", fails)}
          {kv("Rooms this month", roomsThisMonth)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Room credit ledger</div>
          {(roomLedger.data ?? []).length === 0 ? <div style={{ fontSize: 12, color: "#B0A488" }}>No entries.</div> :
            (roomLedger.data as { delta: number; reason: string; created_at: string }[]).map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "#6b675f" }}>{l.reason}</span>
                <span style={{ color: l.delta >= 0 ? "#1F7A68" : "#A32D2D" }}>{l.delta >= 0 ? "+" : ""}{l.delta}</span>
                <span style={{ color: "#B0A488" }}>{fmt(l.created_at)}</span>
              </div>
            ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>฿ credit ledger</div>
          {(baktLedger.data ?? []).length === 0 ? <div style={{ fontSize: 12, color: "#B0A488" }}>No entries.</div> :
            (baktLedger.data as { delta: number; reason: string; created_at: string }[]).map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "#6b675f" }}>{l.reason}</span>
                <span style={{ color: l.delta >= 0 ? "#1F7A68" : "#A32D2D" }}>{l.delta >= 0 ? "+" : ""}฿{l.delta}</span>
                <span style={{ color: "#B0A488" }}>{fmt(l.created_at)}</span>
              </div>
            ))}
        </div>
      </div>

      <UserActions userId={u.id} hasPendingReferral={pendingReferral} />

      <div style={{ marginTop: 10, textAlign: "right" }}>
        <a href={`/admin/audit?target=${u.id}`} style={{ fontSize: 12, color: "#9A8B73", textDecoration: "none" }}>view this user&apos;s audit history →</a>
      </div>
    </div>
  );
}
