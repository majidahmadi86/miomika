import { normalizeLearningTarget, oppositeLanguage } from "@/lib/brain/language";

/** Cookie stores the guest's chosen practice target (what they want to learn). */
export const GUEST_PRACTICE_TARGET_COOKIE = "guest-practice-target";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseGuestPracticeTarget(raw: string | null | undefined): "th" | "en" | null {
  return normalizeLearningTarget(raw ?? null);
}

export function readGuestPracticeTargetFromCookieHeader(
  cookieHeader: string | null | undefined,
): "th" | "en" | null {
  if (!cookieHeader) return null;
  const escaped = GUEST_PRACTICE_TARGET_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return parseGuestPracticeTarget(match?.[1] ?? null);
}

export function readGuestPracticeTargetCookie(): "th" | "en" | null {
  if (typeof document === "undefined") return null;
  const escaped = GUEST_PRACTICE_TARGET_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return parseGuestPracticeTarget(match?.[1] ?? null);
}

export function writeGuestPracticeTargetCookie(target: "th" | "en"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_PRACTICE_TARGET_COOKIE}=${target}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;
}

/** Thailand locale → suggest learning English; elsewhere → suggest learning Thai. */
export function isThailandLocale(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Bangkok") return true;
  } catch {
    /* noop */
  }
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("th")) return true;
  const uiMatch = document.cookie.match(/(?:^|;\s*)ui-language=([^;]+)/);
  if (uiMatch?.[1] === "th") return true;
  return false;
}

export function suggestedGuestPracticeTarget(): "th" | "en" {
  return isThailandLocale() ? "en" : "th";
}

/** Guest pick: target = chosen language, UI = the opposite. */
export function sessionLanguagesFromGuestPick(
  practiceTarget: "th" | "en" | null,
): { uiLanguage: "th" | "en"; targetLanguage: "th" | "en" } {
  if (practiceTarget) {
    return {
      uiLanguage: oppositeLanguage(practiceTarget),
      targetLanguage: practiceTarget,
    };
  }
  return { uiLanguage: "en", targetLanguage: "th" };
}
