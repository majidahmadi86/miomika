import { getAdminProfile } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso } from "@/lib/admin/time-range";
import { costByUserInRange } from "@/lib/admin/metrics";

export const runtime = "nodejs";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: string | null;
  subscription_status: string | null;
  room_credits: number | null;
  referral_credit_baht: number | null;
  last_seen_at: string | null;
};

export async function GET(req: Request) {
  const admin = await getAdminProfile();
  if (!admin) return new Response("forbidden", { status: 403 });

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    sp[k] = v;
  });
  const range = parseRange(sp);
  const { fromIso, toIso } = rangeIso(range);

  const q = (sp.q ?? "").replace(/[,()%*]/g, "").slice(0, 80);
  const tier = sp.tier ?? "";
  const activity = sp.activity ?? "";
  const highCost = Number(sp.high_cost || 0);
  const hasRooms = sp.has_rooms === "1";
  const hasReferral = sp.has_referral === "1";
  const sort = sp.sort ?? "last_seen";
  const dir = sp.dir === "asc" ? "asc" : "desc";

  const supabase = await createServiceClient();
  let query = supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status, room_credits, referral_credit_baht, last_seen_at")
    .limit(5000);

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
  if (tier === "free" || tier === "pro" || tier === "pro_max") query = query.eq("tier", tier);
  if (activity === "active") query = query.gte("last_seen_at", fromIso).lte("last_seen_at", toIso);
  if (activity === "inactive") query = query.or(`last_seen_at.is.null,last_seen_at.lt.${fromIso}`);
  if (hasRooms) query = query.gt("room_credits", 0);
  if (hasReferral) query = query.gt("referral_credit_baht", 0);

  const { data } = await query;
  let rows = (data ?? []) as Row[];
  const costs = await costByUserInRange(range);

  if (Number.isFinite(highCost) && highCost > 0) {
    rows = rows.filter((r) => (costs.get(r.id) ?? 0) >= highCost);
  }

  const tierOrder: Record<string, number> = { free: 0, pro: 1, pro_max: 2 };
  rows.sort((a, b) => {
    let cmp = 0;
    if (sort === "cost") cmp = (costs.get(a.id) ?? 0) - (costs.get(b.id) ?? 0);
    else if (sort === "room_credits") cmp = (a.room_credits ?? 0) - (b.room_credits ?? 0);
    else if (sort === "tier") cmp = (tierOrder[a.tier ?? "free"] ?? 0) - (tierOrder[b.tier ?? "free"] ?? 0);
    else {
      const at = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bt = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      cmp = at - bt;
    }
    return dir === "asc" ? cmp : -cmp;
  });

  const header = [
    "id",
    "email",
    "display_name",
    "tier",
    "subscription_status",
    "room_credits",
    "referral_credit_baht",
    "last_seen_at",
    "cost_thb_in_range",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.email,
        r.display_name,
        r.tier,
        r.subscription_status,
        r.room_credits,
        r.referral_credit_baht,
        r.last_seen_at,
        Math.round(costs.get(r.id) ?? 0),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miomika-users-${stamp}.csv"`,
    },
  });
}
