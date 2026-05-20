// lib/ai/vocabulary.ts
// Connects vocabulary_bank (Supabase) to session engine.
// Replaces the hardcoded VOCABULARY object in library.ts.
// All functions are non-blocking where possible.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Level } from "./library";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type SupabaseVocabWord = {
  word_en: string;
  word_th: string;
  th_romanization: string | null;
  en_ipa: string | null;
  cefr_level: string;
  topic: string;
  subtopic: string | null;
  register: string;
  miomi_note_th: string | null;
  miomi_note_en: string | null;
  example_th: string | null;
  example_en: string | null;
  emoji: string | null;
  frequency_score: number;
  difficulty_score: number;
  cultural_warning: string | null;
  use_when: string | null;
  do_not_use_when: string | null;
};

// The shape session.ts and the word card UI expect
export type SessionVocabWord = {
  word: string;          // word_en
  thai: string;          // word_th
  pronunciationHint: string; // th_romanization or en_ipa fallback
  imageKey: string;      // derived from topic
  exampleTh: string;
  exampleEn: string;
  miomiIntro: string;    // miomi_note_th (Miomi's voice, warm)
  celebration: string;   // generated from word
  emoji: string;
  cefrLevel: string;
  topic: string;
  register: string;
  culturalWarning: string | null;
};

// ─── CEFR → LEVEL MAPPING ─────────────────────────────────────────────────────

const CEFR_TO_LEVEL: Record<string, Level> = {
  A1: "beginner",
  A2: "elementary",
  B1: "intermediate",
  B2: "intermediate",
  C1: "upper",
  C2: "upper",
};

// Levels that are acceptable for each session level
// Always include one level above (Krashen i+1)
const LEVEL_CEFR_MAP: Record<Level, string[]> = {
  beginner: ["A1", "A2"],
  elementary: ["A2", "B1"],
  intermediate: ["B1", "B2"],
  upper: ["B2", "C1", "C2"],
};

// ─── ROW → SESSION WORD ───────────────────────────────────────────────────────

function rowToSessionWord(row: SupabaseVocabWord): SessionVocabWord {
  return {
    word: row.word_en,
    thai: row.word_th,
    pronunciationHint: row.th_romanization ?? row.en_ipa ?? "",
    imageKey: `topic_${row.topic.replace(/\s+/g, "_").toLowerCase()}`,
    exampleTh: row.example_th ?? `ลองใช้คำว่า '${row.word_en}' ในประโยคดูนะคะ~`,
    exampleEn: row.example_en ?? `Try using '${row.word_en}' in a sentence~`,
    miomiIntro:
      row.miomi_note_th ??
      `วันนี้ลองใช้คำว่า '${row.word_en}' ดูนะคะ~ แปลว่า ${row.word_th} ค่า~`,
    celebration: `คุณใช้คำว่า '${row.word_en}' ได้ถูกต้องมากเลยนะคะ~ หนูดีใจมากค่า~`,
    emoji: row.emoji ?? "✨",
    cefrLevel: row.cefr_level,
    topic: row.topic,
    register: row.register,
    culturalWarning: row.cultural_warning ?? null,
  };
}

// ─── FUNCTION 1: getWordForSession ───────────────────────────────────────────
// Called by session engine each time a word needs to be introduced.
// Krashen i+1: picks from user's level AND one level above.
// Avoids words already introduced this session.
// Returns null if nothing is available (graceful — library.ts fallback takes over).

export async function getWordForSession(
  level: Level,
  alreadyIntroduced: string[],
  supabase: SupabaseClient,
  topic?: string
): Promise<SessionVocabWord | null> {
  try {
    const cefrLevels = LEVEL_CEFR_MAP[level];

    let query = supabase
      .from("vocabulary_bank")
      .select(
        "word_en, word_th, th_romanization, en_ipa, cefr_level, topic, subtopic, register, miomi_note_th, miomi_note_en, example_th, example_en, emoji, frequency_score, difficulty_score, cultural_warning, use_when, do_not_use_when"
      )
      .in("cefr_level", cefrLevels)
      .eq("status", "active")
      .eq("teach_thai_to_english", true)
      // Prefer informal register — feels natural in conversation
      .in("register", ["informal", "formal"])
      .order("frequency_score", { ascending: false })
      .limit(50); // Fetch pool, then filter client-side to avoid words already introduced

    if (topic) {
      query = query.eq("topic", topic);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      console.error("[vocabulary] getWordForSession query failed:", error?.message);
      return null;
    }

    // Filter out already-introduced words client-side
    const available = (data as SupabaseVocabWord[]).filter(
      (row) => !alreadyIntroduced.includes(row.word_en.toLowerCase())
    );

    if (available.length === 0) return null;

    // Pick from top-frequency available words (not pure random — better teaching)
    // Take top 10 by frequency, then randomize within that pool
    const topPool = available.slice(0, Math.min(10, available.length));
    const picked = topPool[Math.floor(Math.random() * topPool.length)];

    if (!picked) return null;

    return rowToSessionWord(picked);
  } catch (err) {
    console.error("[vocabulary] getWordForSession threw:", err);
    return null;
  }
}

// ─── FUNCTION 2: getWordsByTopic ──────────────────────────────────────────────
// For topic-specific teaching moments.
// Example: user says "ไปกินข้าว" → fetch food vocabulary for that conversation.

