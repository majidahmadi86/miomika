"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useInstallBannerStore } from "@/lib/ui/install-banner-store";

const DISMISS_KEY = "miomika-install-dismissed";
const SESSION_KEY = "miomika-install-session-dismissed";
const PERMANENT_KEY = "miomika-install-dismissed-permanent";
const HOME_DISMISS_KEY = "miomika.install_prompt_dismissed";
const MS_24H = 24 * 60 * 60 * 1000;
const HOME_SHOW_DELAY_MS = 10_000;
const HOME_AUTO_DISMISS_MS = 8_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type DismissRecord = { at: number; count: number };

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isHomeDismissed(): boolean {
  try {
    return localStorage.getItem(HOME_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function getDismissRecord(): DismissRecord | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DismissRecord;
  } catch {
    return null;
  }
}

function canShowInstallPrompt(): boolean {
  if (isStandalone()) return false;
  if (localStorage.getItem(PERMANENT_KEY) === "1") return false;

  const record = getDismissRecord();
  if (!record) return true;
  if (record.count >= 2) return false;

  if (record.count === 1) {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
    if (Date.now() - record.at < MS_24H) return false;
    return true;
  }

  return true;
}

function isComebackPrompt(): boolean {
  const record = getDismissRecord();
  if (!record || record.count !== 1) return false;
  return Date.now() - record.at >= MS_24H;
}

export function InstallPrompt() {
  const pathname = usePathname();
  const isHome = pathname === "/home";
  const setBannerVisible = useInstallBannerStore((s) => s.setVisible);

  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [comeback, setComeback] = useState(false);
  const autoDismissRef = useRef<number | null>(null);
  const homeShowTimerRef = useRef<number | null>(null);

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissRef.current) {
      window.clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  }, []);

  const hideBanner = useCallback(() => {
    clearAutoDismiss();
    setShow(false);
    setBannerVisible(false);
  }, [clearAutoDismiss, setBannerVisible]);

  const dismissHome = useCallback(() => {
    try {
      localStorage.setItem(HOME_DISMISS_KEY, "1");
    } catch {
      // private mode — best effort
    }
    hideBanner();
  }, [hideBanner]);

  const scheduleHomeAutoDismiss = useCallback(() => {
    clearAutoDismiss();
    autoDismissRef.current = window.setTimeout(() => {
      autoDismissRef.current = null;
      dismissHome();
    }, HOME_AUTO_DISMISS_MS);
  }, [clearAutoDismiss, dismissHome]);

  const revealBanner = useCallback(() => {
    setShow(true);
    setBannerVisible(true);
    if (isHome) scheduleHomeAutoDismiss();
  }, [isHome, scheduleHomeAutoDismiss, setBannerVisible]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setPrompt(event);

      if (isHome) {
        if (isHomeDismissed() || isStandalone()) return;
        return;
      }

      if (!canShowInstallPrompt()) return;
      setComeback(isComebackPrompt());
      window.setTimeout(() => {
        if (canShowInstallPrompt()) revealBanner();
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isHome, revealBanner]);

  useEffect(() => {
    if (!isHome || isStandalone() || isHomeDismissed()) return;

    homeShowTimerRef.current = window.setTimeout(() => {
      homeShowTimerRef.current = null;
      if (isHomeDismissed()) return;
      revealBanner();
    }, HOME_SHOW_DELAY_MS);

    return () => {
      if (homeShowTimerRef.current) {
        window.clearTimeout(homeShowTimerRef.current);
        homeShowTimerRef.current = null;
      }
    };
  }, [isHome, revealBanner]);

  useEffect(() => {
    return () => {
      clearAutoDismiss();
      if (homeShowTimerRef.current) {
        window.clearTimeout(homeShowTimerRef.current);
      }
      setBannerVisible(false);
    };
  }, [clearAutoDismiss, setBannerVisible]);

  const handleDismiss = useCallback(() => {
    if (isHome) {
      dismissHome();
      return;
    }

    const record = getDismissRecord();
    if (!record) {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ at: Date.now(), count: 1 } satisfies DismissRecord),
      );
      sessionStorage.setItem(SESSION_KEY, "1");
    } else if (record.count === 1) {
      localStorage.setItem(PERMANENT_KEY, "1");
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ at: record.at, count: 2 } satisfies DismissRecord),
      );
    }
    hideBanner();
  }, [dismissHome, hideBanner, isHome]);

  const handleInstall = useCallback(() => {
    void prompt?.prompt()?.then(() => {
      try {
        localStorage.setItem(HOME_DISMISS_KEY, "1");
      } catch {
        // noop
      }
    });
    hideBanner();
  }, [hideBanner, prompt]);

  const canRender = show && (isHome || prompt !== null);

  return (
    <AnimatePresence>
      {canRender ? (
        <motion.div
          key="install-prompt"
          className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl border border-[#EDE8E0] bg-white p-4"
          style={{
            boxShadow:
              "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)",
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.36, ease: "easeIn" } }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-sm font-medium text-[#1A1A1A]">
            {comeback
              ? "กลับมาแล้วค่า~ ติดตั้งหนูไว้เลยนะคะ จะได้เจอกันง่ายขึ้น~"
              : "ติดตั้งหนูไว้ที่หน้าจอได้นะคะ~"}
          </p>
          <p className="mt-0.5 text-xs text-[#9A8B73]">Add Miomi to your home screen</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              disabled={!prompt}
              className="flex-1 rounded-full py-2 text-xs font-medium text-white transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)" }}
            >
              ติดตั้งเลยค่า
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-[#EDE8E0] px-4 py-2 text-xs text-[#9A8B73] transition-transform active:scale-[0.97]"
            >
              ไว้ก่อน
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
