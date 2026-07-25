import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * A correct pronunciation IS a demonstration of knowing a word — so a passed
 * SayItCheck advances mastery through the SAME spiral as reusing it in
 * conversation (advance_word_mastery: +1 level, caps at 3, stamps mastered_at
 * at 3). This is the link the dashboard was missing: practice in Learn/cards
 * now moves the needle, not just conversation reuse. (7/19)
 */
export async function POST(req: Request): Promise<Response> {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ ok: false }, { status: 401 });

  let wordEn: string | null = null;
  let direction = "th_to_en";
  try {
    const body = (await req.json()) as { wordEn?: unknown; direction?: unknown };
    if (typeof body.wordEn === "string" && body.wordEn.trim()) wordEn = body.wordEn.trim();
    if (body.direction === "en_to_th") direction = "en_to_th";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!wordEn) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const supabase = await createServiceClient();

    // PHRASE-FIRST: room phrases live in phrase_user_state (self-contained,
    // keyed by the same English gloss SayItCheck posts). If this "word" is one
    // of the member's room phrases, advance ITS spiral (same semantics as the
    // word RPC: +1 level, mastered at 3, next review 1d/3d/7d) and stop —
    // never feed a multi-word phrase into the word RPC.
    const { data: phraseRow } = await supabase
      .from("phrase_user_state")
      .select("id, mastery_level")
      .eq("user_id", profile.id)
      .eq("phrase_en", wordEn)
      .limit(1)
      .maybeSingle();
    if (phraseRow) {
      const level = Math.min(3, ((phraseRow.mastery_level as number) ?? 0) + 1);
      const days = level >= 3 ? 0 : level === 2 ? 7 : level === 1 ? 3 : 1;
      const { error: phraseErr } = await supabase
        .from("phrase_user_state")
        .update({
          mastery_level: level,
          next_spiral_at: new Date(Date.now() + days * 86_400_000).toISOString(),
          mastered_at: level >= 3 ? new Date().toISOString() : null,
        })
        .eq("id", phraseRow.id);
      if (phraseErr) {
        console.error("[vocab/practiced] phrase advance failed:", phraseErr.message);
        return NextResponse.json({ ok: false }, { status: 200 });
      }
      return NextResponse.json({ ok: true, phrase: true, mastered: level >= 3 });
    }

    const { data, error } = await supabase.rpc("advance_word_mastery", {
      p_user_id: profile.id,
      p_word_en: wordEn,
      p_direction: direction,
    });
    if (error) {
      console.error("[vocab/practiced] advance failed:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true, masteryLevel: data ?? null });
  } catch (err) {
    console.error("[vocab/practiced] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
