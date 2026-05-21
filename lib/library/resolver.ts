import { createClient } from "@/lib/supabase/client";
import type { VocabularyEntry } from "@/components/talk/WordCardV3";
import { extractWordFromInput } from "./matcher";

export async function resolveWordCard(
  payloadResolver: string,
  payloadParams: Record<string, unknown>,
  userInput: string,
  wordsIntroduced: string[] = []
): Promise<VocabularyEntry | null> {
  try {
    const supabase = createClient();

    if (payloadResolver === "specific_word_id") {
      const wordEn = payloadParams.word_en as string | undefined;
      const wordTh = payloadParams.word_th as string | undefined;
      const cefrLevel = payloadParams.cefr_level as string | undefined;

      let query = supabase
        .from("vocabulary_bank")
        .select("*")
        .eq("status", "active");

      if (wordEn) query = query.ilike("word_en", wordEn);
      if (wordTh) query = query.eq("word_th", wordTh);
      if (cefrLevel) query = query.eq("cefr_level", cefrLevel);

      const { data } = await query.limit(1).single();
      return data as VocabularyEntry | null;
    }

    if (payloadResolver === "first_vocab_at_user_level") {
      const cefrLevel = (payloadParams.cefr_level as string) ?? "A1";
      const { data } = await supabase
        .from("vocabulary_bank")
        .select("*")
        .eq("status", "active")
        .eq("cefr_level", cefrLevel)
        .not("word_en", "in", `(${wordsIntroduced.map(w => `"${w}"`).join(",") || '""'})`)
        .order("frequency_score", { ascending: false })
        .limit(1)
        .single();
      return data as VocabularyEntry | null;
    }

    if (payloadResolver === "extract_from_input") {
      const extracted = extractWordFromInput(userInput);
      if (!extracted) return null;

      const { data } = await supabase
        .from("vocabulary_bank")
        .select("*")
        .eq("status", "active")
        .or(`word_en.ilike.%${extracted}%,word_th.ilike.%${extracted}%`)
        .limit(1)
        .single();
      return data as VocabularyEntry | null;
    }

    return null;
  } catch {
    return null;
  }
}
