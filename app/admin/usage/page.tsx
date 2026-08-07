import type { CSSProperties } from "react";
import Link from "next/link";
import { Flame, PhoneCall, AlertTriangle, Hash } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { COST_ALERT_THB_7D, THB_PER_USD } from "@/lib/admin/cost";
import { parseRange, rangeIso, withRange } from "@/lib/admin/time-range";
import AdminPageHeader, { adminCard, adminPagePad, adminTd, adminTh } from "@/components/admin/AdminPageHeader";
import {
  KpiCard,
  Avatar,
  CostBar,
  GuestChip,
  InternalChip,
  filterPanel,
  applyBtn,
  inputStyle,
  adminPalette,
  FONT_DISPLAY,
  tint,
} from "@/components/admin/ui";
import { isInternalEmail, internalEmailSet } from "@/lib/admin/internal";

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
        <p style={{ color: adminPalette.rose, fontSize: 13 }}>Query error: {error.message}</p>
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
    if (!id) return { label: "guest", sub: "", email: null as string | null, name: null as string | null, guest: true };
    const p = prof.get(id);
    return { label: p?.name || p?.email || id, sub: p?.email && p?.name ? p.email : "", email: p?.email ?? null, name: p?.name ?? null, guest: false };
  };

  const tot = sum(rows);
  const internal = internalEmailSet();
  const grp = (keyFn: (r: UsageRow) => string) => {
    const m = new Map<string, UsageRow[]>();
    for (const r of rows) { const k = keyFn(r); const a = m.get(k) ?? []; a.push(r); m.set(k, a); }
    return [...m.entries()].map(([k, rs]) => ({ k, rs, ...sum(rs) })).sort((a, b) => b.cost - a.cost);
  };
  const byUser = grp((r) => r.user_id ?? "∅");
  const byFn = grp((r) => r.fn);
  const byApi = grp((r) => `${r.provider} · ${r.model}`);
  const maxUserCost = Math.max(0, ...byUser.map((u) => u.cost));

  const invG = new Map<string, { fn: string; calls: number; cost: number }>();
  for (const r of rows) { const k = `${r.fn}|${r.user_id ?? "-"}|${r.created_at}`; const g = invG.get(k) ?? { fn: r.fn, calls: 0, cost: 0 }; g.calls++; g.cost += n(r.est_cost_usd); invG.set(k, g); }
  const invFn = new Map<string, { inv: number; cost: number }>();
  for (const g of invG.values()) { const s = invFn.get(g.fn) ?? { inv: 0, cost: 0 }; s.inv++; s.cost += g.cost; invFn.set(g.fn, s); }

  const dayMap = new Map<string, UsageRow[]>();
  for (const r of rows) { const d = r.created_at.slice(0, 10); const a = dayMap.get(d) ?? []; a.push(r); dayMap.set(d, a); }
  const daysArr = [...dayMap.entries()].map(([d, rs]) => ({ d, ...sum(rs) })).sort((a, b) => (a.d < b.d ? 1 : -1));
  const fails = rows.filter((r) => !r.ok).slice(0, 30);

  const failHigh = tot.calls > 0 && tot.fails / tot.calls > 0.2;
  const thN: CSSProperties = { ...adminTh, textAlign: "right" };
  const tdN: CSSProperties = { ...adminTd, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" };
  const lbl: CSSProperties = { fontSize: 11, color: adminPalette.muted, display: "block", marginBottom: 3 };

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Cost" rangeLabel={`${range.label} · UTC · ฿ ≈ USD×${THB_PER_USD}`} />

      <form method="GET" className="admin-filter" style={{ ...filterPanel, marginBottom: 12 }}>
        <input type="hidden" name="range" value={range.preset} />
        {range.preset === "custom" && (
          <>
            <input type="hidden" name="from" value={range.from.toISOString()} />
            <input type="hidden" name="to" value={range.to.toISOString()} />
          </>
        )}
        <div>
          <label style={lbl}>Service</label>
          <select name="fn" defaultValue={fFn} style={inputStyle}>
            <option value="">all</option>{fnOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>API</label>
          <select name="provider" defaultValue={fProv} style={inputStyle}>
            <option value="">all</option>{provOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button type="submit" className="admin-apply" style={applyBtn}>Apply</button>
      </form>

      <div className="admin-kpi-grid">
        <KpiCard color={adminPalette.amber} icon={Flame} label="Cost" value={baht(tot.cost)} sub={usd(tot.cost)} />
        <KpiCard color={adminPalette.sky} icon={PhoneCall} label="Calls" value={String(tot.calls)} />
        <KpiCard
          color={failHigh ? adminPalette.rose : adminPalette.teal}
          icon={AlertTriangle}
          label="Fail rate"
          value={pct(tot.fails, tot.calls)}
          sub={`${tot.fails} failed`}
        />
        <KpiCard color={adminPalette.sky} icon={Hash} label="Tokens" value={tot.tok.toLocaleString()} />
      </div>

      <div style={{ ...adminCard, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Per user</div>
        <div className="admin-table-scroll">
          <table>
            <thead><tr><th style={adminTh}>User</th><th style={adminTh}>Email</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byUser.map((u, idx) => {
              const w = who(u.rs[0].user_id);
              const thb = Math.round(u.cost * THB_PER_USD);
              const hot = thb >= COST_ALERT_THB_7D;
              const id = u.rs[0].user_id;
              return (
                <tr
                  key={u.k}
                  style={{
                    background: idx % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined,
                  }}
                >
                  <td style={adminTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {w.guest ? (
                        <GuestChip />
                      ) : (
                        <Avatar name={w.name} email={w.email} />
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {id ? (
                            <Link href={withRange(`/admin/users/${id}`, range.queryString)} style={{ color: adminPalette.teal, fontWeight: 700, fontFamily: FONT_DISPLAY, textDecoration: "none" }}>
                              {w.label}
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 700, fontFamily: FONT_DISPLAY }}>{w.label}</span>
                          )}
                          {!w.guest && isInternalEmail(w.email, internal) ? <InternalChip /> : null}
                          {hot ? (
                            <span style={{ fontSize: 10, background: tint(adminPalette.amber, 0.18), color: "#854F0B", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>hot</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...adminTd, color: adminPalette.muted, fontSize: 11 }}>{w.sub || "·"}</td>
                  <td style={tdN}>{u.calls}</td>
                  <td style={{ ...tdN, color: u.fails / Math.max(1, u.calls) > 0.2 ? adminPalette.rose : adminPalette.ink }}>{u.fails}</td>
                  <td style={tdN}>{u.tok.toLocaleString()}</td>
                  <td style={{ ...tdN, color: hot ? "#854F0B" : undefined }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      <CostBar value={u.cost} max={maxUserCost} />
                      <span>{baht(u.cost)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>

      <div className="admin-two-col" style={{ marginBottom: 10 }}>
        <div style={adminCard}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Per service</div>
          <div className="admin-table-scroll">
          <table>
            <thead><tr><th style={adminTh}>Function</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Avg/inv</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byFn.map((r, idx) => {
              const iv = invFn.get(r.k);
              return (
                <tr key={r.k} style={{ background: idx % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined }}>
                  <td style={adminTd}>{r.k}</td>
                  <td style={tdN}>{r.calls}</td>
                  <td style={{ ...tdN, color: r.fails / Math.max(1, r.calls) > 0.2 ? adminPalette.rose : adminPalette.ink }}>{r.fails}</td>
                  <td style={tdN}>{iv ? baht(iv.cost / iv.inv) : "·"}</td>
                  <td style={tdN}>{baht(r.cost)}</td>
                </tr>
              );
            })}</tbody>
          </table>
          </div>
        </div>
        <div style={adminCard}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Per API</div>
          <div className="admin-table-scroll">
          <table>
            <thead><tr><th style={adminTh}>API</th><th style={thN}>Calls</th><th style={thN}>Fails</th><th style={thN}>Tokens</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{byApi.map((r, idx) => (
              <tr key={r.k} style={{ background: idx % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined }}>
                <td style={adminTd}>{r.k}</td>
                <td style={tdN}>{r.calls}</td>
                <td style={{ ...tdN, color: r.fails / Math.max(1, r.calls) > 0.2 ? adminPalette.rose : adminPalette.ink }}>{r.fails}</td>
                <td style={tdN}>{r.tok.toLocaleString()}</td>
                <td style={tdN}>{baht(r.cost)}</td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="admin-two-col">
        <div style={adminCard}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Daily totals</div>
          <div className="admin-table-scroll">
          <table>
            <thead><tr><th style={adminTh}>Day</th><th style={thN}>Calls</th><th style={thN}>Fail %</th><th style={thN}>Cost</th></tr></thead>
            <tbody>{daysArr.map((r, idx) => (
              <tr key={r.d} style={{ background: idx % 2 === 1 ? tint(adminPalette.ink, 0.02) : undefined }}>
                <td style={adminTd}>{r.d}</td>
                <td style={tdN}>{r.calls}</td>
                <td style={{ ...tdN, color: r.fails / Math.max(1, r.calls) > 0.2 ? adminPalette.rose : adminPalette.ink }}>{pct(r.fails, r.calls)}</td>
                <td style={tdN}>{baht(r.cost)}</td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        </div>
        <div style={adminCard}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Recent failures</div>
          {fails.length === 0 ? <p style={{ color: adminPalette.subtle, fontSize: 12.5 }}>No failures.</p> : (
            <div className="admin-table-scroll">
            <table>
              <thead><tr><th style={adminTh}>When</th><th style={adminTh}>Fn</th><th style={adminTh}>User</th><th style={adminTh}>Error</th></tr></thead>
              <tbody>{fails.map((r, i) => (
                <tr key={i} style={{ background: tint(adminPalette.rose, 0.04), borderLeft: `3px solid ${adminPalette.rose}` }}>
                  <td style={{ ...adminTd, whiteSpace: "nowrap", fontSize: 11 }}>{r.created_at.slice(5, 19).replace("T", " ")}</td>
                  <td style={{ ...adminTd, fontSize: 11 }}>{r.fn}</td>
                  <td style={{ ...adminTd, fontSize: 11 }}>{who(r.user_id).label}</td>
                  <td style={{ ...adminTd, fontSize: 11, color: adminPalette.rose }}>{(r.meta?.error ?? "").slice(0, 70)}</td>
                </tr>
              ))}</tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
