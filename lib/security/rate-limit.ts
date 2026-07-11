// Fixed-window rate limiter, DB-backed so it holds across serverless
// instances/regions (in-memory would not). One row per (scope, identity,
// minute), upserted atomically. Used to bound request FREQUENCY on the
// endpoints that call Google directly — a length/spend cap alone doesn't
// stop rapid repeated calls, and that pattern is what risks another
// Google Cloud abuse suspension, independent of what it costs us.
//
// Fails OPEN: if the rate-limit check itself errors (DB hiccup), the
// request is allowed through rather than blocking real users on an
// infra blip. The length caps and cost gate remain the backstop.

import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/debug/log";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export async function checkRateLimit(scope: string, identity: string, limit: number): Promise<RateLimitResult> {
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const key = `${scope}:${identity}:${minuteBucket}`;
  try {
    const supabase = await createServiceClient();
    // Atomic upsert-increment: if the row exists, bump count; else start at 1.
    const { data, error } = await supabase.rpc("increment_rate_limit", { p_key: key });
    if (error) throw error;
    const count = (data as number) ?? 1;
    const retryAfterSeconds = 60 - (Math.floor(Date.now() / 1000) % 60);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds };
  } catch (e) {
    logError("rate-limit", "check failed, failing open", e, { scope, identity });
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Best-effort client identity: real IP behind Vercel's proxy, else a fallback bucket. */
export function identityFromRequest(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
