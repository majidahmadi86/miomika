export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { introduceWord, pickWordToIntroduce } from "@/lib/brain/teaching";
import { createServiceClient } from "@/lib/supabase/service";
import { log } from "@/lib/debug/log";
import type { Tier } from "@/lib/auth/get-server-profile";

function normalizeLearningTarget(raw: string | null): "th" | "en" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("th") || lower === "thai") return "th";
  if (lower.startsWith("en") || lower === "english") return "en";
  return null;
}

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

async function loadBankExamples(wordEn: string): Promise<{
  example_th: string | null;
  example_en: string | null;
}> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select("example_th, example_en")
      .eq("word_en", wordEn)
      .maybeSingle();
    if (error || !data) return { example_th: null, example_en: null };
    return {
      example_th: (data.example_th as string | null) ?? null,
      example_en: (data.example_en as string | null) ?? null,
    };
  } catch (err) {
    console.error("[teach-word] loadBankExamples failed:", err);
    return { example_th: null, example_en: null };
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
  try {
    const body = (await req.json()) as { topic_hint?: string; topicHint?: string };
    topicHint = String(body?.topic_hint ?? body?.topicHint ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = await getServerProfile();
  const isGuest = !profile;

  let introduced: string[] = [];
  let mastered: string[] = [];
  let cefrLevel: string | null = null;
  let learningTarget: "th" | "en" | null = null;
  let tier: Tier = "guest";
  let userId: string | null = null;

  if (profile) {
    userId = profile.id;
    tier = profile.tier;
    learningTarget = normalizeLearningTarget(profile.learning_target_language);
    const [lists, cefr] = await Promise.all([
      loadVocabLists(profile.id),
      loadCefrLevel(profile.id),
    ]);
    introduced = lists.introduced;
    mastered = lists.mastered;
    cefrLevel = cefr;
  }

  const word = await pickWordToIntroduce({
    userId,
    cefrLevel: isGuest ? "A1" : cefrLevel,
    learningTarget,
    alreadyIntroducedWords: introduced,
    alreadyMasteredWords: mastered,
    tier,
  });

  log("teach-word", "get_word_to_teach", {
    userId: userId ?? "guest",
    topicHint: topicHint || null,
    picked: word?.word_en ?? null,
  });

  if (!word) {
    return NextResponse.json({ ok: true, word: null });
  }

  if (userId) {
    await introduceWord({ userId, word });
  }

  const examples = await loadBankExamples(word.word_en);

  return NextResponse.json({
    ok: true,
    word_en: word.word_en,
    word_th: word.word_th,
    emoji: word.emoji,
    cefr_level: word.cefr_level,
    ...(examples.example_th ? { example_th: examples.example_th } : {}),
    ...(examples.example_en ? { example_en: examples.example_en } : {}),
  });
}
