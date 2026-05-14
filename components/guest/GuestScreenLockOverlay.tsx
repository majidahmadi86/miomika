"use client";

import Image from "next/image";
import Link from "next/link";
import { GUEST_TAB_LOCK_COPY } from "@/components/guest/GuestExplorationContext";

export function GuestScreenLockOverlay() {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-white/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Sign up to use this screen"
    >
      <div className="flex max-w-[min(92%,320px)] flex-col items-center gap-3 rounded-2xl border border-rose-border bg-white px-4 py-5 shadow-lg">
        <div className="h-20 w-20 shrink-0">
          <Image
            src="/miomi/happy.png"
            alt="Miomi"
            width={80}
            height={80}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="text-center">
          <p className="text-[12px] font-medium leading-snug text-neutral-800">
            {GUEST_TAB_LOCK_COPY.th}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-nav-muted">
            {GUEST_TAB_LOCK_COPY.en}
          </p>
        </div>
        <Link
          href="/signup"
          className="rounded-full bg-rose-accent px-5 py-2.5 text-center text-[11px] font-semibold text-white transition-colors hover:bg-rose-mid"
        >
          สมัครฟรี
          <span className="mt-0.5 block text-[9px] font-normal text-white/90">
            Sign up free
          </span>
        </Link>
      </div>
    </div>
  );
}
