import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso, withRange } from "@/lib/admin/time-range";
import { costByUserInRange } from "@/lib/admin/metrics";
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
const PAGE_SIZE = 50;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
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
  const { fromIso } = rangeIso(range);

  const qRaw = one(sp.q).trim();
  const q = qRaw.replace(/[,()%*]/g, "").slice(0, 80);
  const tierFilter = one(sp.tier);
  const activity = one(sp.activity); // active | inactive | ""
  const highCost = Number(one(sp.high_cost) || 0);
  const hasRooms = one(sp.has_rooms) === "1";
  const hasReferral = one(sp.has_referral) === "1";
  const sort = one(sp.sort) || "last_seen";
  const dir = one(sp.dir) === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);

  const supabase = await createServiceClient();
  let query = supabase
    .from("profiles")
    .select("id, email, display_name, tier, subscription_status, room_credits, referral_credit_baht, onboarding_completed_at, last_seen_at")
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
  if ((TIERS as readonly string[]).includes(tierFilter)) query = query.eq("tier", tierFilter);
  if (activity === "active") {
    const { toIso } = rangeIso(range);
    query = query.gte("last_seen_at", fromIso).lte("last_seen_at", toIso);
  }
  if (activity === "inactive") query = query.or(`last_seen_at.is.null,last_seen_at.lt.${fromIso}`);
  if (hasRooms) query = query.gt("room_credits", 0);
  if (hasReferral) query = query.gt("referral_credit_baht", 0);

  const { data, error } = await query;
  let rows = (data ?? []) as ProfileRow[];
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

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const pageRows = rows.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  let paid = 0, withRoomCredits = 0, withReferralCredit = 0;
  const counts: Record<string, number> = { free: 0, pro: 0, pro_max: 0 };
  for (const r of rows) {
    const t = r.tier ?? "free";
    counts[t] = (counts[t] ?? 0) + 1;
    if (t === "pro" || t === "pro_max") paid++;
    if ((r.room_credits ?? 0) > 0) withRoomCredits++;
    if ((r.referral_credit_baht ?? 0) > 0) withReferralCredit++;
  }

  const filterQs = new URLSearchParams();
  filterQs.set("range", range.preset);
  if (range.preset === "custom") {
    filterQs.set("from", range.from.toISOString());
    filterQs.set("to", range.to.toISOString());
  }
  if (q) filterQs.set("q", q);
  if (tierFilter) filterQs.set("tier", tierFilter);
  if (activity) filterQs.set("activity", activity);
  if (highCost > 0) filterQs.set("high_cost", String(highCost));
  if (hasRooms) filterQs.set("has_rooms", "1");
  if (hasReferral) filterQs.set("has_referral", "1");
  filterQs.set("sort", sort);
  filterQs.set("dir", dir);

  const sortHref = (col: string) => {
    const p = new URLSearchParams(filterQs);
    const nextDir = sort === col && dir === "desc" ? "asc" : "desc";
    p.set("sort", col);
    p.set("dir", nextDir);
    p.set("page", "1");
    return `/admin/users?${p.toString()}`;
  };

  const pageHref = (n: number) => {
    const p = new URLSearchParams(filterQs);
    p.set("page", String(n));
    return `/admin/users?${p.toString()}`;
  };

  const exportHref = `/api/admin/users/export?${filterQs.toString()}`;

  const tierPill = (t: string | null) => {
    const v = t ?? "free";
    const bg = v === "pro_max" ? "#EAD9F6" : v === "pro" ? "#D8F0E8" : "#F0EBE3";
    const fg = v === "pro_max" ? "#7A3FA0" : v === "pro" ? "#1F7A68" : "#9A8B73";
    return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{v}</span>;
  };

  const input: React.CSSProperties = { fontFamily: "inherit", fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "0.5px solid #EDE8E0", background: "#fff" };
  const sortMark = (col: string) => (sort === col ? (dir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div style={adminPagePad}>
      <AdminPageHeader
        title="Users"
        rangeLabel={range.label}
        actions={
          <a href={exportHref} style={{ fontSize: 12.5, fontWeight: 600, color: "#1F7A68", border: "0.5px solid #C9E5DC", background: "#EAF6F1", padding: "6px 12px", borderRadius: 6, textDecoration: "none" }}>
            Download CSV
          </a>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 12 }}>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{total}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>matched</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700, color: "#1F7A68" }}>{paid}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>paid</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{counts.pro} / {counts.pro_max}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>Pro / Max</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{withRoomCredits}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>room credits</div></div>
        <div style={adminKpi}><div style={{ fontSize: 18, fontWeight: 700 }}>{withReferralCredit}</div><div style={{ fontSize: 11, color: "#9A8B73" }}>฿ credit</div></div>
      </div>

      <form method="get" style={{ ...adminCard, display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from.toISOString()} />
            <input type="hidden" name="to" value={range.to.toISOString()} />
          </>
        )}
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div style={{ flex: "1 1 200px" }}>
          <div style={{ fontSize: 11, color: "#9A8B73", marginBottom: 3 }}>Search</div>
          <input type="text" name="q" defaultValue={q} placeholder="email, name, referral, Stripe, id" style={{ ...input, width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#9A8B73", marginBottom: 3 }}>Tier</div>
          <select name="tier" defaultValue={tierFilter} style={input}>
            <option value="">All</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="pro_max">Pro Max</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#9A8B73", marginBottom: 3 }}>Activity</div>
          <select name="activity" defaultValue={activity} style={input}>
            <option value="">Any</option>
            <option value="active">Active in range</option>
            <option value="inactive">Inactive in range</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#9A8B73", marginBottom: 3 }}>Min cost ฿</div>
          <input type="number" name="high_cost" defaultValue={highCost > 0 ? highCost : ""} placeholder="e.g. 200" style={{ ...input, width: 90 }} />
        </div>
        <label style={{ fontSize: 12, color: "#6b675f", display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
          <input type="checkbox" name="has_rooms" value="1" defaultChecked={hasRooms} /> rooms &gt; 0
        </label>
        <label style={{ fontSize: 12, color: "#6b675f", display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
          <input type="checkbox" name="has_referral" value="1" defaultChecked={hasReferral} /> ฿ credit &gt; 0
        </label>
        <button type="submit" style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #C9E5DC", background: "#EAF6F1", color: "#1F7A68", cursor: "pointer" }}>Apply</button>
      </form>

      {error ? (
        <p style={{ color: "#A32D2D", fontSize: 13 }}>Couldn&apos;t load users: {error.message}</p>
      ) : pageRows.length === 0 ? (
        <p style={{ color: "#9A8B73", fontSize: 13 }}>No users match.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto", border: "0.5px solid #EDE8E0", borderRadius: 10, background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={adminTh}>User</th>
                  <th style={adminTh}><a href={sortHref("tier")} style={{ color: "inherit", textDecoration: "none" }}>Tier{sortMark("tier")}</a></th>
                  <th style={adminTh}>Sub</th>
                  <th style={adminTh}><a href={sortHref("room_credits")} style={{ color: "inherit", textDecoration: "none" }}>Rooms{sortMark("room_credits")}</a></th>
                  <th style={adminTh}>฿ credit</th>
                  <th style={adminTh}><a href={sortHref("cost")} style={{ color: "inherit", textDecoration: "none" }}>Cost in range{sortMark("cost")}</a></th>
                  <th style={adminTh}><a href={sortHref("last_seen")} style={{ color: "inherit", textDecoration: "none" }}>Last seen{sortMark("last_seen")}</a></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const cost = Math.round(costs.get(r.id) ?? 0);
                  return (
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
                      <td style={{ ...adminTd, fontVariantNumeric: "tabular-nums", color: cost >= 200 ? "#854F0B" : undefined }}>฿{cost}</td>
                      <td style={adminTd}>{ago(r.last_seen_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12, color: "#9A8B73" }}>
            <span>Page {pageSafe} of {pages} · {total} users</span>
            <div style={{ display: "flex", gap: 8 }}>
              {pageSafe > 1 ? <a href={pageHref(pageSafe - 1)} style={{ color: "#1F7A68", fontWeight: 600, textDecoration: "none" }}>Prev</a> : null}
              {pageSafe < pages ? <a href={pageHref(pageSafe + 1)} style={{ color: "#1F7A68", fontWeight: 600, textDecoration: "none" }}>Next</a> : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
