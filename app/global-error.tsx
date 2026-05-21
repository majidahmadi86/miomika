"use client";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Standalone HTML shell because the root layout failed. Still in Miomi voice.
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
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
          หนูสะดุดนิดหนึ่งค่า~
        </h1>
        <p style={{ marginTop: "8px", fontSize: "14px", color: "#9A8B73", textAlign: "center" }}>
          I tripped a little. Please refresh the page.
        </p>
      </body>
    </html>
  );
}
