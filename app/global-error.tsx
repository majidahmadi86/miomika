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
      const KEY = "mk_global_error_reload";
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
      }
    } catch {
      /* storage blocked — fall through to the visible message */
    }
  }, [error]);

  return (
    <html lang="th">
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
      </body>
    </html>
  );
}
