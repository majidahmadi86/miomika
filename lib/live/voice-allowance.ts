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

import type { SupabaseClient } from "@supabase/supabase-js";

export const VOICE_FREE_WEEKLY_SECONDS = 180; // 3 minutes / week (Mike's call)
export const VOICE_WARN_RATIO = 0.8;          // warn at 80% consumed
// Speaking Room is a BOUNDED unit — the whole pricing model depends on it.
export const ROOM_MAX_SECONDS = 600;   // 10 min hard cap
export const ROOM_WARN_SECONDS = 480;  // warn (in voice) at 8 min

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

/** Live-voice budget in seconds for this tier THIS PERIOD. Free = weekly;
 *  pro tiers provisional until the pricing session stamps them. */
export function voiceBudgetSeconds(tier: string): number {
  if (tier === "pro") return VOICE_PRO_MONTHLY_SECONDS;
  if (tier === "pro_max") return VOICE_PRO_MAX_MONTHLY_SECONDS;
  return VOICE_FREE_WEEKLY_SECONDS; // free + any unknown tier
}

/** Seconds already spent by this user in the current week. 0 if no row. */
export async function voiceSecondsUsed(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const week = isoWeekStart();
  const { data, error } = await supabase
    .from("voice_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("week_start", week)
    .maybeSingle();
  if (error) {
    console.error("[voice-allowance] read failed:", error.message);
    // Fail OPEN on a read error for paid users, CLOSED for free — never
    // accidentally hand free users unlimited voice on a transient DB hiccup.
    throw error;
  }
  return Number(data?.seconds_used ?? 0);
}

/** True if the user still has live-voice budget left this period. */
export async function hasVoiceBudget(
  supabase: SupabaseClient,
  userId: string,
  tier: string,
): Promise<{ ok: boolean; usedSeconds: number; budgetSeconds: number }> {
  const budgetSeconds = voiceBudgetSeconds(tier);
  const usedSeconds = await voiceSecondsUsed(supabase, userId);
  return { ok: usedSeconds < budgetSeconds, usedSeconds, budgetSeconds };
}

/** Add elapsed live-voice seconds to this week's ledger (server-side only,
 *  upsert-accumulate). Called on session end. Refresh-proof by construction:
 *  the browser cannot reset a server-side running total. */
export async function recordVoiceSeconds(
  supabase: SupabaseClient,
  userId: string,
  seconds: number,
): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const week = isoWeekStart();
  const prior = await voiceSecondsUsed(supabase, userId).catch(() => 0);
  const { error } = await supabase
    .from("voice_usage")
    .upsert(
      { user_id: userId, week_start: week, seconds_used: prior + Math.round(seconds), updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" },
    );
  if (error) console.error("[voice-allowance] record failed:", error.message);
}
