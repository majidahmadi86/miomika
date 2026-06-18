// SERVER ONLY. Vocabulary introduce / mastery / spiral helpers (service role).

import { isVocabularySlug } from "@/lib/talk/teach-word-card";
import { createServiceClient } from "@/lib/supabase/service";

export interface IntroducedWord {
  word: string;
  word_th: string;
  word_en: string;
  cefr_level: string | null;
  emoji: string | null;
}

export type MasteryEvent =
  | { type: "introduced"; word: IntroducedWord }
  | { type: "advanced"; word: string; newStage: number }
  | { type: "mastered"; word: string }
  | { type: "none" };

type Tier = "guest" | "free" | "pro" | "pro_max";

type VocabBankRow = {
  word_en?: string | null;
  word?: string | null;
  word_th?: string | null;
  cefr_level?: string | null;
  emoji?: string | null;
  created_at?: string | null;
};

const DAILY_INTRO_CAP: Record<Tier, number> = {
  guest: 1,
  free: 3,
  pro: 15,
  pro_max: 50,
};

const TIER_CEFR_FALLBACK: Record<Tier, string> = {
  guest: "A1",
  free: "A2",
  pro: "B1",
  pro_max: "B1",
};

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function rowToIntroducedWord(
  row: VocabBankRow,
  learningTarget: "th" | "en" | null,
): IntroducedWord | null {
  const rawEn = (row.word_en ?? "").trim();
  const rawWord = (row.word ?? "").trim();
  const word_en = rawEn || (rawWord && !isVocabularySlug(rawWord) ? rawWord : "");
  const word_th = (row.word_th ?? "").trim();
  if (!word_en || !word_th) return null;
  if (isVocabularySlug(word_en) || isVocabularySlug(word_th)) return null;
  const word = learningTarget === "th" ? word_th : word_en;
  return {
    word,
    word_en,
    word_th,
    cefr_level: row.cefr_level ?? null,
    emoji: row.emoji ?? null,
  };
}

function targetLength(word: IntroducedWord, learningTarget: "th" | "en" | null): number {
  if (learningTarget === "th") return word.word_th.length;
  return word.word_en.length;
}

function scoreCandidate(word: IntroducedWord, learningTarget: "th" | "en" | null): number {
  let score = 0;
  if (word.emoji) score += 10;
  if (targetLength(word, learningTarget) <= 8) score += 5;
  return score;
}

