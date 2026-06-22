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
  free: 0.05,
  pro: 0.5,
  pro_max: 2.0,
} as const;

/**
 * Per-day exchange (chat reply) caps by tier — the user-facing free limit.
 * A free user gets this many chat exchanges per day, then the warm
 * "tomorrow / upgrade" message. Tiers NOT listed here have no exchange cap
 * (they're governed by the cost cap above only). The cost caps remain as an
 * invisible safety net beneath this for any single runaway turn.
 */
export const DAILY_EXCHANGE_CAPS: Record<string, number> = {
  free: 50,
};
