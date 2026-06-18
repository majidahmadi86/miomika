// SERVER ONLY — word/phrase content engine.
// The MODEL chooses which item to teach; this resolves it to a real card:
//   verified bank hit → curated card, served directly (no LLM).
//   unverified / miss → validate or generate → serve NOW + persist verified (lib grows).
//   withhold (null) only when generation can't pass validation — never serve a wrong word.
// Pair-agnostic interface; content generation is Thai<->English today (the only cardable pair).
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/service";
import { recordUsage } from "@/lib/usage/ledger";
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
  verified_at?: string | null;
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

export async function callGroqJson(system: string, user: string, maxTokens: number = 600): Promise<string | null> {
  const groq = getGroq();
  if (!groq) {
    console.error("[brain] groq unavailable: GROQ_API_KEY missing");
    recordUsage({ provider: "groq", model: "llama-3.3-70b-versatile", ok: false, meta: { reason: "key_missing" } });
    return null;
  }
  const started = Date.now();
  try {
    const r = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const finish = r.choices[0]?.finish_reason;
    if (finish && finish !== "stop") {
      console.error(`[brain] groq finish_reason=${finish} (likely truncated at max_tokens=${maxTokens})`);
    }
    recordUsage({ provider: "groq", model: "llama-3.3-70b-versatile", promptTokens: r.usage?.prompt_tokens ?? 0, completionTokens: r.usage?.completion_tokens ?? 0, latencyMs: Date.now() - started, ok: true, meta: finish && finish !== "stop" ? { finish } : undefined });
    return r.choices[0]?.message?.content ?? null;
  } catch (err) {
    recordUsage({ provider: "groq", model: "llama-3.3-70b-versatile", latencyMs: Date.now() - started, ok: false, meta: { error: String(err).slice(0, 200) } });
    console.error("[brain] groq call failed:", String(err));
    return null;
  }
}

export async function callGeminiJson(system: string, user: string, maxTokens: number = 800): Promise<string | null> {
  if (process.env.ENABLE_GEMINI_FALLBACK !== "true") return null;
  const gemini = getGemini();
  if (!gemini) {
    console.error("[brain] gemini unavailable: GEMINI_API_KEY missing");
    recordUsage({ provider: "gemini", model: "gemini-2.5-flash", ok: false, meta: { reason: "key_missing" } });
    return null;
  }
  const started = Date.now();
  try {
    const chat = gemini.chats.create({
      model: "gemini-2.5-flash",
      config: { systemInstruction: system, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: maxTokens, temperature: 0.3, responseMimeType: "application/json" },
    });
    const r = await chat.sendMessage({ message: user });
    if (!r.text) console.error("[brain] gemini returned empty text (possible truncation or block)");
    recordUsage({ provider: "gemini", model: "gemini-2.5-flash", promptTokens: r.usageMetadata?.promptTokenCount ?? 0, completionTokens: r.usageMetadata?.candidatesTokenCount ?? 0, latencyMs: Date.now() - started, ok: !!r.text });
    return r.text ?? null;
  } catch (err) {
    recordUsage({ provider: "gemini", model: "gemini-2.5-flash", latencyMs: Date.now() - started, ok: false, meta: { error: String(err).slice(0, 200) } });
    console.error("[brain] gemini call failed:", String(err));
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
  return `You are a bilingual Thai–English lexicographer building ONE vocabulary card for a ${cefr} learner whose target language is ${targetName}. Given a word, short phrase, or meaning, reply with STRICT JSON ONLY — no prose, no markdown fences — with keys: word_en (the English form), word_th (the Thai form, in Thai script), example_en (one short, natural English sentence that uses the English form), example_th (the Thai translation of that sentence, in Thai script, using the Thai form), topic (one lowercase English word, e.g. food, feelings, travel), register (exactly one of: neutral, formal, casual, slang). REAL CONTENT ONLY: the input may be an English meaning, Thai script, or an approximate romanization — TRANSLATE IT BY MEANING into the Thai a real Thai speaker actually uses. NEVER spell English sounds out in Thai letters (no phonetic transliteration) and never invent a word that does not exist; if you cannot give a real, correct Thai form for the meaning, return word_th as an empty string "". ONE COHERENT SENSE: word_en, word_th, and both examples must all be the same word/phrase and the same meaning — example_th must contain word_th verbatim and example_en must contain word_en. Never substitute a related-but-different word (e.g. if the input is ขอ "to request / may I have", do NOT drift to ขอโทษ "sorry"). If the input is ambiguous, pick the most common everyday sense and keep every field consistent with it. Keep it natural and appropriate for a ${cefr} learner. JSON only.`;
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
        "word_en, word_th, cefr_level, emoji, example_th, example_en, th_romanization, en_ipa, topic, register, verified_at",
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
      verified_at: (data.verified_at as string | null) ?? null,
      source: "bank",
    };
  } catch (err) {
    console.error("[word-content.lookupBankWord] failed:", err);
    return null;
  }
}

