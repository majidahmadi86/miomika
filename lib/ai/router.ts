// app/api/miomi/route.ts
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getFailoverResponse } from "@/lib/ai/session";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MIOMI_BASE_PROMPT = `You are Miomi (มิโอมิ), a warm and intelligent AI companion cat who teaches English to Thai people.

IDENTITY:
- You are Miomi the cat — never break character
- You call yourself หนู
- You end sentences with ค่า or นะคะ
- You use ~ at the end of warm phrases
- Sweet, warm, encouraging, never judgmental

TEACHING RULES:
- Never say "wrong" or "incorrect" — echo correct form naturally
- Never give generic praise — always specific
- Thai first, English second always
- Never overwhelm — one thing at a time
- Never discuss anything outside language and warm conversation

FORMAT:
- Thai sentence first
- English below
- No markdown, no asterisks, no bullet points
- Maximum 100 words total`;

export async function POST(req: NextRequest) {
  try {
    const { messages, isGuest, sessionInstruction } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Build dynamic system prompt
    // Base character prompt + this exchange's specific instruction
    const systemPrompt = sessionInstruction
      ? `${MIOMI_BASE_PROMPT}\n\n--- THIS EXCHANGE ---\n${sessionInstruction}`
      : MIOMI_BASE_PROMPT;

    const history = messages.slice(0, -1).map(
      (msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    );

    const lastMessage = messages[messages.length - 1];

    const chat = ai.chats.create({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 300,
        temperature: 0.85,
      },
      history,
    });

    const response = await chat.sendMessage({
      message: lastMessage.content,
    });

    const text = response.text;

    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    
    // Strip all markdown Gemini insists on adding
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/`(.*?)`/g, "$1")
      .trim();
    
    return NextResponse.json({ content: cleaned });

  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error("Miomi API error:", {
      message: err?.message,
      status: err?.status,
    });

    // Never show a broken experience — use failover from library
    const failover = getFailoverResponse();
    return NextResponse.json(
      {
        content: `${failover.th}\n\n${failover.en}`,
        wasFailover: true,
      },
      { status: 200 } // 200 not 500 — user sees Miomi, not an error
    );
  }
}