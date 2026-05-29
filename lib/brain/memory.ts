// SERVER ONLY. Conversation memory writes and reads for the brain context engine.

import { createServiceClient } from "@/lib/supabase/service";

export async function saveExchange(params: {
  userId: string | null;
  sessionId: string;
  exchangeNumber: number;
  role: "user" | "miomi";
  content: string;
  language?: string | null;
  move?: string | null;
  emotionalSignal?: string | null;
  intent?: string | null;
  usedTargetWord?: boolean;
  aiCostUsd?: number;
}): Promise<void> {
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("conversations").insert({
      user_id: params.userId,
      session_id: params.sessionId,
      exchange_number: params.exchangeNumber,
      role: params.role,
      content: params.content,
      language: params.language ?? null,
      move: params.move ?? null,
      emotional_signal: params.emotionalSignal ?? null,
      intent: params.intent ?? null,
      used_target_word: params.usedTargetWord ?? false,
      ai_cost_usd: params.aiCostUsd ?? 0,
    });
    if (error) {
      console.error(
        "[memory.saveExchange] insert failed:",
        error.message,
        error.details,
      );
    }
  } catch (err) {
    console.error("[memory.saveExchange] insert failed:", err);
  }
}

export async function getRecentExchanges(
  userId: string | null,
  limit: number = 10,
): Promise<Array<{ role: string; content: string; created_at: string }>> {
  if (!userId) {
    return [];
  }

  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        "[memory.getRecentExchanges] select failed:",
        error.message,
        error.details,
      );
      return [];
    }

    return (data ?? []).slice().reverse();
  } catch (err) {
    console.error("[memory.getRecentExchanges] select failed:", err);
    return [];
  }
}
