// Lesson-layer helpers — card guarantee + plan cursor (no turn-controller coupling).

import { nextPlannedWord } from "@/lib/talk/lesson-plan";
import {
  recommendWordPick,
  type TeachingModeState,
} from "@/lib/talk/teaching-mode";
import type { TeachWordResult } from "@/lib/talk/teach-word-card";

export function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase();
}

/** Plan words already served (indices [0, introducedIdx)). */
export function introducedPlanWords(plan: string[], introducedIdx: number): string[] {
  return plan.slice(0, Math.max(0, introducedIdx));
}

/** Served plan words that still lack a canvas card. */
export function missingCardedPlanWords(args: {
  plan: string[];
  introducedIdx: number;
  carded: Set<string>;
}): string[] {
  return introducedPlanWords(args.plan, args.introducedIdx).filter(
    (wordId) => !args.carded.has(normalizeWordKey(wordId)),
  );
}

/** Focus turn expected a NEW plan word but the model skipped the tool. */
export function shouldBackstopFocusNewWord(args: {
  teaching: TeachingModeState;
  wordPickThisTurn: boolean;
  hasDueReview: boolean;
  canIntroNew: boolean;
  plan: string[];
  introducedIdx: number;
  carded: Set<string>;
}): boolean {
  if (args.wordPickThisTurn) return false;
  const pick = recommendWordPick(args.teaching, {
    hasDueReview: args.hasDueReview,
    canIntroNew: args.canIntroNew,
  });
  if (pick !== "new") return false;
  const next = nextPlannedWord(args.plan, args.introducedIdx);
  if (!next) return false;
  return !args.carded.has(normalizeWordKey(next));
}

/** Shared per-lesson set — exactly one card per normalized word (tool + backstop). */
export function isLessonWordCarded(carded: Set<string>, wordId: string): boolean {
  const key = normalizeWordKey(wordId);
  return !!key && carded.has(key);
}

/**
 * Synchronous claim before any word_card append.
 * Returns false when the word already has a card (repeat tool call or backstop race).
 */
export function claimLessonWordCard(carded: Set<string>, wordId: string): boolean {
  const key = normalizeWordKey(wordId);
  if (!key || carded.has(key)) return false;
  carded.add(key);
  return true;
}

export function markPlanWordCarded(carded: Set<string>, wordId: string): void {
  const key = normalizeWordKey(wordId);
  if (key) carded.add(key);
}

export function teachResultWordId(result: TeachWordResult): string | null {
  const id = result.word_en?.trim();
  return id || null;
}

/**
 * Words the card backstop may push on turn_complete — at most one per exchange.
 * Skips entirely when the tool already carded this turn (wordPickThisTurn).
 */
export function planBackstopCardWords(args: {
  teaching: TeachingModeState;
  wordPickThisTurn: boolean;
  hasDueReview: boolean;
  canIntroNew: boolean;
  plan: string[];
  introducedIdx: number;
  carded: Set<string>;
}): string[] {
  if (args.wordPickThisTurn) return [];

  const missing = missingCardedPlanWords({
    plan: args.plan,
    introducedIdx: args.introducedIdx,
    carded: args.carded,
  });
  if (missing.length > 0) return [missing[0]!];

  if (
    shouldBackstopFocusNewWord({
      teaching: args.teaching,
      wordPickThisTurn: false,
      hasDueReview: args.hasDueReview,
      canIntroNew: args.canIntroNew,
      plan: args.plan,
      introducedIdx: args.introducedIdx,
      carded: args.carded,
    })
  ) {
    const next = nextPlannedWord(args.plan, args.introducedIdx);
    return next ? [next] : [];
  }
  return [];
}
