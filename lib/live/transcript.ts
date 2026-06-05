/** CJK blocks that appear when Live ASR mis-detects Thai speech (Gemini API has no language hint). */
const CJK_BLOCK =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/g;

/**
 * Strip mis-detected CJK from user transcript display.
 * Gemini consumer Live API does not support `inputAudioTranscription.languageCodes`
 * (SDK throws if set); display-side cleanup is the supported fallback.
 */
export function sanitizeUserTranscript(text: string): string {
  return text.replace(CJK_BLOCK, "").replace(/\s{2,}/g, " ").trim();
}
