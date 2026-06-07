import { messageDominantLang } from "@/lib/brain/language";

/** Route Live model transcript chunks by spoken script — not session UI language. */

function fieldForChunk(
  chunk: string,
  existing: { textTh: string; textEn: string },
): "th" | "en" {
  const dominant = messageDominantLang(chunk);
  if (dominant) return dominant;
  if (existing.textEn.length > existing.textTh.length) return "en";
  if (existing.textTh.length > existing.textEn.length) return "th";
  return "en";
}

export function routeGeminiTranscriptChunk(
  existing: { textTh: string; textEn: string },
  chunk: string,
): { textTh: string; textEn: string } {
  const field = fieldForChunk(chunk, existing);
  if (field === "th") {
    return { textTh: existing.textTh + chunk, textEn: existing.textEn };
  }
  return { textTh: existing.textTh, textEn: existing.textEn + chunk };
}

export function newGeminiTranscriptItem(
  chunk: string,
): { textTh: string; textEn: string } {
  const field = messageDominantLang(chunk) ?? "en";
  return field === "th"
    ? { textTh: chunk, textEn: "" }
    : { textTh: "", textEn: chunk };
}
