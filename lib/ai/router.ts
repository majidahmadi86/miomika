// lib/ai/router.ts
// AI Router — tries engines in order, never fails the user
// Order: Groq (primary, fast) → Gemini (fallback, Thai quality) → Library failover
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { log } from "@/lib/debug/log";
import { isSaneReply } from "@/lib/ai/output-guard";
import { recordUsage } from "@/lib/usage/ledger";
import { assertBudget, estimateLlmUsd, BudgetExceededError } from "@/lib/usage/gate";
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
  // Vertex AI (billed to the GCP credit) — NOT the AI-Studio apiKey path (cash wallet).
  // Mirrors lib/brain/word-content.ts so chat replies use the same accurate-Thai model.
  const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
  const project = process.env.GCP_PROJECT_ID;
  if (!raw || !project) return null;
  try {
    const sa = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!sa.client_email || !sa.private_key) {
      console.error("[ai.router] GCP_SERVICE_ACCOUNT_JSON missing client_email/private_key");
      return null;
    }
    _gemini = new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.GCP_LOCATION || "us-central1",
      googleAuthOptions: {
        credentials: { client_email: sa.client_email, private_key: sa.private_key },
      },
    });
    return _gemini;
  } catch (err) {
    console.error("[ai.router] gemini (vertex) init failed:", String(err));
    return null;
  }
}
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.5-flash";
// Cap how much conversation history we send to the LLM each turn. Without this the
// client re-sends the ENTIRE growing transcript every call → token cost grows turn
// over turn. Keep enough recent context for a coherent companion that remembers the
// thread (raised from 8 → she was losing the conversation past a few turns and reading
// as forgetful). Cost is bounded by the daily caps, not by starving her memory.
const MAX_HISTORY_MESSAGES = 16;
// Ceiling on reply length. TURN ECONOMY is law: replies are 1–2 short sentences, and
// TTS bills per character — long replies are the #1 cost driver (61% of daily spend was
// TTS on 7/16). This cap ENFORCES the prompt, since llama follows soft rules loosely.
// 240 still fits a full teaching turn (word + phonetics + example); pure chat lands far
// below it. Also the cap for memory-extraction + comprehension-router (tiny JSON, safe).
// (Lowered 600 → 240.)
const MAX_REPLY_TOKENS = 240;
// Hard per-engine timeouts. A turn must NEVER hang the mic. We saw a 52-SECOND Gemini
// call freeze the whole turn; with these, a slow engine is abandoned fast and we fall
// through to the next option (or the instant library failover) instead of locking up.
const GROQ_TIMEOUT_MS = 9000;
const GEMINI_TIMEOUT_MS = 9000;
/** Resolved model string after first successful call or 404 fallback. */
let geminiModelInUse = GEMINI_MODEL;
type Message = { role: "user" | "assistant"; content: string };
// Reject a promise if it doesn't settle within `ms` — keeps one slow engine from
// stalling the whole pipeline.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
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
// Warm fallback shown when a user hits their cost ceiling — never an error.
// TODO Mike: replace the Thai copy with your own wording.
const CAPPED_DAILY = {
  en: "We've had so much fun today — that's all our free chats until tomorrow! I'll be right here when they refresh. Or if you'd rather not wait, you can unlock unlimited time with me anytime.",
  th: "วันนี้เราคุยกันสนุกมากเลยน้า — โควต้าแชทฟรีของวันนี้หมดแล้ว! พรุ่งนี้พอรีเฟรชแล้วหนูจะรออยู่ตรงนี้นะ หรือถ้าไม่อยากรอ ก็ปลดล็อกคุยกับหนูได้ไม่จำกัดเลยน้า",
};
const CAPPED_TURN = {
  en: "Ooh, that's a big one! Let's take it a little at a time — try me again in a moment?",
  th: "โอ้ว อันนี้ยาวเลยน้า! ค่อยๆ เป็นค่อยๆ ไปนะ เดี๋ยวลองถามมิโอมิอีกทีนะ",
};