async function countTodayIntroductions(userId: string): Promise<number> {
  try {
    const supabase = await createServiceClient();
    const { count, error } = await supabase
      .from("vocabulary_user_state")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("first_introduced_at", startOfUtcDay());

    if (error) {
      console.error(
        "[teaching.countTodayIntroductions] failed:",
        error.message,
        error.details,
      );
      return Number.MAX_SAFE_INTEGER;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[teaching.countTodayIntroductions] failed:", err);
    return Number.MAX_SAFE_INTEGER;
  }
}

async function isIntroCapReached(args: {
  userId: string | null;
  tier: Tier;
  alreadyIntroducedWords: string[];
}): Promise<boolean> {
  const cap = DAILY_INTRO_CAP[args.tier];

  if (args.tier === "guest") {
    return args.alreadyIntroducedWords.length >= cap;
  }

  if (!args.userId) {
    return true;
  }

  const todayCount = await countTodayIntroductions(args.userId);
  return todayCount >= cap;
}

function textContainsWord(userText: string, word: string): boolean {
  const lowerText = userText.toLowerCase();
  const lowerWord = word.toLowerCase();
  if (!lowerWord) return false;

  if (/[\u0E00-\u0E7F]/.test(word)) {
    return userText.includes(word) || lowerText.includes(lowerWord);
  }

  const escaped = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(userText);
}

function isCardableVocabRow(row: VocabBankRow): boolean {
  const word_en = (row.word_en ?? "").trim();
  const word_th = (row.word_th ?? "").trim();
  return !!word_en && !!word_th && !isVocabularySlug(word_en);
}

/** Rows missing gloss fields or carrying bank topic ids — never teach/card. */
export function countUncardableBankRows(rows: VocabBankRow[]): number {
  return rows.filter((row) => !isCardableVocabRow(row)).length;
}

/** Sorted cardable pick — skips slug/topic ids; used by pickWordToIntroduce + self-check. */
export function pickIntroduceCandidate(
  candidates: IntroducedWord[],
  learningTarget: "th" | "en" | null,
): IntroducedWord | null {
  const sorted = [...candidates].sort(
    (a, b) =>
      scoreCandidate(b, learningTarget) - scoreCandidate(a, learningTarget),
  );
  for (const candidate of sorted) {
    if (
      candidate.word_en &&
      candidate.word_th &&
      !isVocabularySlug(candidate.word_en)
    ) {
      return candidate;
    }
  }
  return null;
}

/** Pure bank filter — excludes known/session words; used by pickWordToIntroduce + self-check. */
export function filterVocabCandidates(args: {
  rows: VocabBankRow[];
  learningTarget: "th" | "en" | null;
  exclude: Set<string>;
}): IntroducedWord[] {
  const candidates: IntroducedWord[] = [];
  for (const row of args.rows) {
    const intro = rowToIntroducedWord(row, args.learningTarget);
    if (!intro) continue;
    const keys = [intro.word_en, intro.word_th, intro.word].map((k) => k.toLowerCase());
    if (keys.some((k) => args.exclude.has(k))) continue;
    candidates.push(intro);
  }
  return candidates;
}

export type ReviewCandidateRow = {
  word_en: string;
  next_spiral_at: string | null;
  mastery_level: number;
};

/** Pure due-word picker — overdue first, then earliest spiral (self-check + pickWordToPractice). */
export function selectDueReviewCandidate(
  rows: ReviewCandidateRow[],
  now: Date = new Date(),
  exclude: Set<string> = new Set(),
): string | null {
  const poolRows = rows.filter((row) => !exclude.has(row.word_en.toLowerCase()));
  if (poolRows.length === 0) return null;
  const nowMs = now.getTime();
  const scored = poolRows.map((row) => {
    const dueAt = row.next_spiral_at
      ? new Date(row.next_spiral_at).getTime()
      : Number.POSITIVE_INFINITY;
    return {
      word_en: row.word_en,
      dueAt,
      overdue: dueAt <= nowMs,
      mastery: row.mastery_level,
    };
  });
  const due = scored.filter((r) => r.overdue);
  const pool = due.length > 0 ? due : scored;
  pool.sort((a, b) => a.dueAt - b.dueAt || a.mastery - b.mastery);
  return pool[0]?.word_en ?? null;
}

/** Tool 3 — due spiral review word from vocabulary_user_state (TEACHING MODE v1). */
export async function pickWordToReview(args: {
  userId: string;
  learningTarget: "th" | "en" | null;
  now?: Date;
  exclude?: string[];
}): Promise<IntroducedWord | null> {
  return pickWordToPractice(args);
}

/** When intro cap or bank is exhausted, practice a due word from vocabulary_user_state. */
export async function pickWordToPractice(args: {
  userId: string;
  learningTarget: "th" | "en" | null;
  now?: Date;
  exclude?: string[];
}): Promise<IntroducedWord | null> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_user_state")
      .select("word_en, next_spiral_at, mastery_level")
      .eq("user_id", args.userId)
      .is("mastered_at", null)
      .order("next_spiral_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (error) {
      console.error(
        "[teaching.pickWordToPractice] vocabulary_user_state query failed:",
        error.message,
        error.details,
      );
      return null;
    }

    const exclude = new Set(
      (args.exclude ?? []).map((word) => word.toLowerCase()),
    );

    const pickEn = selectDueReviewCandidate(
      (data ?? []).map((row) => ({
        word_en: row.word_en as string,
        next_spiral_at: (row.next_spiral_at as string | null) ?? null,
        mastery_level: (row.mastery_level as number) ?? 0,
      })),
      args.now ?? new Date(),
      exclude,
    );
    if (!pickEn) return null;

    const { data: bankRow, error: bankErr } = await supabase
      .from("vocabulary_bank")
      .select("word_en, word_th, cefr_level, emoji")
      .eq("word_en", pickEn)
      .maybeSingle();

    if (bankErr) {
      console.error(
        "[teaching.pickWordToPractice] vocabulary_bank query failed:",
        bankErr.message,
        bankErr.details,
      );
      return null;
    }

    if (!bankRow) return null;
    return rowToIntroducedWord(bankRow as VocabBankRow, args.learningTarget);
  } catch (err) {
    console.error("[teaching.pickWordToPractice] failed:", err);
    return null;
  }
}

