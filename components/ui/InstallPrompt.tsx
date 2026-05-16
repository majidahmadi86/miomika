"use client";
import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setShow(true), 30000);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !prompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-[#EAD0DB] bg-white p-4 shadow-xl">
      <p className="text-sm font-medium text-[#1A1A1A]">ติดตั้งหนูไว้ที่หน้าจอได้นะคะ~</p>
      <p className="mt-0.5 text-xs text-[#888888]">Add Miomi to your home screen</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => { prompt.prompt(); setShow(false); }}
          className="flex-1 rounded-full bg-[#8B1A35] py-2 text-xs font-medium text-white"
        >
          ติดตั้งเลยค่า
        </button>
        <button
          onClick={() => setShow(false)}
          className="rounded-full border border-[#EAD0DB] px-4 py-2 text-xs text-[#888888]"
        >
          ไว้ก่อน
        </button>
      </div>
    </div>
  );
}
