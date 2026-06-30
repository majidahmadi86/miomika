"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Revenue", href: "/admin/revenue" },
  { label: "Cost", href: "/admin/usage" },
  { label: "Audit", href: "/admin/audit" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <div style={{ display: "flex", gap: 2, padding: "8px 12px 0", borderBottom: "0.5px solid #EDE8E0", background: "#fff", fontSize: 13, overflowX: "auto" }}>
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <a
            key={t.href}
            href={t.href}
            style={{
              padding: "8px 14px",
              fontWeight: active ? 600 : 400,
              color: active ? "#2C8E76" : "#6b675f",
              borderBottom: active ? "2px solid #2C8E76" : "2px solid transparent",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
