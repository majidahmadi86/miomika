"use client";

/**
 * Global error boundary for the (app) segment. Miomi delivers the error —
 * never red toasts, never "Something went wrong" (MIOMIKA.md §4.2 forbidden).
 *
 * The warm phrase is sourced from lib/voice/warmth.ts (RECOVERY_STRUGGLE) —
 * no hardcoded Thai warm strings here per Phase-2 §C2.
 *
 * Reports to Sentry when DSN is configured.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { pickPhrase, RECOVERY_STRUGGLE } from "@/lib/voice/warmth";
import { useUILanguage } from "@/lib/i18n/client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = useUILanguage();
  // Picked once via the lazy state initializer so we don't re-roll the
  // phrase on every render. error.tsx is a Client Component that mounts
  // only post-error, so the random pick fires after hydration.
  const [phrase] = useState(() => ({
    th: pickPhrase(RECOVERY_STRUGGLE, { lang: "th" }),
    en: pickPhrase(RECOVERY_STRUGGLE, { lang: "en" }),
  }));

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const heading = lang === "th" ? phrase.th : phrase.en;
  const sub =
    lang === "th"
      ? "ลองอีกครั้งด้วยกันนะคะ~"
      : "Let's try that again together.";

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
        {heading}
      </h1>
      <p className="mt-1 text-center text-sm text-[#9A8B73]">{sub}</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-full bg-gradient-to-br from-[#E8C77A] to-[#C9A96E] py-3 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(201,169,110,0.4)]"
        >
          {lang === "th" ? "ลองอีกครั้ง · Try again" : "Try again"}
        </button>
        <Link
          href="/home"
          className="w-full rounded-full border border-[#EDE8E0] bg-white py-3 text-center text-sm font-medium text-[#9A8B73]"
        >
          {lang === "th" ? "กลับหน้าหลัก · Go home" : "Go home"}
        </Link>
      </div>
    </div>
  );
}
