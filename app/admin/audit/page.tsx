import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso, withRange } from "@/lib/admin/time-range";
import AdminPageHeader, { adminCard, adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";

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

  const input: React.CSSProperties = { padding: "6px 8px", border: "0.5px solid #D9D3C8", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontSize: 11, color: "#9A8B73", display: "block", marginBottom: 3 };

  return (
    <div style={adminPagePad}>
      <AdminPageHeader
        title="Audit"
        rangeLabel={range.label}
        actions={
          <a href={exportHref} style={{ fontSize: 12.5, fontWeight: 600, color: "#1F7A68", border: "0.5px solid #C9E5DC", background: "#EAF6F1", padding: "6px 12px", borderRadius: 6, textDecoration: "none" }}>
            Download CSV
          </a>
        }
      />

      <form method="get" style={{ ...adminCard, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from.toISOString()} />
            <input type="hidden" name="to" value={range.to.toISOString()} />
          </>
        )}
        <div>
          <label style={lbl}>Action</label>
          <select name="action" defaultValue={action} style={input}>
            <option value="">all actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>User id</label>
          <input type="text" name="target" defaultValue={target} placeholder="target user id" style={{ ...input, width: 180 }} />
        </div>
        <div>
          <label style={lbl}>Search</label>
          <input type="text" name="q" defaultValue={q} placeholder="admin email or detail" style={{ ...input, width: 180 }} />
        </div>
        <button type="submit" style={{ padding: "7px 14px", border: "0.5px solid #C9E5DC", background: "#EAF6F1", color: "#1F7A68", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Filter</button>
        <a href={withRange("/admin/audit", range.queryString)} style={{ fontSize: 12, color: "#9A8B73", textDecoration: "none", padding: "7px 4px" }}>reset</a>
      </form>

      <div style={adminCard}>
        <div style={{ fontSize: 11, color: "#B0A488", marginBottom: 8 }}>
          {rows.length} entr{rows.length === 1 ? "y" : "ies"}
          {rows.length === 500 ? " (showing latest 500 · narrow the filters or export)" : ""}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
              {rows.length === 0 ? (
                <tr><td style={adminTd} colSpan={5}><span style={{ color: "#B0A488" }}>No matching entries.</span></td></tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...adminTd, whiteSpace: "nowrap", color: "#6b675f" }}>{fmt(r.created_at)}</td>
                  <td style={adminTd}>{r.admin_email || "·"}</td>
                  <td style={adminTd}><span style={{ background: "#F2EEE7", padding: "1px 7px", borderRadius: 99, fontSize: 11 }}>{r.action}</span></td>
                  <td style={adminTd}>{r.target_user_id ? <Link href={withRange(`/admin/users/${r.target_user_id}`, range.queryString)} style={{ color: "#2C8E76" }}>{r.target_user_id.slice(0, 8)}</Link> : "·"}</td>
                  <td style={{ ...adminTd, color: "#4a4742" }}>{r.detail || "·"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