/** Fire-and-forget: stamp a bank row verified (and drop a flawed example) so future serves skip the verify LLM call. */
export function markBankVerified(card: ResolvedWord, exampleOk: boolean): void {
  void (async () => {
    try {
      const supabase = await createServiceClient();
      const patch: Record<string, unknown> = { verified_at: new Date().toISOString() };
      if (!exampleOk) {
        patch.example_th = null;
        patch.example_en = null;
      }
      const { error } = await supabase
        .from("vocabulary_bank")
        .update(patch)
        .eq("word_en", card.word_en);
      if (error) {
        console.error("[word-content.markBankVerified] update failed:", error.message);
      }
    } catch (err) {
      console.error("[word-content.markBankVerified] failed:", err);
    }
  })();
}
export function persistGeneratedWord(card: ResolvedWord): void {
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
          verified_at: new Date().toISOString(),
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

type CardCheck = { headwordOk: boolean; exampleOk: boolean };

function buildVerifySystem(): string {
  return `You are a strict bilingual Thai-English checker. You are given a Thai word or phrase with a CLAIMED English meaning, plus an example sentence pair. Reply with STRICT JSON ONLY — no prose, no markdown fences — {"headword_real": boolean, "headword_matches": boolean, "example_real": boolean, "example_uses_word": boolean, "example_matches": boolean}.
- headword_real: true ONLY if the Thai word/phrase is real, natural Thai a speaker actually uses. FALSE if it is gibberish, a word-salad, or a phonetic transliteration of English sounds spelled in Thai letters.
- headword_matches: true ONLY if the Thai word/phrase actually means the claimed English meaning.
- example_real: read EVERY word in the Thai example individually; true ONLY if every single word is a real Thai word AND the whole sentence is grammatical and natural. Set it FALSE if ANY token is a non-word, typo, fragment, or corrupted spelling.
- example_uses_word: true ONLY if the Thai example actually contains and uses the Thai word/phrase.
- example_matches: true ONLY if the Thai example and the English example mean the same thing.
Be strict: when in doubt, set the boolean to false.`;
}

// Independent, blind verification. The HEADWORD must check out or the card is never
// shown (we withhold rather than teach something wrong). The EXAMPLE is verified
// separately — if it has any flaw it is dropped, so a bad example can never reach
// the learner while a correct word still can.
export async function verifyCard(args: {
  word_en: string;
  word_th: string;
  example_th: string | null;
  example_en: string | null;
}): Promise<CardCheck> {
  const system = buildVerifySystem();
  const user = `Thai word/phrase: ${args.word_th}\nClaimed English meaning: ${args.word_en}\nThai example: ${args.example_th ?? "(none)"}\nEnglish example: ${args.example_en ?? "(none)"}`;
  const raw = (await callGeminiJson(system, user)) ?? (await callGroqJson(system, user));
  if (!raw) return { headwordOk: false, exampleOk: false };
  try {
    const v = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      headword_real?: boolean;
      headword_matches?: boolean;
      example_real?: boolean;
      example_uses_word?: boolean;
      example_matches?: boolean;
    };
    const headwordOk = v.headword_real === true && v.headword_matches === true;
    const hasExample = Boolean(args.example_th && args.example_en);
    const exampleOk =
      hasExample &&
      v.example_real === true &&
      v.example_uses_word === true &&
      v.example_matches === true;
    return { headwordOk, exampleOk };
  } catch {
    return { headwordOk: false, exampleOk: false };
  }
}

export async function generateWordCard(
  word: string,
  target: "th" | "en",
  cefr: string,
): Promise<ResolvedWord | null> {
  const system = buildGenSystem(target, cefr);
  const user = `Word, short phrase, or meaning to teach: ${word}`;
  // Two independent attempts (Groq, then Gemini). The headword must verify or we
  // skip the candidate (and ultimately withhold). Prefer a candidate whose example
  // also verifies; otherwise keep a headword-only card with the example dropped.
  let fallback: ResolvedWord | null = null;
  // 3 attempts: Groq once, then Gemini twice — survives a missing GROQ_API_KEY or one flaky call.
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const parsed = parseCard(raw);
    if (!isValidCard(parsed)) continue;
    const word_en = (parsed.word_en ?? "").trim();
    const word_th = (parsed.word_th ?? "").trim();
    const example_en = (parsed.example_en ?? "").trim() || null;
    const example_th = (parsed.example_th ?? "").trim() || null;
    const check = await verifyCard({ word_en, word_th, example_th, example_en });
    if (!check.headwordOk) continue;
    const card: ResolvedWord = {
      word_en,
      word_th,
      example_en: check.exampleOk ? example_en : null,
      example_th: check.exampleOk ? example_th : null,
      topic: (parsed.topic ?? "").trim() || null,
      register: (parsed.register ?? "").trim() || null,
      cefr_level: cefr,
      emoji: null,
      th_romanization: null,
      en_ipa: null,
      source: "generated",
    };
    if (check.exampleOk) return card;
    if (!fallback) fallback = card;
  }
  return fallback;
}

/**
 * Resolve a learner-facing item the MODEL chose to a card.
 * VERIFIED bank hit → served directly (no LLM, instant). Everything else — an
 * unverified row or a bank miss — is WITHHELD (null) and logged, so the live path
 * can never teach an unverified or invented word. Callers fall back to another word
 * or skip; the WITHHELD log feeds deliberate offline bank growth.
 */
export async function resolveOrGenerateWord(args: {
  word: string;
  learningTarget: "th" | "en";
  cefrLevel: string | null;
}): Promise<ResolvedWord | null> {
  const word = args.word.trim();
  if (!word) return null;
  const cefr = args.cefrLevel?.trim() || "A1";
  const hit = await lookupBankWord(word);
  if (hit) {
    if (hit.verified_at) return hit;
    const check = await verifyCard({
      word_en: hit.word_en,
      word_th: hit.word_th,
      example_th: hit.example_th,
      example_en: hit.example_en,
    });
    if (check.headwordOk) {
      const clean = check.exampleOk ? hit : { ...hit, example_th: null, example_en: null };
      markBankVerified(clean, check.exampleOk);
      return clean;
    }
  }
  const generated = await generateWordCard(word, args.learningTarget, cefr);
  if (generated) {
    persistGeneratedWord(generated);
    return generated;
  }
  console.warn(`[brain] WITHHELD word="${word}" reason=generation_failed`);
  return null;
}
