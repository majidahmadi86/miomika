// Pure lesson-plan logic for /talk teach path (Stage 2 — themed).
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
  difficulty_score?: number | null;
  prerequisite_words?: string[] | string | null;
  topic?: string | null;
};

export type LessonPlanResult = {
  plan: string[];
  topic: string | null;
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

/** Guest-first engaging topics — deterministic pick order. */
export const GUEST_STARTER_TOPICS: readonly string[] = [
  "food",
  "travel",
  "daily_routine",
  "shopping",
  "family",
  "feelings",
];

/** Member fallback topic order when no hint matches. */
export const MEMBER_TOPIC_PICK_ORDER: readonly string[] = [
  "food",
  "travel",
  "daily_routine",
  "shopping",
  "family",
  "feelings",
  "work",
  "health",
  "education",
  "home_stuff",
  "relationship",
  "technology",
  "appearance",
];

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

/** Parse prerequisite_words from bank row (JSON array or comma-separated). */
export function parsePrerequisiteWords(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((w) => String(w).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((w) => String(w).trim().toLowerCase()).filter(Boolean);
        }
      } catch {
        /* fall through to comma split */
      }
    }
    return trimmed.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

/** Easiest-first: difficulty_score asc, frequency_score desc, created_at asc. */
export function compareRowsForPlan(a: LessonPlanBankRow, b: LessonPlanBankRow): number {
  const diffDiff = (a.difficulty_score ?? 0) - (b.difficulty_score ?? 0);
  if (diffDiff !== 0) return diffDiff;
  const freqDiff = (b.frequency_score ?? 0) - (a.frequency_score ?? 0);
  if (freqDiff !== 0) return freqDiff;
  const aCreated = (a.created_at ?? "").trim();
  const bCreated = (b.created_at ?? "").trim();
  return aCreated.localeCompare(bCreated);
}

export function sortRowsForPlan(rows: LessonPlanBankRow[]): LessonPlanBankRow[] {
  return [...rows].sort(compareRowsForPlan);
}

function prereqsSatisfied(
  row: LessonPlanBankRow,
  planKeys: Set<string>,
  exclude: Set<string>,
): boolean {
  const prereqs = parsePrerequisiteWords(row.prerequisite_words);
  return prereqs.every((p) => planKeys.has(p) || exclude.has(p));
}

export function countCardableByTopic(args: {
  rows: LessonPlanBankRow[];
  cefrLevel: string;
  exclude: Set<string>;
}): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of args.rows) {
    if ((row.cefr_level ?? "").trim() !== args.cefrLevel) continue;
    if (!isCardableVocabRow(row)) continue;
    const word_en = (row.word_en ?? "").trim();
    const word_th = (row.word_th ?? "").trim();
    if (!word_en) continue;
    const keys = [word_en, word_th].map((k) => k.toLowerCase());
    if (keys.some((k) => args.exclude.has(k))) continue;
    const topic = (row.topic ?? "").trim();
    if (!topic) continue;
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return counts;
}

/** One coherent lesson topic — enough cardable words at tier CEFR. */
export function selectLessonTopic(args: {
  rows: LessonPlanBankRow[];
  planSize: number;
  cefrLevel: string;
  exclude: Set<string>;
  tier: Tier;
  topicHint?: string;
}): string | null {
  const counts = countCardableByTopic({
    rows: args.rows,
    cefrLevel: args.cefrLevel,
    exclude: args.exclude,
  });

  const hint = args.topicHint?.trim().toLowerCase();
  if (hint && (counts.get(hint) ?? 0) >= args.planSize) {
    return hint;
  }

  const order =
    args.tier === "guest" ? GUEST_STARTER_TOPICS : MEMBER_TOPIC_PICK_ORDER;
  for (const topic of order) {
    if ((counts.get(topic) ?? 0) >= args.planSize) return topic;
  }

  const eligible = [...counts.entries()]
    .filter(([, n]) => n >= args.planSize)
    .sort(([a], [b]) => a.localeCompare(b));
  return eligible[0]?.[0] ?? null;
}

/** Pure plan builder — single topic, easiest-first with prerequisite order, capped at planSize. */
export function buildLessonPlanFromRows(args: {
  rows: LessonPlanBankRow[];
  planSize: number;
  exclude: Set<string>;
  topic?: string | null;
}): string[] {
  const topicFilter = args.topic?.trim() ?? "";
  const pool: LessonPlanBankRow[] = [];
  for (const row of args.rows) {
    if (topicFilter && (row.topic ?? "").trim() !== topicFilter) continue;
    if (!isCardableVocabRow(row)) continue;
    const word_en = (row.word_en ?? "").trim();
    const word_th = (row.word_th ?? "").trim();
    if (!word_en) continue;
    const keys = [word_en, word_th].map((k) => k.toLowerCase());
    if (keys.some((k) => args.exclude.has(k))) continue;
    if (pool.some((r) => (r.word_en ?? "").trim() === word_en)) continue;
    pool.push(row);
  }

  const plan: string[] = [];
  const planKeys = new Set<string>();
  const remaining = [...pool];

  while (plan.length < args.planSize && remaining.length > 0) {
    const ready = remaining.filter((row) => prereqsSatisfied(row, planKeys, args.exclude));
    if (ready.length === 0) break;
    ready.sort(compareRowsForPlan);
    const pick = ready[0]!;
    const word_en = (pick.word_en ?? "").trim();
    plan.push(word_en);
    planKeys.add(word_en.toLowerCase());
    remaining.splice(remaining.indexOf(pick), 1);
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

/** Next planned word id — null only when lesson_complete. */
export function nextPlannedWord(plan: string[], introducedIdx: number): string | null {
  const serve = resolveTeachServe({ plan, introducedIdx });
  return serve.kind === "word" ? serve.wordId : null;
}

export function isLessonComplete(plan: string[], introducedIdx: number): boolean {
  return introducedIdx >= plan.length;
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

/** Server: query vocabulary_bank and return ordered word_en ids = THE PLAN (one topic). */
export async function buildLessonPlan(args: {
  tier: Tier;
  cefrLevel: string | null;
  learningTarget: "th" | "en";
  alreadyIntroducedWords: string[];
  alreadyMasteredWords: string[];
  topicHint?: string;
}): Promise<LessonPlanResult> {
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
      .select(
        "word_en, word_th, cefr_level, emoji, created_at, frequency_score, difficulty_score, prerequisite_words, topic",
      )
      .eq("status", "active")
      .eq("cefr_level", cefr)
      .eq(teachFlag, true)
      .order("difficulty_score", { ascending: true })
      .order("frequency_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error(
        "[lesson-plan.buildLessonPlan] vocabulary_bank query failed:",
        error.message,
        error.details,
      );
      return { plan: [], topic: null };
    }

    const rows = (data ?? []) as LessonPlanBankRow[];
    const topic = selectLessonTopic({
      rows,
      planSize,
      cefrLevel: cefr,
      exclude,
      tier: args.tier,
      topicHint: args.topicHint,
    });

    const plan = buildLessonPlanFromRows({
      rows,
      planSize,
      exclude,
      topic,
    });

    return { plan, topic };
  } catch (err) {
    console.error("[lesson-plan.buildLessonPlan] failed:", err);
    return { plan: [], topic: null };
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
      .select("word_en, word_th, cefr_level, frequency_score, created_at, topic")
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
