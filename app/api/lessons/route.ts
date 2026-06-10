export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 60;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { buildLesson } from "@/lib/brain/lesson-builder";
import { loadCefrLevel } from "@/lib/vocab/user-state-read";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";

const LEVEL_COOKIE = "miomika.teach_level";
const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
function levelFromCookie(req: NextRequest): string | null {
  const v = req.cookies.get(LEVEL_COOKIE)?.value ?? "";
  return VALID_LEVELS.includes(v) ? v : null;
}

export type LessonListItem = {
  id: string;
  title_en: string;
  title_th: string | null;
  topic: string;
  color: string;
  cefr_level: string;
  status: string;
  position: number;
  words_count: number;
  phrases_count: number;
  has_checkpoint: boolean;
  progress: Record<string, unknown>;
};

export async function GET() {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ lessons: [] });
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("lessons")
      .select(
        "id, title_en, title_th, topic, color, cefr_level, status, position, content, progress",
      )
      .eq("user_id", profile.id)
      .order("position", { ascending: true });
    if (error) throw error;
    const lessons: LessonListItem[] = (data ?? []).map((row) => {
      const content = (row.content ?? {}) as {
        words?: unknown[];
        phrases?: unknown[];
        candos?: unknown[];
      };
      return {
        id: row.id as string,
        title_en: (row.title_en as string) ?? "",
        title_th: (row.title_th as string | null) ?? null,
        topic: (row.topic as string) ?? "general",
        color: (row.color as string) ?? "peach",
        cefr_level: (row.cefr_level as string) ?? "A1",
        status: (row.status as string) ?? "planned",
        position: (row.position as number) ?? 0,
        words_count: Array.isArray(content.words) ? content.words.length : 0,
        phrases_count: Array.isArray(content.phrases) ? content.phrases.length : 0,
        has_checkpoint: Array.isArray(content.candos) && content.candos.length > 0,
        progress: (row.progress ?? {}) as Record<string, unknown>,
      };
    });
    return NextResponse.json({ lessons });
  } catch (err) {
    console.error("[api/lessons] list failed:", err);
    return NextResponse.json({ lessons: [] });
  }
}

export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  let topicAsk: string | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as { topic?: string };
    topicAsk = String(body?.topic ?? "").trim() || null;
  } catch {
    topicAsk = null;
  }
  try {
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const dbLevel = await loadCefrLevel(profile.id);
    const level = levelFromCookie(req) ?? dbLevel ?? "A1";
    const result = await buildLesson({
      userId: profile.id,
      topicAsk,
      cefrLevel: level,
      learningTarget,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[api/lessons] generate failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
