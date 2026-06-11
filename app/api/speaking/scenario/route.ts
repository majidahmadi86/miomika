export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { callGeminiJson, callGroqJson } from "@/lib/brain/word-content";
import { buildExtraPhrases } from "@/lib/brain/lesson-builder";
import { loadCefrLevel } from "@/lib/vocab/user-state-read";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";

const LEVEL_COOKIE = "miomika.teach_level";
const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
// CONFIDENT SPEAKING: the FIRST scenario of every course is free — the demo.
const FREE_SCENARIOS_PER_COURSE = 1;

type Scenario = {
  position: number;
  title_en: string;
  scene_en: string;
  goals: string[];
  phrases: Array<{ en: string; th: string; romanization: string | null }>;
  status: string;
};

type Course = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  scenario_titles: string[];
  scenarios: Scenario[];
};

function levelFromCookie(req: NextRequest): string | null {
  const v = req.cookies.get(LEVEL_COOKIE)?.value ?? "";
  return VALID_LEVELS.includes(v) ? v : null;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
  } catch {
    return null;
  }
}

async function callScene(
  level: string,
  targetName: string,
  courseTitle: string,
  scenarioTitle: string,
): Promise<{ scene_en: string; goals: string[] } | null> {
  const system = `You design one short warm roleplay scenario for a ${level} learner practicing spoken ${targetName} with Miomi, a charming cat companion who plays the other person. Reply STRICT JSON ONLY — no prose, no markdown fences — {"scene_en": 2-3 friendly English sentences setting the scene and naming the role Miomi plays (e.g. the vendor, the receptionist), "goals": EXACTLY 3 strings, each one small concrete thing the learner says OUT LOUD to complete the scene, starting with a verb (e.g. "Order one dish")}. Everyday, polite, ${level}-appropriate. JSON only.`;
  const user = `Course: ${courseTitle}. Scenario: ${scenarioTitle}.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const parsed = parseJson<{ scene_en?: string; goals?: string[] }>(raw);
    const scene = String(parsed?.scene_en ?? "").trim();
    const goals = (parsed?.goals ?? []).map((g) => String(g).trim()).filter(Boolean).slice(0, 3);
    if (scene && goals.length === 3) return { scene_en: scene, goals };
  }
  return null; // withhold over lie
}

export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      level?: string;
      course_position?: number;
      scenario_position?: number;
    };
    const coursePos = Number(body?.course_position ?? 0);
    const scenarioPos = Number(body?.scenario_position ?? 0);
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

    // PRO GATE: beyond the free demo scenario, Confident Speaking is Pro.
    if (scenarioPos > FREE_SCENARIOS_PER_COURSE) {
      const { data: tierRow } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", profile.id)
        .maybeSingle();
      const tier = String(tierRow?.tier ?? "free");
      if (tier !== "pro" && tier !== "pro_max") {
        return NextResponse.json({ ok: false, reason: "pro_required" }, { status: 200 });
      }
    }

    const { data: row, error: rowErr } = await supabase
      .from("speaking_courses")
      .select("id, plan, progress")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) return NextResponse.json({ ok: false, reason: "no_plan" }, { status: 200 });

    const plan = (row.plan ?? {}) as { courses?: Course[] };
    const courses = Array.isArray(plan.courses) ? plan.courses : [];
    const course = courses.find((c) => c.position === coursePos);
    if (!course) return NextResponse.json({ ok: false, reason: "no_course" }, { status: 200 });

    const builtCount = (course.scenarios ?? []).length;
    if (scenarioPos !== builtCount + 1) {
      // Scenarios build in order within a course — the path is the promise.
      const already = (course.scenarios ?? []).find((s) => s.position === scenarioPos);
      if (already) return NextResponse.json({ ok: true, existing: true }, { status: 200 });
      return NextResponse.json({ ok: false, reason: "locked_scenario" }, { status: 200 });
    }
    const title = (course.scenario_titles ?? [])[builtCount];
    if (!title) return NextResponse.json({ ok: false, reason: "course_built" }, { status: 200 });

    const targetName = learningTarget === "en" ? "English" : "Thai";
    const scene = await callScene(level, targetName, course.title_en, title);
    if (!scene) return NextResponse.json({ ok: false, reason: "content_incomplete" }, { status: 200 });

    // Helper phrases pass the SAME accuracy gate as lessons.
    const phrases = await buildExtraPhrases({
      topic: `${course.title_en} — ${title}`,
      cefrLevel: level,
      learningTarget,
      exclude: [],
      count: 3,
    });
    if (phrases.length < 2) {
      return NextResponse.json({ ok: false, reason: "content_incomplete" }, { status: 200 });
    }

    const scenario: Scenario = {
      position: builtCount + 1,
      title_en: title,
      scene_en: scene.scene_en,
      goals: scene.goals,
      phrases,
      status: "ready",
    };
    course.scenarios = [...(course.scenarios ?? []), scenario];
    const { error: upErr } = await supabase
      .from("speaking_courses")
      .update({ plan: { ...plan, courses }, status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) {
      console.error("[api/speaking/scenario] plan update failed:", upErr.message);
      return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
    }
    return NextResponse.json({ ok: true, course_position: coursePos, scenario_position: scenario.position }, { status: 200 });
  } catch (err) {
    console.error("[api/speaking/scenario] failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
