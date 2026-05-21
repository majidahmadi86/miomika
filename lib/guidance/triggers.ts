/**
 * Guidance triggers — pure detectors. Each function takes the current
 * context and returns either a GuidanceMoment or null. The engine runs
 * them all on every context update and picks the highest-priority moment.
 *
 * MIOMIKA.md §8 Phase 2 (Block D).
 */

import type {
  GuidanceContext,
  GuidanceMoment,
  GuidanceTrigger,
} from "./types";
import {
  pickPhrase,
  pickPhraseWith,
  GUIDANCE_GUEST_LIMIT_NEAR,
  GUIDANCE_GUEST_LIMIT_HIT,
  GUIDANCE_IDLE,
  GUIDANCE_STREAK,
  GUIDANCE_MASTERY,
  RECOVERY_STRUGGLE,
  RECOVERY_RETURN,
} from "@/lib/voice/warmth";

const NEVER_REPEAT_IN_SESSION: GuidanceTrigger[] = [
  "guest_limit_approached",
  "first_word_mastered",
  "three_day_streak",
  "seven_day_streak",
  "feature_not_discovered",
  "returning_after_absence",
  "idle_in_app",
];

function alreadyShown(ctx: GuidanceContext, trigger: GuidanceTrigger): boolean {
  return (
    NEVER_REPEAT_IN_SESSION.includes(trigger) &&
    ctx.history.moments_shown_this_session.includes(trigger)
  );
}

function newId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function bothLangs(vector: typeof GUIDANCE_GUEST_LIMIT_NEAR, ctx: GuidanceContext) {
  return {
    th: pickPhrase(vector, { lang: "th", gender: ctx.user.gender ?? undefined, stage: ctx.user.journey_stage ?? undefined }),
    en: pickPhrase(vector, { lang: "en", gender: ctx.user.gender ?? undefined, stage: ctx.user.journey_stage ?? undefined }),
  };
}

// ─── Guest limit ────────────────────────────────────────────────────────────

export function detectGuestLimitApproached(ctx: GuidanceContext): GuidanceMoment | null {
  if (ctx.user.tier !== "guest") return null;
  if (ctx.session.exchange_count !== 4) return null;
  if (alreadyShown(ctx, "guest_limit_approached")) return null;

  const phrases = bothLangs(GUIDANCE_GUEST_LIMIT_NEAR, ctx);
  return {
    trigger: "guest_limit_approached",
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action: {
      label_th: "เปิดบัญชีฟรี",
      label_en: "Create free account",
      kind: "open_signup",
    },
    miomi_state: "happy",
    dismissible: true,
    priority: "soft",
    id: newId(),
    created_at: Date.now(),
  };
}

