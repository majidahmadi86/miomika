"use client";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Standalone HTML shell because the root layout failed. Still in Miomi voice.
 *
 * Warm phrase sourced from lib/voice/warmth.ts. We can't useState/pickPhrase
 * at render time because pickPhrase is non-deterministic; instead the phrase
 * is selected once on mount and stored.
 */

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { pickPhrase, RECOVERY_STRUGGLE } from "@/lib/voice/warmth";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  // Lazy initializer picks the warm phrase once on mount; no
  // setState-in-effect.
  const [phraseTh] = useState(() =>
    pickPhrase(RECOVERY_STRUGGLE, { lang: "th" }),
  );

  useEffect(() => {
    Sentry.captureException(error);
    // Auto-recover from transient first-load/chunk errors (common right after a
    // deploy when the service worker briefly serves a stale shell): reload once,
    // silently. The guard stops a reload loop if the error is genuinely
    // persistent — then the message below is shown for real.
    try {
      // WINDOW guard, not once-forever — see app/(app)/error.tsx. Any
      // deploy-era chunk error heals silently; only a sub-minute loop
      // surfaces the visible message.
      const KEY = "mk_global_error_reload";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* storage blocked — fall through to the visible message */
    }
  }, [error]);

  return (
    <html lang="th" translate="no">
      <body
        style={{
          background: "#FAFAF6",
          color: "#1A1A18",
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, textAlign: "center" }}>
          {phraseTh}
        </h1>
        <p style={{ marginTop: "8px", fontSize: "14px", color: "#9A8B73", textAlign: "center" }}>
          Please refresh the page.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: "24px",
            width: "100%",
            maxWidth: "280px",
            padding: "12px 0",
            fontSize: "14px",
            fontWeight: 600,
            color: "#FFFFFF",
            background: "linear-gradient(135deg, #6ECDB8, #34A98F)",
            border: "none",
            borderRadius: "999px",
            cursor: "pointer",
          }}
        >
          ลองอีกครั้ง · Try again
        </button>
        {/* DIAGNOSTIC CONFESSION: this card only stays visible for PERSISTENT
            errors (the silent reload already failed). Print the real cause so
            a single user screenshot names the culprit — no more blind fixes. */}
        <p style={{ marginTop: "20px", fontSize: "11px", color: "#C4B8A4", textAlign: "center", maxWidth: "320px", wordBreak: "break-word" }}>
          {String(error?.name ?? "Error")}: {String(error?.message ?? "unknown").slice(0, 160)}
          {error?.digest ? ` · ${error.digest}` : ""}
        </p>
      </body>
    </html>
  );
}
