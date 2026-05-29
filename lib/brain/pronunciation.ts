// SERVER ONLY. Pronunciation detection and lesson building — no AI.

import { createServiceClient } from "@/lib/supabase/service";
import { getRecentExchanges } from "@/lib/brain/memory";

export interface PronunciationLesson {
  word: string;
  word_th: string;
  syllables: string[];
  ipa: string | null;
  meaning_en: string;
  meaning_th: string;
  example_th: string | null;
  example_en: string | null;
}

const THAI_SCRIPT = /[\u0E00-\u0E7F]/;

const CONTINUATION_RE =
  /say it slowly|say it again|one more time|อีกครั้ง|ช้าๆ|พูดช้า|พูดอีกที|พูดใหม่/i;

type VocabRow = {
  word_en?: string | null;
  word?: string | null;
  word_th?: string | null;
  th_romanization?: string | null;
  en_ipa?: string | null;
  miomi_note_th?: string | null;
  miomi_note_en?: string | null;
  example_th?: string | null;
  example_en?: string | null;
  tone?: string | null;
};

export function detectPronunciationRequest(text: string): {
  word: string | null;
  isRequest: boolean;
} {
  const t = text.trim();
  if (!t) return { word: null, isRequest: false };

  const patterns: RegExp[] = [
    /how (?:do|to|can) (?:i|you) (?:say|pronounce) ['"]?([\w\u0E00-\u0E7F]+)['"]?/i,
    /pronunciation of ['"]?([\w\u0E00-\u0E7F]+)['"]?/i,
    /how is ['"]?([\w\u0E00-\u0E7F]+)['"]? pronounced/i,
    /['"]([\w\u0E00-\u0E7F]+)['"] in thai/i,
    /ออกเสียง.*คำว่า\s*([\w\u0E00-\u0E7F]+)/,
    /["""]?([\w\u0E00-\u0E7F]+)["""]?\s*พูดยังไง/,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      return { word: m[1].trim(), isRequest: true };
    }
  }

  if (CONTINUATION_RE.test(t)) {
    return { word: null, isRequest: true };
  }

  return { word: null, isRequest: false };
}

export function isPronunciationContinuation(text: string): boolean {
  return CONTINUATION_RE.test(text.trim());
}

export async function resolveContinuationWord(
  userId: string | null,
  memory: Array<{ role: "user" | "miomi"; content: string }>,
): Promise<string | null> {
  const miomiMessages = memory.filter((m) => m.role === "miomi").slice(-3);
  for (let i = miomiMessages.length - 1; i >= 0; i--) {
    const extracted = extractWordFromLessonMessage(miomiMessages[i].content);
    if (extracted) return extracted;
  }

  if (!userId) return null;

  try {
    const rows = await getRecentExchanges(userId, 8);
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].role !== "miomi") continue;
      const extracted = extractWordFromLessonMessage(rows[i].content);
      if (extracted) return extracted;
    }
  } catch (err) {
    console.error("[pronunciation.resolveContinuationWord] failed:", err);
  }

  return null;
}

function extractWordFromLessonMessage(content: string): string | null {
  const quoted = content.match(/คำว่า\s*["「]([^"」]+)["」]|word\s*["']([^"']+)["']/i);
  if (quoted) return (quoted[1] ?? quoted[2])?.trim() ?? null;

  const thaiWord = content.match(/[\u0E00-\u0E7F]{2,}/);
  if (thaiWord) return thaiWord[0];

  const latin = content.match(/\b([a-z]{3,})\b/i);
  return latin?.[1]?.toLowerCase() ?? null;
}

