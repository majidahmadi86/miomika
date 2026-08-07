import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/guard";
import AdminNav from "@/components/admin/AdminNav";
import RangePicker from "@/components/admin/RangePicker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        background: "#FBFAF6",
        minHeight: "100vh",
        color: "#2A2A28",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "0.5px solid #EDE8E0",
          background: "#fff",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>Miomika admin</div>
          <Suspense fallback={<span style={{ fontSize: 11, color: "#9A8B73" }}>range…</span>}>
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
                border: "0.5px solid #D9D3C8",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "inherit",
                width: 170,
                background: "#FBFAF6",
              }}
            />
          </form>
          <a href="/home" style={{ fontSize: 12, color: "#9A8B73", textDecoration: "none" }}>
            back to app
          </a>
        </div>
      </div>
      <Suspense fallback={null}>
        <AdminNav />
      </Suspense>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
