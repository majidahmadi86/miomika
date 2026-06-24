export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";

const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const VALID_BADGES = ["ก", "ข", "ค", "ง"];

// Serves a curated, ZERO-COST checkpoint (the ก/ข/ค/ง path tests). Copies the
// pre-authored questions from checkpoint_catalog — never calls an LLM. Returns an
// empty list (graceful) when no row exists yet, so the path keeps its placeholder.
export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { level?: string; badge?: string };
    const level = String(body?.level ?? "").trim().toUpperCase();
    const badge = String(body?.badge ?? "").trim();
    if (!VALID_LEVELS.includes(level) || !VALID_BADGES.includes(badge)) {
      return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 200 });
    }

    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("checkpoint_catalog")
      .select("badge, after_unit, kind, questions")
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .eq("badge", badge)
      .maybeSingle();

    if (error || !data || !Array.isArray(data.questions) || data.questions.length === 0) {
      return NextResponse.json({ ok: true, questions: [], kind: null, afterUnit: null, learningTarget });
    }

    return NextResponse.json({
      ok: true,
      questions: data.questions,
      kind: data.kind ?? "checkpoint",
      afterUnit: data.after_unit ?? null,
      learningTarget,
    });
  } catch (err) {
    console.error("[checkpoint] serve failed:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 200 });
  }
}
