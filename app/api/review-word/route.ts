export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import { rowToIntroducedWord } from "@/lib/brain/teaching";
import { createServiceClient } from "@/lib/supabase/service";
import { log } from "@/lib/debug/log";
import {
  buildExcludeSet,
  pickPlanReviewWord,
} from "@/lib/talk/lesson-plan";

async function loadWordFromBank(wordEn: string): Promise<{
  word_en: string;
  word_th: string;
  emoji: string | null;
  cefr_level: string | null;
  example_th: string | null;
  example_en: string | null;
  th_romanization: string | null;
  en_ipa: string | null;
} | null> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select(
        "word_en, word_th, emoji, cefr_level, example_th, example_en, th_romanization, en_ipa",
      )
      .eq("word_en", wordEn)
      .maybeSingle();
    if (error || !data) return null;
    const word_en = (data.word_en as string | null)?.trim() ?? "";
    const word_th = (data.word_th as string | null)?.trim() ?? "";
    if (!word_en || !word_th) return null;
    return {
      word_en,
      word_th,
      emoji: (data.emoji as string | null) ?? null,
      cefr_level: (data.cefr_level as string | null) ?? null,
      example_th: (data.example_th as string | null) ?? null,
      example_en: (data.example_en as string | null) ?? null,
      th_romanization: (data.th_romanization as string | null) ?? null,
      en_ipa: (data.en_ipa as string | null) ?? null,
    };
  } catch (err) {
    console.error("[review-word] loadWordFromBank failed:", err);
    return null;
  }
}

function parseLessonPlan(body: unknown): string[] {
  if (!Array.isArray(body)) return [];
  return body.filter((w): w is string => typeof w === "string" && w.trim().length > 0);
}

function parseIntroducedIdx(body: unknown): number {
  if (typeof body !== "number" || !Number.isInteger(body) || body < 0) return 0;
  return body;
}

/**
 * POST /api/review-word
 * Stage 1 — Tool 3: rotate through introduced lesson-plan words (session exclude ledger).
 * Guests + members: plan-based when lesson_plan is present. Never 401 guests.
 */
export async function POST(req: NextRequest) {
  let bodyLearningTarget: string | null = null;
  let bodyExclude: string[] = [];
  let clientLessonPlan: string[] = [];
  let clientIntroducedIdx = 0;
  try {
    const body = (await req.json()) as {
      learning_target?: string;
      exclude?: string[];
      lesson_plan?: string[];
      introduced_idx?: number;
    };
    bodyLearningTarget = body?.learning_target ?? null;
    bodyExclude = Array.isArray(body?.exclude)
      ? body.exclude.filter((w): w is string => typeof w === "string")
      : [];
    clientLessonPlan = parseLessonPlan(body?.lesson_plan);
    clientIntroducedIdx = parseIntroducedIdx(body?.introduced_idx);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = await getServerProfile();
  const isGuest = !profile;

  const uiLanguage = isGuest
    ? "en"
    : normalizeUiLanguage(profile!.ui_language ?? null);
  const profileTarget = isGuest
    ? null
    : normalizeLearningTarget(profile!.learning_target_language);
  const requestTarget = normalizeLearningTarget(bodyLearningTarget);
  const learningTarget = sanitizeTargetLanguage(
    uiLanguage,
    requestTarget ?? profileTarget,
  );

  if (clientLessonPlan.length === 0 || clientIntroducedIdx <= 0) {
    log("review-word", "get_word_to_review", {
      userId: isGuest ? "guest" : profile!.id,
      picked: null,
      reason: "no_introduced_plan_words",
    });
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  const exclude = buildExcludeSet(bodyExclude);
  const pickEn = pickPlanReviewWord({
    plan: clientLessonPlan,
    introducedIdx: clientIntroducedIdx,
    exclude,
  });

  log("review-word", "get_word_to_review", {
    userId: isGuest ? "guest" : profile!.id,
    picked: pickEn,
    mode: pickEn ? "practice" : "none",
  });

  if (!pickEn) {
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  const bankRow = await loadWordFromBank(pickEn);
  const word = bankRow ? rowToIntroducedWord(bankRow, learningTarget) : null;
  if (!word) {
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  const phonetics = await resolvePhonetics({
    word_th: word.word_th,
    word_en: word.word_en,
    learningTarget,
    bankRomanization: bankRow?.th_romanization ?? null,
    bankIpa: bankRow?.en_ipa ?? null,
  });

  return NextResponse.json({
    ok: true,
    mode: "practice",
    word_en: word.word_en,
    word_th: word.word_th,
    emoji: word.emoji,
    cefr_level: word.cefr_level,
    phonetics: phonetics.phonetics,
    phonetics_source: phonetics.phonetics_source,
    ...(phonetics.th_romanization ? { th_romanization: phonetics.th_romanization } : {}),
    ...(phonetics.en_ipa ? { en_ipa: phonetics.en_ipa } : {}),
    ...(bankRow?.example_th ? { example_th: bankRow.example_th } : {}),
    ...(bankRow?.example_en ? { example_en: bankRow.example_en } : {}),
  });
}
