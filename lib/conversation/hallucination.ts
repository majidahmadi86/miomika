const ALLOWED_SHORTS = new Set([
  "yes",
  "no",
  "ok",
  "okay",
  "hi",
  "hey",
  "ใช่",
  "ไม่",
  "อืม",
  "ค่ะ",
  "ครับ",
]);

const ENGLISH_MEANINGFUL = new Set([
  "a",
  "an",
  "the",
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "it",
  "is",
  "are",
  "was",
  "were",
  "am",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "can",
  "may",
  "might",
  "must",
  "hello",
  "hi",
  "hey",
  "yes",
  "no",
  "ok",
  "okay",
  "thanks",
  "thank",
  "please",
  "sorry",
  "good",
  "bye",
  "what",
  "how",
  "why",
  "when",
  "where",
  "who",
  "which",
  "this",
  "that",
  "with",
  "for",
  "not",
  "but",
  "and",
  "or",
  "my",
  "me",
  "your",
  "our",
  "their",
  "to",
  "of",
  "in",
  "on",
  "at",
  "from",
  "about",
  "like",
  "want",
  "need",
  "know",
  "think",
  "see",
  "go",
  "come",
  "get",
  "make",
  "take",
  "give",
  "say",
  "tell",
  "ask",
  "help",
  "learn",
  "speak",
  "english",
  "thai",
  "name",
  "today",
  "tomorrow",
  "yesterday",
]);

function thaiCharRatio(text: string): number {
  const thai = text.match(/[\u0E00-\u0E7F]/g)?.length ?? 0;
  const total = text.replace(/\s/g, "").length;
  if (total === 0) return 0;
  return thai / total;
}

function latinCharRatio(text: string): number {
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  const total = text.replace(/\s/g, "").length;
  if (total === 0) return 0;
  return latin / total;
}

function hasEnglishMeaningfulWord(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.some((w) => ENGLISH_MEANINGFUL.has(w));
}

/**
 * Whisper sanity guard — drop transcripts that are likely model hallucinations.
 */
export function isLikelyHallucination(
  text: string,
  userSpeaksLanguage: "th" | "en",
  isPracticeAttempt: boolean,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const normalized = trimmed.toLowerCase();
  if (trimmed.length < 2 && !ALLOWED_SHORTS.has(normalized)) {
    return true;
  }

  if (userSpeaksLanguage === "en" && thaiCharRatio(trimmed) > 0.7 && !isPracticeAttempt) {
    return true;
  }

  if (
    userSpeaksLanguage === "th" &&
    latinCharRatio(trimmed) > 0.7 &&
    !hasEnglishMeaningfulWord(trimmed)
  ) {
    return true;
  }

  return false;
}
