/** Route Live model transcript chunks into the correct UI-language field. */

export function routeGeminiTranscriptChunk(
  uiLang: "th" | "en",
  existing: { textTh: string; textEn: string },
  chunk: string,
): { textTh: string; textEn: string } {
  if (uiLang === "th") {
    return { textTh: existing.textTh + chunk, textEn: existing.textEn };
  }
  return { textTh: existing.textTh, textEn: existing.textEn + chunk };
}

export function newGeminiTranscriptItem(
  uiLang: "th" | "en",
  chunk: string,
): { textTh: string; textEn: string } {
  return uiLang === "th"
    ? { textTh: chunk, textEn: "" }
    : { textTh: "", textEn: chunk };
}
