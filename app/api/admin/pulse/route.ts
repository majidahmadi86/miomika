import { NextResponse } from "next/server";
import { getAdminProfile } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso } from "@/lib/admin/time-range";

export const runtime = "nodejs";

export type PulseEvent = {
  t: string;
  type: "llm" | "signup" | "room" | "payment" | "admin";
  ok?: boolean;
  title: string;
  detail: string | null;
  href?: string;
};

function one(v: string | null): string {
  return v ?? "";
}

export async function GET(req: Request) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    sp[k] = v;
  });
  const range = parseRange(sp);
  const { fromIso, toIso } = rangeIso(range);
  const supabase = await createServiceClient();

  const events: PulseEvent[] = [];

  const [llmRes, roomsRes, whRes, auditRes, usersPage] = await Promise.all([
    supabase
      .from("llm_usage")
      .select("created_at, fn, provider, ok, user_id, est_cost_usd, meta")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("speaking_sessions")
      .select("id, user_id, status, completed_at, created_at")
      .eq("status", "completed")
      .gte("completed_at", fromIso)
      .lte("completed_at", toIso)
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("webhook_events")
      .select("created_at, type, ok, detail")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("admin_audit_log")
      .select("created_at, admin_email, action, target_user_id, detail")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.auth.admin.listUsers({ page: 1, perPage: 30 }),
  ]);

  const userIds = new Set<string>();
  for (const r of (llmRes.data ?? []) as { user_id: string | null }[]) if (r.user_id) userIds.add(r.user_id);
  for (const r of (roomsRes.data ?? []) as { user_id: string }[]) userIds.add(r.user_id);
  for (const r of (auditRes.data ?? []) as { target_user_id: string | null }[]) if (r.target_user_id) userIds.add(r.target_user_id);

  const names = new Map<string, string>();
  if (userIds.size) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", [...userIds]);
    for (const p of (ps ?? []) as { id: string; email: string | null; display_name: string | null }[]) {
      names.set(p.id, p.display_name || p.email || p.id.slice(0, 8));
    }
  }

  for (const r of (llmRes.data ?? []) as {
    created_at: string;
    fn: string;
    provider: string;
    ok: boolean;
    user_id: string | null;
    est_cost_usd: number | string;
    meta: { error?: string } | null;
  }[]) {
    const cost = typeof r.est_cost_usd === "string" ? parseFloat(r.est_cost_usd) : r.est_cost_usd;
    const who = r.user_id ? names.get(r.user_id) ?? "guest" : "guest";
    events.push({
      t: r.created_at,
      type: "llm",
      ok: r.ok !== false,
      title: `${r.fn} · ${r.provider}`,
      detail: r.ok === false
        ? (r.meta?.error ?? "failed")
        : `${who} · $${Number.isFinite(cost) ? cost.toFixed(4) : "0"}`,
      href: r.user_id ? `/admin/users/${r.user_id}` : undefined,
    });
  }

  for (const r of (roomsRes.data ?? []) as { completed_at: string | null; created_at: string; user_id: string }[]) {
    events.push({
      t: r.completed_at || r.created_at,
      type: "room",
      ok: true,
      title: "Room completed",
      detail: names.get(r.user_id) ?? r.user_id.slice(0, 8),
      href: `/admin/users/${r.user_id}`,
    });
  }

  for (const r of (whRes.data ?? []) as { created_at: string; type: string; ok: boolean; detail: string | null }[]) {
    events.push({
      t: r.created_at,
      type: "payment",
      ok: r.ok !== false,
      title: `Stripe · ${r.type || "event"}`,
      detail: r.ok === false ? (r.detail ?? "failed") : null,
    });
  }

  for (const r of (auditRes.data ?? []) as {
    created_at: string;
    admin_email: string | null;
    action: string;
    target_user_id: string | null;
    detail: string | null;
  }[]) {
    events.push({
      t: r.created_at,
      type: "admin",
      ok: true,
      title: r.action,
      detail: `${r.admin_email ?? "admin"}${r.detail ? ` · ${r.detail}` : ""}`,
      href: r.target_user_id ? `/admin/users/${r.target_user_id}` : undefined,
    });
  }

  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  for (const u of usersPage.data?.users ?? []) {
    if (!u.created_at) continue;
    const t = new Date(u.created_at).getTime();
    if (t < fromMs || t > toMs) continue;
    events.push({
      t: u.created_at,
      type: "signup",
      ok: true,
      title: "Signup",
      detail: one(u.email ?? null) || u.id.slice(0, 8),
      href: `/admin/users/${u.id}`,
    });
  }

  events.sort((a, b) => (a.t < b.t ? 1 : -1));
  return NextResponse.json({ events: events.slice(0, 15), generatedAt: new Date().toISOString() });
}
