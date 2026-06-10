// SERVER ONLY — lesson builder (Lessons milestone).
// Plans a lesson via LLM JSON, then sends EVERY word and phrase through the
// ACCURACY GATE: words via resolveOrGenerateWord, phrases via blind verifyCard.
// Anything that fails verification is WITHHELD — never stored, never shown.
// title_th stays null here: unverified Thai is never displayed.
import { createServiceClient } from "@/lib/supabase/service";
import {
  callGeminiJson,
  callGroqJson,
  resolveOrGenerateWord,
  verifyCard,
} from "@/lib/brain/word-content";
import { resolvePhonetics } from "@/lib/brain/phonetics";

export type LessonCando = { label: string; cefr: string; skill: string };
export type LessonWordItem = {
  word_en: string;
  word_th: string;
  emoji: string | null;
  romanization: string | null;
  ipa: string | null;
  cefr_level: string | null;
  example_en: string | null;
  example_th: string | null;
  /** Reserved: extra verified senses for the "More meanings" expander. */
  meanings?: Array<{ sense: string; example_en?: string; example_th?: string }>;
};
export type LessonPhraseItem = {
  en: string;
  th: string;
  romanization: string | null;
};
export type BuiltLessonContent = {
  words: LessonWordItem[];
  phrases: LessonPhraseItem[];
  candos: LessonCando[];
};

const TOPIC_COLORS: Record<string, string> = {
  food: "peach",
  travel: "lavender",
  social: "pink",
  shopping: "mint",
  work: "teal",
  feelings: "coral",
};
function colorForTopic(topic: string): string {
  return TOPIC_COLORS[topic] ?? "peach";
}

type LessonPlan = {
  title_en?: string;
  topic?: string;
  words?: string[];
  phrases?: string[];
  candos?: Array<{ label?: string; skill?: string }>;
};

function buildPlanSystem(level: string, targetName: string, avoid: string[]): string {
  const avoidBlock = avoid.length
    ? ` The learner ALREADY KNOWS these words — do NOT reuse any of them; choose the NEXT most useful ones and make this lesson one step deeper. Give the title a distinct angle (a sub-situation, or a "II"): ${avoid.join(", ")}.`
    : "";
  return `You are a CEFR-expert lesson planner for learners of ${targetName} at level ${level}. Reply STRICT JSON ONLY — no prose, no markdown fences — with keys: title_en (short inviting lesson title, e.g. "Ordering food"), topic (ONE lowercase English word, e.g. food, travel, social, shopping, work, feelings, general), words (EXACTLY 5 strings — each the plain ENGLISH MEANING of one useful ${targetName} word for this situation at ${level}; single concepts, no romanization, no duplicates), phrases (EXACTLY 5 strings — each the plain ENGLISH MEANING of one complete, short, polite, practical sentence the learner will actually say in this situation at ${level}), candos (EXACTLY 3 objects {"label": a CEFR-style can-do statement starting with "Can", "skill": one of "spoken interaction", "spoken production", "listening"}). The words and phrases together must genuinely cover the situation end to end — the lesson must deliver its promise.${avoidBlock} JSON only.`;
}

function buildPhraseSystem(level: string): string {
  return `You are a bilingual Thai-English phrasebook author writing for a ${level} learner. Given the English meaning of something to say, reply STRICT JSON ONLY — no prose, no markdown fences — {"en": the natural short English sentence, "th": the natural, polite Thai sentence a real Thai speaker actually says (Thai script; polite particle where natural), "rom": romanization of the Thai with a space between every syllable (lowercase Latin letters, hyphens and spaces only)}. REAL Thai only: never spell English sounds in Thai letters, never mix non-Thai words unless they are genuine everyday loanwords. Keep both short and everyday for ${level}. JSON only.`;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
  } catch {
    return null;
  }
}

