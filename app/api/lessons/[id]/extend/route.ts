export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 30;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { buildExtraWords, type LessonWordItem } from "@/lib/brain/lesson-builder";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  try {
    const { id } = await context.params;
    const supabase = await createServiceClient();
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("id, title_en, topic, cefr_level, learning_target, content")
      .eq("id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) throw error;
    if (!lesson) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    const content = (lesson.content ?? {}) as { words?: LessonWordItem[]; phrases?: unknown[]; candos?: unknown[] };
    const words = Array.isArray(content.words) ? content.words : [];
    if (words.length >= 12) return NextResponse.json({ ok: false, reason: "limit" });
    const exclude = words.map((w) => w.word_en).filter(Boolean);
    const target = lesson.learning_target === "en" ? "en" : "th";
    const extra = (
      await buildExtraWords({
        topic: (lesson.title_en as string) || (lesson.topic as string) || "everyday life",
        cefrLevel: (lesson.cefr_level as string) || "A1",
        learningTarget: target,
        exclude,
        count: 3,
      })
    ).filter((w) => !exclude.includes(w.word_en));
    if (!extra.length) return NextResponse.json({ ok: false, reason: "content_incomplete" });
    const newContent = { ...content, words: [...words, ...extra] };
    const { error: updErr } = await supabase
      .from("lessons")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", profile.id);
    if (updErr) throw updErr;
    return NextResponse.json({ ok: true, added: extra.length });
  } catch (err) {
    console.error("[api/lessons/extend] failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
