export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { buildLevelCheck } from "@/lib/brain/test-builder";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";

// Generates a model-built, accuracy-gated level check (vocab recognition, climbing
// A1→B2). The UI scores it and anchors the learner's CEFR. Questions are generated
// AT LEVEL — never limited to a fixed bank.
export async function POST() {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, reason: "signin_required" },
      { status: 401 },
    );
  }
  try {
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const targetName = learningTarget === "th" ? "Thai" : "English";
    const { questions } = await buildLevelCheck({ learningTarget, targetName });
    if (!questions.length) {
      return NextResponse.json(
        { ok: false, reason: "gen_failed" },
        { status: 200 },
      );
    }
    return NextResponse.json({ ok: true, questions, learningTarget });
  } catch (err) {
    console.error("[test] level-check failed:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 200 });
  }
}
