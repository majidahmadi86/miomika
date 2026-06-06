export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import { pickWordToReview } from "@/lib/brain/teaching";
import { createServiceClient } from "@/lib/supabase/service";
import { log } from "@/lib/debug/log";

async function loadBankExtras(wordEn: string): Promise<{
  example_th: string | null;
  example_en: string | null;
  th_romanization: string | null;
  en_ipa: string | null;
}> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select("example_th, example_en, th_romanization, en_ipa")
      .eq("word_en", wordEn)
      .maybeSingle();
    if (error || !data) {
      return { example_th: null, example_en: null, th_romanization: null, en_ipa: null };
    }
    return {
      example_th: (data.example_th as string | null) ?? null,
      example_en: (data.example_en as string | null) ?? null,
      th_romanization: (data.th_romanization as string | null) ?? null,
      en_ipa: (data.en_ipa as string | null) ?? null,
    };
  } catch (err) {
    console.error("[review-word] loadBankExtras failed:", err);
    return { example_th: null, example_en: null, th_romanization: null, en_ipa: null };
  }
}

/**
 * POST /api/review-word
 * TEACHING MODE v1 — Tool 3 backend: spiral due words via pickWordToReview.
 * Members only (guests have no vocabulary_user_state). Never 401 guests.
 */
export async function POST(req: NextRequest) {
  let bodyLearningTarget: string | null = null;
  let bodyExclude: string[] = [];
  try {
    const body = (await req.json()) as {
      learning_target?: string;
      exclude?: string[];
    };
    bodyLearningTarget = body?.learning_target ?? null;
    bodyExclude = Array.isArray(body?.exclude)
      ? body.exclude.filter((w): w is string => typeof w === "string")
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = await getServerProfile();
  if (!profile) {
    log("review-word", "get_word_to_review", { userId: "guest", picked: null });
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
  const profileTarget = normalizeLearningTarget(profile.learning_target_language);
  const requestTarget = normalizeLearningTarget(bodyLearningTarget);
  const learningTarget = sanitizeTargetLanguage(
    uiLanguage,
    requestTarget ?? profileTarget,
  );

  const word = await pickWordToReview({
    userId: profile.id,
    learningTarget,
    exclude: bodyExclude,
  });

  log("review-word", "get_word_to_review", {
    userId: profile.id,
    picked: word?.word_en ?? null,
    mode: word ? "practice" : "none",
  });

  if (!word) {
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  const bank = await loadBankExtras(word.word_en);
  const phonetics = await resolvePhonetics({
    word_th: word.word_th,
    word_en: word.word_en,
    learningTarget,
    bankRomanization: bank.th_romanization,
    bankIpa: bank.en_ipa,
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
    ...(bank.example_th ? { example_th: bank.example_th } : {}),
    ...(bank.example_en ? { example_en: bank.example_en } : {}),
  });
}
