import { GUEST_INVITATION_CUE } from "@/lib/live/live-config";

/** CJK blocks that appear when Live ASR mis-detects Thai speech (Gemini API has no language hint). */
const CJK_BLOCK =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/g;

function normalizeForTranscriptMatch(text: string): string {
  return text.trim().toLowerCase().replace(/[~✦….,!?'"]/g, "");
}

/** Internal Live prompts and spoken invitation cues — never shown in the chat transcript. */
export function isHiddenLiveTranscript(text: string): boolean {
  const t = text.trim();
  if (
    t.startsWith("[session_open]") ||
    t.startsWith("[Speak exactly") ||
    t.startsWith("LAST-TURN HAND-OFF:")
  ) {
    return true;
  }

  const norm = normalizeForTranscriptMatch(t);
  for (const cue of Object.values(GUEST_INVITATION_CUE)) {
    const cueNorm = normalizeForTranscriptMatch(cue);
    if (norm === cueNorm || norm.includes(cueNorm) || cueNorm.includes(norm)) {
      return true;
    }
  }

  if (norm.includes("stay with me") && norm.includes("free account")) return true;
  if (norm.includes("อยู่กับหนู") && norm.includes("เปิดบัญชี")) return true;
  return false;
}

/**
 * Strip mis-detected CJK from user transcript display.
 * Gemini consumer Live API does not support `inputAudioTranscription.languageCodes`
 * (SDK throws if set); display-side cleanup is the supported fallback.
 */
export function sanitizeUserTranscript(text: string): string {
  return text.replace(CJK_BLOCK, "").replace(/\s{2,}/g, " ").trim();
}
