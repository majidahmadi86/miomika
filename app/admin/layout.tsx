import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/guard";
import AdminNav from "@/components/admin/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div style={{ fontFamily: "'Quicksand', system-ui, sans-serif", background: "#FBFAF6", minHeight: "100vh", color: "#2A2A28" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid #EDE8E0", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>Miomika admin</div>
        <a href="/home" style={{ fontSize: 12.5, color: "#9A8B73", textDecoration: "none" }}>← back to app</a>
      </div>
      <AdminNav />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
