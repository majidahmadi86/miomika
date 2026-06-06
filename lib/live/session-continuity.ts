/**
 * Live session transport continuity — close classification, epoch guard, reconnect budget.
 * Pure helpers for harness + /talk resume (turn-controller untouched).
 */

export const MAX_TRANSPORT_RECONNECTS = 2;

export type LiveCloseKind = "intentional" | "transport";

export function createLiveClientEpoch(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `epoch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** TRUE only when we deliberately tear down (invitation sheet, unmount, user clear). */
export function classifyLiveClose(intentionalClose: boolean): LiveCloseKind {
  return intentionalClose ? "intentional" : "transport";
}

/** Ignore callbacks from a superseded MiomiLiveClient instance. */
export function shouldIgnoreClientEpoch(
  eventEpoch: string,
  currentEpoch: string | null,
): boolean {
  if (!currentEpoch) return true;
  return eventEpoch !== currentEpoch;
}

export function canAttemptTransportReconnect(attempts: number): boolean {
  return attempts < MAX_TRANSPORT_RECONNECTS;
}

/** Next plan word id for resume prompt — cursor is introducedIdx (next to teach). */
export function nextResumeWordHint(plan: string[], introducedIdx: number): string | null {
  if (introducedIdx < 0 || introducedIdx >= plan.length) return null;
  return plan[introducedIdx] ?? null;
}

export type KickoffAudience = "first_time" | "returning";

/** Guest = first_time; member with prior words this canvas = returning. */
export function resolveKickoffAudience(
  isGuest: boolean,
  sessionIntroducedWordCount: number,
): KickoffAudience {
  if (isGuest) return "first_time";
  if (sessionIntroducedWordCount > 0) return "returning";
  return "first_time";
}

const FIRST_TIME_FORBIDDEN = /missed you|waiting for you|welcome back|remember/i;

export function kickoffPromptIsFirstTimeSafe(prompt: string): boolean {
  const positive = prompt.split(/Do NOT/i)[0] ?? prompt;
  return !FIRST_TIME_FORBIDDEN.test(positive);
}
