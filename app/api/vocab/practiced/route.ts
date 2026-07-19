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
