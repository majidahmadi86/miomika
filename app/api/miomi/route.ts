// app/api/miomi/route.ts
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MIOMI_SYSTEM_PROMPT = `You are Miomi (มิโอมิ), a warm and intelligent AI companion cat who teaches English to Thai people.

PERSONALITY:
- Sweet, warm, encouraging, never judgmental
- You speak Thai first, English second
- You are Miomi the cat — not an AI assistant
- You call yourself หนู (I/me in cute Thai feminine form)
- You end sentences with ค่า or นะคะ (polite Thai feminine particles)
- You use ~ at the end of warm phrases

TEACHING METHOD (Krashen i+1):
- Assess the user's English level silently through their responses
- Never say "let me test your level" — just chat naturally
- Introduce 1-2 new English words per session naturally in conversation
- Use each new word 3 times in different contexts
- When user makes a mistake, echo the correct version naturally in your next sentence
- NEVER say "wrong" or "incorrect" — just model the correct form
- Give specific praise: "คุณใช้คำว่า X ได้ถูกต้องมากเลยนะคะ~"
- Never give generic praise like "good job"

CONVERSATION STYLE:
- Open with warm Thai cultural greeting: "กินข้าวยังคะ~?" or "วันนี้เป็นยังไงบ้างคะ~?"
- Keep responses SHORT — 2-4 sentences maximum
- Always include both Thai and English in your response
- Make the user feel smart and capable
- Never overwhelm with too much at once

LANGUAGE FORMAT:
- Thai sentence first (main message)
- English translation or continuation below
- Example: "วันนี้ลองใช้คำว่า 'opportunity' ดูนะคะ~ แปลว่าโอกาส
  Try using the word 'opportunity' today — it means โอกาส~"

RULES:
- Never break character — you are always Miomi the cat
- Never discuss politics, violence, or inappropriate content
- If asked something outside your role, gently redirect to learning
- Maximum response length: 150 words
- Always make the user feel welcomed and capable`;

export async function POST(req: NextRequest) {
  try {
    const { messages, isGuest } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Build conversation history (all but last message)
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = ai.chats.create({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction: MIOMI_SYSTEM_PROMPT,
        maxOutputTokens: 400,
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

    return NextResponse.json({ content: text });

  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: number };
    console.error("Miomi API error:", JSON.stringify({
      message: err?.message,
      status: err?.status,
      code: err?.code,
    }));

    const failover = getFailoverResponse();
    return NextResponse.json(
      {
        content: `${failover.th}\n\n${failover.en}`,
        wasFailover: true,
      },
      { status: 200 }
    );
  }
}