export async function getAIResponse(
  messages: Message[],
  systemPrompt: string,
  uiLanguage: "th" | "en" = "en",
): Promise<{ content: string; engine: string; wasFailover: boolean }> {
  log("ai.router", "env keys", {
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
    GCP_VERTEX: Boolean(process.env.GCP_SERVICE_ACCOUNT_JSON && process.env.GCP_PROJECT_ID),
  });
  // Only the most recent turns are needed — keeps per-call token cost bounded.
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);

  // COST GATE — check the turn/day budget BEFORE spending. If over, return a warm
  // capped message rather than an error (a reply must always come back).
  try {
    const estChars = systemPrompt.length + recent.reduce((s, m) => s + m.content.length, 0);
    assertBudget("reply", estimateLlmUsd(estChars, MAX_REPLY_TOKENS));
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      const capped = err.scope === "turn" ? CAPPED_TURN : CAPPED_DAILY;
      return { content: uiLanguage === "th" ? capped.th : capped.en, engine: "capped", wasFailover: true };
    }
    throw err;
  }
  const geminiEnabled = process.env.ENABLE_GEMINI_FALLBACK === "true";
  // GEMINI PRIMARY, GROQ BACKUP — Mike's standing decision, fully executed 7/17.
  // The old "English replies keep Groq" split was wrong: EN-UI learners are
  // LEARNING THAI, so their turns contain Thai constantly — and Groq invents
  // Thai (เพด, บัวก, ดาหลา) and ignores soft prompt rules. Gemini is the
  // accurate-Thai model at cost parity (฿0.028 vs ฿0.029/call, admin 7/17).
  // Groq stays as the fast fallback on Gemini error/timeout; the output guard
  // and library failover below are unchanged.
  const order: Array<"groq" | "gemini"> =
    geminiEnabled ? ["gemini", "groq"] : ["groq", "gemini"];

  for (const engine of order) {
    if (engine === "gemini" && !geminiEnabled) continue;
    try {
      const content =
        engine === "groq"
          ? await withTimeout(callGroq(recent, systemPrompt), GROQ_TIMEOUT_MS, "groq")
          : await withTimeout(callGemini(recent, systemPrompt), GEMINI_TIMEOUT_MS, "gemini");
      if (content) {
        // OUTPUT GUARD — a garbage reply (mojibake, language flip, repetition
        // loop) is treated exactly like a provider failure: the next engine in
        // the order is the silent retry, and the library failover below is the
        // warm net. A user never sees garbage and never sees an error.
        const sane = isSaneReply(content);
        if (sane.ok) return { content, engine, wasFailover: false };
        log("ai.router", `${engine} reply rejected by output guard`, {
          reason: sane.reason,
          sample: content.slice(0, 80),
        });
        continue;
      }
    } catch (error) {
      const { message, status } = aiErrorFields(error);
      log("ai.router", `${engine} failed`, { message, status });
    }
  }

  // Both failed — library failover. ONE language only (never the th+en blob).
  const failover = getFailoverResponse();
  return {
    content: uiLanguage === "th" ? failover.th : failover.en,
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
  const started = Date.now();
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
  recordUsage({ provider: "groq", model: GROQ_MODEL, promptTokens: response.usage?.prompt_tokens ?? 0, completionTokens: response.usage?.completion_tokens ?? 0, latencyMs: Date.now() - started, ok: true, meta: { path: "reply" } });
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
  recordUsage({ provider: "gemini", model, promptTokens: response.usageMetadata?.promptTokenCount ?? 0, completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0, ok: true, meta: { path: "reply" } });
  const text = response.text ?? "";
  if (!text.trim()) throw new Error("Empty Gemini response");
  return stripMarkdown(text);
}
async function callGemini(
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const gemini = getGemini();
  if (!gemini) throw new Error("Gemini (Vertex) unavailable — GCP_SERVICE_ACCOUNT_JSON / GCP_PROJECT_ID missing");
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