/** LOCKED 2026-06-05 — Live Tool 1 backend: /api/teach-word → pickWordToIntroduce (+ introduceWord for members). */
export async function pickWordToIntroduce(args: {
  userId: string | null;
  cefrLevel: string | null;
  learningTarget: "th" | "en" | null;
  alreadyIntroducedWords: string[];
  alreadyMasteredWords: string[];
  tier: Tier;
}): Promise<IntroducedWord | null> {
  try {
    const exclude = new Set(
      [...args.alreadyIntroducedWords, ...args.alreadyMasteredWords].map((w) =>
        w.toLowerCase(),
      ),
    );

    if (await isIntroCapReached(args)) {
      return null;
    }

    const cefr =
      args.cefrLevel?.trim() ||
      TIER_CEFR_FALLBACK[args.tier];

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select("word_en, word_th, cefr_level, emoji, created_at")
      .eq("status", "active")
      .eq("cefr_level", cefr)
      .not("verified_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error(
        "[teaching.pickWordToIntroduce] vocabulary_bank query failed:",
        error.message,
        error.details,
      );
      return null;
    }

    const bankRows = (data ?? []) as VocabBankRow[];
    const uncardableCount = countUncardableBankRows(bankRows);
    if (uncardableCount > 0) {
      console.log(
        `[teaching.pickWordToIntroduce] excluded ${uncardableCount} uncardable vocabulary_bank rows`,
      );
    }

    const candidates = filterVocabCandidates({
      rows: bankRows,
      learningTarget: args.learningTarget,
      exclude,
    });

    return pickIntroduceCandidate(candidates, args.learningTarget);
  } catch (err) {
    console.error("[teaching.pickWordToIntroduce] failed:", err);
    return null;
  }
}

export async function introduceWord(args: {
  userId: string | null;
  word: IntroducedWord;
}): Promise<void> {
  if (!args.userId) return;

  try {
    const supabase = await createServiceClient();
    const now = new Date();
    const nextSpiral = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const iso = now.toISOString();

    const { error } = await supabase.from("vocabulary_user_state").upsert(
      {
        user_id: args.userId,
        word_en: args.word.word_en,
        mastery_level: 0,
        times_seen: 1,
        first_introduced_at: iso,
        last_introduced_at: iso,
        next_spiral_at: nextSpiral.toISOString(),
        updated_at: iso,
      },
      { onConflict: "user_id,word_en" },
    );

    if (error) {
      console.error(
        "[teaching.introduceWord] upsert failed:",
        error.message,
        error.details,
      );
    }
  } catch (err) {
    console.error("[teaching.introduceWord] failed:", err);
  }
}

async function readMasteryRow(
  userId: string,
  wordEn: string,
): Promise<{ mastery_level: number; mastered_at: string | null } | null> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_user_state")
      .select("mastery_level, mastered_at")
      .eq("user_id", userId)
      .eq("word_en", wordEn)
      .maybeSingle();

    if (error) {
      console.error(
        "[teaching.readMasteryRow] failed:",
        error.message,
        error.details,
      );
      return null;
    }
    if (!data) return null;
    return {
      mastery_level: (data.mastery_level as number) ?? 0,
      mastered_at: (data.mastered_at as string | null) ?? null,
    };
  } catch (err) {
    console.error("[teaching.readMasteryRow] failed:", err);
    return null;
  }
}

function touchExposuresFireAndForget(userId: string, words: string[]): void {
  void (async () => {
    try {
      const supabase = await createServiceClient();
      for (const word of words) {
        const { error } = await supabase.rpc("touch_word_exposure", {
          p_user_id: userId,
          p_word_en: word,
        });
        if (error) {
          console.error(
            "[teaching.touch_word_exposure] failed:",
            word,
            error.message,
          );
        }
      }
    } catch (err) {
      console.error("[teaching.touch_word_exposure] failed:", err);
    }
  })();
}

export async function detectReuseAndAdvance(args: {
  userId: string | null;
  userText: string;
  introducedWords: string[];
}): Promise<MasteryEvent> {
  if (!args.userId || args.introducedWords.length === 0) {
    return { type: "none" };
  }

  try {
    for (const word of args.introducedWords) {
      if (!textContainsWord(args.userText, word)) continue;

      try {
        const supabase = await createServiceClient();
        const { error: rpcError } = await supabase.rpc("advance_word_mastery", {
          p_user_id: args.userId,
          p_word_en: word,
        });
        if (rpcError) {
          console.error(
            "[teaching.advance_word_mastery] failed:",
            word,
            rpcError.message,
            rpcError.details,
          );
        }
      } catch (rpcErr) {
        console.error("[teaching.advance_word_mastery] failed:", word, rpcErr);
      }

      const row = await readMasteryRow(args.userId, word);
      if (row?.mastered_at) {
        return { type: "mastered", word };
      }
      return {
        type: "advanced",
        word,
        newStage: row?.mastery_level ?? 1,
      };
    }

    touchExposuresFireAndForget(args.userId, args.introducedWords);
    return { type: "none" };
  } catch (err) {
    console.error("[teaching.detectReuseAndAdvance] failed:", err);
    return { type: "none" };
  }
}
