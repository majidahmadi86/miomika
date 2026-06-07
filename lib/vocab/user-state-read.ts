import { createServiceClient } from "@/lib/supabase/service";

export async function loadVocabLists(userId: string): Promise<{
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
        "[vocab] vocabulary_user_state query failed:",
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
    console.error("[vocab] loadVocabLists failed:", err);
  }
  return { introduced, mastered };
}

export async function loadCefrLevel(userId: string): Promise<string | null> {
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
    console.error("[vocab] loadCefrLevel failed:", err);
    return null;
  }
}

export async function loadRecentIntroducedWords(
  userId: string,
  limit = 3,
): Promise<Array<{ word_en: string; word_th: string }>> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("vocabulary_user_state")
      .select("word_en")
      .eq("user_id", userId)
      .order("last_introduced_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    const wordEns = data
      .map((row) => (row.word_en as string | null)?.trim())
      .filter((w): w is string => !!w);

    if (wordEns.length === 0) return [];

    const { data: bankRows, error: bankErr } = await supabase
      .from("vocabulary_bank")
      .select("word_en, word_th")
      .in("word_en", wordEns);

    if (bankErr || !bankRows?.length) {
      return wordEns.map((word_en) => ({ word_en, word_th: word_en }));
    }

    const thByEn = new Map<string, string>();
    for (const row of bankRows) {
      const en = (row.word_en as string | null)?.trim();
      const th = (row.word_th as string | null)?.trim();
      if (en && th) thByEn.set(en, th);
    }

    return wordEns.map((word_en) => ({
      word_en,
      word_th: thByEn.get(word_en) ?? word_en,
    }));
  } catch (err) {
    console.error("[vocab] loadRecentIntroducedWords failed:", err);
    return [];
  }
}
