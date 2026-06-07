import { GUEST_INVITATION_CUE } from "@/lib/live/live-config";

/**
 * Scripts outside Thai + Latin — Live ASR has no reliable language hint and
 * mis-detects English speech as Devanagari, CJK, Cyrillic, Arabic, etc.
 * UI + target for Miomika are always Thai and/or Latin; everything else is stripped.
 */
const FOREIGN_SCRIPT_BLOCK =
  /[\u0370-\u03FF\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E80-\u0EFF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u1200-\u137F\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/g;

function normalizeForTranscriptMatch(text: string): string {
  return text.trim().toLowerCase().replace(/[~✦….,!?'"]/g, "");
}

/** Internal Live prompts and spoken invitation cues — never shown in the chat transcript. */
export function isHiddenLiveTranscript(text: string): boolean {
  const t = text.trim();
  if (
    t.startsWith("[session_open]") ||
    t.startsWith("[Speak exactly") ||
    t.startsWith("[handoff_reply]") ||
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

  if (norm.includes("stay with me") && (norm.includes("free account") || norm.includes("sign up free"))) return true;
  if (norm.includes("pick up right where we left off")) return true;
  if (norm.includes("อยู่กับหนู") && (norm.includes("เปิดบัญชี") || norm.includes("สมัครฟรี"))) return true;
  if (norm.includes("เล่นต่อจากตรงนี้")) return true;
  return false;
}

/**
 * Strip mis-detected foreign scripts from user transcript display.
 * Keeps Thai (UI or target) and Latin (UI or target); drops Devanagari, CJK, etc.
 * Gemini consumer Live API does not support `inputAudioTranscription.languageCodes`
 * (SDK throws if set); display-side cleanup is the supported fallback.
 */
export function sanitizeUserTranscript(text: string): string {
  return text.replace(FOREIGN_SCRIPT_BLOCK, "").replace(/\s{2,}/g, " ").trim();
}
