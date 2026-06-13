/**
 * Voice allowance policy — the single source of truth for how much LIVE voice
 * each tier gets. Live voice (~1.32฿/min) is the only metered cost; banked
 * pre-generated voice (greetings, guide, pronunciation) is free and never
 * counted against these budgets.
 *
 * FREE: a small WEEKLY taste — a recurring habit loop and a gentle upsell moment
 * ("your free minutes are back~"), cheaper at scale than it looks because most
 * users never spend the whole budget.
 */

export const VOICE_FREE_WEEKLY_SECONDS = 120; // 2 minutes / week (Mike's call)
export const VOICE_WARN_RATIO = 0.8;          // warn at 80% consumed

// Pro allowances are stamped at the pricing session against verified rates.
// Placeholder values here are NOT yet wired to any gate (M1 is foundation only).
export const VOICE_PRO_MONTHLY_SECONDS = 200 * 60;     // ~200 min/mo (provisional)
export const VOICE_PRO_MAX_MONTHLY_SECONDS = 400 * 60; // provisional

/** Monday 00:00 UTC of the week containing `d` — the ledger's week_start key. */
export function isoWeekStart(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();                 // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day;      // shift back to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);       // YYYY-MM-DD
}

/** Weekly live-voice budget in seconds for a tier. Pro tiers are monthly; this
 *  helper returns the FREE weekly figure — Pro accounting lands with pricing. */
export function freeWeeklyVoiceSeconds(): number {
  return VOICE_FREE_WEEKLY_SECONDS;
}
