// SINGLE OWNER for romanization quality. "Real, readable syllables — or nothing."
// Imported by resolvePhonetics (all word-card paths) AND the lesson phrase builder
// so the rule cannot diverge across call sites.

const LATIN_ROMAN = /^[a-zà-ÿ''\- ]+$/i;
const tokensOf = (t: string): string[] => t.split(/[\s\-]+/).filter(Boolean);
const notLetterSpam = (tokens: string[]): boolean => {
  if (tokens.length === 0) return false;
  return tokens.filter((x) => x.length === 1).length / tokens.length <= 0.34;
};

/** Curated bank romanization — trust unless egregiously broken. */
export function isAcceptableBankRomanization(roman: string, source: string): boolean {
  const t = (roman ?? "").trim();
  if (!t || t === (source ?? "").trim()) return false;
  if (!LATIN_ROMAN.test(t)) return false;
  return notLetterSpam(tokensOf(t.toLowerCase()));
}

/** LLM-generated romanization — strict: real syllables, segmented for multi-syllable words. */
export function isAcceptableGeneratedRomanization(roman: string, source: string): boolean {
  if (!isAcceptableBankRomanization(roman, source)) return false;
  const t = (roman ?? "").trim().toLowerCase();
  const tokens = tokensOf(t);
  const thaiChars = (source.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  if (thaiChars >= 5 && tokens.length < 2) return false; // catches เพิ่มเติม → "phetmetmore"
  if (tokens.length === 1 && t.length > 9) return false;  // no absurd single run
  return true;
}

/** Lesson phrases (2+ words). Exact port of the original looksSyllabic, now shared. */
export function isSyllabicPhrase(txt: string): boolean {
  const t = (txt ?? "").trim();
  if (!t || !/^[a-z' \-]+$/.test(t)) return false;
  const tokens = t.split(/[\s\-]+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 16) return false;
  return tokens.filter((x) => x.length === 1).length / tokens.length <= 0.34;
}
