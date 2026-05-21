/**
 * Supabase-backed library matcher. The route handler at /api/miomi uses this
 * to look up `library_entries` rows and decide whether to serve from the
 * library (zero AI cost) or fall through to an AI call.
 *
 * This file used to live at `lib/ai/matcher.ts`. Phase-2 §F1 consolidation
 * moved it to `lib/library/` next to its sibling, the in-code template
 * matcher (lib/library/matcher.ts). The intent classifier helpers that lived
 * here are now replaced by `lib/ai/intents.ts` (`classifyIntentAdvanced`).
 *
 * Exported `matchLibrary` (DB-backed) is renamed to `matchLibraryFromDB` to
 * disambiguate from the template `matchLibrary` in lib/library/matcher.ts.
 *
 * MIOMIKA.md §6.2.
 */

import { createClient } from "@/lib/supabase/server";

export type Intent =
  | "greeting"
  | "asking_help"
  | "asking_definition"
  | "asking_question"
  | "expressing_emotion_positive"
  | "expressing_emotion_negative"
  | "making_statement"
  | "using_target_word"
  | "confusion"
  | "agreement"
  | "off_topic"
  | "unclear";

export type LibraryMatch = {
  id: string;
  response_th: string;
  response_en: string;
  follow_up_question_th: string | null;
  follow_up_question_en: string | null;
  response_type: string;
  embedded_word: string | null;
  embedded_word_thai: string | null;
  ui_action: string | null;
  ui_payload: Record<string, unknown> | null;
  quality_score: number;
  match_confidence: number;
  matched_via: "exact" | "pattern" | "intent_only";
};

export type MatchResult =
  | { type: "library"; match: LibraryMatch }
  | { type: "ai"; reason: string; intent: Intent };

export type MatchContext = {
  estimatedLevel: string;
  sessionArc: string;
  exchangeNumber: number;
  currentTargetWord: string | null;
  emotionalMomentum: string;
};

// ─── LEGACY INTENT CLASSIFIER ────────────────────────────────────────────────
//
// Kept as a side-helper for callers that haven't migrated to the new
// classifyIntentAdvanced in lib/ai/intents.ts. New code should NOT use this.

export function classifyIntent(
  userInput: string,
  context: MatchContext,
): Intent {
  const raw = userInput.trim();
  const lower = raw.toLowerCase();
  const words = lower.split(/\s+/);

  if (
    context.currentTargetWord &&
    lower.includes(context.currentTargetWord.toLowerCase())
  ) {
    return "using_target_word";
  }

  if (
    /^(hi|hello|hey|good morning|good evening|good afternoon|good night|สวัสดี|หวัดดี|ดีจ้า|ดีครับ|ดีค่ะ)/.test(
      lower,
    )
  ) {
    return "greeting";
  }

  if (
    /^(what\?|huh|ห๊ะ|อะไรนะ|ไม่เข้าใจ|เข้าใจไม่ได้|don'?t understand|cant understand|confused)/.test(
      lower,
    ) ||
    lower === "?"
  ) {
    return "confusion";
  }

  if (/(what.*mean|แปลว่าอะไร|แปลว่า|meaning of|definition of|คืออะไร)/.test(lower)) {
    return "asking_definition";
  }

  if (
    /(help me|ช่วย|teach me|สอน|can you teach|อยากเรียน|want to learn|อยากเก่ง|how do i|how can i)/.test(
      lower,
    )
  ) {
    return "asking_help";
  }

  if (
    lower.endsWith("?") ||
    /^(what|where|when|why|how|who|which|is|are|do|does|can|could|would|should)/.test(
      lower,
    )
  ) {
    return "asking_question";
  }

  if (
    /(i'?m happy|i am happy|i feel good|great|wonderful|amazing|love it|ดีใจ|มีความสุข|ชอบมาก|สนุก|ตื่นเต้น|excited)/.test(
      lower,
    )
  ) {
    return "expressing_emotion_positive";
  }

  if (
    /(i'?m (sad|tired|scared|stressed|worried|bored)|i feel (bad|down)|เหนื่อย|เครียด|กลัว|เศร้า|ไม่สบาย|หงุดหงิด)/.test(
      lower,
    )
  ) {
    return "expressing_emotion_negative";
  }

  if (/^(yes|yeah|yep|ok|okay|sure|alright|ครับ|ค่ะ|ได้|โอเค|ใช่|เข้าใจ|i understand|i see|got it)/.test(lower)) {
    return "agreement";
  }

  if (
    /(your name|how old|are you (a|an|real|ai|bot|robot|human)|who made you|ใครสร้าง|ชื่ออะไร|อายุเท่าไหร่)/.test(
      lower,
    )
  ) {
    return "off_topic";
  }

  if (words.length <= 1 && !/[ก-๙]/.test(raw)) {
    return "unclear";
  }

  return "making_statement";
}

