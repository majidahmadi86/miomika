"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import {
  BookOpen,
  Home,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import {
  GuestExplorationProvider,
  useGuestExploration,
} from "@/components/guest/GuestExplorationContext";
import { AmbientCompanion } from "@/components/companion/AmbientCompanion";
import { GuidanceHost } from "@/components/guidance/GuidanceHost";
import { DesktopHoldBanner } from "@/components/layout/DesktopHoldBanner";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { cn } from "@/lib/utils";
import { useUILanguage } from "@/lib/i18n/client";
import { useRef, useCallback, useEffect } from "react";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

const navItems = [
  { href: "/home",      Icon: Home,       labelTh: "หน้าหลัก",  labelEn: "Home"   },
  { href: "/learn",     Icon: BookOpen,   labelTh: "เรียน",      labelEn: "Learn"  },
  { href: "/talk",      Icon: Sparkles,   labelTh: "คุย",        labelEn: "Talk"   },
  { href: "/dashboard", Icon: TrendingUp, labelTh: "แดชบอร์ด",  labelEn: "Growth" },
  { href: "/me",        Icon: User,       labelTh: "ฉัน",        labelEn: "Me"     },
] as const;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GuestExplorationProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </GuestExplorationProvider>
  );
}

const SCREENS = ["/home", "/lessons", "/dashboard", "/create", "/me"];

function SwipeNavigator({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const activeIndex = SCREENS.indexOf(pathname);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const intentRef = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SCREENS.length - 1, index));
    const target = SCREENS[clamped];
    if (!target || target === pathname) return;
    
    const container = containerRef.current;
    if (!container) {
      window.location.href = target;
      return;
    }

    const vw = window.innerWidth;
    const direction = index > activeIndex ? -1 : 1;
    
    container.style.transition = "transform 0.32s cubic-bezier(0.4,0,0.2,1)";
    container.style.transform = `translateX(${direction * vw * 0.4}px)`;
    container.style.opacity = "0.6";
    
    setTimeout(() => {
      window.location.href = target;
    }, 280);
  }, [pathname, activeIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let intent: "horizontal" | "vertical" | null = null;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      intent = null;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (intent === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        intent = Math.abs(dx) > Math.abs(dy) * 1.1
          ? "horizontal"
          : "vertical";
      }

      if (intent === "horizontal") {
        const target = e.target as HTMLElement;
        if (target.closest("[data-horizontal-scroll-zone]")) {
          intent = "vertical";
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active || intent !== "horizontal") {
        active = false;
        intent = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const vw = window.innerWidth;
      const threshold = vw * 0.25;

      active = false;
      intent = null;

      if (Math.abs(dx) > threshold) {
        const direction = dx < 0 ? 1 : -1;
        goTo(activeIndex + direction);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeIndex, goTo]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-hidden"
      style={{ touchAction: "pan-y" }}
    >
      <div className="mx-auto h-full w-full max-w-[680px] md:max-w-[960px]">
        {children}
      </div>
    </div>
  );
}
function AppLayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { authReady } = useGuestExploration();
  const lang = useUILanguage();

  // Block render until auth is resolved to prevent home-content flash
  // before WelcomeScreen takes over on first visit.
  if (!authReady) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAFAF6",
          zIndex: 9999,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="relative isolate h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#FAFAF6] md:flex md:h-screen md:max-h-none md:overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <AmbientBackground mode="ambient" />
      </div>
      <aside className="relative z-10 hidden h-screen w-[80px] shrink-0 flex-col items-center border-r border-[#EFE9E0]/60 bg-white/55 py-5 backdrop-blur-xl md:flex">
        <Link
          href="/home"
          className="mb-6 text-[19px] font-medium leading-none text-[#C9A96E]"
          aria-label="Miomika"
        >
          m
        </Link>
        <nav className="flex w-full flex-1 flex-col items-center gap-1.5 px-1.5">
          {navItems.map(({ href, Icon, labelTh, labelEn }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            const label = lang === "en" ? labelEn : labelTh;
            return (
              <Link
                key={href}
                href={href}
                className="flex w-full flex-col items-center gap-1 py-1"
                aria-label={labelEn}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] transition-colors"
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
                          boxShadow: "0 6px 14px -5px rgba(52,169,143,0.45)",
                        }
                      : undefined
                  }
                >
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px]",
                      active ? "text-white" : "text-[#A89C88]",
                    )}
                    strokeWidth={active ? 2.1 : 1.85}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "leading-none",
                    active ? "font-medium text-[#34A98F]" : "text-[#A89C88]",
                  )}
                  style={{
                    fontFamily:
                      lang === "en"
                        ? "'Quicksand', sans-serif"
                        : "'Kanit', sans-serif",
                    fontSize: "9.5px",
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-3">
          <Image
            src="/miomi/idle.png"
            alt="Miomi"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        </div>
      </aside>

      <div className="relative z-10 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-transparent md:h-full md:max-h-none md:min-h-0 md:overflow-hidden">
        <DesktopHoldBanner />
        <SwipeNavigator pathname={pathname}>
          {children}
        </SwipeNavigator>
        <BottomNav />
        {pathname !== "/talk" && <InstallPrompt />}
        <AmbientCompanion />
        <GuidanceHost />
      </div>

    </div>
  );
}
