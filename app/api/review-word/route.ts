export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";
import { UI_LANGUAGE_COOKIE } from "@/lib/i18n/server";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import { rowToIntroducedWord } from "@/lib/brain/teaching";
import { resolveOrGenerateWord } from "@/lib/brain/word-content";
import { log } from "@/lib/debug/log";
import {
  buildExcludeSet,
  pickPlanReviewWord,
} from "@/lib/talk/lesson-plan";

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

  let uiLanguage: "th" | "en";
  let learningTarget: "th" | "en";

  if (profile) {
    uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const profileTarget = normalizeLearningTarget(profile.learning_target_language);
    const requestTarget = normalizeLearningTarget(bodyLearningTarget);
    learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      requestTarget ?? profileTarget,
    );
  } else {
    const browserUi = normalizeUiLanguage(
      req.cookies.get(UI_LANGUAGE_COOKIE)?.value ?? null,
    );
    const requestTarget = normalizeLearningTarget(bodyLearningTarget);
    uiLanguage = browserUi;
    learningTarget = sanitizeTargetLanguage(browserUi, requestTarget);
  }

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

  const resolved = await resolveOrGenerateWord({
    word: pickEn,
    learningTarget,
    cefrLevel: isGuest ? "A1" : null,
  });
  const word = resolved ? rowToIntroducedWord(resolved, learningTarget) : null;
  if (!word) {
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  const phonetics = await resolvePhonetics({
    word_th: word.word_th,
    word_en: word.word_en,
    learningTarget,
    bankRomanization: resolved?.th_romanization ?? null,
    bankIpa: resolved?.en_ipa ?? null,
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
    ...(resolved?.example_th ? { example_th: resolved.example_th } : {}),
    ...(resolved?.example_en ? { example_en: resolved.example_en } : {}),
  });
}
