import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rough baht conversion for at-a-glance only — change this one line as FX moves.
const THB_PER_USD = 36;

type UsageRow = {
  created_at: string;
  user_id: string | null;
  fn: string;
  provider: string;
  kind: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  est_cost_usd: number | string; // numeric → arrives as string from PostgREST
  latency_ms: number | null;
  ok: boolean;
  meta: { error?: string } | null;
};

const num = (v: number | string | null | undefined): number => {
  const x = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return Number.isFinite(x as number) ? (x as number) : 0;
};
const usd = (v: number) => `$${v.toFixed(v !== 0 && v < 0.01 ? 6 : 4)}`;
const baht = (v: number) => `฿${(v * THB_PER_USD).toFixed(2)}`;
const pct = (a: number, b: number) => (b === 0 ? "0%" : `${((a / b) * 100).toFixed(1)}%`);

function summarize(rs: UsageRow[]) {
  let cost = 0, tok = 0, fails = 0;
  for (const r of rs) {
    cost += num(r.est_cost_usd);
    tok += num(r.prompt_tokens) + num(r.completion_tokens);
    if (!r.ok) fails++;
  }
  return { calls: rs.length, fails, cost, tok };
}

async function loadUsageRows(): Promise<{
  rows: UsageRow[];
  today: UsageRow[];
  last7: UsageRow[];
  error: string | null;
}> {
  const now = Date.now();
  const supabase = await createServiceClient();
  const since = new Date(now - 14 * 864e5).toISOString();
  const { data, error } = await supabase
    .from("llm_usage")
    .select("created_at,user_id,fn,provider,kind,model,prompt_tokens,completion_tokens,est_cost_usd,latency_ms,ok,meta")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) return { rows: [], today: [], last7: [], error: error.message };
  const rows = (data ?? []) as UsageRow[];
  const todayStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate())).toISOString();
  const last7Start = new Date(now - 7 * 864e5).toISOString();
  return {
    rows,
    today: rows.filter((r) => r.created_at >= todayStart),
    last7: rows.filter((r) => r.created_at >= last7Start),
    error: null,
  };
}

