"use client";

/**
 * Global error boundary for the (app) segment. Miomi delivers the error —
 * never red toasts, never "Something went wrong" (MIOMIKA.md §4.2 forbidden).
 *
 * Reports to Sentry when DSN is configured.
 */

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#FAFAF6] px-6">
      <Image
        src="/miomi/thinking.png"
        alt="Miomi"
        width={160}
        height={160}
        priority
        className="object-contain"
      />
      <h1 className="mt-6 text-center text-xl font-semibold text-[#1A1A18]">
        หนูสะดุดนิดหนึ่งค่า~
      </h1>
      <p className="mt-1 text-center text-sm text-[#9A8B73]">
        I tripped a little — let&apos;s try that again together.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-full bg-gradient-to-br from-[#F9A8D4] to-[#DB2777] py-3 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(219,39,119,0.4)]"
        >
          ลองอีกครั้ง · Try again
        </button>
        <Link
          href="/home"
          className="w-full rounded-full border border-[#EDE8E0] bg-white py-3 text-center text-sm font-medium text-[#9A8B73]"
        >
          กลับหน้าหลัก · Go home
        </Link>
      </div>
    </div>
  );
}
