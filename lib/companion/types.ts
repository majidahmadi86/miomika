/**
 * Companion animation states. The 14-state machine lives here so both the
 * companion components and the guidance system can reason about Miomi's mood.
 *
 * Phase 2 implements only the subset we currently animate. Higher-priority
 * one-shots (LEVEL_UP, WORD_MASTERED, PAYMENT_CONFIRMED, FIRST_FUEL_TAP) wire
 * in Phase 3.
 *
 * MIOMIKA.md §2.5 (Tap behavior) + §4.5 (Components).
 */

export type MiomiAnimationState =
  | "idle"
  | "happy"
  | "listening"
  | "speaking"
  | "thinking"
  | "excited"
  | "low_fuel"
  | "missing_user"
  | "playful";

/**
 * Legacy UPPER_CASE labels still appear in some Phase-1 callers. Use these
 * mappers when bridging old/new code paths so we have a single source of
 * truth going forward.
 */
export type CompanionStateLegacy =
  | "IDLE"
  | "HAPPY"
  | "LISTENING"
  | "SPEAKING"
  | "CELEBRATION"
  | "LOW_FUEL"
  | "MISSING_USER"
  | "PLAYFUL";

export function toAnimationState(s: CompanionStateLegacy): MiomiAnimationState {
  switch (s) {
    case "IDLE": return "idle";
    case "HAPPY": return "happy";
    case "LISTENING": return "listening";
    case "SPEAKING": return "speaking";
    case "CELEBRATION": return "excited";
    case "LOW_FUEL": return "low_fuel";
    case "MISSING_USER": return "missing_user";
    case "PLAYFUL": return "playful";
  }
}

export function toLegacyState(s: MiomiAnimationState): CompanionStateLegacy {
  switch (s) {
    case "idle": return "IDLE";
    case "happy": return "HAPPY";
    case "listening": return "LISTENING";
    case "speaking": return "SPEAKING";
    case "thinking": return "IDLE";
    case "excited": return "CELEBRATION";
    case "low_fuel": return "LOW_FUEL";
    case "missing_user": return "MISSING_USER";
    case "playful": return "PLAYFUL";
  }
}
