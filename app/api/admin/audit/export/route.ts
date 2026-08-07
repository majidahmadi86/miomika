import { getAdminProfile } from "@/lib/admin/guard";
import { loadProfilesByIds, queryAuditLog } from "@/lib/admin/audit-query";

export const runtime = "nodejs";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const admin = await getAdminProfile();
  if (!admin) return new Response("forbidden", { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const action = url.searchParams.get("action") ?? "";
  const q = url.searchParams.get("q") ?? "";

  const fromIso = from ? new Date(from).toISOString() : new Date(0).toISOString();
  let toIso = new Date().toISOString();
  if (to) {
    const t = new Date(to);
    t.setUTCHours(23, 59, 59, 999);
    toIso = t.toISOString();
  }

  const { rows } = await queryAuditLog({ fromIso, toIso, action: action || undefined, q: q || undefined, limit: 20000 });
  const profiles = await loadProfilesByIds(rows.map((r) => r.target_user_id).filter(Boolean) as string[]);

  const header = ["created_at", "admin_email", "action", "target_user_id", "target_name", "target_email", "detail"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const p = r.target_user_id ? profiles.get(r.target_user_id) : undefined;
    lines.push(
      [
        r.created_at,
        r.admin_email,
        r.action,
        r.target_user_id,
        p?.display_name ?? "",
        p?.email ?? "",
        r.detail,
      ].map(csvCell).join(","),
    );
  }
  const csv = lines.join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miomika-audit-${stamp}.csv"`,
    },
  });
}
