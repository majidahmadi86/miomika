import Link from "next/link";
import { ScrollText } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso, withRange } from "@/lib/admin/time-range";
import AdminPageHeader, { adminCard, adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";
import {
  ActionChip,
  Avatar,
  filterPanel,
  applyBtn,
  inputStyle,
  adminPalette,
  FONT_DISPLAY,
  tint,
} from "@/components/admin/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = [
  "set_tier",
  "grant_room_credits",
  "grant_referral_credit",
  "adjust_room_credits",
  "adjust_referral_credit_baht",
  "reward_referral",
  "add_note",
];

function fmt(d: string | null | undefined) {
  if (!d) return "·";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { fromIso, toIso } = rangeIso(range);
  const action = one(sp.action);
  const target = one(sp.target);
  const q = one(sp.q);

  const supabase = await createServiceClient();
  let query = supabase
    .from("admin_audit_log")
    .select("created_at, admin_email, action, target_user_id, detail")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(500);
  if (action) query = query.eq("action", action);
  if (target) query = query.eq("target_user_id", target);
  if (q) query = query.or(`admin_email.ilike.%${q}%,detail.ilike.%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as { created_at: string; admin_email: string | null; action: string; target_user_id: string | null; detail: string | null }[];

  const qp = new URLSearchParams();
  qp.set("from", range.from.toISOString().slice(0, 10));
  qp.set("to", range.to.toISOString().slice(0, 10));
  if (action) qp.set("action", action);
  if (target) qp.set("target", target);
  if (q) qp.set("q", q);
  const exportHref = `/api/admin/audit/export?${qp.toString()}`;

  const lbl: React.CSSProperties = { fontSize: 11, color: adminPalette.muted, display: "block", marginBottom: 3 };

  return (
    <div style={adminPagePad}>
      <AdminPageHeader
        title="Audit"
        rangeLabel={range.label}
        actions={
          <a
            href={exportHref}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: FONT_DISPLAY,
              color: "#fff",
              background: adminPalette.teal,
              padding: "7px 14px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Download CSV
          </a>
        }
      />

      <form method="get" className="admin-filter" style={{ ...filterPanel, marginBottom: 10 }}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from.toISOString()} />
            <input type="hidden" name="to" value={range.to.toISOString()} />
          </>
        )}
        <div>
          <label style={lbl}>Action</label>
          <select name="action" defaultValue={action} style={inputStyle}>
            <option value="">all actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>User id</label>
          <input type="text" name="target" defaultValue={target} placeholder="target user id" style={inputStyle} />
        </div>
        <div>
          <label style={lbl}>Search</label>
          <input type="text" name="q" defaultValue={q} placeholder="admin email or detail" style={inputStyle} />
        </div>
        <button type="submit" className="admin-apply" style={applyBtn}>Filter</button>
        <a href={withRange("/admin/audit", range.queryString)} style={{ fontSize: 12, color: adminPalette.muted, textDecoration: "none", padding: "10px 4px" }}>reset</a>
      </form>

      <div style={adminCard}>
        <div style={{ fontSize: 11, color: adminPalette.subtle, marginBottom: 8 }}>
          {rows.length} entr{rows.length === 1 ? "y" : "ies"}
          {rows.length === 500 ? " (showing latest 500 · narrow the filters or export)" : ""}
        </div>
        {rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: adminPalette.subtle }}>
            <ScrollText size={36} strokeWidth={1.75} style={{ margin: "0 auto 12px", opacity: 0.55 }} />
            <div style={{ fontSize: 13.5, fontFamily: FONT_DISPLAY, fontWeight: 600 }}>No matching entries.</div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={adminTh}>When</th>
                  <th style={adminTh}>Admin</th>
                  <th style={adminTh}>Action</th>
                  <th style={adminTh}>Target</th>
                  <th style={adminTh}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined }}>
                    <td style={{ ...adminTd, whiteSpace: "nowrap", color: adminPalette.muted }}>{fmt(r.created_at)}</td>
                    <td style={adminTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar email={r.admin_email} name={r.admin_email} size={26} />
                        <span style={{ fontSize: 12.5 }}>{r.admin_email || "·"}</span>
                      </div>
                    </td>
                    <td style={adminTd}><ActionChip action={r.action} /></td>
                    <td style={adminTd}>
                      {r.target_user_id ? (
                        <Link href={withRange(`/admin/users/${r.target_user_id}`, range.queryString)} style={{ color: adminPalette.teal, fontWeight: 600, textDecoration: "none" }}>
                          {r.target_user_id.slice(0, 8)}
                        </Link>
                      ) : "·"}
                    </td>
                    <td style={{ ...adminTd, color: "#4a4742" }}>{r.detail || "·"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
