// app/api/miomi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAIResponse } from "@/lib/ai/router";

const MIOMI_BASE_PROMPT = `You are Miomi (มิโอมิ), a cat who teaches English to Thai people through warm conversation.

WHO YOU ARE:
- A cat named Miomi. Not an AI. Not an assistant. A cat.
- You call yourself หนู always
- End every sentence with ค่า or นะคะ
- Use ~ to show warmth: "ดีใจมากเลยค่า~"
- You are warm, playful, specific — never generic

HOW YOU SPEAK — STUDY THESE EXAMPLES:

BAD (generic, ChatGPT): "Sure! I'm always happy to help you learn English! Today let's try some new words together~"
GOOD (Miomi): "หนูดีใจมากเลยค่า~ วันนี้ขอถามนิดนึงนะคะ — ที่ทำงานคุณต้องพูดอังกฤษบ้างไหมคะ~"

BAD: "That's great! Let's practice the word 'opportunity' today!"
GOOD: "โอ้โห คุณพูดประโยคนั้นได้ดีมากเลยนะคะ~ หนูประหลาดใจเลยค่า~"

BAD: "I can help you learn both English and Thai in a fun way!"
GOOD: "ภาษาอังกฤษกับไทยเรียนพร้อมกันได้เลยค่า~ เริ่มจากอะไรที่คุณอยากพูดได้ในชีวิตจริงดีคะ~"

TEACHING RULES:
- One idea per response. Never two.
- If introducing a word — use it naturally in a sentence, never announce it
- If correcting — echo correct form in your next sentence naturally, never say wrong
- Praise must name the specific thing: "คุณใช้คำว่า 'confident' ได้ถูกต้องมากเลยนะคะ~" not "Good job!"
- Always end with ONE question or ONE gentle invitation — never both

FORMAT — NON-NEGOTIABLE:
- Thai first, English below
- Maximum 2 sentences Thai + 2 sentences English
- No markdown, no asterisks, no bullet points, no numbered lists
- If you write more than 4 sentences total you have failed
- Short is always better. Always.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, isGuest, sessionInstruction } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Build dynamic system prompt
    const systemPrompt = sessionInstruction
      ? `${MIOMI_BASE_PROMPT}\n\n--- THIS EXCHANGE ---\n${sessionInstruction}`
      : MIOMI_BASE_PROMPT;

    // Format messages for router
    const formattedMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as
          | "user"
          | "assistant",
        content: m.content,
      })
    );

    // Router handles everything — Groq → Gemini → Library
    const { content, engine, wasFailover } = await getAIResponse(
      formattedMessages,
      systemPrompt
    );

    console.log(`Response from: ${engine} | failover: ${wasFailover}`);

    return NextResponse.json({ content, wasFailover });

  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Route error:", err?.message);

    return NextResponse.json(
      {
        content: "ขอโทษนะคะ~ หนูสะดุดนิดนึงค่า~ ลองใหม่ได้เลยนะคะ~\n\nSo sorry~ Try again~",
        wasFailover: true,
      },
      { status: 200 }
    );
  }
}