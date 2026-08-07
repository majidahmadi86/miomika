import { Suspense } from "react";
import { UserPlus, Users, Coins, Flame } from "lucide-react";
import { parseRange } from "@/lib/admin/time-range";
import { overviewMetrics } from "@/lib/admin/metrics";
import { buildAttentionItems } from "@/lib/admin/attention";
import { buildWatchboard } from "@/lib/admin/watchboard";
import AdminPageHeader, { adminCard, adminPagePad } from "@/components/admin/AdminPageHeader";
import { AdminBarChart, AdminLineChart } from "@/components/admin/Chart";
import { KpiCard, adminPalette, FONT_DISPLAY } from "@/components/admin/ui";
import { AttentionStrip } from "@/components/admin/AttentionStrip";
import Watchboard from "@/components/admin/Watchboard";
import Pulse from "@/components/admin/Pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Command-center Overview · fits 1280×800 without scroll on desktop. */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const [metrics, attention, watch] = await Promise.all([
    overviewMetrics(range),
    buildAttentionItems(range),
    buildWatchboard(range),
  ]);

  const dual = metrics.costSeries.map((c, i) => ({
    t: c.t,
    cost: Math.round(c.v * 100) / 100,
    revenue: Math.round((metrics.revenueSeries[i]?.v ?? 0) * 100) / 100,
  }));

  const panel = { ...adminCard, padding: "10px 12px" as const };

  return (
    <div
      className="admin-cc"
      style={{
        ...adminPagePad,
        paddingTop: 10,
        paddingBottom: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <AdminPageHeader title="Overview" rangeLabel={range.label} />
      <AttentionStrip items={attention} />

      <div className="admin-kpi-grid" style={{ marginBottom: 0 }}>
        <KpiCard color={adminPalette.teal} icon={UserPlus} label="Signups" value={Math.round(metrics.signups.value).toLocaleString()} deltaPct={metrics.signups.deltaPct} spark={metrics.signups.spark} />
        <KpiCard color={adminPalette.mint} icon={Users} label="Active users" value={Math.round(metrics.active.value).toLocaleString()} deltaPct={metrics.active.deltaPct} spark={metrics.active.spark} />
        <KpiCard color={adminPalette.gold} icon={Coins} label="Pack revenue" value={`฿${Math.round(metrics.revenue.value).toLocaleString()}`} deltaPct={metrics.revenue.deltaPct} spark={metrics.revenue.spark} />
        <KpiCard color={adminPalette.amber} icon={Flame} label="AI cost" value={`฿${Math.round(metrics.cost.value).toLocaleString()}`} deltaPct={metrics.cost.deltaPct} invertDelta spark={metrics.cost.spark} />
      </div>

      <div className="admin-cc-row">
        <div style={panel}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2, fontFamily: FONT_DISPLAY }}>Cost vs pack revenue</div>
          <div style={{ fontSize: 10.5, color: adminPalette.muted, marginBottom: 4 }}>AI cost (฿) · room-pack purchases (฿)</div>
          <AdminLineChart
            data={dual}
            bucket={range.bucket}
            height={200}
            area
            glowDots
            series={[
              { key: "cost", name: "AI cost", color: adminPalette.amber },
              { key: "revenue", name: "Pack revenue", color: adminPalette.teal },
            ]}
          />
        </div>
        <div style={{ ...panel, minHeight: 0, maxHeight: 320, overflow: "auto" }}>
          <Watchboard services={watch.services} reminders={watch.reminders} remindersReady={watch.remindersReady} />
        </div>
      </div>

      <div className="admin-cc-row">
        <div style={{ ...panel, maxHeight: 240, overflow: "hidden" }}>
          <Suspense fallback={<div style={{ fontSize: 12, color: adminPalette.muted }}>pulse…</div>}>
            <Pulse />
          </Suspense>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0 }}>
          <div style={panel}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Signups</div>
            <AdminBarChart data={metrics.signupsSeries} bucket={range.bucket} name="Signups" color={adminPalette.teal} height={160} />
          </div>
          <div style={panel}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, fontFamily: FONT_DISPLAY }}>Active</div>
            <AdminLineChart
              data={metrics.activeSeries}
              bucket={range.bucket}
              height={160}
              area
              series={[{ key: "v", name: "Active", color: adminPalette.mint }]}
            />
          </div>
        </div>
      </div>

      <style>{`
        .admin-cc-row { display: grid; grid-template-columns: 1fr; gap: 8px; }
        @media (min-width: 1024px) {
          .admin-cc-row { grid-template-columns: 1.15fr 1fr; align-items: stretch; }
          .admin-cc { max-height: calc(100dvh - 108px); overflow: hidden; }
          .admin-cc .admin-kpi-grid { gap: 8px; }
        }
        @media (max-width: 1023px) {
          .admin-cc { max-height: none; overflow: visible; }
        }
      `}</style>
    </div>
  );
}
