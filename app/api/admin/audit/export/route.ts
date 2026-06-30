import { getAdminProfile } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";

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
  const target = url.searchParams.get("target") ?? "";
  const q = url.searchParams.get("q") ?? "";

  const supabase = await createServiceClient();
  let query = supabase
    .from("admin_audit_log")
    .select("created_at, admin_email, action, target_user_id, detail")
    .order("created_at", { ascending: false })
    .limit(20000);
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) { const t = new Date(to); t.setUTCHours(23, 59, 59, 999); query = query.lte("created_at", t.toISOString()); }
  if (action) query = query.eq("action", action);
  if (target) query = query.eq("target_user_id", target);
  if (q) query = query.or(`admin_email.ilike.%${q}%,detail.ilike.%${q}%`);

  const { data } = await query;
  const rows = (data ?? []) as { created_at: string; admin_email: string | null; action: string; target_user_id: string | null; detail: string | null }[];

  const header = ["created_at", "admin_email", "action", "target_user_id", "detail"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.created_at, r.admin_email, r.action, r.target_user_id, r.detail].map(csvCell).join(","));
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
