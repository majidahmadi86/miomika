"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "หน้าหลัก", icon: Home },
  { href: "/create", label: "เรียน", icon: Sparkles },
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/profile", label: "ฉัน", icon: User },
] as const;

const tapClass =
  "flex h-full w-full flex-col items-center justify-center gap-0.5 transition-transform active:scale-[0.97]";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="z-50 flex w-full shrink-0 flex-col border-t border-[#EAD0DB] bg-white pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Primary"
    >
      <ul className="flex h-[72px] w-full shrink-0 items-stretch justify-between px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;

          return (
            <li key={href} className="flex flex-1">
              <Link href={href} className={tapClass}>
                <span
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl px-3 py-1",
                    active && "bg-[#FBEAF0]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-7 w-7 shrink-0",
                      active ? "text-[#8B1A35]" : "text-[#AAAAAA]",
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "mt-0.5 text-[11px] font-medium leading-none",
                      active ? "text-[#8B1A35]" : "text-[#AAAAAA]",
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
