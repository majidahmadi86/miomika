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

export function markPlanWordCarded(carded: Set<string>, wordId: string): void {
  const key = normalizeWordKey(wordId);
  if (key) carded.add(key);
}

export function teachResultWordId(result: TeachWordResult): string | null {
  const id = result.word_en?.trim();
  return id || null;
}