export async function getWordsByTopic(
  topic: string,
  level: Level,
  limit: number,
  supabase: SupabaseClient
): Promise<SessionVocabWord[]> {
  try {
    const cefrLevels = LEVEL_CEFR_MAP[level];

    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select(
        "word_en, word_th, th_romanization, en_ipa, cefr_level, topic, subtopic, register, miomi_note_th, miomi_note_en, example_th, example_en, emoji, frequency_score, difficulty_score, cultural_warning, use_when, do_not_use_when"
      )
      .eq("topic", topic)
      .in("cefr_level", cefrLevels)
      .eq("status", "active")
      .eq("teach_thai_to_english", true)
      .order("frequency_score", { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error("[vocabulary] getWordsByTopic query failed:", error?.message);
      return [];
    }

    return (data as SupabaseVocabWord[]).map(rowToSessionWord);
  } catch (err) {
    console.error("[vocabulary] getWordsByTopic threw:", err);
    return [];
  }
}

// ─── FUNCTION 3: recordWordIntroduced ────────────────────────────────────────
// Fire-and-forget. Logs that Miomi introduced this word to this user.
// Used by self-improvement loop and spiral recall system.
// Never awaited — never blocks the response.

export function recordWordIntroduced(
  userId: string | null,
  sessionId: string,
  word: SessionVocabWord,
  supabase: SupabaseClient
): void {
  // Fire and forget — intentionally not awaited
  supabase
    .from("library_interactions")
    .insert({
      session_id: sessionId,
      user_id: userId,
      interaction_type: "word_introduced",
      word_en: word.word,
      word_th: word.thai,
      cefr_level: word.cefrLevel,
      topic: word.topic,
      created_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) {
        // Silently log — never surface to user
        console.error("[vocabulary] recordWordIntroduced failed:", error.message);
      }
    });
}

// ─── FUNCTION 4: recordWordUsedCorrectly ────────────────────────────────────
// Called when session engine detects user used the target word.
// Fire-and-forget.

export function recordWordUsedCorrectly(
  userId: string | null,
  sessionId: string,
  word: SessionVocabWord,
  supabase: SupabaseClient
): void {
  supabase
    .from("library_interactions")
    .insert({
      session_id: sessionId,
      user_id: userId,
      interaction_type: "word_used_correctly",
      word_en: word.word,
      word_th: word.thai,
      cefr_level: word.cefrLevel,
      topic: word.topic,
      created_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) {
        console.error("[vocabulary] recordWordUsedCorrectly failed:", error.message);
      }
    });
}

// ─── FUNCTION 5: detectTopicFromMessage ──────────────────────────────────────
// Maps user message keywords to vocabulary_bank topic names.
// Zero-cost. Called before AI to find topic-relevant words.
// Returns null if no strong signal — fall back to level-based selection.

export function detectTopicFromMessage(message: string): string | null {
  const lower = message.toLowerCase();

  const TOPIC_SIGNALS: Array<{ keywords: string[]; topic: string }> = [
    { keywords: ["กิน", "ข้าว", "อาหาร", "food", "eat", "hungry", "restaurant", "ร้านอาหาร", "หิว"], topic: "food" },
    { keywords: ["ทำงาน", "work", "office", "บริษัท", "ออฟฟิศ", "งาน", "boss", "meeting"], topic: "work" },
    { keywords: ["ครอบครัว", "family", "พ่อ", "แม่", "พี่", "น้อง", "mom", "dad", "sister", "brother"], topic: "family" },
    { keywords: ["รู้สึก", "feel", "เครียด", "stressed", "happy", "sad", "เศร้า", "ดีใจ", "emotion"], topic: "feelings" },
    { keywords: ["เที่ยว", "travel", "ไป", "trip", "vacation", "สนามบิน", "airport", "โรงแรม", "hotel"], topic: "travel" },
    { keywords: ["ซื้อ", "shop", "shopping", "ตลาด", "market", "mall", "ห้าง", "ราคา", "price"], topic: "shopping" },
    { keywords: ["เรียน", "study", "school", "มหาวิทยาลัย", "university", "การศึกษา", "learn"], topic: "education" },
    { keywords: ["สุขภาพ", "health", "หมอ", "doctor", "hospital", "โรงพยาบาล", "ป่วย", "sick"], topic: "health" },
    { keywords: ["บ้าน", "home", "ห้อง", "room", "house", "อยู่", "live", "stay"], topic: "home_stuff" },
    { keywords: ["เพื่อน", "friend", "แฟน", "relationship", "love", "รัก", "คบ", "date"], topic: "relationship" },
    { keywords: ["เทคโนโลยี", "technology", "phone", "โทรศัพท์", "app", "internet", "social media", "tiktok"], topic: "technology" },
    { keywords: ["สี", "color", "สวย", "beautiful", "ดูดี", "look", "หน้าตา", "appearance"], topic: "appearance" },
    { keywords: ["เช้า", "กลางวัน", "เย็น", "ค่ำ", "routine", "ตื่น", "นอน", "wake", "sleep", "daily"], topic: "daily_routine" },
  ];

  for (const signal of TOPIC_SIGNALS) {
    if (signal.keywords.some((kw) => lower.includes(kw))) {
      return signal.topic;
    }
  }

  return null;
}

// ─── EXPORT: CEFR helper ─────────────────────────────────────────────────────

export function cefrToLevel(cefr: string): Level {
  return CEFR_TO_LEVEL[cefr] ?? "elementary";
}