async function callPlan(level: string, targetName: string, topicAsk: string | null, avoid: string[]): Promise<LessonPlan | null> {
  const system = buildPlanSystem(level, targetName, avoid);
  const user = topicAsk
    ? `Plan the lesson about: ${topicAsk}`
    : "Choose the most useful next everyday topic and plan the lesson.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const plan = parseJson<LessonPlan>(raw);
    if (
      plan &&
      (plan.title_en ?? "").trim() &&
      Array.isArray(plan.words) && plan.words.length >= 5 &&
      Array.isArray(plan.phrases) && plan.phrases.length >= 5 &&
      Array.isArray(plan.candos) && plan.candos.length >= 3
    ) {
      return plan;
    }
  }
  return null;
}

/** Small sequential-chunk mapper — keeps LLM concurrency low (free-tier RPM). */
async function mapChunked<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.all(chunk.map((it) => fn(it).catch(() => null)));
    for (const r of results) if (r) out.push(r);
  }
  return out;
}

/** ACCURACY GATE: script purity. Thai fields must be pure Thai script (plus
 *  digits/spaces/basic punctuation); no field may carry CJK/kana/hangul/cyrillic. */
const THAI_PURE = /^[\u0E00-\u0E7F0-9\s.,!?'"()\u2018\u2019\u201C\u201D\-\u2013\u2014:;%฿\u2026]+$/;
const FOREIGN_SCRIPT = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/;
function isPureThai(text: string): boolean {
  const t = text.trim();
  return THAI_PURE.test(t) && /[\u0E00-\u0E7F]/.test(t);
}

async function buildWordItem(
  meaning: string,
  learningTarget: "th" | "en",
  cefrLevel: string,
): Promise<LessonWordItem | null> {
  const resolved = await resolveOrGenerateWord({
    word: meaning,
    learningTarget,
    cefrLevel,
  });
  if (!resolved) return null; // ACCURACY GATE: withhold over lie
  if (!isPureThai(resolved.word_th)) return null;
  if (resolved.example_th && !isPureThai(resolved.example_th)) return null;
  if (FOREIGN_SCRIPT.test(resolved.word_en)) return null;
  if (resolved.example_en && FOREIGN_SCRIPT.test(resolved.example_en)) return null;
  const phonetics = await resolvePhonetics({
    word_th: resolved.word_th,
    word_en: resolved.word_en,
    learningTarget,
    bankRomanization: resolved.th_romanization,
    bankIpa: resolved.en_ipa,
  });
  return {
    word_en: resolved.word_en,
    word_th: resolved.word_th,
    emoji: resolved.emoji ?? null,
    romanization: phonetics.th_romanization ?? resolved.th_romanization ?? null,
    ipa: phonetics.en_ipa ?? resolved.en_ipa ?? null,
    cefr_level: resolved.cefr_level ?? cefrLevel,
    example_en: resolved.example_en,
    example_th: resolved.example_th,
  };
}

async function buildPhraseItem(
  meaning: string,
  learningTarget: "th" | "en",
  cefrLevel: string,
): Promise<LessonPhraseItem | null> {
  const system = buildPhraseSystem(cefrLevel);
  const user = `Meaning to say: ${meaning}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const parsed = parseJson<{ en?: string; th?: string; rom?: string }>(raw);
    const en = (parsed?.en ?? "").trim();
    const th = (parsed?.th ?? "").trim();
    const promptRom = (parsed?.rom ?? "").trim().toLowerCase();
    if (!en || !th || !isPureThai(th) || FOREIGN_SCRIPT.test(en)) continue;
    // ACCURACY GATE: blind verification — the Thai must be real and must match.
    const check = await verifyCard({ word_en: en, word_th: th, example_th: null, example_en: null });
    if (!check.headwordOk) continue;
    const phonetics = await resolvePhonetics({
      word_th: th,
      word_en: en,
      learningTarget,
      bankRomanization: null,
      bankIpa: null,
    });
    // PHONETICS ARE FIRST-CLASS: phrase romanization must be syllable-spaced.
    const segmented = (txt: string) => txt.includes(" ") || txt.includes("-");
    const resolvedRom = (phonetics.th_romanization ?? "").trim();
    const cleanPromptRom =
      promptRom && /^[a-z' \-]+$/.test(promptRom) && segmented(promptRom) ? promptRom : null;
    const romanization =
      resolvedRom && segmented(resolvedRom) ? resolvedRom : cleanPromptRom ?? (resolvedRom || null);
    return { en, th, romanization };
  }
  return null; // withhold over lie
}

export async function buildExtraWords(args: {
  topic: string;
  cefrLevel: string;
  learningTarget: "th" | "en";
  exclude: string[];
  count?: number;
}): Promise<LessonWordItem[]> {
  const n = Math.min(Math.max(args.count ?? 3, 1), 4);
  const level = args.cefrLevel.trim() || "A1";
  const targetName = args.learningTarget === "en" ? "English" : "Thai";
  const avoid = args.exclude.slice(0, 60).join(", ");
  const system = `You are a CEFR-expert vocabulary planner for learners of ${targetName} at level ${level}. Reply STRICT JSON ONLY — no prose, no markdown fences — {"words": array of EXACTLY ${n} strings, each the plain ENGLISH MEANING of one more useful ${targetName} word for the situation "${args.topic}" at ${level}; single concepts, no romanization, no duplicates${avoid ? `; the learner ALREADY KNOWS and you must NOT reuse: ${avoid}` : ""}}. JSON only.`;
  const user = "Choose the next most useful words.";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const parsed = parseJson<{ words?: string[] }>(raw);
    const meanings = (parsed?.words ?? []).map((w) => String(w).trim()).filter(Boolean).slice(0, n);
    if (!meanings.length) continue;
    const items = await mapChunked(meanings, 3, (m) => buildWordItem(m, args.learningTarget, level));
    if (items.length) return items;
  }
  return []; // withhold over lie
}

export type BuildLessonArgs = {
  userId: string;
  topicAsk?: string | null;
  cefrLevel: string;
  learningTarget: "th" | "en";
  knownWords?: string[];
};

export type BuildLessonResult =
  | { ok: true; lessonId: string; title_en: string; topic: string }
  | { ok: false; reason: "plan_failed" | "content_incomplete" | "store_failed" };

export async function buildLesson(args: BuildLessonArgs): Promise<BuildLessonResult> {
  const level = args.cefrLevel.trim() || "A1";
  const targetName = args.learningTarget === "en" ? "English" : "Thai";
  const plan = await callPlan(level, targetName, args.topicAsk?.trim() || null, (args.knownWords ?? []).slice(0, 60));
  if (!plan) return { ok: false, reason: "plan_failed" };

  const wordMeanings = (plan.words ?? []).map((w) => String(w).trim()).filter(Boolean).slice(0, 5);
  const phraseMeanings = (plan.phrases ?? []).map((p) => String(p).trim()).filter(Boolean).slice(0, 5);

  const words = await mapChunked(wordMeanings, 3, (m) =>
    buildWordItem(m, args.learningTarget, level),
  );
  const phrases = await mapChunked(phraseMeanings, 3, (m) =>
    buildPhraseItem(m, args.learningTarget, level),
  );
  // Deliver the promise or don't deliver at all: a thin lesson is withheld.
  if (words.length < 4 || phrases.length < 4) {
    return { ok: false, reason: "content_incomplete" };
  }

  const candos: LessonCando[] = (plan.candos ?? [])
    .map((c) => ({
      label: String(c?.label ?? "").trim(),
      cefr: level,
      skill: String(c?.skill ?? "spoken interaction").trim(),
    }))
    .filter((c) => c.label.startsWith("Can"))
    .slice(0, 3);

  const topic = (plan.topic ?? "general").trim().toLowerCase() || "general";
  const title_en = String(plan.title_en).trim();
  const content: BuiltLessonContent = { words, phrases, candos };

  try {
    const supabase = await createServiceClient();
    const { count } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("user_id", args.userId);
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        user_id: args.userId,
        title_en,
        title_th: null,
        topic,
        color: colorForTopic(topic),
        cefr_level: level,
        learning_target: args.learningTarget,
        position: count ?? 0,
        status: "planned",
        content,
        progress: {},
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[lesson-builder] insert failed:", error?.message);
      return { ok: false, reason: "store_failed" };
    }
    return { ok: true, lessonId: data.id as string, title_en, topic };
  } catch (err) {
    console.error("[lesson-builder] store failed:", err);
    return { ok: false, reason: "store_failed" };
  }
}
