"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, MessageCircle, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home",      labelTh: "หน้าหลัก",  labelEn: "Home",   icon: Home,          primary: false },
  { href: "/dashboard", labelTh: "แดชบอร์ด",  labelEn: "Growth", icon: TrendingUp,    primary: false },
  { href: "/create",    labelTh: "เรียน",      labelEn: "Learn",  icon: MessageCircle, primary: true  },
  { href: "/invite",    labelTh: "ชวนเพื่อน",  labelEn: "Invite", icon: Gift,          primary: false },
  { href: "/profile",   labelTh: "ฉัน",        labelEn: "Me",     icon: User,          primary: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

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
      {/* SVG notch mask — cuts hole above center pill */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          top: "-22px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "76px",
          height: "22px",
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 0,
        }}
        viewBox="0 0 76 22"
        fill="none"
      >
        <path
          d="M0 22 Q0 0 38 0 Q76 0 76 22 Z"
          fill="#FFFFFF"
        />
      </svg>

      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          height: "72px",
          width: "100%",
          margin: 0,
          padding: "0 4px",
          listStyle: "none",
          alignItems: "stretch",
          position: "relative",
          zIndex: 1,
        }}
      >
        {tabs.map(({ href, labelTh, labelEn, icon: Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(href + "/");

          if (primary) {
            return (
              <li
                key={href}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: "0px",
                }}
              >
                <Link
                  href={href}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textDecoration: "none",
                    marginTop: "-22px",
                    position: "relative",
                  }}
                >
                  {/* Pill */}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: active
                        ? "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)"
                        : "linear-gradient(135deg, #FDE8F0 0%, #F9A8D4 100%)",
                      boxShadow: active
                        ? "0 8px 24px -4px rgba(219,39,119,0.50), 0 2px 6px rgba(219,39,119,0.20)"
                        : "0 6px 18px -4px rgba(249,168,212,0.55), 0 2px 4px rgba(249,168,212,0.25)",
                      transition: "all 0.25s ease",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      style={{
                        width: "28px",
                        height: "28px",
                        color: active ? "#FFFFFF" : "#DB2777",
                        strokeWidth: 2,
                      }}
                      aria-hidden
                    />
                  </span>
                  {/* Label */}
                  <span
                    style={{
                      fontFamily: "'Kanit', sans-serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: active ? "#DB2777" : "#F9A8D4",
                      marginTop: "3px",
                      lineHeight: 1,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {labelTh}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={href} style={{ display: "flex" }}>
              <Link
                href={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "3px",
                  width: "100%",
                  textDecoration: "none",
                  transition: "transform 0.15s ease",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "12px",
                    padding: "4px 10px",
                    background: active ? "#FFF0F5" : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  <Icon
                    style={{
                      width: "24px",
                      height: "24px",
                      color: active ? "#DB2777" : "#C4BDB5",
                      strokeWidth: 1.75,
                      transition: "color 0.2s ease",
                    }}
                    aria-hidden
                  />
                  <span
                    style={{
                      fontFamily: "'Kanit', sans-serif",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: active ? "#DB2777" : "#C4BDB5",
                      marginTop: "2px",
                      lineHeight: 1,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {labelTh}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
