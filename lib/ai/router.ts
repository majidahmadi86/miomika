// lib/ai/router.ts
// AI Router — tries engines in order, never fails the user
// Order: Groq (primary, fast) → Gemini (fallback, Thai quality) → Library failover
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { log } from "@/lib/debug/log";
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
// Cap how much conversation history we send to the LLM each turn. Without this the
// client re-sends the ENTIRE growing transcript every call → token cost grows turn
// over turn. The last few exchanges are plenty of context for a chat companion.
const MAX_HISTORY_MESSAGES = 8;
// Ceiling on reply length. Replies should be 1-2 sentences (the prompt enforces this);
// 200 tokens is a safety cap that (a) keeps a runaway reply from burning Groq's
// per-minute token budget — which is what drops us onto slow Gemini — and (b) caps cost.
const MAX_REPLY_TOKENS = 200;
/** Resolved model string after first successful call or 404 fallback. */
let geminiModelInUse = GEMINI_MODEL;
type Message = { role: "user" | "assistant"; content: string };
// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────
function aiErrorFields(error: unknown): { message: string; status?: number } {
  const err = error as { status?: number; message?: string };
  return {
    message:
      err?.message ??
      (error instanceof Error ? error.message : String(error)),
    status: err?.status,
  };
}
export async function getAIResponse(
  messages: Message[],
  systemPrompt: string
): Promise<{ content: string; engine: string; wasFailover: boolean }> {
  log("ai.router", "env keys", {
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
  });
  // Only the most recent turns are needed — keeps per-call token cost bounded.
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  // Try Groq first — fast, reliable
  try {
    const content = await callGroq(recent, systemPrompt);
    if (content) return { content, engine: "groq", wasFailover: false };
  } catch (error) {
    const { message, status } = aiErrorFields(error);
    log("ai.router", "groq failed", { message, status });
  }
  // Try Gemini second — Thai quality fallback
  try {
    const content = await callGemini(recent, systemPrompt);
    if (content) return { content, engine: "gemini", wasFailover: false };
  } catch (error) {
    const { message, status } = aiErrorFields(error);
    log("ai.router", "gemini failed", { message, status });
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
    max_tokens: MAX_REPLY_TOKENS,
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
      maxOutputTokens: MAX_REPLY_TOKENS,
      temperature: 0.85,
      // CRITICAL COST CONTROL: Gemini 2.5 Flash enables "thinking" by default and
      // bills those hidden reasoning tokens at the high $2.50/M output rate. Our
      // replies are short chat turns that need no reasoning, so disable thinking.
      thinkingConfig: { thinkingBudget: 0 },
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
