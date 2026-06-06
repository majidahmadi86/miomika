export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import { introduceWord, rowToIntroducedWord } from "@/lib/brain/teaching";
import { createServiceClient } from "@/lib/supabase/service";
import { log } from "@/lib/debug/log";
import {
  buildLessonPlan,
  resolveTeachServe,
} from "@/lib/talk/lesson-plan";
import type { Tier } from "@/lib/auth/get-server-profile";

async function loadVocabLists(userId: string): Promise<{
  introduced: string[];
  mastered: string[];
}> {
  const introduced: string[] = [];
  const mastered: string[] = [];
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_user_state")
      .select("word_en, mastered_at")
      .eq("user_id", userId);

    if (error) {
      console.error(
        "[teach-word] vocabulary_user_state query failed:",
        error.message,
        error.details,
      );
      return { introduced, mastered };
    }

    for (const row of data ?? []) {
      const word = (row.word_en as string | null) ?? null;
      if (!word) continue;
      if (row.mastered_at) mastered.push(word);
      else introduced.push(word);
    }
  } catch (err) {
    console.error("[teach-word] loadVocabLists failed:", err);
  }
  return { introduced, mastered };
}

async function loadCefrLevel(userId: string): Promise<string | null> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("cefr_level")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return (data.cefr_level as string | null) ?? null;
  } catch (err) {
    console.error("[teach-word] loadCefrLevel failed:", err);
    return null;
  }
}

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
    console.error("[teach-word] loadWordFromBank failed:", err);
    return null;
  }
}

function parseLessonPlan(body: unknown): string[] {
  if (!Array.isArray(body)) return [];
  return body.filter((w): w is string => typeof w === "string" && w.trim().length > 0);
}

function parseIntroducedIdx(body: unknown): number | null {
  if (typeof body !== "number" || !Number.isInteger(body) || body < 0) return null;
  return body;
}

/**
 * POST /api/teach-word
 * Stage 1 — deterministic lesson plan for Gemini Live `get_word_to_teach`.
 * buildLessonPlan + cursor serve (lib/talk/lesson-plan.ts). Members: introduceWord save.
 * Guests: A1 plan only, no save, never 401.
 */
export async function POST(req: NextRequest) {
  let topicHint = "";
  let bodyLearningTarget: string | null = null;
  let sessionIntroduced: string[] = [];
  let clientLessonPlan: string[] = [];
  let clientIntroducedIdx: number | null = null;
  try {
    const body = (await req.json()) as {
      topic_hint?: string;
      topicHint?: string;
      learning_target?: string;
      session_introduced?: string[];
      lesson_plan?: string[];
      introduced_idx?: number;
    };
    topicHint = String(body?.topic_hint ?? body?.topicHint ?? "").trim();
    bodyLearningTarget = body?.learning_target ?? null;
    if (Array.isArray(body?.session_introduced)) {
      sessionIntroduced = body.session_introduced.filter(
        (w): w is string => typeof w === "string" && w.trim().length > 0,
      );
    }
    clientLessonPlan = parseLessonPlan(body?.lesson_plan);
    clientIntroducedIdx = parseIntroducedIdx(body?.introduced_idx);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = await getServerProfile();
  const isGuest = !profile;
  const uiLanguage = isGuest
    ? "en"
    : normalizeUiLanguage(profile.ui_language ?? null);

  let introduced: string[] = [...sessionIntroduced];
  let mastered: string[] = [];
  let cefrLevel: string | null = null;
  let learningTarget: "th" | "en";
  let tier: Tier = "guest";
  let userId: string | null = null;

  if (profile) {
    userId = profile.id;
    tier = profile.tier;
    const profileTarget = normalizeLearningTarget(profile.learning_target_language);
    const requestTarget = normalizeLearningTarget(bodyLearningTarget);
    learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      requestTarget ?? profileTarget,
    );
    const [lists, cefr] = await Promise.all([
      loadVocabLists(profile.id),
      loadCefrLevel(profile.id),
    ]);
    introduced = [...introduced, ...lists.introduced];
    mastered = lists.mastered;
    cefrLevel = cefr;
  } else {
    const requestTarget = normalizeLearningTarget(bodyLearningTarget);
    learningTarget = sanitizeTargetLanguage(uiLanguage, requestTarget ?? "th");
  }

  let lessonPlan = clientLessonPlan;
  let introducedIdx = clientIntroducedIdx ?? 0;
  let lessonTopic: string | null = null;

  if (lessonPlan.length === 0) {
    const built = await buildLessonPlan({
      tier,
      cefrLevel: isGuest ? "A1" : cefrLevel,
      learningTarget,
      alreadyIntroducedWords: introduced,
      alreadyMasteredWords: mastered,
      topicHint: topicHint || undefined,
    });
    lessonPlan = built.plan;
    lessonTopic = built.topic;
    introducedIdx = 0;
  }

  const serve = resolveTeachServe({ plan: lessonPlan, introducedIdx });

  if (serve.kind === "lesson_complete") {
    log("teach-word", "get_word_to_teach", {
      userId: userId ?? "guest",
      topicHint: topicHint || null,
      picked: null,
      mode: "lesson_complete",
      planSize: lessonPlan.length,
      introducedIdx,
    });
    return NextResponse.json({
      ok: true,
      word: null,
      mode: "lesson_complete",
      lesson_plan: lessonPlan,
      lesson_topic: lessonTopic,
      introduced_idx: introducedIdx,
    });
  }

  const bankRow = await loadWordFromBank(serve.wordId);
  const word = bankRow
    ? rowToIntroducedWord(bankRow, learningTarget)
    : null;

  if (!word) {
    log("teach-word", "get_word_to_teach", {
      userId: userId ?? "guest",
      topicHint: topicHint || null,
      picked: serve.wordId,
      mode: "none",
      planMiss: true,
    });
    return NextResponse.json({
      ok: true,
      word: null,
      mode: "none",
      lesson_plan: lessonPlan,
      lesson_topic: lessonTopic,
      introduced_idx: introducedIdx,
    });
  }

  const nextIntroducedIdx = serve.introducedIdx + 1;
  const mode = "introduce" as const;

  log("teach-word", "get_word_to_teach", {
    userId: userId ?? "guest",
    topicHint: topicHint || null,
    picked: word.word_en,
    mode,
    planIndex: serve.introducedIdx,
    planSize: lessonPlan.length,
  });

  if (userId) {
    await introduceWord({ userId, word });
  }

  const phonetics = await resolvePhonetics({
    word_th: word.word_th,
    word_en: word.word_en,
    learningTarget,
    bankRomanization: bankRow?.th_romanization ?? null,
    bankIpa: bankRow?.en_ipa ?? null,
  });

  log("teach-word", "phonetics", {
    word_en: word.word_en,
    source: phonetics.phonetics_source,
  });

  return NextResponse.json({
    ok: true,
    mode,
    lesson_plan: lessonPlan,
    lesson_topic: lessonTopic,
    introduced_idx: nextIntroducedIdx,
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
