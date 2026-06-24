export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 60;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { buildLesson, type BuildLessonResult } from "@/lib/brain/lesson-builder";
import { withUsage, enableBudget } from "@/lib/usage/ledger";
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
  learning_target: string;
  status: string;
  position: number;
  words_count: number;
  phrases_count: number;
  has_checkpoint: boolean;
  progress: Record<string, unknown>;
  catalog_slug: string | null;
};

export async function GET() {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ lessons: [] });
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("lessons")
      .select(
        "id, title_en, title_th, topic, color, cefr_level, learning_target, status, position, content, progress, catalog_slug",
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
        learning_target: (row.learning_target as string) ?? "th",
        status: (row.status as string) ?? "planned",
        position: (row.position as number) ?? 0,
        words_count: Array.isArray(content.words) ? content.words.length : 0,
        phrases_count: Array.isArray(content.phrases) ? content.phrases.length : 0,
        has_checkpoint: Array.isArray(content.candos) && content.candos.length > 0,
        progress: (row.progress ?? {}) as Record<string, unknown>,
        catalog_slug: (row.catalog_slug as string | null) ?? null,
      };
    });
    let cefrLevel: string | null = null;
    try { cefrLevel = await loadCefrLevel(profile.id); } catch { cefrLevel = null; }
    return NextResponse.json({ lessons, cefrLevel });
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
  let levelAsk: string | null = null;
  let targetAsk: "th" | "en" | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as { topic?: string; level?: string; target?: string };
    topicAsk = String(body?.topic ?? "").trim() || null;
    const lv = String(body?.level ?? "").trim().toUpperCase();
    levelAsk = VALID_LEVELS.includes(lv) ? lv : null;
    const tg = String(body?.target ?? "").trim().toLowerCase();
    targetAsk = tg === "th" || tg === "en" ? (tg as "th" | "en") : null;
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
    // LEVEL ACCESS: a learner may plan at most one level above their own.
    const LADDER = ["A1", "A2", "B1", "B2", "C1"];
    const userRank = Math.max(0, LADDER.indexOf((levelFromCookie(req) ?? dbLevel ?? "A1").toUpperCase()));
    const askRank = levelAsk ? LADDER.indexOf(levelAsk) : -1;
    const clampedAsk = askRank >= 0 ? LADDER[Math.min(askRank, Math.min(userRank + 1, LADDER.length - 1))]! : null;
    const level = clampedAsk ?? levelFromCookie(req) ?? dbLevel ?? "A1";
    let knownWords: string[] = [];
    try {
      const supabase = await createServiceClient();
      const { data: prior } = await supabase
        .from("lessons")
        .select("content")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(12);
      for (const row of prior ?? []) {
        const ws = (row.content as { words?: Array<{ word_en?: string }> })?.words ?? [];
        for (const w of ws) if (w?.word_en) knownWords.push(w.word_en);
      }
      knownWords = [...new Set(knownWords)];
    } catch {
      knownWords = [];
    }
    // STANDARD COURSE: copy a pre-built, verified catalog lesson (zero LLM). Only a custom
    // topic, or a level whose catalog is not built yet, falls through to generation.
    const learning_target = targetAsk ?? learningTarget;
    let copied: BuildLessonResult | null = null;
    if (!topicAsk) {
      try {
        const supabase = await createServiceClient();
        const { data: mine } = await supabase
          .from("lessons")
          .select("catalog_slug")
          .eq("user_id", profile.id)
          .not("catalog_slug", "is", null);
        const taken = new Set((mine ?? []).map((r) => r.catalog_slug as string));
        const { data: cat } = await supabase
          .from("lesson_catalog")
          .select("slug, title_en, title_th, topic, color, cefr_level, learning_target, content")
          .eq("cefr_level", level)
          .eq("learning_target", learning_target)
          .order("position", { ascending: true });
        const next = (cat ?? []).find((c) => !taken.has(c.slug as string));
        if (next) {
          const { count } = await supabase
            .from("lessons")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);
          const { data: ins, error: insErr } = await supabase
            .from("lessons")
            .insert({
              user_id: profile.id,
              title_en: next.title_en,
              title_th: next.title_th ?? null,
              topic: next.topic,
              color: next.color,
              cefr_level: next.cefr_level,
              learning_target: next.learning_target,
              position: count ?? 0,
              status: "planned",
              content: next.content,
              progress: {},
              catalog_slug: next.slug,
            })
            .select("id")
            .single();
          if (!insErr && ins) {
            copied = { ok: true, lessonId: ins.id as string, title_en: String(next.title_en), topic: String(next.topic) };
          }
        }
      } catch (e) {
        console.error("[api/lessons] catalog copy failed, will generate:", e);
      }
    }
    const result =
      copied ??
      (await withUsage("lessons.create", profile.id, async () => {
        await enableBudget(profile.tier);
        return buildLesson({
          userId: profile.id,
          topicAsk,
          cefrLevel: level,
          learningTarget: learning_target,
          knownWords,
        });
      }));
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[api/lessons] generate failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
