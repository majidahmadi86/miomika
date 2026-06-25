/**
 * Server-enforced limits. Never trust the client for these values.
 * MIOMIKA.md §3, §4.6
 */

/** Max AI exchanges per session for unregistered (guest) users. */
export const GUEST_EXCHANGE_LIMIT = 5;

/** Per-session cost caps in USD */
export const COST_CAPS_USD = {
  guest: 0.02,
  free: 0.05,
  pro: 0.15,
  pro_max: 0.5,
} as const;

/** Per-day cost caps in USD */
export const DAILY_COST_CAPS_USD = {
  guest: 0.02,
  free: 0.1,
  pro: 0.5,
  pro_max: 2.0,
} as const;

/**
 * Per-day exchange (chat reply) caps by tier — the user-facing daily limit.
 * A user gets this many real AI chat replies per day, then the warm
 * "see you tomorrow" message. Free is the meaningful wall; pro / pro_max are set
 * high as an abuse backstop, not a felt limit. Only exchanges that make a real
 * model call count (kickoff openers and the limit message itself are free). Tiers
 * NOT listed here (guest) are bounded per-session by GUEST_EXCHANGE_LIMIT instead.
 * The hard cost caps above remain an invisible safety net beneath this. Prices and
 * limits are config — adjust freely.
 */
export const DAILY_EXCHANGE_CAPS: Record<string, number> = {
  free: 25,
  pro: 200,
  pro_max: 400,
};
