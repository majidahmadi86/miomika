import type { VocabularyEntry } from "@/components/talk/WordCardV3";

const SLUG_TOPIC_SUFFIX =
  /_(?:stuff|food|travel|work|daily|greeting|social|market|health|school|business|home|family)$/;

/** Internal vocabulary_bank topic/category ids — never user-facing gloss or replay text. */
export function isVocabularySlug(text: string | null | undefined): boolean {
  const t = (text ?? "").trim().toLowerCase();
  if (!t) return false;
  if (/\s/.test(t) || /[\u0E00-\u0E7F]/.test(t)) return false;
  if (!/^[a-z][a-z0-9_]*$/.test(t)) return false;
  if (/[0-9]$/.test(t)) return true;
  if (SLUG_TOPIC_SUFFIX.test(t)) return true;
  return false;
}

function humanGloss(word_en: string, word_th: string, prefer: "en" | "th"): string {
  const en = word_en.trim();
  const th = word_th.trim();
  if (prefer === "en") {
    if (en && !isVocabularySlug(en)) return en;
    if (th && !isVocabularySlug(th)) return th;
    return "";
  }
  if (th && !isVocabularySlug(th)) return th;
  if (en && !isVocabularySlug(en)) return en;
  return "";
}

function humanTargetSurface(word_en: string, word_th: string, target: "th" | "en"): string {
  if (target === "th") {
    if (word_th.trim() && !isVocabularySlug(word_th)) return word_th.trim();
    if (word_en.trim() && !isVocabularySlug(word_en)) return word_en.trim();
    return "";
  }
  if (word_en.trim() && !isVocabularySlug(word_en)) return word_en.trim();
  if (word_th.trim() && !isVocabularySlug(word_th)) return word_th.trim();
  return "";
}

export type TeachWordResult = {
  ok?: boolean;
  mode?: "introduce" | "none" | "lesson_complete" | "practice";
  lesson_plan?: string[];
  introduced_idx?: number;
  word_en?: string;
  word_th?: string;
  word?: null;
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
  const word_en = result.word_en?.trim() ?? "";
  const word_th = result.word_th?.trim() ?? "";
  if (!word_en || !word_th) return null;
  if (isVocabularySlug(word_en) || isVocabularySlug(word_th)) return null;

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

/** UI-language gloss for the card meaning row — never a bank topic/category slug. */
export function cardMeaningForWord(
  word: Pick<VocabularyEntry, "word_en" | "word_th">,
  direction: "th_to_en" | "en_to_th",
): string {
  const prefer = direction === "th_to_en" ? "th" : "en";
  return humanGloss(word.word_en, word.word_th, prefer);
}

export function replayTextForWord(
  word: VocabularyEntry,
  targetLanguage: "th" | "en" | null,
): { text: string; lang: "th" | "en" } {
  const target = targetLanguage ?? "th";
  const text = humanTargetSurface(word.word_en, word.word_th, target);
  if (!text) return { text: "", lang: target };
  return { text, lang: target };
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
