// SERVER ONLY. Reads user situation before generating a reply — no AI calls.

import { getServerProfile } from "@/lib/auth/get-server-profile";
import {
  detectLanguage,
  detectPracticeAttempt,
  normalizeLearningTarget,
  normalizeUiLanguage,
  resolveTargetLanguage,
  resolveUiLanguage,
  type DetectedLang,
} from "@/lib/brain/language";
import { getRecentExchanges } from "@/lib/brain/memory";
import { createServiceClient } from "@/lib/supabase/service";

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

export type { DetectedLang } from "@/lib/brain/language";

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
  const uiLanguage = resolveUiLanguage({ profileUiLang });
  const targetLanguage = resolveTargetLanguage({
    profileTarget: learningTarget,
    uiLanguage,
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
