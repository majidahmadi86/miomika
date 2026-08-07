"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Coins,
  Flame,
  Activity,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { withRange } from "@/lib/admin/time-range";
import { adminPalette, FONT_DISPLAY } from "@/components/admin/ui";

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Revenue", href: "/admin/revenue", icon: Coins },
  { label: "Cost", href: "/admin/usage", icon: Flame },
  { label: "Health", href: "/admin/health", icon: Activity },
  { label: "Audit", href: "/admin/audit", icon: ScrollText },
];

export default function AdminNav() {
  const path = usePathname();
  const sp = useSearchParams();
  const stripRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>("[data-active='1']");
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [path]);

  return (
    <div
      ref={stripRef}
      className="admin-hscroll"
      style={{
        display: "flex",
        gap: 2,
        padding: "4px 12px 0",
        borderBottom: `0.5px solid ${adminPalette.line}`,
        background: "#fff",
        fontSize: 12.5,
        fontFamily: FONT_DISPLAY,
      }}
    >
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <a
            key={t.href}
            href={withRange(t.href, rangeQs)}
            data-active={active ? "1" : "0"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 12px",
              fontWeight: active ? 700 : 500,
              color: active ? adminPalette.teal : adminPalette.muted,
              borderBottom: active ? `3px solid ${adminPalette.teal}` : "3px solid transparent",
              whiteSpace: "nowrap",
              textDecoration: "none",
              flexShrink: 0,
              scrollSnapAlign: "start",
            }}
          >
            <Icon size={14} strokeWidth={1.75} style={{ opacity: active ? 1 : 0.6 }} />
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
