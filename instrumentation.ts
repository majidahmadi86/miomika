/**
 * Next.js 16 instrumentation hook. Re-exports Sentry's edge/node hooks so the
 * appropriate `sentry.*.config.ts` runs on each runtime. Safe when DSN is unset
 * (each config self-guards).
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
