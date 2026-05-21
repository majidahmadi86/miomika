// lib/ai/router.ts
// AI Router — tries engines in order, never fails the user
// Order: Groq (free, fast) → Gemini (backup) → Library failover

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
const GEMINI_MODEL = "gemini-2.5-flash-lite";

type Message = { role: "user" | "assistant"; content: string };

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

export async function getAIResponse(
  messages: Message[],
  systemPrompt: string
): Promise<{ content: string; engine: string; wasFailover: boolean }> {

  // Try Groq first — free, 14400 requests/day, fast
  try {
    const content = await callGroq(messages, systemPrompt);
    if (content) return { content, engine: "groq", wasFailover: false };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    console.warn("Groq failed:", err?.status, err?.message?.slice(0, 100));
  }

  // Try Gemini second — 20 requests/day free backup
  try {
    const content = await callGemini(messages, systemPrompt);
    if (content) return { content, engine: "gemini", wasFailover: false };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    console.warn("Gemini failed:", err?.status, err?.message?.slice(0, 100));
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

async function callGemini(
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const gemini = getGemini();
  if (!gemini) throw new Error("GEMINI_API_KEY missing — Gemini disabled");
  const chat = gemini.chats.create({
    model: GEMINI_MODEL,
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

// ─── MARKDOWN STRIPPER ────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}