// Shared language resolution — used by brain (server) and live session (client).

export type DetectedLang = "th" | "en" | "mixed";

const LEARN_INTENT_RE =
  /(?:teach me|i want to learn|สอน|เรียน)\s*(?:thai|english|ไทย|อังกฤษ|ภาษาไทย|ภาษาอังกฤษ)/i;

/** Explicit UI-language switch — practicing the target language is NOT a switch. */
const UI_SWITCH_RE =
  /(?:speak|talk|explain|reply|switch|use|in)\s+(?:to\s+)?(?:thai|english|ไทย|อังกฤษ)|(?:พูด|คุย|อธิบาย|ตอบ).*(?:ไทย|อังกฤษ)|(?:ภาษาไทย|ภาษาอังกฤษ)\s*(?:หน่อย|ได้ไหม|please)|ไทยหน่อย/i;

export function detectExplicitUiLanguageRequest(text: string): "th" | "en" | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (/(?:พูด|คุย|สอน|อธิบาย|ตอบ).*ไทย|ไทยหน่อย/.test(trimmed)) return "th";
  if (/(?:พูด|คุย|สอน|อธิบาย|ตอบ).*(?:อังกฤษ|english)/i.test(trimmed)) return "en";
  if (/speak.*(thai|ไทย)|in thai|switch.*thai|explain.*thai|reply.*thai/.test(lower)) return "th";
  if (/speak.*english|in english|switch.*english|explain.*english|reply.*english/.test(lower)) {
    return "en";
  }
  if (UI_SWITCH_RE.test(trimmed)) {
    if (/thai|ไทย|ภาษาไทย/i.test(trimmed)) return "th";
    if (/english|อังกฤษ|ภาษาอังกฤษ/i.test(trimmed)) return "en";
  }
  return null;
}

export function normalizeUiLanguage(raw: string | null): "th" | "en" {
  if (!raw) return "th";
  return raw.toLowerCase().startsWith("en") ? "en" : "th";
}

export function normalizeLearningTarget(raw: string | null): "th" | "en" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("th") || lower === "thai") return "th";
  if (lower.startsWith("en") || lower === "english") return "en";
  return null;
}

function detectTargetLanguageFromIntent(text: string): "th" | "en" | null {
  const m = text.match(LEARN_INTENT_RE);
  if (!m) return null;
  const fragment = m[0].toLowerCase();
  if (/thai|ไทย|ภาษาไทย/.test(fragment)) return "th";
  if (/english|อังกฤษ|ภาษาอังกฤษ/.test(fragment)) return "en";
  return null;
}

export function resolveUiLanguage(args: {
  profileUiLang: "th" | "en";
  userInput: string;
  memory: Array<{ role: "user" | "miomi"; content: string }>;
  /** When set, dominant target-language input (practice) does not flip UI. */
  learningTargetLanguage?: "th" | "en" | null;
}): "th" | "en" {
  const { profileUiLang, userInput, memory, learningTargetLanguage } = args;

  const explicitNow = detectExplicitUiLanguageRequest(userInput);
  if (explicitNow) return explicitNow;

  // Scan recent user turns for an explicit switch request only — never mirror script.
  for (let i = memory.length - 1; i >= 0; i--) {
    const m = memory[i];
    if (m.role !== "user") continue;
    const explicit = detectExplicitUiLanguageRequest(m.content);
    if (explicit) return explicit;
    if (memory.length - i > 6) break;
  }

  const dominant = messageDominantLang(userInput);
  if (
    learningTargetLanguage &&
    dominant === learningTargetLanguage &&
    dominant !== profileUiLang
  ) {
    return profileUiLang;
  }

  return profileUiLang;
}

export function resolveTargetLanguage(args: {
  userInput: string;
  memory: Array<{ role: "user" | "miomi"; content: string }>;
  profileTarget: "th" | "en" | null;
  uiLanguage?: "th" | "en";
}): "th" | "en" {
  const fromInput = detectTargetLanguageFromIntent(args.userInput);
  if (fromInput) {
    return args.uiLanguage
      ? sanitizeTargetLanguage(args.uiLanguage, fromInput)
      : fromInput;
  }

  const recentUserMsgs = args.memory.filter((m) => m.role === "user").slice(-5);
  for (let i = recentUserMsgs.length - 1; i >= 0; i--) {
    const fromHistory = detectTargetLanguageFromIntent(recentUserMsgs[i].content);
    if (fromHistory) {
      return args.uiLanguage
        ? sanitizeTargetLanguage(args.uiLanguage, fromHistory)
        : fromHistory;
    }
  }

  const fallback = args.profileTarget ?? null;
  if (args.uiLanguage) {
    return sanitizeTargetLanguage(args.uiLanguage, fallback);
  }
  return fallback ?? "th";
}

