import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  pickPhrase,
  RECOVERY_RETURN,
  CARE_EATEN,
  PRAISE_PROGRESS,
  type PhraseContext,
} from "@/lib/voice/warmth";

function opener(ctx: PhraseContext & { isNew: boolean; isReturning: boolean }) {
  const { isNew, isReturning, ...phraseCtx } = ctx;
  const vector = isNew ? CARE_EATEN : isReturning ? RECOVERY_RETURN : PRAISE_PROGRESS;
  return {
    th: pickPhrase(vector, { ...phraseCtx, lang: "th" }),
    en: pickPhrase(vector, { ...phraseCtx, lang: "en" }),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(opener({ isNew: true, isReturning: false, lang: "th" }));
    }

    const supabase = await createClient();

    const [sessionRes, profileRes] = await Promise.all([
      supabase
        .from("user_sessions")
        .select("started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("users")
        .select("journey_stage, gender, last_seen_at, welcome_shown_at")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;
    const stage = (profile?.journey_stage as PhraseContext["stage"]) ?? "unspecified";
    const gender = (profile?.gender as PhraseContext["gender"]) ?? "neutral";

    const isNew = !profile?.welcome_shown_at && !sessionRes.data;

    const hoursSinceLast = sessionRes.data?.started_at
      ? (Date.now() - new Date(sessionRes.data.started_at).getTime()) / (1000 * 60 * 60)
      : 999;
    const isReturning = hoursSinceLast > 24 * 3;

    return NextResponse.json(
      opener({ isNew, isReturning, lang: "th", stage, gender }),
    );
  } catch {
    return NextResponse.json(
      opener({ isNew: false, isReturning: false, lang: "th" }),
    );
  }
}
