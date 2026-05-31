// lib/ai/router.ts
// AI Router — tries engines in order, never fails the user
// Order: Gemini (primary, clean Thai) → Groq (fallback) → Library failover

import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { getFailoverResponse } from "./session";

// Lazy clients — constructing at module load fails Next 16's page-data
// collection step when env vars are absent (build-time).
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

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.5-flash";

/** Resolved model string after first successful call or 404 fallback. */
let geminiModelInUse = GEMINI_MODEL;

type Message = { role: "user" | "assistant"; content: string };

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

export async function getAIResponse(
  messages: Message[],
  systemPrompt: string
): Promise<{ content: string; engine: string; wasFailover: boolean }> {

  // Try Gemini first — clean Thai, cheap and fast
  try {
    const content = await callGemini(messages, systemPrompt);
    if (content) return { content, engine: "gemini", wasFailover: false };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    console.warn("Gemini failed:", err?.status, err?.message?.slice(0, 100));
  }

  // Try Groq second — fast fallback on error
  try {
    const content = await callGroq(messages, systemPrompt);
    if (content) return { content, engine: "groq", wasFailover: false };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    console.warn("Groq failed:", err?.status, err?.message?.slice(0, 100));
  }

  // Both failed — library failover, always works
  const failover = getFailoverResponse();
  return {
    content: `${failover.th}\n\n${failover.en}`,
    engine: "library",
    wasFailover: true,
  };
}

// ─── GROQ CALL ────────────────────────────────────────────────────────────────

async function callGroq(
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const groq = getGroq();
  if (!groq) throw new Error("GROQ_API_KEY missing — Groq disabled");
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 300,
    temperature: 0.85,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Empty Groq response");

  return stripMarkdown(text);
}

// ─── GEMINI CALL ─────────────────────────────────────────────────────────────

function isGeminiModelNotFound(error: unknown): boolean {
  const err = error as { status?: number; code?: number; message?: string };
  const msg = err?.message ?? String(error);
  return (
    err?.status === 404 ||
    err?.code === 404 ||
    /404|NOT_FOUND|not found/i.test(msg)
  );
}

async function resolveFlashGeminiModel(gemini: GoogleGenAI): Promise<string> {
  try {
    const pager = await gemini.models.list();
    const names: string[] = [];

    if (pager && typeof (pager as AsyncIterable<{ name?: string }>)[Symbol.asyncIterator] === "function") {
      for await (const model of pager as AsyncIterable<{ name?: string }>) {
        const name = (model.name ?? "").replace(/^models\//, "");
        if (name) names.push(name);
      }
    } else {
      const models = (pager as { models?: { name?: string }[] }).models ?? [];
      for (const model of models) {
        const name = (model.name ?? "").replace(/^models\//, "");
        if (name) names.push(name);
      }
    }

    console.warn("Gemini available models:", names.join(", "));

    const flash = names.find((n) => /flash/i.test(n) && !/lite/i.test(n));
    if (flash) return flash;
  } catch (error) {
    const err = error as { message?: string };
    console.warn("Gemini model list failed:", err?.message?.slice(0, 100));
  }

  return GEMINI_MODEL;
}

async function callGeminiWithModel(
  gemini: GoogleGenAI,
  model: string,
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = gemini.chats.create({
    model,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 300,
      temperature: 0.85,
    },
    history,
  });

  const response = await chat.sendMessage({
    message: lastMessage?.content ?? "",
  });

  const text = response.text ?? "";
  if (!text.trim()) throw new Error("Empty Gemini response");

  return stripMarkdown(text);
}

async function callGemini(
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const gemini = getGemini();
  if (!gemini) throw new Error("GEMINI_API_KEY missing — Gemini disabled");

  try {
    const content = await callGeminiWithModel(
      gemini,
      geminiModelInUse,
      messages,
      systemPrompt
    );
    return content;
  } catch (error) {
    if (!isGeminiModelNotFound(error) || geminiModelInUse !== GEMINI_MODEL) {
      throw error;
    }

    const fallback = await resolveFlashGeminiModel(gemini);
    geminiModelInUse = fallback;
    console.warn(
      `Gemini ${GEMINI_MODEL} not found; using ${fallback}`
    );

    return callGeminiWithModel(gemini, fallback, messages, systemPrompt);
  }
}

// ─── MARKDOWN STRIPPER ────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}
