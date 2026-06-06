// Pure lesson-plan logic for /talk teach path (Stage 1).
// Deterministic ordered vocabulary serving — no turn-controller coupling.

import { isVocabularySlug } from "@/lib/talk/teach-word-card";
import { createServiceClient } from "@/lib/supabase/service";
import type { Tier } from "@/lib/auth/get-server-profile";

export type LessonPlanBankRow = {
  word_en?: string | null;
  word_th?: string | null;
  cefr_level?: string | null;
  emoji?: string | null;
  created_at?: string | null;
  frequency_score?: number | null;
};

const PLAN_SIZE: Record<Tier, number> = {
  guest: 3,
  free: 4,
  pro: 6,
  pro_max: 6,
};

const TIER_CEFR_FALLBACK: Record<Tier, string> = {
  guest: "A1",
  free: "A2",
  pro: "B1",
  pro_max: "B1",
};

/** Rows missing gloss fields or carrying bank topic ids — never teach/card. */
export function isCardableVocabRow(row: LessonPlanBankRow): boolean {
  const word_en = (row.word_en ?? "").trim();
  const word_th = (row.word_th ?? "").trim();
  return !!word_en && !!word_th && !isVocabularySlug(word_en);
}

export function planSizeForTier(tier: Tier): number {
  return PLAN_SIZE[tier];
}

export function teachFlagColumn(
  learningTarget: "th" | "en",
): "teach_thai_to_english" | "teach_english_to_thai" {
  return learningTarget === "th" ? "teach_thai_to_english" : "teach_english_to_thai";
}

export function buildExcludeSet(words: string[]): Set<string> {
  return new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean));
}

/** Deterministic order: frequency_score desc, then created_at asc. */
export function sortRowsForPlan(rows: LessonPlanBankRow[]): LessonPlanBankRow[] {
  return [...rows].sort((a, b) => {
    const freqDiff = (b.frequency_score ?? 0) - (a.frequency_score ?? 0);
    if (freqDiff !== 0) return freqDiff;
    const aCreated = (a.created_at ?? "").trim();
    const bCreated = (b.created_at ?? "").trim();
    return aCreated.localeCompare(bCreated);
  });
}

/** Pure plan builder — cardable-only, excludes known words, capped at planSize. */
export function buildLessonPlanFromRows(args: {
  rows: LessonPlanBankRow[];
  planSize: number;
  exclude: Set<string>;
}): string[] {
  const plan: string[] = [];
  for (const row of sortRowsForPlan(args.rows)) {
    if (!isCardableVocabRow(row)) continue;
    const word_en = (row.word_en ?? "").trim();
    const word_th = (row.word_th ?? "").trim();
    if (!word_en) continue;
    const keys = [word_en, word_th].map((k) => k.toLowerCase());
    if (keys.some((k) => args.exclude.has(k))) continue;
    if (plan.includes(word_en)) continue;
    plan.push(word_en);
    if (plan.length >= args.planSize) break;
  }
  return plan;
}

export type TeachServeResult =
  | { kind: "word"; wordId: string; introducedIdx: number }
  | { kind: "lesson_complete" };

/** Cursor serve — introducedIdx is the next index to teach (0 = first word). */
export function resolveTeachServe(args: {
  plan: string[];
  introducedIdx: number;
}): TeachServeResult {
  const { plan, introducedIdx } = args;
  if (introducedIdx >= plan.length) {
    return { kind: "lesson_complete" };
  }
  return { kind: "word", wordId: plan[introducedIdx]!, introducedIdx };
}

/** Rotate through plan[0..introducedIdx) skipping session review ledger excludes. */
export function pickPlanReviewWord(args: {
  plan: string[];
  introducedIdx: number;
  exclude: Set<string>;
}): string | null {
  const pool = args.plan.slice(0, Math.max(0, args.introducedIdx));
  for (const wordId of pool) {
    if (!args.exclude.has(wordId.toLowerCase())) return wordId;
  }
  return null;
}

export function countCardableRows(
  rows: LessonPlanBankRow[],
  cefrLevel?: string,
): number {
  return rows.filter((row) => {
    if (cefrLevel && (row.cefr_level ?? "").trim() !== cefrLevel) return false;
    return isCardableVocabRow(row);
  }).length;
}

/** Server: query vocabulary_bank and return ordered word_en ids = THE PLAN. */
export async function buildLessonPlan(args: {
  tier: Tier;
  cefrLevel: string | null;
  learningTarget: "th" | "en";
  alreadyIntroducedWords: string[];
  alreadyMasteredWords: string[];
}): Promise<string[]> {
  const planSize = planSizeForTier(args.tier);
  const cefr = args.cefrLevel?.trim() || TIER_CEFR_FALLBACK[args.tier];
  const exclude = buildExcludeSet([
    ...args.alreadyIntroducedWords,
    ...args.alreadyMasteredWords,
  ]);
  const teachFlag = teachFlagColumn(args.learningTarget);

  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select("word_en, word_th, cefr_level, emoji, created_at, frequency_score")
      .eq("status", "active")
      .eq("cefr_level", cefr)
      .eq(teachFlag, true)
      .order("frequency_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error(
        "[lesson-plan.buildLessonPlan] vocabulary_bank query failed:",
        error.message,
        error.details,
      );
      return [];
    }

    return buildLessonPlanFromRows({
      rows: (data ?? []) as LessonPlanBankRow[],
      planSize,
      exclude,
    });
  } catch (err) {
    console.error("[lesson-plan.buildLessonPlan] failed:", err);
    return [];
  }
}

/** Optional harness/report helper — counts A1 active cardable rows for a teach direction. */
export async function countA1CardableWords(
  learningTarget: "th" | "en",
): Promise<number | null> {
  try {
    const supabase = await createServiceClient();
    const teachFlag = teachFlagColumn(learningTarget);
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select("word_en, word_th, cefr_level, frequency_score, created_at")
      .eq("status", "active")
      .eq("cefr_level", "A1")
      .eq(teachFlag, true)
      .limit(500);

    if (error) return null;
    return countCardableRows((data ?? []) as LessonPlanBankRow[], "A1");
  } catch {
    return null;
  }
}