export default async function AdminUsagePage() {
  const profile = await getServerProfile();
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? "";
  const isAdmin =
    (email !== "" && allow.includes(email)) || process.env.NODE_ENV === "development";
  if (!profile || !isAdmin) notFound();

  const wrap: CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "32px 20px", fontFamily: "ui-sans-serif, system-ui, sans-serif", color: "#1a1a1a" };
  const { rows, today, last7, error } = await loadUsageRows();
  if (error) {
    return <main style={wrap}><h1>Usage</h1><p style={{ color: "#c00" }}>Query error: {error}</p></main>;
  }
  const tToday = summarize(today);
  const t7 = summarize(last7);

  // group helper → sorted by cost desc
  const groupBy = (keyFn: (r: UsageRow) => string) => {
    const m = new Map<string, UsageRow[]>();
    for (const r of last7) { const k = keyFn(r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
    return [...m.entries()].map(([k, rs]) => ({ k, ...summarize(rs) })).sort((a, b) => b.cost - a.cost);
  };
  const byFn = groupBy((r) => r.fn);
  const byModel = groupBy((r) => `${r.provider} · ${r.model}`);
  const byUser = groupBy((r) => r.user_id ?? "— (none/guest)").slice(0, 20);

  // per-invocation: rows from one withUsage flush share an exact created_at
  const invMap = new Map<string, { fn: string; calls: number; cost: number }>();
  for (const r of last7) {
    const k = `${r.fn}|${r.user_id ?? "-"}|${r.created_at}`;
    const g = invMap.get(k) ?? { fn: r.fn, calls: 0, cost: 0 };
    g.calls++; g.cost += num(r.est_cost_usd); invMap.set(k, g);
  }
  const invByFn = new Map<string, { inv: number; calls: number; cost: number; max: number }>();
  for (const g of invMap.values()) {
    const s = invByFn.get(g.fn) ?? { inv: 0, calls: 0, cost: 0, max: 0 };
    s.inv++; s.calls += g.calls; s.cost += g.cost; s.max = Math.max(s.max, g.cost); invByFn.set(g.fn, s);
  }
  const invRows = [...invByFn.entries()].map(([fn, s]) => ({ fn, ...s })).sort((a, b) => b.cost / b.inv - a.cost / a.inv);

  // daily
  const dayMap = new Map<string, UsageRow[]>();
  for (const r of rows) { const d = r.created_at.slice(0, 10); (dayMap.get(d) ?? dayMap.set(d, []).get(d)!).push(r); }
  const days = [...dayMap.entries()].map(([d, rs]) => ({ d, ...summarize(rs) })).sort((a, b) => (a.d < b.d ? 1 : -1));

  const fails = last7.filter((r) => !r.ok).slice(0, 25);

  const card: CSSProperties = { border: "1px solid #e8e8e8", borderRadius: 12, padding: 18, marginBottom: 22, background: "#fff" };
  const h2: CSSProperties = { fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "#333" };
  const table: CSSProperties = { width: "100%", borderCollapse: "collapse" };
  const th: CSSProperties = { textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 };
  const td: CSSProperties = { padding: "6px 10px", borderBottom: "1px solid #f4f4f4", fontSize: 13 };
  const tdN: CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, SFMono-Regular, monospace" };
  const thN: CSSProperties = { ...th, textAlign: "right" };
  const stat: CSSProperties = { flex: 1, minWidth: 150, padding: "14px 16px", border: "1px solid #e8e8e8", borderRadius: 12, background: "#fafafa" };
  const statBig: CSSProperties = { fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" };
  const statLbl: CSSProperties = { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };
  const failColor = (a: number, b: number) => (b > 0 && a / b > 0.2 ? "#c0392b" : "#1a1a1a");

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Miomika · AI usage & cost</h1>
      <p style={{ color: "#888", fontSize: 12, marginBottom: 24 }}>Service-role read · last 14 days · times UTC · ฿ ≈ USD×{THB_PER_USD}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={stat}><div style={statLbl}>Today cost</div><div style={statBig}>{baht(tToday.cost)}</div><div style={{ color: "#aaa", fontSize: 12 }}>{usd(tToday.cost)}</div></div>
        <div style={stat}><div style={statLbl}>Today calls</div><div style={statBig}>{tToday.calls}</div></div>
        <div style={stat}><div style={statLbl}>Today fail rate</div><div style={{ ...statBig, color: failColor(tToday.fails, tToday.calls) }}>{pct(tToday.fails, tToday.calls)}</div><div style={{ color: "#aaa", fontSize: 12 }}>{tToday.fails} failed</div></div>
        <div style={stat}><div style={statLbl}>7-day cost</div><div style={statBig}>{baht(t7.cost)}</div><div style={{ color: "#aaa", fontSize: 12 }}>{usd(t7.cost)} · {t7.calls} calls</div></div>
      </div>
      {tToday.calls > 0 && tToday.fails / tToday.calls > 0.2 && (
        <div style={{ ...card, background: "#fdecea", borderColor: "#f5c6c2", color: "#922" }}>High fail rate — likely Groq free-tier rate/token limit (TPD). Optimize call count or wait for daily reset.</div>
      )}

      <div style={card}>
        <h2 style={h2}>Cost per invocation (lesson / turn)</h2>
        <table style={table}><thead><tr><th style={th}>Function</th><th style={thN}>Invocations</th><th style={thN}>Avg calls</th><th style={thN}>Avg cost</th><th style={thN}>Max cost</th></tr></thead>
          <tbody>{invRows.map((r) => (<tr key={r.fn}><td style={td}>{r.fn}</td><td style={tdN}>{r.inv}</td><td style={tdN}>{(r.calls / r.inv).toFixed(1)}</td><td style={tdN}>{baht(r.cost / r.inv)}</td><td style={tdN}>{baht(r.max)}</td></tr>))}</tbody></table>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>Grouped by one usage-context flush (shared timestamp). Avg cost = your real per-lesson / per-turn cost.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>By function — 7d (top sinks)</h2>
        <table style={table}><thead><tr><th style={th}>Function</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
          <tbody>{byFn.map((r) => (<tr key={r.k}><td style={td}>{r.k}</td><td style={tdN}>{r.calls}</td><td style={{ ...tdN, color: failColor(r.fails, r.calls) }}>{r.fails}</td><td style={tdN}>{r.tok.toLocaleString()}</td><td style={tdN}>{baht(r.cost)}</td></tr>))}</tbody></table>
      </div>

      <div style={card}>
        <h2 style={h2}>By model — 7d</h2>
        <table style={table}><thead><tr><th style={th}>Provider · model</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
          <tbody>{byModel.map((r) => (<tr key={r.k}><td style={td}>{r.k}</td><td style={tdN}>{r.calls}</td><td style={{ ...tdN, color: failColor(r.fails, r.calls) }}>{r.fails}</td><td style={tdN}>{r.tok.toLocaleString()}</td><td style={tdN}>{baht(r.cost)}</td></tr>))}</tbody></table>
      </div>

      <div style={card}>
        <h2 style={h2}>Top users — 7d</h2>
        <table style={table}><thead><tr><th style={th}>User</th><th style={thN}>Calls</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
          <tbody>{byUser.map((r) => (<tr key={r.k}><td style={{ ...td, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{r.k}</td><td style={tdN}>{r.calls}</td><td style={tdN}>{r.tok.toLocaleString()}</td><td style={tdN}>{baht(r.cost)}</td></tr>))}</tbody></table>
      </div>

      <div style={card}>
        <h2 style={h2}>Daily totals</h2>
        <table style={table}><thead><tr><th style={th}>Day (UTC)</th><th style={thN}>Calls</th><th style={thN}>Fail %</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
          <tbody>{days.map((r) => (<tr key={r.d}><td style={td}>{r.d}</td><td style={tdN}>{r.calls}</td><td style={{ ...tdN, color: failColor(r.fails, r.calls) }}>{pct(r.fails, r.calls)}</td><td style={tdN}>{r.tok.toLocaleString()}</td><td style={tdN}>{baht(r.cost)}</td></tr>))}</tbody></table>
      </div>

      <div style={card}>
        <h2 style={h2}>Recent failures — 7d</h2>
        {fails.length === 0 ? <p style={{ color: "#888", fontSize: 13 }}>No failures.</p> : (
          <table style={table}><thead><tr><th style={th}>When (UTC)</th><th style={th}>Function</th><th style={th}>Model</th><th style={th}>Error</th></tr></thead>
            <tbody>{fails.map((r, i) => (<tr key={i}><td style={{ ...td, whiteSpace: "nowrap" }}>{r.created_at.slice(5, 19).replace("T", " ")}</td><td style={td}>{r.fn}</td><td style={{ ...td, fontSize: 11 }}>{r.model}</td><td style={{ ...td, fontSize: 11, color: "#922" }}>{(r.meta?.error ?? "").slice(0, 90)}</td></tr>))}</tbody></table>
        )}
      </div>
    </main>
  );
}
