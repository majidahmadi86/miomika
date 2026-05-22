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
