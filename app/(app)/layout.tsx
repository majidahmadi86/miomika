"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import {
  GuestExplorationProvider,
  useGuestExploration,
} from "@/components/guest/GuestExplorationContext";
import { DesktopHoldBanner } from "@/components/layout/DesktopHoldBanner";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { Rail } from "@/components/layout/Rail";
import { useRef, useCallback, useEffect } from "react";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

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

const SCREENS = ["/home", "/learn", "/talk", "/dashboard", "/me"];

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
      <div className="mx-auto h-full w-full max-w-[680px] md:max-w-none">
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
    <div className="relative isolate h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[var(--mk-canvas)] md:flex md:h-screen md:max-h-none md:overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <AmbientBackground mode="ambient" />
      </div>
      <Rail />

      <div className="relative z-10 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-transparent md:h-full md:max-h-none md:min-h-0 md:overflow-hidden">
        <DesktopHoldBanner />
        <SwipeNavigator pathname={pathname}>
          {children}
        </SwipeNavigator>
        <div className="md:hidden"><BottomNav /></div>
        {pathname !== "/talk" && <div className="md:hidden"><InstallPrompt /></div>}
      </div>

    </div>
  );
}
