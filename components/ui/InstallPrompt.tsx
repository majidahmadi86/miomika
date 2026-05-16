"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "miomika-install-dismissed";
const SESSION_KEY = "miomika-install-session-dismissed";
const PERMANENT_KEY = "miomika-install-dismissed-permanent";
const MS_24H = 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type DismissRecord = { at: number; count: number };

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
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
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [comeback, setComeback] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      if (!canShowInstallPrompt()) return;

      const event = e as BeforeInstallPromptEvent;
      setComeback(isComebackPrompt());
      setPrompt(event);
      window.setTimeout(() => {
        if (canShowInstallPrompt()) setShow(true);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = useCallback(() => {
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

    setShow(false);
  }, []);

  const handleInstall = useCallback(() => {
    void prompt?.prompt();
    setShow(false);
  }, [prompt]);

  if (!show || !prompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-[#EAD0DB] bg-white p-4 shadow-xl">
      <p className="text-sm font-medium text-[#1A1A1A]">
        {comeback
          ? "กลับมาแล้วค่า~ ติดตั้งหนูไว้เลยนะคะ จะได้เจอกันง่ายขึ้น~"
          : "ติดตั้งหนูไว้ที่หน้าจอได้นะคะ~"}
      </p>
      <p className="mt-0.5 text-xs text-[#888888]">Add Miomi to your home screen</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 rounded-full bg-[#8B1A35] py-2 text-xs font-medium text-white transition-transform active:scale-[0.97]"
        >
          ติดตั้งเลยค่า
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full border border-[#EAD0DB] px-4 py-2 text-xs text-[#888888] transition-transform active:scale-[0.97]"
        >
          ไว้ก่อน
        </button>
      </div>
    </div>
  );
}
