import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/guard";
import AdminNav from "@/components/admin/AdminNav";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scroll root: globals.css locks html/body overflow:hidden below md.
 * This layout owns a flex column at 100dvh; only the content pane scrolls
 * (flex-1 min-h-0 overflow-y-auto) · same lesson as /pricing.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div
      className="flex h-[100dvh] flex-col"
      style={{
        fontFamily: FONT_DISPLAY,
        background: adminPalette.canvas,
        color: adminPalette.ink,
      }}
    >
      <Suspense
        fallback={
          <div className="shrink-0" style={{ padding: 14, background: "#fff", fontSize: 12, color: adminPalette.muted }}>
            Miomika admin
          </div>
        }
      >
        <AdminHeader />
      </Suspense>
      <div className="shrink-0">
        <Suspense fallback={null}>
          <AdminNav />
        </Suspense>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-8"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>{children}</div>
      </div>
      <style>{`
        tr.admin-tr:hover > td { background: ${tint(adminPalette.teal, 0.04)} !important; }
        .admin-hscroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-snap-type: x proximity; }
        .admin-hscroll::-webkit-scrollbar { display: none; }
        .admin-kpi-grid { display: grid; gap: 10px; grid-template-columns: 1fr; margin-bottom: 12px; }
        @media (min-width: 640px) { .admin-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .admin-kpi-grid { grid-template-columns: repeat(4, 1fr); } }
        .admin-two-col { display: grid; gap: 10px; grid-template-columns: 1fr; }
        @media (min-width: 768px) { .admin-two-col { grid-template-columns: 1fr 1fr; } }
        .admin-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .admin-table-scroll > table { min-width: 640px; width: 100%; border-collapse: collapse; }
        .admin-filter { display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
        .admin-filter > div, .admin-filter > label { width: 100%; }
        .admin-filter select, .admin-filter input[type="text"], .admin-filter input[type="number"] { width: 100%; box-sizing: border-box; }
        .admin-filter .admin-apply { width: 100%; }
        @media (min-width: 768px) {
          .admin-filter { flex-direction: row; flex-wrap: wrap; align-items: flex-end; }
          .admin-filter > div, .admin-filter > label { width: auto; }
          .admin-filter .admin-apply { width: auto; }
        }
        .admin-check { min-height: 40px; display: flex; align-items: center; gap: 8px; }
        .admin-users-table { display: none; }
        .admin-users-cards { display: flex; flex-direction: column; gap: 8px; }
        @media (min-width: 768px) {
          .admin-users-table { display: block; }
          .admin-users-cards { display: none; }
        }
        .admin-user-card {
          display: block; text-decoration: none; color: inherit;
          background: #fff; border: 0.5px solid ${adminPalette.line}; border-radius: 12px; padding: 12px;
        }
        .admin-actions-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        @media (max-width: 767px) {
          .admin-actions-row { flex-direction: column; align-items: stretch; }
          .admin-actions-row > button, .admin-actions-row > select, .admin-actions-row > input { width: 100%; box-sizing: border-box; }
        }
      `}</style>
    </div>
  );
}
