"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Lock, Sparkles, User } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Me", icon: User },
] as const;

const tapClass =
  "flex h-full w-full flex-col items-center justify-center gap-0.5 transition-transform active:scale-[0.97]";

export function BottomNav() {
  const pathname = usePathname();
  const { isGuest, authReady } = useGuestExploration();

  return (
    <nav
      className="z-50 flex w-full shrink-0 flex-col border-t border-[#EAD0DB] bg-white pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Primary"
    >
      <ul className="flex h-16 w-full shrink-0 items-stretch justify-between px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const guestLocked =
            authReady &&
            isGuest &&
            (href === "/create" || href === "/dashboard");
          const guestMe = authReady && isGuest && href === "/profile";
          const linkHref = guestMe ? "/signup" : href;

          const inner = (
            <>
              <span
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl px-3 py-1.5",
                  active && "bg-[#FBEAF0]",
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 shrink-0",
                    active ? "text-[#8B1A35]" : "text-[#AAAAAA]",
                    guestLocked && !active && "opacity-50",
                  )}
                  strokeWidth={2}
                  aria-hidden
                />
                {active ? (
                  <>
                    <span
                      className="mt-0.5 h-1 w-1 rounded-full bg-[#8B1A35]"
                      aria-hidden
                    />
                    <span className="text-[10px] font-medium leading-none text-[#8B1A35]">
                      {label}
                    </span>
                  </>
                ) : null}
              </span>
              {guestLocked ? (
                <Lock
                  className="absolute right-1 top-2 h-3 w-3 text-[#8B1A35]"
                  strokeWidth={2.5}
                  aria-hidden
                />
              ) : null}
            </>
          );

          return (
            <li key={href} className="relative flex flex-1">
              <Link href={linkHref} className={cn(tapClass, "relative")}>
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
