/**
 * Miomika unified logger.
 *
 * Server side (Node / Edge runtime): always logs to stdout → visible in
 *   Vercel logs at vercel.com/miomika/logs.
 *
 * Client side (browser): silent in production by default. Enable per-session
 *   with either:
 *     - Append ?debug=1 to any URL
 *     - Run in console: localStorage.setItem("miomika_debug", "1")
 *   Always on in development.
 *
 * PII: email addresses are auto-redacted to first 3 chars + "…@" in any
 *   string or nested object value.
 *
 * Usage:
 *   import { log } from "@/lib/debug/log";
 *   log("auth.callback", "exchanged session", { user: "majid@x.com", tier: "free" });
 *
 *   // Output:
 *   // [auth.callback] exchanged session { user: "maj…@", tier: "free" }
 *
 * Scope convention (free-form string, but stay consistent):
 *   auth.callback, auth.post-signup, profile.server, profile.client,
 *   mic, voice, engine, nav, cookie
 */

type LogData = Record<string, unknown>;

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function clientLogsEnabled(): boolean {
  if (!isClient()) return false;
  if (!isProduction()) return true;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("debug") === "1") return true;
    if (window.localStorage.getItem("miomika_debug") === "1") return true;
  } catch {
    /* localStorage / URL access can throw in some sandboxed contexts */
  }
  return false;
}

function redactString(s: string): string {
  return s.replace(EMAIL_REGEX, (_match, name: string) => {
    const visible = name.slice(0, 3);
    return `${visible}…@`;
  });
}

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as LogData)) {
      out[k] = redact(v);
    }
    return out;
  }
  return value;
}

/**
 * log(scope, message, data?)
 *
 * Examples:
 *   log("auth.callback", "received", { hasCode: true });
 *   log("mic", "state idle→listening", { lang: "en-US" });
 *   log("profile.server", "fetched", { user: "majid@x.com", latency: 42 });
 */
export function log(scope: string, msg: string, data?: LogData): void {
  if (isClient() && !clientLogsEnabled()) return;

  const prefix = `[${scope}]`;
  if (data === undefined) {
    console.log(`${prefix} ${msg}`);
    return;
  }

  const safe = redact(data);
  console.log(`${prefix} ${msg}`, safe);
}

/**
 * logError(scope, message, error, data?)
 *
 * Use for caught exceptions. Logs to console.error so Vercel surfaces it,
 * but does NOT call Sentry — Sentry already auto-captures unhandled errors,
 * and double-capture is noisy. Use Sentry.captureException explicitly if you
 * want to send a handled error.
 */
export function logError(
  scope: string,
  msg: string,
  error: unknown,
  data?: LogData,
): void {
  if (isClient() && !clientLogsEnabled()) return;

  const prefix = `[${scope}]`;
  const errMsg = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack : undefined;

  const payload = {
    error: redactString(errMsg),
    ...(errStack ? { stack: errStack.split("\n").slice(0, 5).join(" | ") } : {}),
    ...(data ? (redact(data) as LogData) : {}),
  };

  console.error(`${prefix} ${msg}`, payload);
}
