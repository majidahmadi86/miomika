import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { COST_ALERT_THB_7D } from "@/lib/admin/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THB_PER_USD = 36;

type UsageRow = {
  created_at: string; user_id: string | null; fn: string; provider: string; model: string;
  prompt_tokens: number; completion_tokens: number; est_cost_usd: number | string;
  ok: boolean; meta: { error?: string } | null;
};

const n = (v: number | string | null | undefined): number => {
  const x = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return Number.isFinite(x as number) ? (x as number) : 0;
};
const usd = (v: number) => `$${v.toFixed(v !== 0 && v < 0.01 ? 6 : 4)}`;
const baht = (v: number) => `฿${(v * THB_PER_USD).toFixed(2)}`;
const pct = (a: number, b: number) => (b === 0 ? "0%" : `${((a / b) * 100).toFixed(1)}%`);
function sum(rs: UsageRow[]) {
  let cost = 0, tok = 0, fails = 0;
  for (const r of rs) { cost += n(r.est_cost_usd); tok += n(r.prompt_tokens) + n(r.completion_tokens); if (!r.ok) fails++; }
  return { calls: rs.length, fails, cost, tok };
}

async function loadUsageData(days: number) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("llm_usage")
    .select("created_at,user_id,fn,provider,model,prompt_tokens,completion_tokens,est_cost_usd,ok,meta")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(50000);
  return { supabase, data, error };
}

