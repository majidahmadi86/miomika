import crypto from "crypto";

/** Constant-time string equality for secrets (cron bearer, API keys). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** True when the request carries "Authorization: Bearer <CRON_SECRET>". */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get("authorization"), `Bearer ${secret}`);
}
