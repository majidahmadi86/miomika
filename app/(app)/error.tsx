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
    // Transient first-load/chunk error after a deploy → reload once, silently.
    // Guard prevents a loop; a genuinely persistent error still shows the card.
    try {
      // WINDOW guard, not once-forever: the old flag allowed ONE silent
      // recovery per browser session — with frequent deploys, the SECOND
      // chunk error hours later showed this card ("please refresh"). Now any
      // error auto-heals silently unless the LAST reload was under a minute
      // ago — that minute is what stops a genuine boot-loop.
      const KEY = "mk_app_error_reload";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* storage blocked — fall through to the visible card */
    }
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
      {/* DIAGNOSTIC CONFESSION — see app/global-error.tsx: one screenshot
          names the culprit instead of another blind fix. */}
      <p className="mt-4 max-w-xs break-words text-center text-[11px] text-[#C4B8A4]">
        {String(error?.name ?? "Error")}: {String(error?.message ?? "unknown").slice(0, 160)}
        {error?.digest ? ` · ${error.digest}` : ""}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-full bg-gradient-to-br from-[#6ECDB8] to-[#34A98F] py-3 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(52,169,143,0.4)]"
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
