import Link from "next/link";
import { Users, Coins, Sparkles, DoorOpen, Wallet } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso, withRange } from "@/lib/admin/time-range";
import { costByUserInRange } from "@/lib/admin/metrics";
import AdminPageHeader, { adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";
import {
  KpiCard,
  TierBadge,
  Avatar,
  ActivityDot,
  activityTone,
  CostBar,
  InternalChip,
  filterPanel,
  applyBtn,
  inputStyle,
  adminPalette,
  FONT_DISPLAY,
  tint,
} from "@/components/admin/ui";
import { isInternalEmail, internalEmailSet } from "@/lib/admin/internal";

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
  const internal = internalEmailSet();
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
  const maxCost = Math.max(1, ...pageRows.map((r) => Math.round(costs.get(r.id) ?? 0)));
  const sortMark = (col: string) => (sort === col ? (dir === "asc" ? " ↑" : " ↓") : "");
  const nowMs = range.to.getTime();

  return (
    <div style={adminPagePad}>
      <AdminPageHeader
        title="Users"
        rangeLabel={range.label}
        actions={
          <a href={exportHref} style={{ fontSize: 12.5, fontWeight: 700, fontFamily: FONT_DISPLAY, color: "#fff", background: adminPalette.teal, padding: "6px 12px", borderRadius: 8, textDecoration: "none" }}>
            Download CSV
          </a>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 12 }}>
        <KpiCard color={adminPalette.sky} icon={Users} label="Matched" value={String(total)} />
        <KpiCard color={adminPalette.gold} icon={Coins} label="Paid" value={String(paid)} />
        <KpiCard color={adminPalette.violet} icon={Sparkles} label="Pro / Max" value={`${counts.pro} / ${counts.pro_max}`} />
        <KpiCard color={adminPalette.teal} icon={DoorOpen} label="Room credits" value={String(withRoomCredits)} />
        <KpiCard color={adminPalette.gold} icon={Wallet} label="฿ credit" value={String(withReferralCredit)} />
      </div>

      <form method="get" style={{ ...filterPanel, display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
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
          <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 3, fontFamily: FONT_DISPLAY }}>Search</div>
          <input type="text" name="q" defaultValue={q} placeholder="email, name, referral, Stripe, id" style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 3, fontFamily: FONT_DISPLAY }}>Tier</div>
          <select name="tier" defaultValue={tierFilter} style={inputStyle}>
            <option value="">All</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="pro_max">Pro Max</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 3, fontFamily: FONT_DISPLAY }}>Activity</div>
          <select name="activity" defaultValue={activity} style={inputStyle}>
            <option value="">Any</option>
            <option value="active">Active in range</option>
            <option value="inactive">Inactive in range</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 3, fontFamily: FONT_DISPLAY }}>Min cost ฿</div>
          <input type="number" name="high_cost" defaultValue={highCost > 0 ? highCost : ""} placeholder="e.g. 200" style={{ ...inputStyle, width: 90 }} />
        </div>
        <label style={{ fontSize: 12, color: adminPalette.muted, display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
          <input type="checkbox" name="has_rooms" value="1" defaultChecked={hasRooms} /> rooms &gt; 0
        </label>
        <label style={{ fontSize: 12, color: adminPalette.muted, display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
          <input type="checkbox" name="has_referral" value="1" defaultChecked={hasReferral} /> ฿ credit &gt; 0
        </label>
        <button type="submit" style={applyBtn}>Apply</button>
      </form>

      {error ? (
        <p style={{ color: adminPalette.rose, fontSize: 13 }}>Couldn&apos;t load users: {error.message}</p>
      ) : pageRows.length === 0 ? (
        <p style={{ color: adminPalette.muted, fontSize: 13 }}>No users match.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto", border: `0.5px solid ${adminPalette.line}`, borderRadius: 12, background: "#fff" }}>
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
                {pageRows.map((r, idx) => {
                  const cost = Math.round(costs.get(r.id) ?? 0);
                  return (
                    <tr key={r.id} className="admin-tr" style={{ background: idx % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined }}>
                      <td style={adminTd}>
                        <Link href={withRange(`/admin/users/${r.id}`, range.queryString)} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={r.display_name} email={r.email} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ fontWeight: 700, color: adminPalette.teal, fontFamily: FONT_DISPLAY }}>{r.display_name || "·"}</div>
                              {isInternalEmail(r.email, internal) ? <InternalChip /> : null}
                            </div>
                            <div style={{ fontSize: 11, color: adminPalette.muted }}>{r.email || r.id.slice(0, 8)}</div>
                          </div>
                        </Link>
                      </td>
                      <td style={adminTd}><TierBadge tier={r.tier} /></td>
                      <td style={adminTd}>{r.subscription_status || "·"}</td>
                      <td style={adminTd}>{r.room_credits ?? 0}</td>
                      <td style={adminTd}>{r.referral_credit_baht ? `฿${r.referral_credit_baht}` : "·"}</td>
                      <td style={adminTd}><CostBar value={cost} max={maxCost} /></td>
                      <td style={adminTd}>
                        <span style={{ display: "inline-flex", alignItems: "center" }}>
                          <ActivityDot tone={activityTone(r.last_seen_at, nowMs)} />
                          {ago(r.last_seen_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12, color: adminPalette.muted }}>
            <span>Page {pageSafe} of {pages} · {total} users</span>
            <div style={{ display: "flex", gap: 8 }}>
              {pageSafe > 1 ? <a href={pageHref(pageSafe - 1)} style={{ color: adminPalette.teal, fontWeight: 600, textDecoration: "none" }}>Prev</a> : null}
              {pageSafe < pages ? <a href={pageHref(pageSafe + 1)} style={{ color: adminPalette.teal, fontWeight: 600, textDecoration: "none" }}>Next</a> : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
