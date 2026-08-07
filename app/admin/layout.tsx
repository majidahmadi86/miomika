import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/guard";
import AdminNav from "@/components/admin/AdminNav";
import RangePicker from "@/components/admin/RangePicker";
import { adminPalette, FONT_DISPLAY, tint } from "@/components/admin/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        background: adminPalette.canvas,
        minHeight: "100vh",
        color: adminPalette.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          background: "#fff",
          flexWrap: "wrap",
          borderBottom: "none",
          boxShadow: `inset 0 -1px 0 transparent`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            background: `linear-gradient(90deg, ${tint(adminPalette.teal, 0.45)}, ${tint(adminPalette.gold, 0.45)})`,
            opacity: 0.55,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: FONT_DISPLAY }}>
            <span style={{ color: adminPalette.gold }}>Miomika</span>
            <span style={{ color: adminPalette.ink, fontWeight: 600 }}> admin</span>
          </div>
          <Suspense fallback={<span style={{ fontSize: 11, color: adminPalette.muted }}>range…</span>}>
            <RangePicker />
          </Suspense>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <form method="get" action="/admin/users">
            <input
              name="q"
              placeholder="Search anyone…"
              style={{
                padding: "5px 10px",
                border: `0.5px solid ${adminPalette.line}`,
                borderRadius: 99,
                fontSize: 12,
                fontFamily: "inherit",
                width: 170,
                background: adminPalette.canvas,
              }}
            />
          </form>
          <a href="/home" style={{ fontSize: 12, color: adminPalette.muted, textDecoration: "none" }}>
            back to app
          </a>
        </div>
      </div>
      <Suspense fallback={null}>
        <AdminNav />
      </Suspense>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
      <style>{`
        tr.admin-tr:hover > td { background: ${tint(adminPalette.teal, 0.04)} !important; }
      `}</style>
    </div>
  );
}
