"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { withRange } from "@/lib/admin/time-range";

const TABS = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Revenue", href: "/admin/revenue" },
  { label: "Cost", href: "/admin/usage" },
  { label: "Health", href: "/admin/health" },
  { label: "Audit", href: "/admin/audit" },
];

export default function AdminNav() {
  const path = usePathname();
  const sp = useSearchParams();
  const rangeQs = (() => {
    const range = sp.get("range") || "7d";
    const from = sp.get("from");
    const to = sp.get("to");
    if (range === "custom" && (from || to)) {
      const p = new URLSearchParams();
      p.set("range", "custom");
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      return p.toString();
    }
    return `range=${range}`;
  })();

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: "6px 12px 0",
        borderBottom: "0.5px solid #EDE8E0",
        background: "#fff",
        fontSize: 12.5,
        overflowX: "auto",
      }}
    >
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <a
            key={t.href}
            href={withRange(t.href, rangeQs)}
            style={{
              padding: "7px 12px",
              fontWeight: active ? 700 : 500,
              color: active ? "#1F7A68" : "#6b675f",
              borderBottom: active ? "2px solid #34A98F" : "2px solid transparent",
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
