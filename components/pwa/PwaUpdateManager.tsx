"use client";

/**
 * Registers the service worker and keeps installed / homescreen clients on the
 * latest deploy. Auto-reloads when safe; defers on /talk with a gentle banner.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, Sparkles, X } from "lucide-react";
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

  // App mounted OK → clear the one-shot error-reload guards so a future
  // transient error can still self-recover once.
  useEffect(() => {
    try {
      sessionStorage.removeItem("mk_global_error_reload");
      sessionStorage.removeItem("mk_app_error_reload");
    } catch {
      /* storage blocked — nothing to clear */
    }
  }, []);

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
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
        zIndex: 95,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <div
        role="status"
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: "380px",
          display: "flex",
          alignItems: "center",
          gap: "11px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "0.5px solid #EDE8E0",
          borderRadius: "20px",
          padding: "11px 12px 11px 14px",
          boxShadow: "0 10px 30px rgba(26,26,24,0.12), 0 2px 6px rgba(26,26,24,0.04)",
          animation: "miomiUpdatePop 0.42s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #FFF4E8 0%, #FFE3F0 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={15} color="#F19CC4" strokeWidth={2} />
        </span>
        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: "12.5px",
            fontWeight: 500,
            lineHeight: 1.35,
            color: "#6B5E4E",
            fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
          }}
        >
          {tr("pwa_update_ready", lang)}
        </p>
        <button
          type="button"
          onClick={applyUpdate}
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            border: "none",
            borderRadius: "999px",
            padding: "8px 14px",
            cursor: "pointer",
            background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
            color: "#FFFFFF",
            fontSize: "12.5px",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(52,169,143,0.28)",
            fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
          }}
        >
          <RefreshCw size={13} strokeWidth={2} />
          {tr("pwa_update_reload", lang)}
        </button>
        <button
          type="button"
          onClick={() => setUpdateReady(false)}
          aria-label={tr("companion_dismiss", lang)}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            padding: "3px",
            borderRadius: "999px",
          }}
        >
          <X size={15} color="#B8AC9C" strokeWidth={2} />
        </button>
        <style>{`
          @keyframes miomiUpdatePop {
            0% { opacity: 0; transform: translateY(14px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __MIOMIKA_BUILD_ID__?: string;
  }
}