export function detectGuestLimitReached(ctx: GuidanceContext): GuidanceMoment | null {
  if (ctx.user.tier !== "guest") return null;
  if (ctx.session.exchange_count < 5) return null;

  const phrases = bothLangs(GUIDANCE_GUEST_LIMIT_HIT, ctx);
  return {
    trigger: "guest_limit_reached",
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action: {
      label_th: "เปิดบัญชีฟรี — 30 วินาที",
      label_en: "Create free account — 30s",
      kind: "open_signup",
    },
    miomi_state: "happy",
    dismissible: false,
    priority: "firm",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── Idle ───────────────────────────────────────────────────────────────────

export function detectIdleInApp(ctx: GuidanceContext): GuidanceMoment | null {
  if (ctx.session.idle_seconds < 60) return null;
  if (alreadyShown(ctx, "idle_in_app")) return null;
  // Don't fire if the companion sheet is already open — they're engaged.
  if (ctx.ui.companion_is_open) return null;

  const phrases = bothLangs(GUIDANCE_IDLE, ctx);
  return {
    trigger: "idle_in_app",
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action: {
      label_th: "เริ่มคุยกัน",
      label_en: "Let's chat",
      kind: "open_sheet",
    },
    miomi_state: "thinking",
    dismissible: true,
    priority: "soft",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── Pronunciation failed ───────────────────────────────────────────────────

export function detectPronunciationFailedThrice(ctx: GuidanceContext): GuidanceMoment | null {
  if (ctx.session.pronunciation_failures_current_word < 3) return null;

  const phrases = bothLangs(RECOVERY_STRUGGLE, ctx);
  return {
    trigger: "pronunciation_failed_thrice",
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action: {
      label_th: "ข้ามไปก่อน",
      label_en: "Skip for now",
      kind: "skip_for_now",
    },
    miomi_state: "thinking",
    dismissible: true,
    priority: "medium",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── Streak ─────────────────────────────────────────────────────────────────

export function detectStreakMilestone(ctx: GuidanceContext): GuidanceMoment | null {
  const target: GuidanceTrigger | null =
    ctx.session.streak_days === 3
      ? "three_day_streak"
      : ctx.session.streak_days === 7
        ? "seven_day_streak"
        : null;
  if (!target) return null;
  if (alreadyShown(ctx, target)) return null;

  const days = ctx.session.streak_days;
  const phrases = {
    th: pickPhraseWith(
      GUIDANCE_STREAK,
      { lang: "th", gender: ctx.user.gender ?? undefined },
      { days },
    ),
    en: pickPhraseWith(
      GUIDANCE_STREAK,
      { lang: "en", gender: ctx.user.gender ?? undefined },
      { days },
    ),
  };

  return {
    trigger: target,
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action:
      days >= 7
        ? { label_th: "แชร์ความสำเร็จ", label_en: "Share this win", kind: "share_now" }
        : { label_th: "เรียนต่อ", label_en: "Keep going", kind: "continue" },
    miomi_state: days >= 7 ? "excited" : "happy",
    dismissible: true,
    priority: "medium",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── Returning after absence ────────────────────────────────────────────────

export function detectReturningAfterAbsence(ctx: GuidanceContext): GuidanceMoment | null {
  if (!ctx.user.last_seen_at) return null;
  const last = new Date(ctx.user.last_seen_at).getTime();
  if (!Number.isFinite(last)) return null;
  const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
  if (hoursSince < 48) return null;
  if (alreadyShown(ctx, "returning_after_absence")) return null;

  const phrases = bothLangs(RECOVERY_RETURN, ctx);
  return {
    trigger: "returning_after_absence",
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action: {
      label_th: "เริ่มเลย",
      label_en: "Let's start",
      kind: "open_sheet",
    },
    miomi_state: "excited",
    dismissible: true,
    priority: "medium",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── Fuel low / exhausted (free tier) ───────────────────────────────────────

export function detectFreeFuelLow(ctx: GuidanceContext): GuidanceMoment | null {
  if (ctx.user.tier !== "free") return null;
  const { heart, zap, brain } = ctx.session.fuel;
  const minFuel = Math.min(heart, zap, brain);
  if (minFuel > 25 || minFuel <= 0) return null;
  if (alreadyShown(ctx, "free_daily_fuel_low")) return null;

  return {
    trigger: "free_daily_fuel_low",
    miomi_says_th: "พลังเริ่มน้อยแล้วค่า~ อยากเติมพลังเพิ่มไหมคะ?",
    miomi_says_en: "Fuel's getting low~ want a top-up?",
    next_action: {
      label_th: "ดู Pro",
      label_en: "See Pro",
      kind: "open_pricing",
    },
    miomi_state: "low_fuel",
    dismissible: true,
    priority: "soft",
    id: newId(),
    created_at: Date.now(),
  };
}

export function detectFreeFuelExhausted(ctx: GuidanceContext): GuidanceMoment | null {
  if (ctx.user.tier !== "free") return null;
  const { heart, zap, brain } = ctx.session.fuel;
  if (heart > 0 || zap > 0 || brain > 0) return null;

  return {
    trigger: "free_daily_fuel_exhausted",
    miomi_says_th: "พลังหมดวันนี้แล้วค่า~ แต่หนูยังคุยกับคุณได้นะคะ พรุ่งนี้พลังจะกลับมา",
    miomi_says_en: "All fuel used today~ I can still chat though. Fuel resets tomorrow~",
    next_action: {
      label_th: "ดู Pro",
      label_en: "See Pro",
      kind: "open_pricing",
    },
    miomi_state: "low_fuel",
    dismissible: true,
    priority: "medium",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── Feature not discovered ─────────────────────────────────────────────────
//
// Stub: needs companion_first_opened_at in profile. Phase 6 wires it.
// Returning null keeps the API surface stable for the engine.

export function detectFeatureNotDiscovered(_ctx: GuidanceContext): GuidanceMoment | null {
  return null;
}

// ─── Voice unavailable ──────────────────────────────────────────────────────
//
// Handled inline in MicButton via lib/talk/speech-support.ts. Detector kept
// for API completeness so all 12 triggers from the spec have entries.

export function detectVoiceUnavailable(_ctx: GuidanceContext): GuidanceMoment | null {
  return null;
}

// ─── First word mastered ────────────────────────────────────────────────────
//
// Fires from outside (vocab pipeline) not from context polling.

export function buildFirstWordMastered(
  word: string,
  ctx: Pick<GuidanceContext, "user">,
): GuidanceMoment {
  const phrases = {
    th: pickPhraseWith(
      GUIDANCE_MASTERY,
      { lang: "th", gender: ctx.user.gender ?? undefined },
      { word },
    ),
    en: pickPhraseWith(
      GUIDANCE_MASTERY,
      { lang: "en", gender: ctx.user.gender ?? undefined },
      { word },
    ),
  };

  return {
    trigger: "first_word_mastered",
    miomi_says_th: phrases.th,
    miomi_says_en: phrases.en,
    next_action: {
      label_th: "เรียนคำต่อไป",
      label_en: "Learn next word",
      kind: "continue",
    },
    miomi_state: "excited",
    dismissible: true,
    priority: "medium",
    id: newId(),
    created_at: Date.now(),
  };
}

// ─── COMPOSER ───────────────────────────────────────────────────────────────

export function detectAllMoments(ctx: GuidanceContext): GuidanceMoment[] {
  const candidates = [
    detectGuestLimitReached(ctx),
    detectGuestLimitApproached(ctx),
    detectFreeFuelExhausted(ctx),
    detectFreeFuelLow(ctx),
    detectPronunciationFailedThrice(ctx),
    detectStreakMilestone(ctx),
    detectReturningAfterAbsence(ctx),
    detectIdleInApp(ctx),
    detectFeatureNotDiscovered(ctx),
    detectVoiceUnavailable(ctx),
  ];
  return candidates.filter((m): m is GuidanceMoment => m !== null);
}
