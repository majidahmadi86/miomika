/**
 * Next.js 16 client-side instrumentation. Initializes Sentry on the browser.
 * Safe when SENTRY_DSN is unset (no-ops).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Errors-only on the client (PageSpeed campaign, 7/19): tracing and
    // error-replay pulled the heaviest SDK integrations into every page's
    // first paint. Crash reporting — the part that protects users — is fully
    // intact; re-enable either knob deliberately if ever needed.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
