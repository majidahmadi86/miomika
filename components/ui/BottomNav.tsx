"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Sparkles, BookOpen, User } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";

const tabs = [
  { href: "/home",      labelTh: "หน้าหลัก",  labelEn: "Home",   icon: Home     },
  { href: "/learn",     labelTh: "เรียน",      labelEn: "Learn",  icon: BookOpen },
  { href: "/talk",      labelTh: "คุย",        labelEn: "Talk",   icon: Sparkles },
  { href: "/dashboard", labelTh: "แดชบอร์ด",  labelEn: "Growth", icon: TrendingUp },
  { href: "/me",        labelTh: "ฉัน",        labelEn: "Me",     icon: User     },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const lang = useUILanguage();

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "relative",
        width: "100%",
        flexShrink: 0,
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "#FFFFFF",
        boxShadow: "0 -6px 20px -4px rgba(26,26,24,0.06), 0 -1px 0 rgba(232,229,223,0.5)",
      }}
    >
      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          height: "64px",
          width: "100%",
          margin: 0,
          padding: 0,
          listStyle: "none",
          alignItems: "stretch",
        }}
      >
        {tabs.map(({ href, labelTh, labelEn, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const label = lang === "en" ? labelEn : labelTh;

          return (
            <li key={href} style={{ display: "flex" }}>
              <Link
                href={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  width: "100%",
                  padding: "8px 0",
                  textDecoration: "none",
                  background: "transparent",
                  border: "none",
                }}
              >
                <Icon
                  style={{
                    width: "24px",
                    height: "24px",
                    color: active ? "#34A98F" : "#9A8B73",
                    strokeWidth: 1.75,
                    transition: "color 0.18s cubic-bezier(0.4,0,0.2,1)",
                  }}
                  aria-hidden
                />
                <span
                  style={{
                    fontFamily: lang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: active ? "#34A98F" : "#9A8B73",
                    lineHeight: 1,
                    letterSpacing: "0.01em",
                    transition: "color 0.18s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
