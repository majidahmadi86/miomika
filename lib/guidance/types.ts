/**
 * Guidance System types — MIOMIKA.md §8 Phase 2 (Block D).
 *
 * The guidance system observes user state, fires typed "moments" at the
 * right time, and renders them as soft inline pills (never modals).
 */

import type { MiomiAnimationState } from "@/lib/companion/types";
import type { Tier, JourneyStage, Gender } from "@/lib/auth/use-profile";

export type GuidanceTrigger =
  | "guest_limit_approached"
  | "guest_limit_reached"
  | "free_daily_fuel_low"
  | "free_daily_fuel_exhausted"
  | "first_word_mastered"
  | "three_day_streak"
  | "seven_day_streak"
  | "idle_in_app"
  | "returning_after_absence"
  | "feature_not_discovered"
  | "voice_unavailable"
  | "pronunciation_failed_thrice"
  | "feature_pro_locked";

export type NextActionKind =
  | "navigate"
  | "open_sheet"
  | "open_signup"
  | "open_pricing"
  | "unlock_with_stars"
  | "continue"
  | "share_now"
  | "try_again"
  | "skip_for_now";

export interface NextAction {
  label_th: string;
  label_en: string;
  kind: NextActionKind;
  payload?: Record<string, unknown>;
}

export interface GuidanceMoment {
  trigger: GuidanceTrigger;
  miomi_says_th: string;
  miomi_says_en: string;
  next_action: NextAction;
  miomi_state: MiomiAnimationState;
  dismissible: boolean;
  priority: "soft" | "medium" | "firm";
  id: string;
  created_at: number;
}

export interface GuidanceUserContext {
  id: string | null;
  tier: Tier;
  journey_stage?: JourneyStage | null;
  gender?: Gender | null;
  last_seen_at?: string | null;
  welcome_shown_at?: string | null;
  onboarding_completed_at?: string | null;
}

export interface GuidanceFuel {
  heart: number;
  zap: number;
  brain: number;
}

export interface GuidanceSessionContext {
  exchange_count: number;
  fuel: GuidanceFuel;
  streak_days: number;
  pronunciation_failures_current_word: number;
  idle_seconds: number;
  last_action_at: number;
}

export interface GuidanceUiContext {
  lang: "th" | "en";
  pathname: string;
  companion_is_open: boolean;
}

export interface GuidanceHistoryContext {
  moments_shown_this_session: GuidanceTrigger[];
}

export interface GuidanceContext {
  user: GuidanceUserContext;
  session: GuidanceSessionContext;
  ui: GuidanceUiContext;
  history: GuidanceHistoryContext;
}
