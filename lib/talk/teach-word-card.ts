import type { VocabularyEntry } from "@/components/talk/WordCardV3";

export type TeachWordResult = {
  ok?: boolean;
  word_en?: string;
  word_th?: string;
  emoji?: string | null;
  cefr_level?: string | null;
  example_th?: string | null;
  example_en?: string | null;
  th_romanization?: string | null;
  en_ipa?: string | null;
  phonetics?: string | null;
  phonetics_source?: "bank" | "generated" | null;
};

export function teachWordToVocabularyEntry(result: TeachWordResult): VocabularyEntry | null {
  const word_en = result.word_en?.trim();
  const word_th = result.word_th?.trim();
  if (!word_en || !word_th) return null;

  return {
    id: word_en,
    word_en,
    word_th,
    th_romanization: result.th_romanization ?? result.phonetics ?? undefined,
    en_ipa: result.en_ipa ?? undefined,
    emoji: result.emoji ?? undefined,
    cefr_level: result.cefr_level ?? undefined,
    example_th: result.example_th ?? undefined,
    example_en: result.example_en ?? undefined,
  };
}

export function cardDirectionForTarget(
  targetLanguage: "th" | "en" | null,
): "th_to_en" | "en_to_th" {
  return targetLanguage === "en" ? "th_to_en" : "en_to_th";
}

export function replayTextForWord(
  word: VocabularyEntry,
  targetLanguage: "th" | "en" | null,
): { text: string; lang: "th" | "en" } {
  const target = targetLanguage ?? "th";
  if (target === "en") {
    return { text: word.word_en, lang: "en" };
  }
  return { text: word.word_th, lang: "th" };
}

export type PracticeWord = {
  word_en: string;
  word_th: string;
  th_romanization?: string | null;
  en_ipa?: string | null;
  emoji?: string | null;
  cefr_level?: string | null;
  example_th?: string | null;
  example_en?: string | null;
};

export function practiceWordToVocabularyEntry(word: PracticeWord): VocabularyEntry {
  return {
    id: word.word_en,
    word_en: word.word_en,
    word_th: word.word_th,
    th_romanization: word.th_romanization ?? undefined,
    en_ipa: word.en_ipa ?? undefined,
    emoji: word.emoji ?? undefined,
    cefr_level: word.cefr_level ?? undefined,
    example_th: word.example_th ?? undefined,
    example_en: word.example_en ?? undefined,
  };
}
