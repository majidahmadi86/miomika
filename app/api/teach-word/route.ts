export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import {
  introduceWord,
  pickWordToIntroduce,
  pickWordToPractice,
} from "@/lib/brain/teaching";
import { createServiceClient } from "@/lib/supabase/service";
import { log } from "@/lib/debug/log";
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
    console.error("[teach-word] loadBankExtras failed:", err);
    return { example_th: null, example_en: null, th_romanization: null, en_ipa: null };
  }
}

/**
 * POST /api/teach-word
 * LOCKED 2026-06-05 — Brain-backed word picker for Gemini Live `get_word_to_teach` tool.
 * pickWordToIntroduce + introduceWord (lib/brain/teaching.ts). Members: pick + save.
 * Guests: A1 pick only, no save, never 401. Do not add auth gate without re-verifying /talk guest flow.
 */
export async function POST(req: NextRequest) {
  let topicHint = "";
  let bodyLearningTarget: string | null = null;
  let sessionIntroduced: string[] = [];
  try {
    const body = (await req.json()) as {
      topic_hint?: string;
      topicHint?: string;
      learning_target?: string;
      session_introduced?: string[];
    };
    topicHint = String(body?.topic_hint ?? body?.topicHint ?? "").trim();
    bodyLearningTarget = body?.learning_target ?? null;
    if (Array.isArray(body?.session_introduced)) {
      sessionIntroduced = body.session_introduced.filter(
        (w): w is string => typeof w === "string" && w.trim().length > 0,
      );
    }
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

  let word = await pickWordToIntroduce({
    userId,
    cefrLevel: isGuest ? "A1" : cefrLevel,
    learningTarget,
    alreadyIntroducedWords: introduced,
    alreadyMasteredWords: mastered,
    tier,
  });

  let mode: "introduce" | "practice" | "none" = word ? "introduce" : "none";

  if (!word && userId) {
    word = await pickWordToPractice({ userId, learningTarget });
    if (word) mode = "practice";
  }

  log("teach-word", "get_word_to_teach", {
    userId: userId ?? "guest",
    topicHint: topicHint || null,
    picked: word?.word_en ?? null,
    mode,
  });

  if (!word) {
    return NextResponse.json({ ok: true, word: null, mode: "none" });
  }

  if (userId && mode === "introduce") {
    await introduceWord({ userId, word });
  }

  const bank = await loadBankExtras(word.word_en);
  const phonetics = await resolvePhonetics({
    word_th: word.word_th,
    word_en: word.word_en,
    learningTarget,
    bankRomanization: bank.th_romanization,
    bankIpa: bank.en_ipa,
  });

  log("teach-word", "phonetics", {
    word_en: word.word_en,
    source: phonetics.phonetics_source,
  });

  return NextResponse.json({
    ok: true,
    mode,
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
