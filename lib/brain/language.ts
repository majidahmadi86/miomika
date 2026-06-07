// Shared language resolution — used by brain (server) and live session (client).

export type DetectedLang = "th" | "en" | "mixed";

const LEARN_INTENT_RE =
  /(?:teach me|i want to learn|help(?:\s+me)?(?:\s+with)?\s+my|สอน|เรียน)\s*(?:thai|english|ไทย|อังกฤษ|ภาษาไทย|ภาษาอังกฤษ)/i;

/** Languages we have curated teaching content for today. */
export const SUPPORTED_TEACHING_LANGS = ["th", "en"] as const;

const UNSUPPORTED_TEACH_RE =
  /(?:teach me|i want to learn|help(?:\s+me)?(?:\s+with)?\s+my|learn|study|practice|สอน|เรียน|ฝึก)\s*(?:me\s+)?(?:to\s+speak\s+)?(?:spanish|french|japanese|chinese|mandarin|korean|german|italian|portuguese|arabic|hindi|russian|vietnamese|ภาษาสเปน|ภาษาฝรั่งเศส|ภาษาญี่ปุ่น|ภาษาจีน|ภาษาเกาหลี)/i;

/** Target-content questions — must NOT flip conversation UI language. */
function isTargetContentQuestion(lower: string): boolean {
  if (/how do you say\b/.test(lower)) return true;
  if (/\bword\s+for\b/.test(lower) && /(?:thai|english|ไทย|อังกฤษ)/i.test(lower)) return true;
  if (/\b(?:the|a|this)\s+(?:thai|english|ไทย|อังกฤษ)\s+word\b/.test(lower)) return true;
  if (/\bwhat(?:'s| is)\s+.+\s+in\s+(?:thai|english|ไทย|อังกฤษ)\b/.test(lower)) return true;
  if (/\bsay\s+.+\s+in\s+(?:thai|english|ไทย|อังกฤษ)\b/.test(lower)) return true;
  if (/\bexplain\s+(?:the\s+)?(?:thai|english|ไทย|อังกฤษ)\b/.test(lower)) return true;
  return false;
}

/** Genuine conversation-medium switch — how Miomi talks to the user, not teaching queries. */
const UI_MEDIUM_SWITCH_RE =
  /(?:speak|talk|reply|respond|switch|use)\b(?:\s+\w+){0,5}\s*(?:to\s+)?(?:me\s+)?(?:in\s+)?(?:thai|english|ไทย|อังกฤษ)|(?:switch\s+to\s+(?:thai|english|ไทย|อังกฤษ))|(?:use\s+(?:thai|english|ไทย|อังกฤษ)\s+with\s+me)|(?:in\s+(?:thai|english|ไทย|อังกฤษ)\s+please)|(?:ภาษาไทย|ภาษาอังกฤษ)\s*(?:หน่อย|ได้ไหม|please)|(?:พูด|คุย|ตอบ)(?:\s+\w+){0,3}\s*(?:กับ|to)?\s*(?:me|หนู|ฉัน)?\s*(?:in\s+)?(?:ไทย|อังกฤษ)|ไทยหน่อย/i;

export function detectExplicitUiLanguageRequest(text: string): "th" | "en" | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (isTargetContentQuestion(lower)) return null;

  if (UI_MEDIUM_SWITCH_RE.test(trimmed)) {
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

export function detectUnsupportedTeachingRequest(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return UNSUPPORTED_TEACH_RE.test(trimmed);
}

export function buildContentHonestyContract(ui: "th" | "en"): string {
  if (ui === "th") {
    return `CONTENT HONESTY — เนื้อหาสอนภาษา:
- วันนี้หนูมีบทเรียนไทย↔อังกฤษเท่านั้น — ห้ามแกล้งสอนภาษาอื่น
- ถ้าขอภาษาที่ยังไม่มี ให้ตอบอบอุ่นและซื่อสัตย์ บอกว่ายังไม่พร้อม แล้วเสนอสิ่งที่หนูสอนได้ (ไทยหรืออังกฤษ) หรือชวนคุยเล่นแทน
- ห้ามสอนคำศัพท์ภาษาอื่นแม้รู้ — อธิบายข้อจำกัดอย่างอบอุ่น`;
  }
  return `CONTENT HONESTY — teaching scope:
- Today Miomika teaching content is Thai↔English ONLY — never fake other languages
- If they ask for a language we don't have yet, stay warm and honest: say it's coming, offer what you CAN teach (Thai or English), or just chat
- Do NOT teach vocabulary in unsupported languages even if you know it — explain the limit warmly`;
}

export function resolveSessionLanguages(args: {
  isGuest: boolean;
  profileUiLang: string | null;
  profileTarget: string | null;
  /** Browser ui-language cookie / Accept-Language seed. */
  browserUiLang: "th" | "en";
  /** Live session target after in-conversation intent (guest + member). */
  sessionTargetLang?: "th" | "en" | null;
  /** TalkConfig.teach.learning — member fallback when profile target unset. */
  teachLearningTarget?: "th" | "en" | null;
}): { uiLanguage: "th" | "en"; targetLanguage: "th" | "en" } {
  const uiLanguage =
    !args.isGuest && args.profileUiLang
      ? normalizeUiLanguage(args.profileUiLang)
      : args.browserUiLang;
  const profileTarget =
    normalizeLearningTarget(args.profileTarget) ??
    normalizeLearningTarget(args.teachLearningTarget ?? null);
  const sessionTarget = normalizeLearningTarget(args.sessionTargetLang ?? null);
  return {
    uiLanguage,
    targetLanguage: sanitizeTargetLanguage(uiLanguage, sessionTarget ?? profileTarget),
  };
}

/** UI anchor for adaptation — profile when set; else browser-seeded session UI. */
export function resolveProfileUiAnchor(args: {
  profileUiLang: string | null;
  sessionUiLang: "th" | "en";
}): "th" | "en" {
  if (args.profileUiLang) {
    return normalizeUiLanguage(args.profileUiLang);
  }
  return args.sessionUiLang;
}

/** Live connect — null profile UI keeps the browser-seeded session language. */
export function resolveLiveSessionLanguages(args: {
  isGuest: boolean;
  profileUiLang: string | null;
  profileTarget: string | null;
  sessionUiLang: "th" | "en";
  browserUiLang: "th" | "en";
  sessionTargetLang?: "th" | "en" | null;
  teachLearningTarget?: "th" | "en" | null;
}): { uiLanguage: "th" | "en"; targetLanguage: "th" | "en" } {
  const uiLanguage =
    !args.isGuest && args.profileUiLang
      ? normalizeUiLanguage(args.profileUiLang)
      : args.sessionUiLang;
  const profileTarget =
    normalizeLearningTarget(args.profileTarget) ??
    normalizeLearningTarget(args.teachLearningTarget ?? null);
  const sessionTarget = normalizeLearningTarget(args.sessionTargetLang ?? null);
  return {
    uiLanguage,
    targetLanguage: sanitizeTargetLanguage(uiLanguage, sessionTarget ?? profileTarget),
  };
}
