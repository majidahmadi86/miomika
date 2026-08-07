import { createServiceClient } from "@/lib/supabase/service";
import { isInternalEmail, internalEmailSet } from "@/lib/admin/internal";
import { previousPeriod, rangeIso, type ParsedRange } from "@/lib/admin/time-range";
import { withRange } from "@/lib/admin/time-range";

export type AttentionSeverity = "action" | "watch" | "ok";

export type AttentionItem = {
  severity: AttentionSeverity;
  title: string;
  detail: string;
  href: string;
};

function agoLabel(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600e3);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60e3))}m ago`;
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Real-data attention items for the command-center strip. */
export async function buildAttentionItems(range: ParsedRange): Promise<AttentionItem[]> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  const internal = internalEmailSet();
  const items: AttentionItem[] = [];
  const healthHref = withRange("/admin/health", range.queryString);
  const since24 = new Date(Date.now() - 864e5).toISOString();
  const since7d = new Date(Date.now() - 7 * 864e5).toISOString();

  // Provider fail rate > 5% in range
  {
    const { data } = await supabase
      .from("llm_usage")
      .select("provider, ok")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .limit(50000);
    const by = new Map<string, { ok: number; total: number }>();
    for (const r of (data ?? []) as { provider: string | null; ok: boolean }[]) {
      const p = r.provider || "unknown";
      const cur = by.get(p) ?? { ok: 0, total: 0 };
      cur.total++;
      if (r.ok !== false) cur.ok++;
      by.set(p, cur);
    }
    for (const [provider, s] of by) {
      if (s.total < 5) continue;
      const failPct = ((s.total - s.ok) / s.total) * 100;
      if (failPct > 5) {
        items.push({
          severity: "action",
          title: `${provider} failing`,
          detail: `${failPct.toFixed(0)}% fail rate · ${s.total - s.ok}/${s.total} calls in range`,
          href: healthHref,
        });
      }
    }
  }

  // Any llm_usage errors in last 24h
  {
    const { count } = await supabase
      .from("llm_usage")
      .select("id", { count: "exact", head: true })
      .eq("ok", false)
      .gte("created_at", since24);
    if ((count ?? 0) > 0) {
      items.push({
        severity: "action",
        title: "AI errors (24h)",
        detail: `${count} failed call${count === 1 ? "" : "s"} · open Health for details`,
        href: healthHref,
      });
    }
  }

  // rate_limit_hits spike >3x prior equal period
  {
    const prev = previousPeriod(range);
    const prevFrom = prev.from.toISOString();
    const prevTo = prev.to.toISOString();
    const sumHits = async (from: string, to: string) => {
      const { data } = await supabase
        .from("rate_limit_hits")
        .select("count, updated_at")
        .gte("updated_at", from)
        .lte("updated_at", to)
        .limit(50000);
      return ((data ?? []) as { count: number }[]).reduce((a, r) => a + (r.count ?? 0), 0);
    };
    const [curHits, prevHits] = await Promise.all([sumHits(fromIso, toIso), sumHits(prevFrom, prevTo)]);
    if (curHits > 0 && prevHits > 0 && curHits > prevHits * 3) {
      items.push({
        severity: "watch",
        title: "Rate-limit spike",
        detail: `${curHits} hits vs ${prevHits} prior · ${Math.round(curHits / prevHits)}×`,
        href: healthHref,
      });
    } else if (curHits > 20 && prevHits === 0) {
      items.push({
        severity: "watch",
        title: "Rate-limit spike",
        detail: `${curHits} hits in range · none in prior period`,
        href: healthHref,
      });
    }
  }

  // Room auto-refund in range
  {
    const { count } = await supabase
      .from("room_credit_ledger")
      .select("id", { count: "exact", head: true })
      .eq("reason", "refund")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);
    if ((count ?? 0) > 0) {
      items.push({
        severity: "watch",
        title: "Room auto-refunds",
        detail: `${count} refund${count === 1 ? "" : "s"} in range · session start failed after debit`,
        href: healthHref,
      });
    }
  }

  // Paying user inactive 7+ days
  {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, display_name, last_seen_at, tier")
      .in("tier", ["pro", "pro_max"])
      .lt("last_seen_at", since7d)
      .limit(20);
    for (const u of (data ?? []) as { id: string; email: string | null; display_name: string | null; last_seen_at: string | null }[]) {
      if (isInternalEmail(u.email, internal)) continue;
      items.push({
        severity: "watch",
        title: "Churn risk",
        detail: `${u.display_name || u.email || "Paying user"} · last seen ${agoLabel(u.last_seen_at)}`,
        href: withRange(`/admin/users/${u.id}`, range.queryString),
      });
    }
  }

  // New signups with ZERO llm calls within 48h of signup
  {
    const signupFrom = new Date(Date.now() - 14 * 864e5);
    const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const recent = (users?.users ?? []).filter((u) => {
      if (!u.created_at || isInternalEmail(u.email, internal)) return false;
      const t = new Date(u.created_at).getTime();
      return t >= signupFrom.getTime() && t <= Date.now() - 48 * 3600e3;
    });
    if (recent.length) {
      const ids = recent.map((u) => u.id);
      const { data: usage } = await supabase
        .from("llm_usage")
        .select("user_id, created_at")
        .in("user_id", ids)
        .limit(5000);
      const firstCall = new Map<string, number>();
      for (const r of (usage ?? []) as { user_id: string | null; created_at: string }[]) {
        if (!r.user_id) continue;
        const t = new Date(r.created_at).getTime();
        const prev = firstCall.get(r.user_id);
        if (prev === undefined || t < prev) firstCall.set(r.user_id, t);
      }
      let neverActivated = 0;
      for (const u of recent) {
        const signup = new Date(u.created_at!).getTime();
        const first = firstCall.get(u.id);
        if (first === undefined || first > signup + 48 * 3600e3) neverActivated++;
      }
      if (neverActivated > 0) {
        items.push({
          severity: "watch",
          title: "Never activated",
          detail: `${neverActivated} signup${neverActivated === 1 ? "" : "s"} with no AI call within 48h`,
          href: withRange("/admin/users?activity=inactive", range.queryString),
        });
      }
    }
  }

  // Stripe webhook silent >7d WHILE active subs exist
  {
    const [{ data: lastWh }, { count: activeSubs }] = await Promise.all([
      supabase.from("webhook_events").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("subscription_status", ["active", "trialing", "past_due"]),
    ]);
    const lastAt = (lastWh?.[0] as { created_at: string } | undefined)?.created_at;
    const silent = !lastAt || Date.now() - new Date(lastAt).getTime() > 7 * 864e5;
    if (silent && (activeSubs ?? 0) > 0) {
      items.push({
        severity: "action",
        title: "Stripe webhook silent",
        detail: `Last event ${agoLabel(lastAt)} · ${activeSubs} active/trialing subs`,
        href: healthHref,
      });
    }
  }

  // Reminders due within 14 days (table may not exist yet)
  try {
    const today = new Date();
    const in14 = new Date(Date.now() + 14 * 864e5);
    const todayIso = today.toISOString().slice(0, 10);
    const in14Iso = in14.toISOString().slice(0, 10);
    const { data: reminders, error } = await supabase
      .from("admin_reminders")
      .select("id, title, due_date, done")
      .eq("done", false)
      .not("due_date", "is", null)
      .lte("due_date", in14Iso)
      .limit(20);
    if (!error && reminders?.length) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      for (const r of reminders as { id: string; title: string; due_date: string }[]) {
        const due = r.due_date;
        const overdue = due < todayIso;
        const days = Math.ceil((new Date(due + "T00:00:00").getTime() - startOfToday.getTime()) / 864e5);
        items.push({
          severity: overdue ? "action" : "watch",
          title: overdue ? `Overdue · ${r.title}` : `Due soon · ${r.title}`,
          detail: overdue ? `was due ${due}` : `due in ${Math.max(0, days)} day${Math.max(0, days) === 1 ? "" : "s"}`,
          href: withRange("/admin", range.queryString) + "#watchboard",
        });
      }
    }
  } catch {
    // table missing · skip
  }

  // Severity sort: action first, then watch
  const rank = { action: 0, watch: 1, ok: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 24);
}
