import type { CSSProperties } from "react";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { COST_ALERT_THB_7D, THB_PER_USD } from "@/lib/admin/cost";
import { parseRange, rangeIso, withRange } from "@/lib/admin/time-range";
import AdminPageHeader, { adminCard, adminKpi, adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export default async function AdminUsagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { fromIso, toIso } = rangeIso(range);
  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const fFn = pick("fn") ?? "";
  const fProv = pick("provider") ?? "";

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("llm_usage")
    .select("created_at,user_id,fn,provider,model,prompt_tokens,completion_tokens,est_cost_usd,ok,meta")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(50000);

  if (error) {
    return (
      <div style={adminPagePad}>
        <AdminPageHeader title="Cost" rangeLabel={range.label} />
        <p style={{ color: "#A32D2D", fontSize: 13 }}>Query error: {error.message}</p>
      </div>
    );
  }

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
    if (!id) return { label: "· guest / none", sub: "" };
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

  const failC = (a: number, b: number) => (b > 0 && a / b > 0.2 ? "#A32D2D" : "#2A2A28");
  const thN: CSSProperties = { ...adminTh, textAlign: "right" };
  const tdN: CSSProperties = { ...adminTd, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" };

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Cost" rangeLabel={`${range.label} · UTC · ฿ ≈ USD×${THB_PER_USD}`} />

      <form method="GET" style={{ ...adminCard, marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from.toISOString()} />
            <input type="hidden" name="to" value={range.to.toISOString()} />
          </>
        )}
        <label style={{ fontSize: 12, color: "#6b675f" }}>Service
          <select name="fn" defaultValue={fFn} style={{ marginLeft: 6, padding: "5px 8px", borderRadius: 6, border: "0.5px solid #D9D3C8", fontSize: 12.5, fontFamily: "inherit" }}>
            <option value="">all</option>{fnOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#6b675f" }}>API
          <select name="provider" defaultValue={fProv} style={{ marginLeft: 6, padding: "5px 8px", borderRadius: 6, border: "0.5px solid #D9D3C8", fontSize: 12.5, fontFamily: "inherit" }}>
            <option value="">all</option>{provOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <button type="submit" style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #C9E5DC", background: "#EAF6F1", color: "#1F7A68", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Apply</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 12 }}>
        <div style={adminKpi}><div style={{ fontSize: 11, color: "#9A8B73" }}>Cost</div><div style={{ fontSize: 18, fontWeight: 700 }}>{baht(tot.cost)}</div><div style={{ color: "#B0A488", fontSize: 11 }}>{usd(tot.cost)}</div></div>
        <div style={adminKpi}><div style={{ fontSize: 11, color: "#9A8B73" }}>Calls</div><div style={{ fontSize: 18, fontWeight: 700 }}>{tot.calls}</div></div>
        <div style={adminKpi}><div style={{ fontSize: 11, color: "#9A8B73" }}>Fail rate</div><div style={{ fontSize: 18, fontWeight: 700, color: failC(tot.fails, tot.calls) }}>{pct(tot.fails, tot.calls)}</div><div style={{ color: "#B0A488", fontSize: 11 }}>{tot.fails} failed</div></div>
        <div style={adminKpi}><div style={{ fontSize: 11, color: "#9A8B73" }}>Tokens</div><div style={{ fontSize: 18, fontWeight: 700 }}>{tot.tok.toLocaleString()}</div></div>
      </div>

      <div style={{ ...adminCard, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Per user</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={adminTh}>User</th><th style={adminTh}>Email</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byUser.map((u) => {
              const w = who(u.rs[0].user_id);
              const thb = Math.round(u.cost * THB_PER_USD);
              const hot = thb >= COST_ALERT_THB_7D;
              const id = u.rs[0].user_id;
              return (
                <tr key={u.k}>
                  <td style={adminTd}>{id ? <Link href={withRange(`/admin/users/${id}`, range.queryString)} style={{ color: "#1f7a68" }}>{w.label}</Link> : w.label}{hot ? <span style={{ marginLeft: 6, fontSize: 10, background: "#FAEEDA", color: "#854F0B", padding: "1px 6px", borderRadius: 99 }}>hot</span> : null}</td>
                  <td style={{ ...adminTd, color: "#9A8B73", fontSize: 11 }}>{w.sub}</td>
                  <td style={tdN}>{u.calls}</td>
                  <td style={{ ...tdN, color: failC(u.fails, u.calls) }}>{u.fails}</td>
                  <td style={tdN}>{u.tok.toLocaleString()}</td>
                  <td style={{ ...tdN, color: hot ? "#854F0B" : undefined }}>{baht(u.cost)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={adminCard}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Per service</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={adminTh}>Function</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Avg/inv</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byFn.map((r) => {
              const iv = invFn.get(r.k);
              return (
                <tr key={r.k}>
                  <td style={adminTd}>{r.k}</td>
                  <td style={tdN}>{r.calls}</td>
                  <td style={{ ...tdN, color: failC(r.fails, r.calls) }}>{r.fails}</td>
                  <td style={tdN}>{iv ? baht(iv.cost / iv.inv) : "·"}</td>
                  <td style={tdN}>{baht(r.cost)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div style={adminCard}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Per API</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={adminTh}>API</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byApi.map((r) => (
              <tr key={r.k}>
                <td style={adminTd}>{r.k}</td>
                <td style={tdN}>{r.calls}</td>
                <td style={{ ...tdN, color: failC(r.fails, r.calls) }}>{r.fails}</td>
                <td style={tdN}>{r.tok.toLocaleString()}</td>
                <td style={tdN}>{baht(r.cost)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={adminCard}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Daily totals</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={adminTh}>Day</th><th style={thN}>Calls</th><th style={thN}>Fail %</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{daysArr.map((r) => (
              <tr key={r.d}>
                <td style={adminTd}>{r.d}</td>
                <td style={tdN}>{r.calls}</td>
                <td style={{ ...tdN, color: failC(r.fails, r.calls) }}>{pct(r.fails, r.calls)}</td>
                <td style={tdN}>{baht(r.cost)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={adminCard}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Recent failures</div>
          {fails.length === 0 ? <p style={{ color: "#9A8B73", fontSize: 12.5 }}>No failures.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={adminTh}>When</th><th style={adminTh}>Fn</th><th style={adminTh}>User</th><th style={adminTh}>Error</th></tr></thead>
              <tbody>{fails.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...adminTd, whiteSpace: "nowrap", fontSize: 11 }}>{r.created_at.slice(5, 19).replace("T", " ")}</td>
                  <td style={{ ...adminTd, fontSize: 11 }}>{r.fn}</td>
                  <td style={{ ...adminTd, fontSize: 11 }}>{who(r.user_id).label}</td>
                  <td style={{ ...adminTd, fontSize: 11, color: "#A32D2D" }}>{(r.meta?.error ?? "").slice(0, 70)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