export async function buildPronunciationLesson(
  word: string,
): Promise<PronunciationLesson | null> {
  const raw = word.trim();
  if (!raw) return null;

  try {
    const supabase = await createServiceClient();
    const isThaiScript = THAI_SCRIPT.test(raw);

    let row: VocabRow | null = null;

    const { data: byEn, error: enErr } = await supabase
      .from("vocabulary_bank")
      .select(
        "word_en, word_th, th_romanization, en_ipa, miomi_note_th, miomi_note_en, example_th, example_en, tone",
      )
      .eq("status", "active")
      .ilike("word_en", raw)
      .limit(1)
      .maybeSingle();

    if (enErr) {
      console.error(
        "[pronunciation.buildPronunciationLesson] word_en lookup failed:",
        enErr.message,
        enErr.details,
      );
    } else if (byEn) {
      row = byEn as VocabRow;
    }

    if (!row && isThaiScript) {
      const { data: byTh, error: thErr } = await supabase
        .from("vocabulary_bank")
        .select(
          "word_en, word_th, th_romanization, en_ipa, miomi_note_th, miomi_note_en, example_th, example_en, tone",
        )
        .eq("status", "active")
        .eq("word_th", raw)
        .limit(1)
        .maybeSingle();

      if (thErr) {
        console.error(
          "[pronunciation.buildPronunciationLesson] word_th lookup failed:",
          thErr.message,
          thErr.details,
        );
      } else if (byTh) {
        row = byTh as VocabRow;
      }
    }

    if (!row && !isThaiScript) {
      const { data: byRom, error: romErr } = await supabase
        .from("vocabulary_bank")
        .select(
          "word_en, word_th, th_romanization, en_ipa, miomi_note_th, miomi_note_en, example_th, example_en, tone",
        )
        .eq("status", "active")
        .ilike("th_romanization", raw)
        .limit(1)
        .maybeSingle();

      if (romErr) {
        console.error(
          "[pronunciation.buildPronunciationLesson] transliteration lookup failed:",
          romErr.message,
          romErr.details,
        );
      } else if (byRom) {
        row = byRom as VocabRow;
      }
    }

    const word_en = (row?.word_en ?? row?.word ?? raw).trim();
    const word_th = (row?.word_th ?? (isThaiScript ? raw : "")).trim() || word_en;
    const meaning_en =
      row?.miomi_note_en?.trim() ||
      row?.word_en?.trim() ||
      word_en;
    const meaning_th =
      row?.miomi_note_th?.trim() ||
      row?.word_th?.trim() ||
      word_th;
    const ipa = row?.en_ipa ?? row?.th_romanization ?? null;

    const syllables = buildSyllables({
      word_en,
      word_th,
      th_romanization: row?.th_romanization ?? null,
      tone: row?.tone ?? null,
      raw,
      isThaiScript,
    });

    return {
      word: word_en,
      word_th,
      syllables,
      ipa,
      meaning_en,
      meaning_th,
      example_th: row?.example_th ?? null,
      example_en: row?.example_en ?? null,
    };
  } catch (err) {
    console.error("[pronunciation.buildPronunciationLesson] FAILED:", err);
    return null;
  }
}

function buildSyllables(args: {
  word_en: string;
  word_th: string;
  th_romanization: string | null;
  tone: string | null;
  raw: string;
  isThaiScript: boolean;
}): string[] {
  const { word_th, th_romanization, tone, raw, isThaiScript } = args;

  if (th_romanization?.trim()) {
    const parts = splitRomanizedSyllables(th_romanization.trim());
    if (parts.length > 1) return applyToneMarks(parts, tone);
  }

  if (THAI_SCRIPT.test(word_th)) {
    return splitThaiSyllables(word_th);
  }

  if (isThaiScript || THAI_SCRIPT.test(raw)) {
    return splitThaiSyllables(raw);
  }

  if (/^[a-z]+$/i.test(raw)) {
    return splitRomanizedSyllables(raw.toLowerCase());
  }

  return splitEnglishSyllables(args.word_en || raw);
}

function splitThaiSyllables(text: string): string[] {
  const chars = [...text];
  const syllables: string[] = [];
  let current = "";

  for (const ch of chars) {
    const isConsonant = /[ก-ฮ]/.test(ch);
    const isVowelMark = /[ะ-ํ]/.test(ch);
    const isTone = /[่-๋]/.test(ch);

    if (isConsonant && current.length > 0) {
      const lastHasConsonant = [...current].some((c) => /[ก-ฮ]/.test(c));
      if (lastHasConsonant) {
        syllables.push(current);
        current = ch;
        continue;
      }
    }

    current += ch;

    if (isVowelMark || isTone) {
      syllables.push(current);
      current = "";
    }
  }

  if (current) syllables.push(current);
  return syllables.length > 0 ? syllables : [text];
}

function splitRomanizedSyllables(text: string): string[] {
  const lower = text.toLowerCase().replace(/[^a-zà-ỹūéèêôâăơíìỉĩóòỏõúùủũ]/gi, "");
  if (!lower) return [text];

  const parts: string[] = [];
  let buf = "";
  const vowels = /[aeiouà-ỹ]/i;

  for (let i = 0; i < lower.length; i++) {
    buf += lower[i];
    const next = lower[i + 1];
    const isVowel = vowels.test(lower[i]);
    const nextIsVowel = next ? vowels.test(next) : false;

    if (isVowel && next && !nextIsVowel) {
      parts.push(buf);
      buf = "";
    } else if (!isVowel && nextIsVowel && buf.length > 1) {
      const last = buf.slice(-1);
      parts.push(buf.slice(0, -1));
      buf = last;
    }
  }

  if (buf) parts.push(buf);
  return parts.length > 0 ? parts : [text];
}

function splitEnglishSyllables(text: string): string[] {
  const lower = text.toLowerCase();
  const parts = lower.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouy]+[bcdfghjklmnpqrstvwxyz]*/gi);
  return parts && parts.length > 0 ? parts : [lower];
}

function applyToneMarks(syllables: string[], tone: string | null): string[] {
  if (!tone?.trim()) return syllables;
  const marks = tone.split(/[·\s,]+/).filter(Boolean);
  if (marks.length !== syllables.length) return syllables;
  return syllables.map((s, i) => {
    const mark = marks[i];
    if (!mark || mark === s) return s;
    if (/[à-ỹ]/i.test(mark)) return mark;
    return s;
  });
}
