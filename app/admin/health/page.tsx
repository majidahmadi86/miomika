import { createServiceClient } from "@/lib/supabase/service";
import { parseRange, rangeIso } from "@/lib/admin/time-range";
import { providerOkSeries, rateLimitSeries } from "@/lib/admin/metrics";
import AdminPageHeader, { adminCard, adminPagePad } from "@/components/admin/AdminPageHeader";
import { AdminLineChart, AdminBarChart } from "@/components/admin/Chart";
import ExpandableFailTable, { type FailRow } from "@/components/admin/ExpandableFailTable";
import { StatusPill, IconChip, PROVIDER_COLORS, adminPalette, FONT_DISPLAY } from "@/components/admin/ui";
import { Webhook, RotateCcw } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(d: string | null | undefined) {
  if (!d) return "·";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ago(d: string | null | undefined): string {
  if (!d) return "never";
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600e3);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60e3))}m ago`;
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Pill = { label: string; tone: "ok" | "warn" | "fail" };

export default async function AdminHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { fromIso, toIso } = rangeIso(range);
  const supabase = await createServiceClient();

  const [okSeries, rlSeries, refundRes, llmFails, webhookFails, webhookLatest] = await Promise.all([
    providerOkSeries(range),
    rateLimitSeries(range),
    supabase
      .from("room_credit_ledger")
      .select("user_id, delta, reason, ref, created_at")
      .eq("reason", "refund")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("llm_usage")
      .select("created_at, provider, fn, ok, meta")
      .eq("ok", false)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("webhook_events")
      .select("created_at, type, ok, detail, event_id")
      .eq("ok", false)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("webhook_events")
      .select("created_at, type, ok")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const refunds = (refundRes.data ?? []) as { user_id: string; delta: number; reason: string; ref: string | null; created_at: string }[];

  // Provider ok-rate chart: average ok% across providers per bucket (or one line per top provider).
  const providers = [...new Set(okSeries.map((r) => r.provider))].slice(0, 4);
  const times = [...new Set(okSeries.map((r) => r.t))].sort();
  const okChart = times.map((t) => {
    const row: Record<string, string | number> = { t };
    for (const p of providers) {
      const hit = okSeries.find((r) => r.t === t && r.provider === p);
      row[p] = hit ? hit.okPct : 100;
    }
    return row;
  });

  const lastStripe = (webhookLatest.data ?? [])[0] as { created_at: string; type: string | null; ok: boolean } | undefined;
  const stripeLagMs = lastStripe ? range.to.getTime() - new Date(lastStripe.created_at).getTime() : Infinity;
  const stripeLagWarn = stripeLagMs > 24 * 3600e3;

  const failRows: FailRow[] = [];
  for (const r of (llmFails.data ?? []) as { created_at: string; provider: string; fn: string; meta: { error?: string } | null }[]) {
    failRows.push({
      source: "llm_usage",
      when: fmt(r.created_at),
      label: `${r.provider} · ${r.fn}`,
      detail: r.meta?.error ?? null,
      payload: r.meta ? JSON.stringify(r.meta, null, 2) : null,
    });
  }
  for (const r of (webhookFails.data ?? []) as { created_at: string; type: string | null; detail: string | null; event_id: string | null }[]) {
    failRows.push({
      source: "webhook_events",
      when: fmt(r.created_at),
      label: r.type || "stripe",
      detail: r.detail,
      payload: JSON.stringify({ event_id: r.event_id, type: r.type, detail: r.detail }, null, 2),
    });
  }
  failRows.sort((a, b) => (a.when < b.when ? 1 : -1));
  const topFails = failRows.slice(0, 20);

  // Status pills
  const llmFailCount = (llmFails.data ?? []).length;
  const whFailCount = (webhookFails.data ?? []).length;
  const pills: Pill[] = [];
  if (llmFailCount === 0 && whFailCount === 0 && !stripeLagWarn && refunds.length === 0) {
    pills.push({ label: "All ok", tone: "ok" });
  } else {
    if (llmFailCount > 0) pills.push({ label: `${llmFailCount} AI failures`, tone: "fail" });
    if (whFailCount > 0) pills.push({ label: `${whFailCount} webhook failures`, tone: "fail" });
    if (stripeLagWarn) pills.push({ label: "Stripe webhook lag >24h", tone: "warn" });
    if (refunds.length > 0) pills.push({ label: `${refunds.length} room refunds`, tone: "warn" });
    if (pills.every((p) => p.tone !== "fail") && pills.length) {
      /* warnings only */
    } else if (pills.length === 0) {
      pills.push({ label: "All ok", tone: "ok" });
    }
  }

  const pillTone = (tone: Pill["tone"]): "ok" | "warn" | "error" =>
    tone === "ok" ? "ok" : tone === "warn" ? "warn" : "error";

  return (
    <div style={adminPagePad}>
      <AdminPageHeader title="Health" rangeLabel={range.label} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {pills.map((p) => (
          <StatusPill key={p.label} tone={pillTone(p.tone)} label={p.label} />
        ))}
      </div>

      <div style={{ ...adminCard, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Provider ok-rate</div>
        <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 8 }}>From llm_usage.ok · % successful calls per bucket</div>
        {okChart.length === 0 ? (
          <div style={{ fontSize: 12.5, color: adminPalette.subtle }}>No AI calls in range.</div>
        ) : (
          <AdminLineChart
            data={okChart}
            bucket={range.bucket}
            height={220}
            series={providers.map((p) => ({
              key: p,
              name: p,
              color: PROVIDER_COLORS[p] ?? adminPalette.violet,
            }))}
          />
        )}
      </div>

      <div className="admin-two-col" style={{ marginBottom: 10 }}>
        <div style={adminCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <IconChip icon={Webhook} color={adminPalette.sky} />
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Webhook recency</div>
          </div>
          <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 8 }}>Stripe only (webhook_events has no multi-provider amounts)</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0" }}>
            <span style={{ color: adminPalette.muted }}>Stripe</span>
            <span style={{ fontWeight: 700, fontFamily: FONT_DISPLAY, color: stripeLagWarn ? adminPalette.amber : adminPalette.ink }}>
              {lastStripe ? `${ago(lastStripe.created_at)}${lastStripe.ok ? "" : " · last failed"}` : "no events"}
              {stripeLagWarn ? " · lag warning" : ""}
            </span>
          </div>
          {lastStripe ? (
            <div style={{ fontSize: 11, color: adminPalette.subtle }}>Last type: {lastStripe.type || "·"} · {fmt(lastStripe.created_at)}</div>
          ) : null}
        </div>
        <div style={adminCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <IconChip icon={RotateCcw} color={adminPalette.teal} />
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Room auto-refunds</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT_DISPLAY, color: refunds.length ? adminPalette.amber : adminPalette.teal }}>{refunds.length}</div>
          <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 8 }}>room_credit_ledger reason=refund in range</div>
          {refunds.length === 0 ? (
            <div style={{ fontSize: 12.5, color: adminPalette.subtle }}>None.</div>
          ) : (
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {refunds.slice(0, 12).map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", gap: 8 }}>
                  <span style={{ color: adminPalette.muted, overflow: "hidden", textOverflow: "ellipsis" }}>{r.user_id.slice(0, 8)} · {r.ref || "·"}</span>
                  <span style={{ color: adminPalette.teal, flexShrink: 0 }}>+{r.delta}</span>
                  <span style={{ color: adminPalette.subtle, flexShrink: 0 }}>{fmt(r.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ ...adminCard, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Rate-limit hits</div>
        <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 8 }}>
          Sum of rate_limit_hits.count by {range.bucket} (updated_at)
          {rlSeries.every((p) => p.v === 0) ? ` · no hits in range` : ""}
        </div>
        <AdminBarChart data={rlSeries} bucket={range.bucket} name="Hits" color={adminPalette.violet} height={180} />
      </div>

      <div style={adminCard}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Latest failed / error events</div>
        <div style={{ fontSize: 11, color: adminPalette.muted, marginBottom: 8 }}>llm_usage ok=false + webhook_events ok=false · tap row for payload</div>
        <ExpandableFailTable rows={topFails} />
      </div>
    </div>
  );
}
