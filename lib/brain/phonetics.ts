// SERVER ONLY — romanization / IPA for teach-word cards.

import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { isAcceptableBankRomanization, isAcceptableGeneratedRomanization } from "./romanization-guard";

export type PhoneticsSource = "bank" | "generated";

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

function cleanPhoneticsOutput(raw: string): string {
  return raw
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(romanization|ipa|pronunciation)\s*:\s*/i, "")
    .replace(/\*\*/g, "")
    .trim();
}

async function callGroqPhonetics(system: string, user: string): Promise<string | null> {
  const groq = getGroq();
  if (!groq) return null;
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 40,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = response.choices[0]?.message?.content ?? "";
    const cleaned = cleanPhoneticsOutput(text);
    return cleaned || null;
  } catch {
    return null;
  }
}

async function callGeminiPhonetics(system: string, user: string): Promise<string | null> {
  // Gemini OFF by default (wallet protection); callers fall back to Groq.
  if (process.env.ENABLE_GEMINI_FALLBACK !== "true") return null;
  const gemini = getGemini();
  if (!gemini) return null;
  try {
    const chat = gemini.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: system,
        maxOutputTokens: 40,
        temperature: 0.2,
      },
    });
    const response = await chat.sendMessage({ message: user });
    const cleaned = cleanPhoneticsOutput(response.text ?? "");
    return cleaned || null;
  } catch {
    return null;
  }
}

async function generateThaiRomanization(word_th: string): Promise<string> {
  const system =
    "You romanize Thai words into simple, readable Latin syllables for beginners. RULES: separate EVERY syllable with a hyphen; plain letters only (no IPA, no Thai script, no tone marks); reply with ONLY the romanization. Examples:\nสวัสดี → sa-wat-dee\nขอบคุณ → khop-khun\nอาหาร → a-han\nเพิ่มเติม → perm-derm\nกิน → kin";
  const user = `Romanize: ${word_th}`;
  const groq = await callGroqPhonetics(system, user);
  if (groq) return groq;
  const gemini = await callGeminiPhonetics(system, user);
  if (gemini) return gemini;
  return word_th;
}

async function generateEnglishIpa(word_en: string): Promise<string> {
  const system =
    "You provide learner-friendly IPA for English words. Reply with ONLY the IPA in slashes removed — just the phonetic symbols, no explanation.";
  const user = `IPA for: ${word_en}`;
  const groq = await callGroqPhonetics(system, user);
  if (groq) return groq;
  const gemini = await callGeminiPhonetics(system, user);
  if (gemini) return gemini;
  return word_en;
}

export async function resolvePhonetics(args: {
  word_th: string;
  word_en: string;
  learningTarget: "th" | "en" | null;
  bankRomanization: string | null;
  bankIpa: string | null;
}): Promise<{
  th_romanization?: string;
  en_ipa?: string;
  phonetics: string;
  phonetics_source: PhoneticsSource;
}> {
  const target = args.learningTarget ?? "th";

  if (target === "en") {
    if (args.bankIpa?.trim()) {
      const ipa = args.bankIpa.trim();
      return { en_ipa: ipa, phonetics: ipa, phonetics_source: "bank" };
    }
    const ipa = await generateEnglishIpa(args.word_en);
    return { en_ipa: ipa, phonetics: ipa, phonetics_source: "generated" };
  }

  if (args.bankRomanization?.trim()) {
    const roman = args.bankRomanization.trim();
    if (isAcceptableBankRomanization(roman, args.word_th)) {
      return { th_romanization: roman, phonetics: roman, phonetics_source: "bank" };
    }
    // bad bank row → fall through and regenerate
  }
  const roman = await generateThaiRomanization(args.word_th);
  if (isAcceptableGeneratedRomanization(roman, args.word_th)) {
    return { th_romanization: roman, phonetics: roman, phonetics_source: "generated" };
  }
  // Garbage romanization → withhold. Real syllables or nothing.
  return { phonetics: "", phonetics_source: "generated" };
}
