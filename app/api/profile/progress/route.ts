export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 10;

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/debug/log";

export type LearningWord = {
  word_en: string;
  word_th: string;
  th_romanization?: string | null;
  en_ipa?: string | null;
  emoji?: string | null;
  cefr_level?: string | null;
  example_th?: string | null;
  example_en?: string | null;
  mastery_level: number;
  next_spiral_at: string | null;
};

export type ProgressResponse = {
  wordsMastered: number;
  wordsLearning: number;
  conversationCount: number;
  streakDays: number;
  cefrLevel: string | null;
  learningTargetLanguage: "th" | "en" | null;
  activityDates: string[];
  learningWords: LearningWord[];
};

const ZEROED: ProgressResponse = {
  wordsMastered: 0,
  wordsLearning: 0,
  conversationCount: 0,
  streakDays: 0,
  cefrLevel: null,
  learningTargetLanguage: null,
  activityDates: [],
  learningWords: [],
};

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return toDateKey(new Date().toISOString());
}

function computeStreak(dateKeys: string[]): number {
  const set = new Set(dateKeys);
  const today = todayKey();
  if (!set.has(today)) return 0;

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = toDateKey(cursor.toISOString());
    if (!set.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function GET() {
  Sentry.setTag("flow", "progress");

  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json(ZEROED);
  }

  try {
    const supabase = await createServiceClient();

    // cefr_level and the (already cross-resolved) learning target both live on
    // the profile from getServerProfile — no need to re-query. Using the resolved
    // value keeps the Dashboard consistent with Home, Talk, and Learn.
    const cefrLevel: string | null = profile.cefr_level;
    const learningTargetLanguage: "th" | "en" | null =
      profile.learning_target_language === "th" || profile.learning_target_language === "en"
        ? profile.learning_target_language
        : null;

    const { count: wordsMastered, error: masteredErr } = await supabase
      .from("vocabulary_user_state")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .not("mastered_at", "is", null);

    if (masteredErr) throw masteredErr;

    const { count: wordsLearning, error: learningErr } = await supabase
      .from("vocabulary_user_state")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .is("mastered_at", null);

    if (learningErr) throw learningErr;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);

    const { data: convRows, error: convErr } = await supabase
      .from("conversations")
      .select("session_id, created_at")
      .eq("user_id", profile.id)
      .gte("created_at", sixtyDaysAgo.toISOString());

    if (convErr) throw convErr;

    const sessionIds = new Set<string>();
    const activityDates: string[] = [];
    for (const row of convRows ?? []) {
      if (row.session_id) sessionIds.add(row.session_id as string);
      if (row.created_at) activityDates.push(toDateKey(row.created_at as string));
    }

    const { data: allSessions, error: allSessionsErr } = await supabase
      .from("conversations")
      .select("session_id")
      .eq("user_id", profile.id);

    if (allSessionsErr) throw allSessionsErr;

    const allSessionIds = new Set<string>();
    for (const row of allSessions ?? []) {
      if (row.session_id) allSessionIds.add(row.session_id as string);
    }

    const streakDays = computeStreak(activityDates);

    const { data: learningRows, error: learningWordsErr } = await supabase
      .from("vocabulary_user_state")
      .select("word_en, mastery_level, next_spiral_at")
      .eq("user_id", profile.id)
      .is("mastered_at", null)
      .order("last_introduced_at", { ascending: false })
      .limit(100);

    if (learningWordsErr) throw learningWordsErr;

    const wordEns = (learningRows ?? []).map((r) => r.word_en as string);
    type BankRow = {
      word_en: string;
      word_th: string;
      th_romanization: string | null;
      en_ipa: string | null;
      emoji: string | null;
      cefr_level: string | null;
      example_th: string | null;
      example_en: string | null;
    };
    const bankByEn = new Map<string, BankRow>();

    if (wordEns.length > 0) {
      const { data: bankRows, error: bankErr } = await supabase
        .from("vocabulary_bank")
        .select("word_en, word_th, th_romanization, en_ipa, emoji, cefr_level, example_th, example_en")
        .in("word_en", Array.from(new Set(wordEns.flatMap((w) => [w, w.toLowerCase()]))));

      if (bankErr) throw bankErr;

      for (const row of bankRows ?? []) {
        if (row.word_en && row.word_th) {
          bankByEn.set((row.word_en as string).toLowerCase(), {
            word_en: row.word_en as string,
            word_th: row.word_th as string,
            th_romanization: (row.th_romanization as string | null) ?? null,
            en_ipa: (row.en_ipa as string | null) ?? null,
            emoji: (row.emoji as string | null) ?? null,
            cefr_level: (row.cefr_level as string | null) ?? null,
            example_th: (row.example_th as string | null) ?? null,
            example_en: (row.example_en as string | null) ?? null,
          });
        }
      }
    }

    const learningWords: LearningWord[] = (learningRows ?? [])
      .map((row): LearningWord | null => {
        const bank = bankByEn.get((row.word_en as string).toLowerCase());
        // No Thai for this word (truly off-bank) → skip it. Showing the English word
        // in the Thai slot (e.g. "excuse me / excuse me") is meaningless to a Thai learner.
        if (!bank) return null;
        return {
          word_en: row.word_en as string,
          word_th: bank.word_th,
          th_romanization: bank.th_romanization,
          en_ipa: bank.en_ipa,
          emoji: bank.emoji,
          cefr_level: bank.cefr_level,
          example_th: bank.example_th,
          example_en: bank.example_en,
          mastery_level: (row.mastery_level as number) ?? 0,
          next_spiral_at: (row.next_spiral_at as string | null) ?? null,
        };
      })
      .filter((w): w is LearningWord => w !== null);

    const payload: ProgressResponse = {
      wordsMastered: wordsMastered ?? 0,
      wordsLearning: wordsLearning ?? 0,
      conversationCount: allSessionIds.size,
      streakDays,
      cefrLevel,
      learningTargetLanguage,
      activityDates: Array.from(new Set(activityDates)),
      learningWords,
    };

    return NextResponse.json(payload);
  } catch (err) {
    logError("progress.route", "progress fetch failed", err);
    console.error("[api/profile/progress] failed:", err);
    return NextResponse.json(ZEROED);
  }
}
