"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "miomika-install-prompt-shown";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* noop */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    timerRef.current = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return;
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* noop */
      }
      if (!isStandalone()) setVisible(true);
    }, 30000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredRef.current;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    deferredRef.current = null;
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-3 md:hidden"
      role="dialog"
      aria-label="Install Miomika"
    >
      <div className="rounded-2xl border border-rose-border bg-white px-4 py-3 shadow-lg">
        <p className="text-[12px] font-medium leading-snug text-neutral-800">
          ติดตั้งหนูไว้ที่หน้าจอได้นะคะ~ จะได้เจอกันง่ายขึ้นค่า
        </p>
        <p className="mt-1 text-[9px] leading-snug text-nav-muted">
          Add me to your home screen so we can meet easier~
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void install()}
            className="flex-1 rounded-full bg-rose-accent py-2 text-[11px] font-medium text-white transition-colors hover:bg-rose-mid"
          >
            ติดตั้งเลย
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-full border border-rose-border bg-white px-3 py-2 text-[11px] font-medium text-nav-muted transition-colors hover:bg-rose-light"
          >
            ไว้ก่อนนะคะ
          </button>
        </div>
      </div>
    </div>
  );
}
