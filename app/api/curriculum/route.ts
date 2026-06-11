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

// Mirrors lesson-builder's topic palette (module-private there; tiny copy here).
const TOPIC_COLORS: Record<string, string> = {
  food: "peach",
  travel: "lavender",
  social: "pink",
  shopping: "mint",
  work: "teal",
  feelings: "coral",
};

export type CurriculumUnit = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  lesson_titles: string[];
  lesson_ids: string[];
  status: string; // planned | in_progress | completed
};

export type CurriculumCheckpoint = {
  badge: string;
  after_unit: number;
  kind: "checkpoint" | "level_test";
};

// LEVEL CHECKPOINTS: ก/ข/ค after units 2/4/6; ง is the level test. Deterministic.
const CHECKPOINTS: CurriculumCheckpoint[] = [
  { badge: "ก", after_unit: 2, kind: "checkpoint" },
  { badge: "ข", after_unit: 4, kind: "checkpoint" },
  { badge: "ค", after_unit: 6, kind: "checkpoint" },
  { badge: "ง", after_unit: 8, kind: "level_test" },
];

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

type PlanReply = { units?: Array<{ title_en?: string; topic?: string; lessons?: string[] }> };

function buildCurriculumSystem(level: string, targetName: string): string {
  const rank = Math.max(0, VALID_LEVELS.indexOf(level.toUpperCase()));
  const rigor =
    rank >= 2
      ? ` THIS IS A ${level} CURRICULUM: units must move beyond survival situations into abstract, social, and professional ground typical of ${level}.`
      : "";
  return `You are a CEFR-expert curriculum planner for learners of ${targetName} at level ${level}. Reply STRICT JSON ONLY — no prose, no markdown fences — {"units": EXACTLY 8 objects, each {"title_en": short inviting unit title, "topic": ONE lowercase English word (food, travel, social, shopping, work, feelings, general), "lessons": EXACTLY 4 strings — short lesson titles that step through the unit from first contact to confident use}}. The 8 units together must cover the core situations a ${level} learner needs, ordered from most immediately useful to most ambitious, with no two consecutive units sharing a topic.${rigor} JSON only.`;
}

async function callCurriculumPlan(level: string, targetName: string): Promise<CurriculumUnit[] | null> {
  const system = buildCurriculumSystem(level, targetName);
  const user = "Plan the curriculum now.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = attempt === 0 ? await callGroqJson(system, user) : await callGeminiJson(system, user);
    const plan = parseJson<PlanReply>(raw);
    const units = Array.isArray(plan?.units) ? plan.units : [];
    if (units.length < 8) continue;
    const cleaned: CurriculumUnit[] = [];
    for (let i = 0; i < 8; i++) {
      const u = units[i];
      const title = String(u?.title_en ?? "").trim();
      const topic = String(u?.topic ?? "general").trim().toLowerCase() || "general";
      const lessons = (u?.lessons ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 4);
      if (!title || lessons.length < 4) break;
      cleaned.push({
        position: i + 1,
        title_en: title,
        topic,
        color: TOPIC_COLORS[topic] ?? "peach",
        lesson_titles: lessons,
        lesson_ids: [],
        status: "planned",
      });
    }
    if (cleaned.length === 8) return cleaned;
  }
  return null; // withhold over a thin plan
}

export async function GET(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ curriculum: null });
  try {
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const dbLevel = await loadCefrLevel(profile.id);
    // LEVEL ACCESS: viewing too is clamped to own level +1.
    const userRank = Math.max(0, VALID_LEVELS.indexOf((levelFromCookie(req) ?? dbLevel ?? "A1").toUpperCase()));
    const lvAsk = (req.nextUrl.searchParams.get("level") ?? "").trim().toUpperCase();
    const askRank = VALID_LEVELS.includes(lvAsk) ? VALID_LEVELS.indexOf(lvAsk) : -1;
    const level =
      askRank >= 0
        ? VALID_LEVELS[Math.min(askRank, Math.min(userRank + 1, VALID_LEVELS.length - 1))]!
        : VALID_LEVELS[Math.max(0, userRank)]!;
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("curricula")
      .select("id, cefr_level, learning_target, status, plan, progress")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ curriculum: data ?? null, level, learningTarget });
  } catch (err) {
    console.error("[api/curriculum] read failed:", err);
    return NextResponse.json({ curriculum: null });
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
    // LEVEL ACCESS: plan at most one level above the learner's own (server clamp).
    const userRank = Math.max(0, VALID_LEVELS.indexOf((levelFromCookie(req) ?? dbLevel ?? "A1").toUpperCase()));
    const lvAsk = String(body?.level ?? "").trim().toUpperCase();
    const askRank = VALID_LEVELS.includes(lvAsk) ? VALID_LEVELS.indexOf(lvAsk) : -1;
    const level =
      askRank >= 0
        ? VALID_LEVELS[Math.min(askRank, Math.min(userRank + 1, VALID_LEVELS.length - 1))]!
        : VALID_LEVELS[userRank]!;

    const supabase = await createServiceClient();
    const { data: existing } = await supabase
      .from("curricula")
      .select("id")
      .eq("user_id", profile.id)
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .maybeSingle();
    if (existing) {
      // A planned journey is a promise — never silently regenerated.
      return NextResponse.json({ ok: true, existing: true, curriculumId: existing.id });
    }

    const targetName = learningTarget === "en" ? "English" : "Thai";
    const units = await callCurriculumPlan(level, targetName);
    if (!units) return NextResponse.json({ ok: false, reason: "plan_failed" }, { status: 200 });

    const { data, error } = await supabase
      .from("curricula")
      .insert({
        user_id: profile.id,
        cefr_level: level,
        learning_target: learningTarget,
        status: "planned",
        plan: { units, checkpoints: CHECKPOINTS },
        progress: { current_unit: 1 },
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[api/curriculum] insert failed:", error?.message);
      return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
    }
    return NextResponse.json({ ok: true, existing: false, curriculumId: data.id as string });
  } catch (err) {
    console.error("[api/curriculum] generate failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
