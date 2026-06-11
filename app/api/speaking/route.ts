export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { callGeminiJson, callGroqJson } from "@/lib/brain/word-content";
import { loadCefrLevel } from "@/lib/vocab/user-state-read";
import {
  normalizeLearningTarget,
  normalizeUiLanguage,
  sanitizeTargetLanguage,
} from "@/lib/brain/language";

const LEVEL_COOKIE = "miomika.teach_level";
const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const TOPIC_COLORS: Record<string, string> = {
  food: "peach",
  travel: "lavender",
  social: "pink",
  shopping: "mint",
  work: "teal",
  feelings: "coral",
};

export type SpeakingScenario = {
  position: number;
  title_en: string;
  scene_en: string;
  goals: string[];
  phrases: Array<{ en: string; th: string; romanization: string | null }>;
  status: string; // ready
};

export type SpeakingCourse = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  scenario_titles: string[];
  scenarios: SpeakingScenario[];
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

function clampLevel(req: NextRequest, dbLevel: string | null, ask: string | null): string {
  const userRank = Math.max(0, VALID_LEVELS.indexOf((levelFromCookie(req) ?? dbLevel ?? "A1").toUpperCase()));
  const askRank = ask && VALID_LEVELS.includes(ask) ? VALID_LEVELS.indexOf(ask) : -1;
  return askRank >= 0
    ? VALID_LEVELS[Math.min(askRank, Math.min(userRank + 1, VALID_LEVELS.length - 1))]!
    : VALID_LEVELS[userRank]!;
}

type PlanReply = { courses?: Array<{ title_en?: string; topic?: string; scenarios?: string[] }> };

function buildSpeakingSystem(level: string, targetName: string): string {
  return `You are a CEFR-expert speaking-course planner for learners of ${targetName} at level ${level} whose goal is CONFIDENT SPEAKING in real life. Reply STRICT JSON ONLY — no prose, no markdown fences — {"courses": EXACTLY 4 objects, each {"title_en": short course title naming a real-life speaking arena (e.g. "Eating out"), "topic": ONE lowercase English word (food, travel, social, shopping, work, feelings, general), "scenarios": EXACTLY 4 strings — concrete roleplay situations the learner acts out by SPEAKING, ordered from easiest to boldest (e.g. "Ordering street food")}}. Together the 4 courses must cover where a ${level} learner most needs to speak out loud, with no two courses sharing a topic. JSON only.`;
}

async function callSpeakingPlan(level: string, targetName: string): Promise<SpeakingCourse[] | null> {
  const system = buildSpeakingSystem(level, targetName);
  const user = "Plan the speaking courses now.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const plan = parseJson<PlanReply>(raw);
    const courses = Array.isArray(plan?.courses) ? plan.courses : [];
    if (courses.length < 4) continue;
    const cleaned: SpeakingCourse[] = [];
    for (let i = 0; i < 4; i++) {
      const c = courses[i];
      const title = String(c?.title_en ?? "").trim();
      const topic = String(c?.topic ?? "general").trim().toLowerCase() || "general";
      const scenarios = (c?.scenarios ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4);
      if (!title || scenarios.length < 4) break;
      cleaned.push({
        position: i + 1,
        title_en: title,
        topic,
        color: TOPIC_COLORS[topic] ?? "peach",
        scenario_titles: scenarios,
        scenarios: [],
      });
    }
    if (cleaned.length === 4) return cleaned;
  }
  return null; // withhold over a thin plan
}

export async function GET(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ speaking: null });
  try {
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const dbLevel = await loadCefrLevel(profile.id);
    const level = clampLevel(req, dbLevel, (req.nextUrl.searchParams.get("level") ?? "").trim().toUpperCase() || null);
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("speaking_courses")
      .select("id, cefr_level, learning_target, status, plan, progress")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ speaking: data ?? null, level, learningTarget });
  } catch (err) {
    console.error("[api/speaking] read failed:", err);
    return NextResponse.json({ speaking: null });
  }
}

export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { level?: string };
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const dbLevel = await loadCefrLevel(profile.id);
    const level = clampLevel(req, dbLevel, String(body?.level ?? "").trim().toUpperCase() || null);

    const supabase = await createServiceClient();
    const { data: existing } = await supabase
      .from("speaking_courses")
      .select("id")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, existing: true, speakingId: existing.id });
    }

    const targetName = learningTarget === "en" ? "English" : "Thai";
    const courses = await callSpeakingPlan(level, targetName);
    if (!courses) return NextResponse.json({ ok: false, reason: "plan_failed" }, { status: 200 });

    const { data, error } = await supabase
      .from("speaking_courses")
      .insert({
        user_id: profile.id,
        cefr_level: level,
        learning_target: learningTarget,
        status: "planned",
        plan: { courses },
        progress: { current_course: 1 },
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[api/speaking] insert failed:", error?.message);
      return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
    }
    return NextResponse.json({ ok: true, existing: false, speakingId: data.id as string });
  } catch (err) {
    console.error("[api/speaking] generate failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
