// app/api/miomi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAIResponse } from "@/lib/ai/router";
import { matchLibrary, logInteraction, type MatchContext } from "@/lib/ai/matcher";

const MIOMI_BASE_PROMPT = `You are Miomi (มิโอมิ), a cat who teaches English to Thai people through warm conversation.

WHO YOU ARE:
- A cat named Miomi. Not an AI. Not an assistant. A cat.
- You call yourself หนู always
- End every sentence with ค่า or นะคะ
- Use ~ to show warmth: "ดีใจมากเลยค่า~"
- You are warm, playful, specific — never generic

HOW YOU SPEAK — STUDY THESE EXAMPLES:

BAD: "Sure! I am always happy to help you learn English!"
GOOD: "หนูดีใจมากเลยค่า~ วันนี้ขอถามนิดนึงนะคะ — ที่ทำงานคุณต้องพูดอังกฤษบ้างไหมคะ~"

BAD: "That is great! Let us practice the word opportunity today!"
GOOD: "โอ้โห คุณพูดประโยคนั้นได้ดีมากเลยนะคะ~ หนูประหลาดใจเลยค่า~"

TEACHING RULES:
- One idea per response. Never two.
- Echo correct form naturally — never say wrong
- Praise must name the specific thing — never generic
- Always end with ONE question or ONE gentle invitation

FORMAT — NON-NEGOTIABLE:
- Thai first, English below
- Maximum 2 sentences Thai + 2 sentences English
- No markdown, no asterisks, no bullet points
- Short is always better. Always.`;

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      isGuest,
      sessionInstruction,
      sessionContext,
      sessionId,
      userId,
    } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage?.content ?? "";

    // ─── STEP 1: TRY LIBRARY FIRST ──────────────────────────────────────────
    // Zero cost. Fast. Gets smarter over time.

    const context: MatchContext = {
      estimatedLevel: sessionContext?.estimatedLevel ?? "elementary",
      sessionArc: sessionContext?.sessionArc ?? "opening",
      exchangeNumber: sessionContext?.exchangeNumber ?? 1,
      currentTargetWord: sessionContext?.currentTargetWord ?? null,
      emotionalMomentum: sessionContext?.emotionalMomentum ?? "neutral",
    };

    const matchResult = await matchLibrary(userInput, context);

    // ─── STEP 2: SERVE FROM LIBRARY ─────────────────────────────────────────
    if (matchResult.type === "library") {
      const { match } = matchResult;

      // Build full response
      const thPart = match.follow_up_question_th
        ? `${match.response_th}\n${match.follow_up_question_th}`
        : match.response_th;

      const enPart = match.follow_up_question_en
        ? `${match.response_en}\n${match.follow_up_question_en}`
        : match.response_en;

      const content = `${thPart}\n\n${enPart}`;

      // Log the interaction (non-blocking)
      void logInteraction({
        sessionId: sessionId ?? "guest",
        exchangeNumber: context.exchangeNumber,
        userId: userId ?? null,
        userInput,
        servedResponse: content,
        servedVia: `library_${match.matched_via}`,
        libraryEntryId: match.id,
        matchConfidence: match.match_confidence,
        aiCostUsd: 0,
      });

      // Update times_served (non-blocking)
      void updateTimesServed(match.id);

      console.log(
        `Library hit: ${match.matched_via} | confidence: ${match.match_confidence.toFixed(2)} | intent: matched`
      );

      return NextResponse.json({
        content,
        servedVia: "library",
        wasFailover: false,
        libraryEntryId: match.id,
        uiAction: match.ui_action,
        uiPayload: match.ui_payload,
        embeddedWord: match.embedded_word,
        embeddedWordThai: match.embedded_word_thai,
      });
    }

    // ─── STEP 3: CALL AI ────────────────────────────────────────────────────
    // Library missed — need real intelligence

    const systemPrompt = sessionInstruction
      ? `${MIOMI_BASE_PROMPT}\n\n--- THIS EXCHANGE ---\n${sessionInstruction}`
      : MIOMI_BASE_PROMPT;

    const formattedMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as
          | "user"
          | "assistant",
        content: m.content,
      })
    );

    const { content, engine, wasFailover } = await getAIResponse(
      formattedMessages,
      systemPrompt
    );

    // Log AI interaction (non-blocking)
    void logInteraction({
      sessionId: sessionId ?? "guest",
      exchangeNumber: context.exchangeNumber,
      userId: userId ?? null,
      userInput,
      servedResponse: content,
      servedVia: `ai_${engine}`,
      libraryEntryId: null,
      matchConfidence: null,
      aiCostUsd: engine === "groq" ? 0 : 0.0008,
    });

    console.log(
      `AI response: ${engine} | failover: ${wasFailover} | reason: ${matchResult.reason}`
    );

    return NextResponse.json({
      content,
      servedVia: `ai_${engine}`,
      wasFailover,
    });

  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Route error:", err?.message);

    return NextResponse.json(
      {
        content:
          "ขอโทษนะคะ~ หนูสะดุดนิดนึงค่า~ ลองใหม่ได้เลยนะคะ~\n\nSo sorry~ Try again~",
        wasFailover: true,
      },
      { status: 200 }
    );
  }
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

async function updateTimesServed(entryId: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase
      .from("library_entries")
      .update({
        times_served: supabase.rpc("increment_library_signal", {
          entry_id: entryId,
          signal_column: "times_served",
        }),
        last_served_at: new Date().toISOString(),
      })
      .eq("id", entryId);
  } catch (err) {
    console.error("Update times served error:", err);
  }
}