export function messageDominantLang(text: string): "th" | "en" | null {
  const thai = text.match(/[\u0E00-\u0E7F]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  if (thai === 0 && latin === 0) return null;
  if (thai > latin * 2) return "th";
  if (latin > thai * 2) return "en";
  return null;
}

export function detectPracticeAttempt(args: {
  userInput: string;
  nowLanguage: DetectedLang;
  learningTargetLanguage: "th" | "en" | null;
  uiLanguage: "th" | "en";
  memory: Array<{ role: "user" | "miomi"; content: string }>;
  introducedWords: string[];
}): boolean {
  const { userInput, nowLanguage, learningTargetLanguage, uiLanguage, memory, introducedWords } = args;
  if (!learningTargetLanguage) return false;
  // You only practice your TARGET language, never the one you converse in.
  if (learningTargetLanguage === uiLanguage) return false;

  const spokeTarget =
    nowLanguage === learningTargetLanguage ||
    (nowLanguage !== "mixed" && messageDominantLang(userInput) === learningTargetLanguage);

  if (!spokeTarget) return false;

  // Don't treat suspicious Whisper hallucinations as practice attempts.
  // If userInput is short and entirely target-lang chars with no diversity,
  // it's likely a hallucination from echo.
  const targetCharCount = learningTargetLanguage === "th"
    ? (userInput.match(/[\u0E00-\u0E7F]/g)?.length ?? 0)
    : (userInput.match(/[a-zA-Z]/g)?.length ?? 0);
  const totalLen = userInput.trim().length;
  if (totalLen > 0 && targetCharCount / totalLen > 0.95 && totalLen < 40) {
    // Almost pure target-language characters in a short utterance — could be
    // hallucination. Require previous Miomi message to have introduced a word.
    const lastMiomi = [...memory].reverse().find((m) => m.role === "miomi");
    if (!lastMiomi) return false;
    const targetWords = collectTargetWords(introducedWords, lastMiomi.content);
    const matchesTarget = targetWords.some((w) =>
      userInput.toLowerCase().includes(w.toLowerCase()),
    );
    if (!matchesTarget) return false;
  }

  const wordCount = userInput.trim().split(/\s+/).filter(Boolean).length;
  const shortTargetUtterance =
    wordCount <= 5 && messageDominantLang(userInput) === learningTargetLanguage;

  const lastMiomi = [...memory].reverse().find((m) => m.role === "miomi");
  const targetWords = collectTargetWords(introducedWords, lastMiomi?.content ?? "");
  const previousHadTarget =
    !!lastMiomi && targetWords.some((w) => lastMiomi.content.toLowerCase().includes(w.toLowerCase()));

  if (previousHadTarget) return true;
  if (shortTargetUtterance) return true;
  return false;
}

function collectTargetWords(introducedWords: string[], miomiContent: string): string[] {
  const words = new Set(introducedWords.map((w) => w.toLowerCase()));
  const pronMatch = miomiContent.match(/คำว่า\s*["']?([^"'\s]+)["']?|word\s*["']([^"']+)["']/gi);
  if (pronMatch) {
    for (const m of pronMatch) {
      const inner = m.replace(/คำว่า\s*|word\s*["']?|["']/gi, "").trim();
      if (inner) words.add(inner.toLowerCase());
    }
  }
  return [...words];
}

export function detectLanguage(userInput: string, fallback: "th" | "en"): DetectedLang {
  const thaiMatches = userInput.match(/[\u0E00-\u0E7F]/g);
  const latinMatches = userInput.match(/[a-zA-Z]/g);
  const thai = thaiMatches?.length ?? 0;
  const latin = latinMatches?.length ?? 0;

  if (thai > latin * 2) return "th";
  if (latin > thai * 2) return "en";
  if (thai >= 3 && latin >= 3) return "mixed";
  return fallback;
}

/** Target must differ from UI — never teach the learner's own conversation language. */
export function oppositeLanguage(lang: "th" | "en"): "th" | "en" {
  return lang === "en" ? "th" : "en";
}

export function sanitizeTargetLanguage(
  uiLanguage: "th" | "en",
  targetLanguage: "th" | "en" | null,
): "th" | "en" {
  if (targetLanguage && targetLanguage !== uiLanguage) return targetLanguage;
  return oppositeLanguage(uiLanguage);
}

export function resolveSessionLanguages(args: {
  isGuest: boolean;
  profileUiLang: string | null;
  profileTarget: string | null;
}): { uiLanguage: "th" | "en"; targetLanguage: "th" | "en" } {
  if (args.isGuest) {
    return { uiLanguage: "en", targetLanguage: "th" };
  }
  const uiLanguage = normalizeUiLanguage(args.profileUiLang);
  const profileTarget = normalizeLearningTarget(args.profileTarget);
  return {
    uiLanguage,
    targetLanguage: sanitizeTargetLanguage(uiLanguage, profileTarget),
  };
}