function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter((t) => t.length > 1));
  const tokensB = new Set(b.split(/\s+/).filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return overlap / union;
}

// ─── MAIN MATCHER ────────────────────────────────────────────────────────────

export async function matchLibraryFromDB(
  userInput: string,
  context: MatchContext,
): Promise<MatchResult> {
  const intent = classifyIntent(userInput, context);
  const normalized = normalizeInput(userInput);

  if (intent === "unclear" && context.exchangeNumber > 2) {
    return { type: "ai", reason: "unclear_input", intent };
  }

  try {
    const supabase = await createClient();

    const { data: candidates, error } = await supabase
      .from("library_entries")
      .select(
        `id, user_input_pattern, response_th, response_en,
         follow_up_question_th, follow_up_question_en,
         response_type, embedded_word, embedded_word_thai,
         ui_action, ui_payload, quality_score, source`,
      )
      .eq("status", "active")
      .eq("intent_category", intent)
      .in("estimated_level", [context.estimatedLevel, getAdjacentLevel(context.estimatedLevel)])
      .lte("exchange_number_min", context.exchangeNumber)
      .gte("exchange_number_max", context.exchangeNumber)
      .order("quality_score", { ascending: false })
      .limit(10);

    if (error || !candidates || candidates.length === 0) {
      return { type: "ai", reason: "no_candidates", intent };
    }

    const scored = candidates
      .map((entry) => {
        const patternSimilarity = tokenSimilarity(
          normalized,
          normalizeInput(entry.user_input_pattern),
        );
        const combined = patternSimilarity * 0.6 + entry.quality_score * 0.4;
        return { entry, patternSimilarity, combined };
      })
      .sort((a, b) => b.combined - a.combined);

    const top = scored[0];
    if (!top) {
      return { type: "ai", reason: "no_candidates", intent };
    }

    if (top.patternSimilarity > 0.6 && top.entry.quality_score > 0.4) {
      return {
        type: "library",
        match: {
          ...top.entry,
          ui_payload: top.entry.ui_payload as Record<string, unknown> | null,
          match_confidence: top.combined,
          matched_via: top.patternSimilarity > 0.8 ? "exact" : "pattern",
        },
      };
    }

    if (top.combined > 0.5 && top.entry.quality_score > 0.5) {
      return {
        type: "library",
        match: {
          ...top.entry,
          ui_payload: top.entry.ui_payload as Record<string, unknown> | null,
          match_confidence: top.combined,
          matched_via: "intent_only",
        },
      };
    }

    return { type: "ai", reason: "low_confidence", intent };
  } catch (err) {
    console.error("Matcher error:", err);
    return { type: "ai", reason: "matcher_error", intent };
  }
}

// ─── INTERACTION LOG ─────────────────────────────────────────────────────────

export async function logInteraction(params: {
  sessionId: string;
  exchangeNumber: number;
  userId: string | null;
  userInput: string;
  servedResponse: string;
  servedVia: string;
  libraryEntryId: string | null;
  matchConfidence: number | null;
  aiCostUsd: number;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("library_interactions").insert({
      session_id: params.sessionId,
      exchange_number: params.exchangeNumber,
      user_id: params.userId,
      user_input: params.userInput,
      served_response: params.servedResponse,
      served_via: params.servedVia,
      library_entry_id: params.libraryEntryId,
      match_confidence: params.matchConfidence,
      ai_cost_usd: params.aiCostUsd,
    });
  } catch (err) {
    console.error("Log interaction error:", err);
  }
}

export async function updateLibraryQuality(
  entryId: string,
  signal: "continued" | "engaged_positively" | "flagged",
) {
  try {
    const supabase = await createClient();
    const columnMap = {
      continued: "times_continued",
      engaged_positively: "times_user_engaged_positively",
      flagged: "times_flagged",
    };
    const column = columnMap[signal];
    await supabase.rpc("increment_library_signal", {
      entry_id: entryId,
      signal_column: column,
    });
  } catch (err) {
    console.error("Update library quality error:", err);
  }
}

function getAdjacentLevel(level: string): string {
  const levels = ["beginner", "elementary", "intermediate", "upper"];
  const idx = levels.indexOf(level);
  if (idx < levels.length - 1) return levels[idx + 1]!;
  return level;
}
