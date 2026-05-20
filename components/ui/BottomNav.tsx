"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home",      label: "หน้าหลัก", icon: Home,            primary: false },
  { href: "/create",    label: "เรียน",     icon: Sparkles,        primary: true  },
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, primary: false },
  { href: "/profile",   label: "ฉัน",       icon: User,            primary: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="z-50 flex w-full shrink-0 flex-col border-t border-[#EAD0DB] bg-white pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Primary"
    >
      <ul className="flex h-[72px] w-full shrink-0 items-stretch justify-between px-2">
        {tabs.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href;

          if (primary) {
            return (
              <li key={href} className="flex flex-1 items-center justify-center">
                <Link
                  href={href}
                  className="relative flex flex-col items-center justify-center transition-transform active:scale-[0.97]"
                  style={{ marginTop: "-22px" }}
                >
                  {/* Raised pill */}
                  <span
                    className="flex flex-col items-center justify-center gap-0.5"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)"
                        : "linear-gradient(135deg, #FDE8F0 0%, #F9A8D4 100%)",
                      borderRadius: "999px",
                      width: "64px",
                      height: "64px",
                      boxShadow: active
                        ? "0 4px 20px rgba(219,39,119,0.35), 0 1px 4px rgba(219,39,119,0.2)"
                        : "0 4px 16px rgba(249,168,212,0.40), 0 1px 4px rgba(249,168,212,0.2)",
                      border: active ? "none" : "1.5px solid rgba(249,168,212,0.6)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <Icon
                      className="h-6 w-6 shrink-0"
                      style={{ color: active ? "#FFFFFF" : "#DB2777" }}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  {/* Label below pill */}
                  <span
                    className="mt-1 text-[10px] font-semibold leading-none"
                    style={{
                      color: active ? "#DB2777" : "#F9A8D4",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className="flex h-full w-full flex-col items-center justify-center gap-0.5 transition-transform active:scale-[0.97]"
              >
                <span
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl px-3 py-1",
                    active && "bg-[#FFF4F0]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 shrink-0",
                      active ? "text-[#DB2777]" : "text-[#C4BDB5]",
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "mt-0.5 text-[11px] font-medium leading-none",
                      active ? "text-[#DB2777]" : "text-[#C4BDB5]",
                    )}
                  >
                    {label}
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