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

type PlanUnit = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  lesson_titles: string[];
  lesson_ids: string[];
  status: string;
};

function levelFromCookie(req: NextRequest): string | null {
  const v = req.cookies.get(LEVEL_COOKIE)?.value ?? "";
  return VALID_LEVELS.includes(v) ? v : null;
}

// Builds the NEXT lesson of the FIRST open unit — and only that one.
// CONSERVE THE KEY: one lesson per call, server-gated, never a future unit.
export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { level?: string; unit_position?: number };
    const askedUnit = Number(body?.unit_position ?? 0);
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const dbLevel = await loadCefrLevel(profile.id);
    const userRank = Math.max(0, VALID_LEVELS.indexOf((levelFromCookie(req) ?? dbLevel ?? "A1").toUpperCase()));
    const lvAsk = String(body?.level ?? "").trim().toUpperCase();
    const askRank = VALID_LEVELS.includes(lvAsk) ? VALID_LEVELS.indexOf(lvAsk) : -1;
    const level =
      askRank >= 0
        ? VALID_LEVELS[Math.min(askRank, Math.min(userRank + 1, VALID_LEVELS.length - 1))]!
        : VALID_LEVELS[userRank]!;

    const supabase = await createServiceClient();
    const { data: cur, error: curErr } = await supabase
      .from("curricula")
      .select("id, plan, progress, status")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .maybeSingle();
    if (curErr) throw curErr;
    if (!cur) return NextResponse.json({ ok: false, reason: "no_curriculum" }, { status: 200 });

    const plan = (cur.plan ?? {}) as { units?: PlanUnit[]; checkpoints?: unknown[] };
    const units = Array.isArray(plan.units) ? plan.units : [];
    if (!units.length) return NextResponse.json({ ok: false, reason: "no_curriculum" }, { status: 200 });

    // Resolve completion from the lessons themselves — the lessons are the truth.
    const allIds = units.flatMap((u) => (Array.isArray(u.lesson_ids) ? u.lesson_ids : []));
    const statusById = new Map<string, string>();
    if (allIds.length) {
      const { data: rows } = await supabase
        .from("lessons")
        .select("id, status")
        .in("id", allIds);
      for (const r of rows ?? []) statusById.set(r.id as string, (r.status as string) ?? "planned");
    }
    const unitComplete = (u: PlanUnit): boolean =>
      (u.lesson_ids ?? []).length >= 4 &&
      (u.lesson_ids ?? []).every((id) => statusById.get(id) === "completed");
    const firstOpen = units.find((u) => !unitComplete(u))?.position ?? 0;
    if (!firstOpen) return NextResponse.json({ ok: false, reason: "level_complete" }, { status: 200 });
    if (askedUnit !== firstOpen) {
      return NextResponse.json({ ok: false, reason: "locked_unit" }, { status: 200 });
    }

    const unit = units.find((u) => u.position === firstOpen)!;
    const builtCount = (unit.lesson_ids ?? []).length;
    const nextTitle = (unit.lesson_titles ?? [])[builtCount];
    if (!nextTitle) return NextResponse.json({ ok: false, reason: "unit_built" }, { status: 200 });

    let knownWords: string[] = [];
    try {
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

    const result = await buildLesson({
      userId: profile.id,
      topicAsk: `${unit.title_en} — ${nextTitle}`,
      cefrLevel: level,
      learningTarget,
      knownWords,
    });
    if (!result.ok) return NextResponse.json(result, { status: 200 });

    unit.lesson_ids = [...(unit.lesson_ids ?? []), result.lessonId];
    unit.status = "in_progress";
    const progress = (cur.progress ?? {}) as Record<string, unknown>;
    progress.current_unit = firstOpen;
    const { error: upErr } = await supabase
      .from("curricula")
      .update({ plan: { ...plan, units }, progress, status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", cur.id);
    if (upErr) {
      console.error("[api/curriculum/lesson] plan update failed:", upErr.message);
      // The lesson exists; the plan link failed. Surface it honestly.
      return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
    }
    return NextResponse.json({ ok: true, lessonId: result.lessonId }, { status: 200 });
  } catch (err) {
    console.error("[api/curriculum/lesson] failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