export default async function AdminUsagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await getServerProfile();
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? "";
  const isAdmin = (email !== "" && allow.includes(email)) || process.env.NODE_ENV === "development";
  if (!profile || !isAdmin) notFound();

  const sp = await searchParams;
  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const days = Math.min(90, Math.max(1, parseInt(pick("days") ?? "7", 10) || 7));
  const fFn = pick("fn") ?? "";
  const fProv = pick("provider") ?? "";

  const { supabase, data, error } = await loadUsageData(days);

  const wrap: CSSProperties = { maxWidth: 1280, margin: "0 auto", padding: "28px 24px", fontFamily: "ui-sans-serif, system-ui, sans-serif", color: "#1a1a1a" };
  if (error) return <main style={wrap}><h1>Usage</h1><p style={{ color: "#c00" }}>Query error: {error.message}</p></main>;

  const allRows = (data ?? []) as UsageRow[];
  const fnOptions = [...new Set(allRows.map((r) => r.fn))].sort();
  const provOptions = [...new Set(allRows.map((r) => `${r.provider} · ${r.model}`))].sort();
  const rows = allRows.filter((r) => (fFn === "" || r.fn === fFn) && (fProv === "" || `${r.provider} · ${r.model}` === fProv));

  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const prof = new Map<string, { email: string | null; name: string | null }>();
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id,email,display_name").in("id", ids);
    for (const p of (ps ?? []) as { id: string; email: string | null; display_name: string | null }[]) prof.set(p.id, { email: p.email, name: p.display_name });
  }
  const who = (id: string | null) => {
    if (!id) return { label: "— guest / none", sub: "" };
    const p = prof.get(id);
    return { label: p?.name || p?.email || id, sub: p?.email && p?.name ? p.email : "" };
  };

  const tot = sum(rows);
  const grp = (keyFn: (r: UsageRow) => string) => {
    const m = new Map<string, UsageRow[]>();
    for (const r of rows) { const k = keyFn(r); const a = m.get(k) ?? []; a.push(r); m.set(k, a); }
    return [...m.entries()].map(([k, rs]) => ({ k, rs, ...sum(rs) })).sort((a, b) => b.cost - a.cost);
  };
  const byUser = grp((r) => r.user_id ?? "∅");
  const byFn = grp((r) => r.fn);
  const byApi = grp((r) => `${r.provider} · ${r.model}`);

  const invG = new Map<string, { fn: string; calls: number; cost: number }>();
  for (const r of rows) { const k = `${r.fn}|${r.user_id ?? "-"}|${r.created_at}`; const g = invG.get(k) ?? { fn: r.fn, calls: 0, cost: 0 }; g.calls++; g.cost += n(r.est_cost_usd); invG.set(k, g); }
  const invFn = new Map<string, { inv: number; cost: number }>();
  for (const g of invG.values()) { const s = invFn.get(g.fn) ?? { inv: 0, cost: 0 }; s.inv++; s.cost += g.cost; invFn.set(g.fn, s); }

  const dayMap = new Map<string, UsageRow[]>();
  for (const r of rows) { const d = r.created_at.slice(0, 10); const a = dayMap.get(d) ?? []; a.push(r); dayMap.set(d, a); }
  const daysArr = [...dayMap.entries()].map(([d, rs]) => ({ d, ...sum(rs) })).sort((a, b) => (a.d < b.d ? 1 : -1));
  const fails = rows.filter((r) => !r.ok).slice(0, 30);

  const card: CSSProperties = { border: "1px solid #e8e8e8", borderRadius: 14, padding: 18, background: "#fff" };
  const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 18, marginBottom: 18 };
  const h2: CSSProperties = { fontSize: 12, fontWeight: 600, margin: "0 0 12px", color: "#333", textTransform: "uppercase", letterSpacing: 0.5 };
  const table: CSSProperties = { width: "100%", borderCollapse: "collapse" };
  const th: CSSProperties = { textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.4 };
  const thN: CSSProperties = { ...th, textAlign: "right" };
  const td: CSSProperties = { padding: "6px 10px", borderBottom: "1px solid #f4f4f4", fontSize: 13 };
  const tdN: CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" };
  const stat: CSSProperties = { flex: 1, minWidth: 150, padding: "14px 16px", border: "1px solid #e8e8e8", borderRadius: 14, background: "#fafafa" };
  const statBig: CSSProperties = { fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" };
  const statLbl: CSSProperties = { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };
  const sel: CSSProperties = { padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, marginLeft: 6 };
  const failC = (a: number, b: number) => (b > 0 && a / b > 0.2 ? "#c0392b" : "#1a1a1a");

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Miomika · AI usage & cost</h1>
      <p style={{ color: "#888", fontSize: 12, marginBottom: 18 }}>Service-role read · last {days}d · UTC · ฿ ≈ USD×{THB_PER_USD}</p>

      <form method="GET" style={{ ...card, marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "#666" }}>Window<select name="days" defaultValue={String(days)} style={sel}><option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
        <label style={{ fontSize: 12, color: "#666" }}>Service<select name="fn" defaultValue={fFn} style={sel}><option value="">all</option>{fnOptions.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
        <label style={{ fontSize: 12, color: "#666" }}>API<select name="provider" defaultValue={fProv} style={sel}><option value="">all</option>{provOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <button type="submit" style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, cursor: "pointer" }}>Apply</button>
      </form>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={stat}><div style={statLbl}>Cost</div><div style={statBig}>{baht(tot.cost)}</div><div style={{ color: "#aaa", fontSize: 12 }}>{usd(tot.cost)}</div></div>
        <div style={stat}><div style={statLbl}>Calls</div><div style={statBig}>{tot.calls}</div></div>
        <div style={stat}><div style={statLbl}>Fail rate</div><div style={{ ...statBig, color: failC(tot.fails, tot.calls) }}>{pct(tot.fails, tot.calls)}</div><div style={{ color: "#aaa", fontSize: 12 }}>{tot.fails} failed</div></div>
        <div style={stat}><div style={statLbl}>Tokens</div><div style={statBig}>{tot.tok.toLocaleString()}</div></div>
      </div>

      <div style={{ ...card, marginBottom: 18 }}>
        <h2 style={h2}>Per user</h2>
        <table style={table}><thead><tr><th style={th}>User</th><th style={th}>Email</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
          <tbody>{byUser.map((u) => { const w = who(u.rs[0].user_id); const thb = Math.round(u.cost * THB_PER_USD); const hot = thb >= COST_ALERT_THB_7D; const id = u.rs[0].user_id; return (<tr key={u.k}><td style={td}>{id ? <Link href={`/admin/users/${id}`} style={{ color: "#1f7a68" }}>{w.label}</Link> : w.label}{hot ? <span style={{ marginLeft: 6, fontSize: 10, background: "#FAEEDA", color: "#854F0B", padding: "1px 6px", borderRadius: 99 }}>hot</span> : null}</td><td style={{ ...td, color: "#888", fontSize: 11 }}>{w.sub}</td><td style={tdN}>{u.calls}</td><td style={{ ...tdN, color: failC(u.fails, u.calls) }}>{u.fails}</td><td style={tdN}>{u.tok.toLocaleString()}</td><td style={{ ...tdN, color: hot ? "#854F0B" : undefined }}>{baht(u.cost)}</td></tr>); })}</tbody></table>
      </div>

      <div style={grid}>
        <div style={card}><h2 style={h2}>Per service (function)</h2>
          <table style={table}><thead><tr><th style={th}>Function</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Avg/inv</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byFn.map((r) => { const iv = invFn.get(r.k); return (<tr key={r.k}><td style={td}>{r.k}</td><td style={tdN}>{r.calls}</td><td style={{ ...tdN, color: failC(r.fails, r.calls) }}>{r.fails}</td><td style={tdN}>{iv ? baht(iv.cost / iv.inv) : "—"}</td><td style={tdN}>{baht(r.cost)}</td></tr>); })}</tbody></table></div>
        <div style={card}><h2 style={h2}>Per API (provider · model)</h2>
          <table style={table}><thead><tr><th style={th}>API</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byApi.map((r) => (<tr key={r.k}><td style={td}>{r.k}</td><td style={tdN}>{r.calls}</td><td style={{ ...tdN, color: failC(r.fails, r.calls) }}>{r.fails}</td><td style={tdN}>{r.tok.toLocaleString()}</td><td style={tdN}>{baht(r.cost)}</td></tr>))}</tbody></table></div>
      </div>

      <div style={grid}>
        <div style={card}><h2 style={h2}>Daily totals</h2>
          <table style={table}><thead><tr><th style={th}>Day</th><th style={thN}>Calls</th><th style={thN}>Fail %</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{daysArr.map((r) => (<tr key={r.d}><td style={td}>{r.d}</td><td style={tdN}>{r.calls}</td><td style={{ ...tdN, color: failC(r.fails, r.calls) }}>{pct(r.fails, r.calls)}</td><td style={tdN}>{baht(r.cost)}</td></tr>))}</tbody></table></div>
        <div style={card}><h2 style={h2}>Recent failures</h2>
          {fails.length === 0 ? <p style={{ color: "#888", fontSize: 13 }}>No failures.</p> : (
            <table style={table}><thead><tr><th style={th}>When</th><th style={th}>Fn</th><th style={th}>User</th><th style={th}>Error</th></tr></thead>
              <tbody>{fails.map((r, i) => (<tr key={i}><td style={{ ...td, whiteSpace: "nowrap", fontSize: 11 }}>{r.created_at.slice(5, 19).replace("T", " ")}</td><td style={{ ...td, fontSize: 11 }}>{r.fn}</td><td style={{ ...td, fontSize: 11 }}>{who(r.user_id).label}</td><td style={{ ...td, fontSize: 11, color: "#922" }}>{(r.meta?.error ?? "").slice(0, 70)}</td></tr>))}</tbody></table>
          )}
        </div>
      </div>
    </main>
  );
}
