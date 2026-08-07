import { createServiceClient } from "@/lib/supabase/service";

export type AuditRow = {
  created_at: string;
  admin_email: string | null;
  action: string;
  target_user_id: string | null;
  detail: string | null;
};

export type ProfileLite = {
  id: string;
  email: string | null;
  display_name: string | null;
};

function sanitizeQ(raw: string): string {
  return raw.replace(/[,()%*]/g, "").trim().slice(0, 80);
}

/** Resolve smart search against profiles (email + display_name ilike). */
export async function resolveProfileIdsByQuery(q: string): Promise<string[]> {
  const clean = sanitizeQ(q);
  if (!clean) return [];
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .limit(200);
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

/**
 * Smart audit query: action select + one search that matches
 * admin_email · detail · OR target_user_id in profile-resolved ids.
 */
export async function queryAuditLog(opts: {
  fromIso: string;
  toIso: string;
  action?: string;
  q?: string;
  limit?: number;
}): Promise<{ rows: AuditRow[]; resolvedIds: string[] }> {
  const supabase = await createServiceClient();
  const clean = sanitizeQ(opts.q ?? "");
  const resolvedIds = clean ? await resolveProfileIdsByQuery(clean) : [];

  let query = supabase
    .from("admin_audit_log")
    .select("created_at, admin_email, action, target_user_id, detail")
    .gte("created_at", opts.fromIso)
    .lte("created_at", opts.toIso)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 500);

  if (opts.action) query = query.eq("action", opts.action);

  if (clean) {
    const parts = [`admin_email.ilike.%${clean}%`, `detail.ilike.%${clean}%`];
    if (resolvedIds.length) {
      // PostgREST: in.(uuid,uuid,…)
      parts.push(`target_user_id.in.(${resolvedIds.join(",")})`);
    }
    query = query.or(parts.join(","));
  }

  const { data } = await query;
  return { rows: (data ?? []) as AuditRow[], resolvedIds };
}

export async function loadProfilesByIds(ids: string[]): Promise<Map<string, ProfileLite>> {
  const map = new Map<string, ProfileLite>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const supabase = await createServiceClient();
  // chunk in case of large sets
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", chunk);
    for (const p of (data ?? []) as ProfileLite[]) map.set(p.id, p);
  }
  return map;
}
