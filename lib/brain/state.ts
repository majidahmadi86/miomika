// SERVER ONLY. Reads user situation before generating a reply — no AI calls.

import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { getRecentExchanges } from "@/lib/brain/memory";

export type EmotionalSignal =
  | "warm"
  | "stuck"
  | "sad"
  | "excited"
  | "curious"
  | "neutral";

export type Intent =
  | "chat"
  | "want_to_learn"
  | "practice"
  | "struggling"
  | "venting"
  | "greeting"
  | "goodbye";

export type DetectedLang = "th" | "en" | "mixed";

export interface BrainState {
  profile: {
    id: string | null;
    displayName: string | null;
    uiLanguage: "th" | "en";
    learningTarget: "th" | "en" | null;
    journeyStage: string | null;
    tier: "guest" | "free" | "pro" | "pro_max";
    cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
    catName: string | null;
  };
  memory: Array<{ role: "user" | "miomi"; content: string }>;
  masteredWords: string[];
  introducedWords: string[];
  nowLanguage: DetectedLang;
  /** Sticky interface language — Miomi always replies in this. */
  uiLanguage: "th" | "en";
  /** Language the user is learning (from profile or explicit intent). */
  targetLanguage: "th" | "en" | null;
  /** Alias for uiLanguage (backwards compat). */
  userSpeaksLanguage: "th" | "en";
  /** Alias for targetLanguage (backwards compat). */
  learningTargetLanguage: "th" | "en" | null;
  isPracticeAttempt: boolean;
  emotionalSignal: EmotionalSignal;
  frustrationSignal: boolean;
  repetitionDetected: boolean;
  intent: Intent;
  isFirstExchange: boolean;
  exchangeNumber: number;
  isGuest: boolean;
}

export async function readBrainState(args: {
  userInput: string;
  sessionId: string;
  exchangeNumber: number;
}): Promise<BrainState> {
  const { userInput, exchangeNumber } = args;

  const profile = await getServerProfile();
  const isGuest = !profile;

  let catName: string | null = null;
  const masteredWords: string[] = [];
  const introducedWords: string[] = [];
  let memory: Array<{ role: "user" | "miomi"; content: string }> = [];

  const profileUiLang = normalizeUiLanguage(profile?.ui_language ?? null);
  const learningTarget = normalizeLearningTarget(
    profile?.learning_target_language ?? null,
  );

  if (profile) {
    try {
      const supabase = await createServiceClient();

      const [exchanges, profileRow, vocabRows] = await Promise.all([
        getRecentExchanges(profile.id, 10),
        supabase
          .from("profiles")
          .select("cat_name")
          .eq("id", profile.id)
          .maybeSingle(),
        supabase
          .from("vocabulary_user_state")
          .select("word_en, mastered_at")
          .eq("user_id", profile.id),
      ]);

      memory = exchanges
        .filter(
          (row): row is { role: "user" | "miomi"; content: string; created_at: string } =>
            row.role === "user" || row.role === "miomi",
        )
        .map(({ role, content }) => ({ role, content }));

      if (profileRow.error) {
        console.error(
          "[brain.readBrainState] profile extras failed:",
          profileRow.error.message,
          profileRow.error.details,
        );
      } else {
        catName = (profileRow.data?.cat_name as string | null) ?? null;
      }

      if (vocabRows.error) {
        console.error(
          "[brain.readBrainState] vocabulary query failed:",
          vocabRows.error.message,
          vocabRows.error.details,
        );
      } else {
        for (const row of vocabRows.data ?? []) {
          const word = (row.word_en as string | null) ?? null;
          if (!word) continue;
          if (row.mastered_at) {
            masteredWords.push(word);
          } else {
            introducedWords.push(word);
          }
        }
      }
    } catch (err) {
      console.error("[brain.readBrainState] DB read failed:", err);
    }
  }

  const nowLanguage = detectLanguage(userInput, profileUiLang);
  const uiLanguage = resolveUiLanguage({
    profileUiLang,
    userInput,
    memory,
  });
  const targetLanguage = resolveTargetLanguage({
    userInput,
    memory,
    profileTarget: learningTarget,
  });
  const userSpeaksLanguage = uiLanguage;
  const learningTargetLanguage = targetLanguage;
  const isPracticeAttempt = detectPracticeAttempt({
    userInput,
    nowLanguage,
    learningTargetLanguage,
    uiLanguage,
    memory,
    introducedWords,
  });
  const emotionalSignal = detectEmotionalSignal(userInput);
  const frustrationSignal = detectFrustrationSignal(userInput);
  const repetitionDetected = detectRepetition(memory);
  const intent = detectIntent(userInput, emotionalSignal);
  const isFirstExchange = exchangeNumber <= 1 && memory.length === 0;

  return {
    profile: {
      id: profile?.id ?? null,
      displayName: profile?.display_name ?? null,
      uiLanguage,
      learningTarget,
      journeyStage: profile?.journey_stage ?? null,
      tier: profile?.tier ?? "guest",
      cefrLevel: null,
      catName,
    },
    memory,
    masteredWords,
    introducedWords,
    nowLanguage,
    uiLanguage,
    targetLanguage,
    userSpeaksLanguage,
    learningTargetLanguage,
    isPracticeAttempt,
    emotionalSignal,
    frustrationSignal,
    repetitionDetected,
    intent,
    isFirstExchange,
    exchangeNumber,
    isGuest,
  };
}

