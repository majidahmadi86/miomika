import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["set_tier", "grant_room_credits", "grant_referral_credit", "reward_referral", "add_note"];

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const from = one(sp.from), to = one(sp.to), action = one(sp.action), target = one(sp.target), q = one(sp.q);

  const supabase = await createServiceClient();
  let query = supabase.from("admin_audit_log").select("created_at, admin_email, action, target_user_id, detail").order("created_at", { ascending: false }).limit(500);
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) { const t = new Date(to); t.setUTCHours(23, 59, 59, 999); query = query.lte("created_at", t.toISOString()); }
  if (action) query = query.eq("action", action);
  if (target) query = query.eq("target_user_id", target);
  if (q) query = query.or(`admin_email.ilike.%${q}%,detail.ilike.%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as { created_at: string; admin_email: string | null; action: string; target_user_id: string | null; detail: string | null }[];

  // Build the CSV export href carrying the same filters.
  const qp = Object.entries({ from, to, action, target, q })
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const exportHref = `/api/admin/audit/export${qp ? `?${qp}` : ""}`;

  const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #EDE8E0", borderRadius: 12, padding: 14 };
  const input: React.CSSProperties = { padding: "6px 8px", border: "0.5px solid #D9D3C8", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontSize: 11, color: "#9A8B73", display: "block", marginBottom: 3 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#9A8B73", fontWeight: 600, borderBottom: "0.5px solid #EDE8E0", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 12.5, borderBottom: "0.5px solid #F2EEE7", verticalAlign: "top" };

  return (
    <div style={{ padding: "16px 18px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Audit log</span>
        <a href={exportHref} style={{ fontSize: 12.5, fontWeight: 600, color: "#1F7A68", border: "0.5px solid #C9E5DC", background: "#EAF6F1", padding: "6px 12px", borderRadius: 6, textDecoration: "none" }}>Download CSV</a>
      </div>

      <form method="get" style={{ ...card, marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label style={lbl}>From</label><input type="date" name="from" defaultValue={from} style={input} /></div>
        <div><label style={lbl}>To</label><input type="date" name="to" defaultValue={to} style={input} /></div>
        <div><label style={lbl}>Action</label>
          <select name="action" defaultValue={action} style={input}>
            <option value="">all actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div><label style={lbl}>User id</label><input type="text" name="target" defaultValue={target} placeholder="target user id" style={{ ...input, width: 180 }} /></div>
        <div><label style={lbl}>Search</label><input type="text" name="q" defaultValue={q} placeholder="admin email or detail" style={{ ...input, width: 180 }} /></div>
        <button type="submit" style={{ padding: "7px 14px", border: "0.5px solid #C9E5DC", background: "#EAF6F1", color: "#1F7A68", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Filter</button>
        <a href="/admin/audit" style={{ fontSize: 12, color: "#9A8B73", textDecoration: "none", padding: "7px 4px" }}>reset</a>
      </form>

      <div style={card}>
        <div style={{ fontSize: 11, color: "#B0A488", marginBottom: 8 }}>{rows.length} entr{rows.length === 1 ? "y" : "ies"}{rows.length === 500 ? " (showing latest 500 — narrow the filters or export)" : ""}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>When</th><th style={th}>Admin</th><th style={th}>Action</th><th style={th}>Target</th><th style={th}>Detail</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td style={td} colSpan={5}><span style={{ color: "#B0A488" }}>No matching entries.</span></td></tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, whiteSpace: "nowrap", color: "#6b675f" }}>{fmt(r.created_at)}</td>
                  <td style={td}>{r.admin_email || "—"}</td>
                  <td style={td}><span style={{ background: "#F2EEE7", padding: "1px 7px", borderRadius: 99, fontSize: 11 }}>{r.action}</span></td>
                  <td style={td}>{r.target_user_id ? <Link href={`/admin/users/${r.target_user_id}`} style={{ color: "#2C8E76" }}>{r.target_user_id.slice(0, 8)}</Link> : "—"}</td>
                  <td style={{ ...td, color: "#4a4742" }}>{r.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
