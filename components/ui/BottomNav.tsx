"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Me", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 flex h-14 w-full max-w-[390px] -translate-x-1/2 items-stretch border-t-[0.5px] border-rose-border bg-white"
      aria-label="Primary"
    >
      <ul className="flex h-full w-full items-stretch justify-between px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1",
                  active ? "text-rose-accent" : "text-nav-muted",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="text-[8px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