const LEARN_INTENT_RE =
  /(?:teach me|i want to learn|สอน|เรียน)\s*(?:thai|english|ไทย|อังกฤษ|ภาษาไทย|ภาษาอังกฤษ)/i;

function normalizeUiLanguage(raw: string | null): "th" | "en" {
  if (!raw) return "th";
  return raw.toLowerCase().startsWith("en") ? "en" : "th";
}

function detectLangSwitchCommand(text: string): "th" | "en" | null {
  const lower = text.toLowerCase().trim();
  // ONLY an explicit, tightly-anchored request to change the REPLY language counts.
  // Topic mentions ("a Thai person", "learn Thai", "understand Thai", "Thai language")
  // must NEVER switch. Default is the language the user is already speaking.
  const EN = /\bspeak\s+english\b|\b(speak|talk|reply|respond|answer|chat)\b(?:\s+(?:to|with)\s+me)?\s+in\s+english\b|\benglish\s+please\b/;
  const TH = /\bspeak\s+thai\b|\b(speak|talk|reply|respond|answer|chat)\b(?:\s+(?:to|with)\s+me)?\s+in\s+thai\b|\bthai\s+please\b/;
  if (EN.test(lower)) return "en";
  if (TH.test(lower)) return "th";
  if (/(พูด|คุย|ตอบ)\s*(?:ภาษา)?\s*อังกฤษ/.test(text)) return "en";
  if (/(พูด|คุย|ตอบ)\s*(?:ภาษา)?\s*ไทย/.test(text) || /ไทยหน่อย/.test(text)) return "th";
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

function resolveUiLanguage(args: {
  profileUiLang: "th" | "en";
  userInput: string;
  memory: Array<{ role: "user" | "miomi"; content: string }>;
}): "th" | "en" {
  // 1. Explicit command wins
  const switchNow = detectLangSwitchCommand(args.userInput);
  if (switchNow) return switchNow;
  const recentUserMsgs = args.memory.filter((m) => m.role === "user").slice(-5);
  for (let i = recentUserMsgs.length - 1; i >= 0; i--) {
    const switched = detectLangSwitchCommand(recentUserMsgs[i].content);
    if (switched) return switched;
  }

  // 2. Behavior signal: if user has spoken in one language consistently
  //    for the last 3+ messages, that overrides profile.
  const recent = [args.userInput, ...recentUserMsgs.map((m) => m.content)]
    .slice(0, 4)
    .filter((t) => t && t.trim().length >= 5);

  if (recent.length >= 3) {
    const allEnglish = recent.every((t) => {
      const latin = (t.match(/[a-zA-Z]/g) ?? []).length;
      const thai = (t.match(/[\u0E00-\u0E7F]/g) ?? []).length;
      return latin > thai * 2;
    });
    const allThai = recent.every((t) => {
      const latin = (t.match(/[a-zA-Z]/g) ?? []).length;
      const thai = (t.match(/[\u0E00-\u0E7F]/g) ?? []).length;
      return thai > latin * 2;
    });
    if (allEnglish) return "en";
    if (allThai) return "th";
  }

  // 3. Even on first message: if dominant chars clearly indicate one
  //    language, lean that way over profile default.
  const t = args.userInput;
  const latin = (t.match(/[a-zA-Z]/g) ?? []).length;
  const thai = (t.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  if (latin >= 10 && latin > thai * 5) return "en";
  if (thai >= 5 && thai > latin * 5) return "th";

  // 4. Fallback to profile
  return args.profileUiLang;
}

function resolveTargetLanguage(args: {
  userInput: string;
  memory: Array<{ role: "user" | "miomi"; content: string }>;
  profileTarget: "th" | "en" | null;
}): "th" | "en" | null {
  const fromInput = detectTargetLanguageFromIntent(args.userInput);
  if (fromInput) return fromInput;

  const recentUserMsgs = args.memory.filter((m) => m.role === "user").slice(-5);
  for (let i = recentUserMsgs.length - 1; i >= 0; i--) {
    const fromHistory = detectTargetLanguageFromIntent(recentUserMsgs[i].content);
    if (fromHistory) return fromHistory;
  }

  return args.profileTarget;
}

function messageDominantLang(text: string): "th" | "en" | null {
  const thai = text.match(/[\u0E00-\u0E7F]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  if (thai === 0 && latin === 0) return null;
  if (thai > latin * 2) return "th";
  if (latin > thai * 2) return "en";
  return null;
}

function detectPracticeAttempt(args: {
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

function normalizeLearningTarget(raw: string | null): "th" | "en" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("th") || lower === "thai") return "th";
  if (lower.startsWith("en") || lower === "english") return "en";
  return null;
}

function detectLanguage(userInput: string, fallback: "th" | "en"): DetectedLang {
  const thaiMatches = userInput.match(/[\u0E00-\u0E7F]/g);
  const latinMatches = userInput.match(/[a-zA-Z]/g);
  const thai = thaiMatches?.length ?? 0;
  const latin = latinMatches?.length ?? 0;

  if (thai > latin * 2) return "th";
  if (latin > thai * 2) return "en";
  if (thai >= 3 && latin >= 3) return "mixed";
  return fallback;
}

function detectFrustrationSignal(userInput: string): boolean {
  if (
    /(you (don'?t|keep) (understand|get|listen)|why are you|stupid|made me ask|again and again|same question|repeating|shut up|annoying)/i.test(
      userInput,
    )
  ) {
    return true;
  }
  if (/(ไม่เข้าใจ|ทำไม.*ถาม|ซ้ำ|งี่เง่า|โง่|รำคาญ)/.test(userInput)) {
    return true;
  }
  return false;
}

function wordSetJaccard(a: string, b: string): number {
  const setA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const setB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function detectRepetition(
  memory: Array<{ role: "user" | "miomi"; content: string }>,
): boolean {
  const miomi = memory.filter((m) => m.role === "miomi").slice(-2);
  if (miomi.length < 2) return false;
  return wordSetJaccard(miomi[0].content, miomi[1].content) > 0.6;
}

function detectEmotionalSignal(userInput: string): EmotionalSignal {
  if (/sad|tired|cry|hate|เหนื่อย|เศร้า|เบื่อ|ท้อ/i.test(userInput)) {
    return "sad";
  }
  if (/don'?t (understand|know|get it)|ไม่เข้าใจ|งง|ยาก|hard|difficult/i.test(userInput)) {
    return "stuck";
  }
  if (/!|love|wow|เย่|เก่ง|ดีจัง|cool|amazing/i.test(userInput)) {
    return "excited";
  }
  if (/\?|why|how|what|ทำไม|ยังไง|อะไร/.test(userInput)) {
    return "curious";
  }
  if (/thank|ขอบ|รัก|happy|good/i.test(userInput)) {
    return "warm";
  }
  return "neutral";
}

function detectIntent(userInput: string, emotionalSignal: EmotionalSignal): Intent {
  if (/^(hi|hello|hey|สวัสดี|หวัด|หวัดดี)/i.test(userInput.trim())) {
    return "greeting";
  }
  if (/(bye|goodbye|บาย|ลาก่อน|เจอกัน)/i.test(userInput)) {
    return "goodbye";
  }
  if (/(teach|learn|สอน|เรียน)/i.test(userInput)) {
    return "want_to_learn";
  }
  if (/(practice|ฝึก|roleplay|conversation)/i.test(userInput)) {
    return "practice";
  }
  if (emotionalSignal === "stuck") {
    return "struggling";
  }
  if (emotionalSignal === "sad") {
    return "venting";
  }
  return "chat";
}
