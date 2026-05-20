export type PrimaryLanguage = "thai" | "english" | "mixed" | "genz_mixed";

export type LearningDirection =
  | "thai_to_english"
  | "english_to_thai"
  | "bilingual"
  | "unknown";

export interface LanguageSignals {
  thaiCharRatio: number;
  englishWordRatio: number;
  genzMarkers: string[];
  romanizedThai: boolean;
  codeSwitchCount: number;
}

const GENZ_MARKERS_THAI = ["555", "ปัง", "เด้ง", "โคตร", "สายฝอ", "เริ่ด", "มู", "จุก", "มันส์"];
const GENZ_MARKERS_EN = ["lowkey", "highkey", "idk", "tbh", "ngl", "slay", "vibes", "bestie", "periodt", "no cap"];
const ROMANIZED_THAI = ["sawadee", "aroy", "pasa", "mai pen rai", "sabai", "krub", "kha", "baht"];

export function detectLanguageSignals(message: string): LanguageSignals {
  const lower = message.toLowerCase();
  const thaiChars = (message.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const totalChars = message.replace(/\s/g, "").length;
  const words = lower.split(/\s+/).filter(Boolean);
  const englishWords = words.filter(w => /^[a-z]+$/.test(w)).length;

  const genzMarkers = [
    ...GENZ_MARKERS_THAI.filter(m => lower.includes(m)),
    ...GENZ_MARKERS_EN.filter(m => lower.includes(m)),
  ];

  const romanizedThai = ROMANIZED_THAI.some(r => lower.includes(r));

  // Count language switches (Thai → English or English → Thai transitions)
  let codeSwitchCount = 0;
  let prevWasThai = false;
  for (const char of message) {
    const isThai = /[\u0E00-\u0E7F]/.test(char);
    const isLatin = /[a-zA-Z]/.test(char);
    if (isThai && !prevWasThai) { codeSwitchCount++; prevWasThai = true; }
    else if (isLatin && prevWasThai) { codeSwitchCount++; prevWasThai = false; }
  }

  return {
    thaiCharRatio: totalChars > 0 ? thaiChars / totalChars : 0,
    englishWordRatio: words.length > 0 ? englishWords / words.length : 0,
    genzMarkers,
    romanizedThai,
    codeSwitchCount: Math.floor(codeSwitchCount / 2),
  };
}

export function detectPrimaryLanguage(
  message: string,
  history: LanguageSignals[]
): { primary: PrimaryLanguage; confidence: number; signals: LanguageSignals } {
  const signals = detectLanguageSignals(message);

  // Smooth with history (exponential moving average α=0.4)
  const smoothedThaiRatio = history.length > 0
    ? signals.thaiCharRatio * 0.4 + (history[history.length - 1]!.thaiCharRatio) * 0.6
    : signals.thaiCharRatio;

  let primary: PrimaryLanguage;
  let confidence: number;

  if (signals.genzMarkers.length >= 2 || (signals.codeSwitchCount >= 2)) {
    primary = "genz_mixed";
    confidence = 0.75;
  } else if (smoothedThaiRatio > 0.7) {
    primary = "thai";
    confidence = smoothedThaiRatio;
  } else if (signals.englishWordRatio > 0.7 && smoothedThaiRatio < 0.1) {
    primary = "english";
    confidence = signals.englishWordRatio;
  } else {
    primary = "mixed";
    confidence = 0.5;
  }

  return { primary, confidence, signals };
}

export function detectLearningDirection(
  primaryLanguage: PrimaryLanguage,
  recentMessages: string[],
  explicitStatement: string | null
): { direction: LearningDirection; confidence: number } {
  // Explicit statements override everything
  if (explicitStatement) {
    const lower = explicitStatement.toLowerCase();
    if (/(สอนภาษาอังกฤษ|teach.*english|learn.*english|อยากเรียนภาษาอังกฤษ)/.test(lower)) {
      return { direction: "thai_to_english", confidence: 1.0 };
    }
    if (/(teach.*thai|learn.*thai|สอนภาษาไทย|อยากเรียนภาษาไทย)/.test(lower)) {
      return { direction: "english_to_thai", confidence: 1.0 };
    }
  }

  // Infer from primary language + recent message content
  const combined = recentMessages.join(" ").toLowerCase();

  if (primaryLanguage === "thai") {
    if (/(ภาษาอังกฤษว่า|in english|english word|how do you say.*english)/.test(combined)) {
      return { direction: "thai_to_english", confidence: 0.85 };
    }
    if (/(caption|post|tiktok|โพสต์|แคปชั่น)/.test(combined)) {
      return { direction: "bilingual", confidence: 0.70 };
    }
    return { direction: "thai_to_english", confidence: 0.60 };
  }

  if (primaryLanguage === "english") {
    if (/(in thai|thai word|how do you say.*thai|ภาษาไทย)/.test(combined)) {
      return { direction: "english_to_thai", confidence: 0.85 };
    }
    return { direction: "english_to_thai", confidence: 0.60 };
  }

  if (primaryLanguage === "genz_mixed") {
    return { direction: "bilingual", confidence: 0.75 };
  }

  return { direction: "unknown", confidence: 0.3 };
}

export function getVoiceRatio(
  direction: LearningDirection,
  cefrLevel: string
): { thai: number; english: number } {
  if (direction === "bilingual" || direction === "unknown") {
    return { thai: 50, english: 50 };
  }
  if (direction === "thai_to_english") {
    const ratios: Record<string, { thai: number; english: number }> = {
      A1: { thai: 90, english: 10 },
      A2: { thai: 80, english: 20 },
      B1: { thai: 65, english: 35 },
      B2: { thai: 50, english: 50 },
      C1: { thai: 40, english: 60 },
      C2: { thai: 30, english: 70 },
    };
    return ratios[cefrLevel] ?? { thai: 70, english: 30 };
  }
  if (direction === "english_to_thai") {
    const ratios: Record<string, { thai: number; english: number }> = {
      A1: { thai: 10, english: 90 },
      A2: { thai: 20, english: 80 },
      B1: { thai: 35, english: 65 },
      B2: { thai: 50, english: 50 },
      C1: { thai: 60, english: 40 },
      C2: { thai: 70, english: 30 },
    };
    return ratios[cefrLevel] ?? { thai: 30, english: 70 };
  }
  return { thai: 50, english: 50 };
}
