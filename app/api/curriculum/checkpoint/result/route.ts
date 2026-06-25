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

function targetFor(profile: { ui_language?: string | null; learning_target_language?: string | null }) {
  const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
  return sanitizeTargetLanguage(uiLanguage, normalizeLearningTarget(profile.learning_target_language ?? null));
}

// GET — the learner's PASSED checkpoints, used to light up cleared dots on the path.
// Kept entirely separate from the placement-test history (level_checks) so the Tests tab stays clean.
export async function GET() {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ ok: false, passed: [] }, { status: 401 });
  try {
    const learningTarget = targetFor(profile);
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("checkpoint_results")
      .select("cefr_level, badge, passed")
      .eq("user_id", profile.id)
      .eq("learning_target", learningTarget)
      .eq("passed", true);
    if (error) throw error;
    const passed = (data ?? []).map((r) => ({ level: r.cefr_level as string, badge: r.badge as string }));
    return NextResponse.json({ ok: true, passed });
  } catch (err) {
    console.error("[checkpoint-result] read failed:", err);
    return NextResponse.json({ ok: true, passed: [] });
  }
}

// POST — record a checkpoint attempt. Pass is STICKY (once cleared it stays cleared); keeps the best score.
export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const body = (await req.json().catch(() => ({}))) as {
      level?: string;
      badge?: string;
      score?: number;
      total?: number;
      passed?: boolean;
    };
    const level = String(body?.level ?? "").trim().toUpperCase();
    const badge = String(body?.badge ?? "").trim();
    if (!VALID_LEVELS.includes(level) || !VALID_BADGES.includes(badge)) {
      return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 200 });
    }
    const score = Math.max(0, Math.floor(Number(body?.score ?? 0)));
    const total = Math.max(0, Math.floor(Number(body?.total ?? 0)));
    const passedIn = body?.passed === true;
    const learningTarget = targetFor(profile);
    const supabase = await createServiceClient();

    const { data: existing } = await supabase
      .from("checkpoint_results")
      .select("score, passed")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .eq("badge", badge)
      .maybeSingle();

    const mergedPassed = passedIn || existing?.passed === true;
    const mergedScore = Math.max(score, Number(existing?.score ?? 0));

    const { error } = await supabase.from("checkpoint_results").upsert(
      {
        user_id: profile.id,
        cefr_level: level,
        learning_target: learningTarget,
        badge,
        score: mergedScore,
        total,
        passed: mergedPassed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,cefr_level,learning_target,badge" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true, passed: mergedPassed });
  } catch (err) {
    console.error("[checkpoint-result] write failed:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 200 });
  }
}
