export function isLikelyHallucination(
  text: string,
  userSpeaksLang: "th" | "en",
  isPracticeAttempt: boolean,
): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Allow-list of meaningful short replies
  const ALLOWED_SHORTS = ["yes","no","ok","okay","hi","hey","bye","ใช่","ไม่","อืม","ค่ะ","ครับ","หวัดดี"];
  if (trimmed.length < 3 && !ALLOWED_SHORTS.includes(trimmed.toLowerCase())) {
    return true;
  }

  const thaiCount = (trimmed.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latinCount = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const total = thaiCount + latinCount;
  if (total < 2) return true;

  // Key insight: judge from CONTENT, not from lang labels.
  // A transcript with mostly Latin letters is English regardless of what
  // Whisper's lang field says.
  const latinRatio = latinCount / total;
  const thaiRatio = thaiCount / total;

  // For an English-interface user:
  // - Mostly Latin → legitimate English (NOT hallucination)
  // - Mostly Thai → suspicious (likely echo unless practice)
  if (userSpeaksLang === "en") {
    if (latinRatio > 0.5) return false;  // legitimate English, KEEP
    if (thaiRatio > 0.7 && !isPracticeAttempt) return true;  // Thai echo
    return false;
  }

  // For a Thai-interface user (symmetric)
  if (userSpeaksLang === "th") {
    if (thaiRatio > 0.5) return false;  // legitimate Thai, KEEP
    if (latinRatio > 0.85 && !isPracticeAttempt) return true;  // English echo
    return false;
  }

  return false;
}
