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

export function BottomNav() {
  const pathname = usePathname();
  const { isGuest, authReady, openLockedTabPrompt } = useGuestExploration();

  return (
    <nav
      className="z-50 flex w-full shrink-0 flex-col border-t-[0.5px] border-rose-border bg-white"
      aria-label="Primary"
    >
      <ul className="flex h-14 w-full shrink-0 items-stretch justify-between px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const tabClass = cn(
            "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1",
            active ? "text-rose-accent" : "text-nav-muted",
          );
          const guestLocked =
            authReady &&
            isGuest &&
            (href === "/create" || href === "/dashboard");
          const guestMe = authReady && isGuest && href === "/profile";

          if (guestLocked) {
            return (
              <li key={href} className="flex flex-1">
                <button
                  type="button"
                  onClick={() => openLockedTabPrompt()}
                  className={cn(tabClass, "relative")}
                  aria-label={`${label} — sign up to unlock`}
                >
                  <span className="relative">
                    <Icon
                      className="h-5 w-5 shrink-0 blur-[0.4px] contrast-90 opacity-50"
                      aria-hidden
                    />
                    <Lock
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 text-rose-accent"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </span>
                  <span className="text-[8px] font-medium leading-none opacity-55">
                    {label}
                  </span>
                </button>
              </li>
            );
          }

          const linkHref = guestMe ? "/signup" : href;

          return (
            <li key={href} className="flex flex-1">
              <Link href={linkHref} className={tabClass}>
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="text-[8px] font-medium leading-none">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div
        className="shrink-0 bg-white [height:env(safe-area-inset-bottom,0px)]"
        aria-hidden
      />
    </nav>
  );
}
