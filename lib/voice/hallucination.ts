export function isLikelyHallucination(
  text: string,
  userSpeaksLang: "th" | "en",
  isPracticeAttempt: boolean,
): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  const ALLOWED_SHORTS = [
    "yes",
    "no",
    "ok",
    "okay",
    "hi",
    "hey",
    "bye",
    "ใช่",
    "ไม่",
    "อืม",
    "ค่ะ",
    "ครับ",
    "หวัดดี",
  ];
  if (trimmed.length < 3 && !ALLOWED_SHORTS.includes(trimmed.toLowerCase())) {
    return true;
  }

  const thaiCount = (trimmed.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latinCount = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const total = thaiCount + latinCount;
  if (total < 2) return true;

  if (!isPracticeAttempt && userSpeaksLang === "en" && thaiCount / total > 0.7) {
    return true;
  }

  if (!isPracticeAttempt && userSpeaksLang === "th" && latinCount / total > 0.85) {
    return true;
  }

  return false;
}
