/**
 * Next.js 16 client-side instrumentation — LAZY Sentry (PageSpeed campaign).
 * The static @sentry/nextjs import bundled the SDK core into every page's
 * critical path (proven by build analysis: Sentry present in 3 first-load
 * chunks incl. the 412KB main vendor chunk). Loading it ~3s after paint
 * removes it from LCP entirely; errors after boot are still captured, and
 * server-side Sentry (API routes) is completely unaffected.
 * Safe when SENTRY_DSN is unset (no-ops).
 */
type SentryModule = typeof import("@sentry/nextjs");

let sentryRef: SentryModule | null = null;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn && typeof window !== "undefined") {
  window.setTimeout(() => {
    void import("@sentry/nextjs").then((Sentry) => {
      sentryRef = Sentry;
      Sentry.init({
        dsn,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      });
    });
  }, 3000);
}

export const onRouterTransitionStart = (...args: unknown[]): void => {
  (sentryRef?.captureRouterTransitionStart as ((...a: unknown[]) => void) | undefined)?.(...args);
};
