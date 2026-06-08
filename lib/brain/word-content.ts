// SERVER ONLY — word/phrase content engine.
// The MODEL chooses which item to teach; this resolves it to a real card:
//   bank hit  → curated card.
//   bank miss → generate + validate + persist (the bank grows itself), best-effort.
// Pair-agnostic interface; content generation is Thai<->English today (the only cardable pair).
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/service";
import { isVocabularySlug } from "@/lib/talk/teach-word-card";

export type ResolvedWordSource = "bank" | "generated";

export type ResolvedWord = {
  word_en: string;
  word_th: string;
  cefr_level: string | null;
  emoji: string | null;
  example_th: string | null;
  example_en: string | null;
  th_romanization: string | null;
  en_ipa: string | null;
  topic: string | null;
  register: string | null;
  source: ResolvedWordSource;
};

type GeneratedCard = {
  word_en?: string;
  word_th?: string;
  example_en?: string;
  example_th?: string;
  topic?: string;
  register?: string;
};

const THAI_RE = /[\u0E00-\u0E7F]/;
const hasThaiScript = (s: string): boolean => THAI_RE.test(s);

let _groq: Groq | null = null;
let _gemini: GoogleGenAI | null = null;
function getGroq(): Groq | null {
  if (_groq) return _groq;
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  _groq = new Groq({ apiKey: key });
  return _groq;
}
function getGemini(): GoogleGenAI | null {
  if (_gemini) return _gemini;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  _gemini = new GoogleGenAI({ apiKey: key });
  return _gemini;
}

async function callGroqJson(system: string, user: string): Promise<string | null> {
  const groq = getGroq();
  if (!groq) return null;
  try {
    const r = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return r.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callGeminiJson(system: string, user: string): Promise<string | null> {
  const gemini = getGemini();
  if (!gemini) return null;
  try {
    const chat = gemini.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: system,
        maxOutputTokens: 300,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });
    const r = await chat.sendMessage({ message: user });
    return r.text ?? null;
  } catch {
    return null;
  }
}

function parseCard(raw: string | null): GeneratedCard | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as GeneratedCard;
  } catch {
    return null;
  }
}

function isValidCard(c: GeneratedCard | null): c is GeneratedCard {
  if (!c) return false;
  const word_en = (c.word_en ?? "").trim();
  const word_th = (c.word_th ?? "").trim();
  if (!word_en || !word_th) return false;
  if (!hasThaiScript(word_th)) return false;
  if (isVocabularySlug(word_en)) return false;
  const example_th = (c.example_th ?? "").trim();
  if (example_th && !example_th.includes(word_th)) return false;
  return true;
}

function buildGenSystem(target: "th" | "en", cefr: string): string {
  const targetName = target === "en" ? "English" : "Thai";
  return `You are a bilingual Thai–English lexicographer building ONE vocabulary card for a ${cefr} learner whose target language is ${targetName}. Given a word or short phrase, reply with STRICT JSON ONLY — no prose, no markdown fences — with keys: word_en (the English form), word_th (the Thai form, in Thai script), example_en (one short, natural English sentence that uses the English form), example_th (the Thai translation of that sentence, in Thai script, using the Thai form), topic (one lowercase English word, e.g. food, feelings, travel), register (exactly one of: neutral, formal, casual, slang). ONE COHERENT SENSE: word_en, word_th, and both examples must all be the same word/phrase and the same meaning — example_th must contain word_th verbatim and example_en must contain word_en. Never substitute a related-but-different word (e.g. if the input is ขอ "to request / may I have", do NOT drift to ขอโทษ "sorry"). If the input is ambiguous, pick the most common everyday sense and keep every field consistent with it. Keep it natural and appropriate for a ${cefr} learner. JSON only.`;
}

async function lookupBankWord(word: string): Promise<ResolvedWord | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;
  try {
    const supabase = await createServiceClient();
    const column = hasThaiScript(trimmed) ? "word_th" : "word_en";
    const { data, error } = await supabase
      .from("vocabulary_bank")
      .select(
        "word_en, word_th, cefr_level, emoji, example_th, example_en, th_romanization, en_ipa, topic, register",
      )
      .ilike(column, trimmed)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const word_en = (data.word_en as string | null)?.trim() ?? "";
    const word_th = (data.word_th as string | null)?.trim() ?? "";
    if (!word_en || !word_th) return null;
    return {
      word_en,
      word_th,
      cefr_level: (data.cefr_level as string | null) ?? null,
      emoji: (data.emoji as string | null) ?? null,
      example_th: (data.example_th as string | null) ?? null,
      example_en: (data.example_en as string | null) ?? null,
      th_romanization: (data.th_romanization as string | null) ?? null,
      en_ipa: (data.en_ipa as string | null) ?? null,
      topic: (data.topic as string | null) ?? null,
      register: (data.register as string | null) ?? null,
      source: "bank",
    };
  } catch (err) {
    console.error("[word-content.lookupBankWord] failed:", err);
    return null;
  }
}

function persistGeneratedWord(card: ResolvedWord): void {
  void (async () => {
    try {
      const supabase = await createServiceClient();
      const { error } = await supabase.from("vocabulary_bank").upsert(
        {
          word_en: card.word_en,
          word_th: card.word_th,
          example_en: card.example_en,
          example_th: card.example_th,
          topic: card.topic ?? "general",
          register: card.register ?? "neutral",
          cefr_level: card.cefr_level ?? "A1",
          status: "generated",
          teach_thai_to_english: true,
          teach_english_to_thai: true,
          frequency_score: 0,
          difficulty_score: 0,
          created_at: new Date().toISOString(),
        },
        { onConflict: "word_en", ignoreDuplicates: true },
      );
      if (error) {
        console.error("[word-content.persist] upsert failed:", error.message, error.details);
      }
    } catch (err) {
      console.error("[word-content.persist] failed:", err);
    }
  })();
}

async function generateWordCard(
  word: string,
  target: "th" | "en",
  cefr: string,
): Promise<ResolvedWord | null> {
  const system = buildGenSystem(target, cefr);
  const user = `Word or short phrase to teach: ${word}`;
  let parsed = parseCard(await callGroqJson(system, user));
  if (!isValidCard(parsed)) {
    parsed = parseCard(await callGeminiJson(system, user));
  }
  if (!isValidCard(parsed)) return null;
  const word_en = (parsed.word_en ?? "").trim();
  const word_th = (parsed.word_th ?? "").trim();
  return {
    word_en,
    word_th,
    example_en: (parsed.example_en ?? "").trim() || null,
    example_th: (parsed.example_th ?? "").trim() || null,
    topic: (parsed.topic ?? "").trim() || null,
    register: (parsed.register ?? "").trim() || null,
    cefr_level: cefr,
    emoji: null,
    th_romanization: null,
    en_ipa: null,
    source: "generated",
  };
}

/**
 * Resolve a learner-facing item the MODEL chose.
 * Bank hit → curated card; bank miss → generate + persist (best-effort) → card.
 * Returns null only when generation itself fails validation (the model then offers a close one).
 */
export async function resolveOrGenerateWord(args: {
  word: string;
  learningTarget: "th" | "en";
  cefrLevel: string | null;
}): Promise<ResolvedWord | null> {
  const word = args.word.trim();
  if (!word) return null;
  const hit = await lookupBankWord(word);
  if (hit) return hit;
  const cefr = args.cefrLevel?.trim() || "A1";
  const generated = await generateWordCard(word, args.learningTarget, cefr);
  if (!generated) return null;
  persistGeneratedWord(generated);
  return generated;
}
