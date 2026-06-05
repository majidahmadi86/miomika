"use client";

/**
 * Registers the service worker and keeps installed / homescreen clients on the
 * latest deploy. Auto-reloads when safe; defers on /talk with a gentle banner.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/strings";

type VersionPayload = { buildId: string };

function readEmbeddedBuildId(): string {
  if (typeof window === "undefined") return "dev";
  return window.__MIOMIKA_BUILD_ID__ ?? "dev";
}

export function PwaUpdateManager() {
  const pathname = usePathname();
  const lang = useUILanguage();
  const [updateReady, setUpdateReady] = useState(false);
  const reloadingRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const applyUpdate = useCallback(() => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;

    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 120);
  }, []);

  const markUpdateReady = useCallback(() => {
    if (pathnameRef.current === "/talk") {
      setUpdateReady(true);
      return;
    }
    applyUpdate();
  }, [applyUpdate]);

  const checkForUpdate = useCallback(async () => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registration = registrationRef.current;
    if (!registration) return;

    try {
      await registration.update();
      const response = await fetch(`/version.json?_=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const remote = (await response.json()) as VersionPayload;
      const embedded = readEmbeddedBuildId();

      if (remote.buildId && remote.buildId !== embedded) {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        markUpdateReady();
      }
    } catch {
      // Offline or transient — try again on next visibility change.
    }
  }, [markUpdateReady]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      markUpdateReady();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      registrationRef.current = registration;

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state !== "activated") return;
          if (!navigator.serviceWorker.controller) return;
          markUpdateReady();
        });
      });

      if (registration.waiting) {
        setUpdateReady(pathnameRef.current === "/talk");
        if (pathnameRef.current !== "/talk") {
          applyUpdate();
        }
      }

      void checkForUpdate();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [applyUpdate, checkForUpdate, markUpdateReady]);

  useEffect(() => {
    if (!updateReady || pathname === "/talk") return;
    applyUpdate();
  }, [applyUpdate, pathname, updateReady]);

  if (!updateReady || pathname !== "/talk") return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        zIndex: 95,
        background: "#FFFFFF",
        border: "1px solid #EDE8E0",
        borderRadius: "12px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 8px 24px rgba(26, 26, 24, 0.08)",
      }}
    >
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: "13px",
          fontWeight: 500,
          color: "#9A8B73",
          fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
        }}
      >
        {tr("pwa_update_ready", lang)}
      </p>
      <button
        type="button"
        onClick={applyUpdate}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          border: "none",
          borderRadius: "999px",
          padding: "8px 14px",
          cursor: "pointer",
          background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
          color: "#1A1A18",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
        }}
      >
        <RefreshCw size={14} strokeWidth={1.75} />
        {tr("pwa_update_reload", lang)}
      </button>
      <button
        type="button"
        onClick={() => setUpdateReady(false)}
        aria-label={tr("companion_dismiss", lang)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          padding: "4px",
          borderRadius: "999px",
        }}
      >
        <X size={16} color="#9A8B73" strokeWidth={1.75} />
      </button>
    </div>
  );
}

declare global {
  interface Window {
    __MIOMIKA_BUILD_ID__?: string;
  }
}
