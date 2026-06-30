export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { withBudget } from "@/lib/usage/ledger";
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
// REGISTER LAW: gen-z and social-media voice are B1+ only — below that we
// clamp to everyday. Decent, level-gated, never slang-dumped on beginners.
const REGISTERS = ["polite", "everyday", "casual", "genz", "social"] as const;
const ADVANCED_REGISTERS = new Set(["genz", "social"]);
// CONFIDENT SPEAKING is a PAID feature — live Gemini sessions cost ~฿3/min, so
// free users get ZERO live sessions (they'd cost us with no revenue). All
// scenarios + custom (ESP) sessions are Pro-only; free users hit the paywall.
const FREE_SCENARIOS_PER_COURSE = 0;
const STAGE_IDS = ["warmup", "phrases", "activity", "practice", "assessment", "exit"] as const;
const ACTIVITY_LIBRARY =
  "roleplay, storytelling, debate (B1+ only), interview simulation, describe-and-guess, summarize-back, opinion round, register switch, shadowing, pronunciation drill, minimal pairs, tongue twisters";

type SessionStagePlan = { id: string; title: string; activity: string; guidance: string };
type SessionPlan = {
  scene: string;
  miomi_role: string;
  objectives: string[];
  stages: SessionStagePlan[];
  phrases: Array<{ en: string; th: string; romanization: string | null }>;
};

function levelFromCookie(req: NextRequest): string | null {
  const v = req.cookies.get(LEVEL_COOKIE)?.value ?? "";
  return VALID_LEVELS.includes(v) ? v : null;
}

function clampLevel(req: NextRequest, dbLevel: string | null, ask: string | null): string {
  const userRank = Math.max(0, VALID_LEVELS.indexOf((levelFromCookie(req) ?? dbLevel ?? "A1").toUpperCase()));
  const askRank = ask && VALID_LEVELS.includes(ask) ? VALID_LEVELS.indexOf(ask) : -1;
  return askRank >= 0
    ? VALID_LEVELS[Math.min(askRank, Math.min(userRank + 1, VALID_LEVELS.length - 1))]!
    : VALID_LEVELS[userRank]!;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "general";
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
  } catch {
    return null;
  }
}

type PlanReply = {
  title_en?: string;
  scene?: string;
  miomi_role?: string;
  objectives?: string[];
  stages?: Array<{ id?: string; title?: string; activity?: string; guidance?: string }>;
};

function buildSessionPlanSystem(level: string, targetName: string, register: string): string {
  const rank = Math.max(0, VALID_LEVELS.indexOf(level.toUpperCase()));
  const registerLine =
    register === "polite"
      ? "polite/formal — respectful particles and forms throughout"
      : register === "casual"
        ? "casual — relaxed everyday speech between friends"
        : register === "genz"
          ? "gen-z — current youthful speech, tasteful and decent, no crude slang"
          : register === "social"
            ? "social-media voice — energetic creator-style speech (YouTube/TikTok flavor), tasteful and decent"
            : "everyday — natural neutral speech";
  const debateNote = rank >= 2 ? "" : " Do NOT pick debate below B1.";
  return `You are a master Confident Speaking session designer for learners of spoken ${targetName} at CEFR ${level}. Reply STRICT JSON ONLY — no prose, no markdown fences — {"title_en": short inviting session title, "scene": 2-3 warm English sentences setting one concrete real-life scene, "miomi_role": the role Miomi (a charming cat tutor) plays in that scene — ALWAYS the counterpart, NEVER the learner's own role; the learner always plays the person who needs this language in real life (the patient at the doctor, the applicant in the interview, the customer in the shop) (e.g. "the doctor", "the interviewer", "the noodle stall vendor"), "objectives": EXACTLY 3 strings — small concrete things the learner SAYS OUT LOUD to earn each one, each starting with a verb, each strictly about the session topic, together covering the scene end to end, "stages": EXACTLY 6 objects in this exact id order ["warmup","phrases","activity","practice","assessment","exit"], each {"id", "title": short stage name, "activity": for warmup a 1-minute spoken icebreaker ABOUT the scene itself, gentle and personal — a feeling or experience question that builds confidence (job interview: nerves, a past interview, the dream role — NEVER an unrelated topic like food, NEVER a task demand); for phrases introducing the helper phrases in context; for activity ONE pick from [${ACTIVITY_LIBRARY}] that fits the scene${debateNote}; for practice a different pick focused on production or pronunciation; for assessment small real tasks covering the 3 objectives without feeling like a test; for exit ONE forward-looking question answered out loud with no help, "guidance": 1-2 sentences telling the tutor exactly how to run this stage at ${level}}}. REGISTER for the whole session: ${registerLine} — weave it into guidance; if the activity is "register switch", contrast this register with one other. Everything pitched precisely at ${level}: not below, not above. EVERY stage, objective, and example must stay strictly inside the session topic — no generic greetings drills, no unrelated vocabulary, no topic switches. JSON only.`;
}

async function generatePlan(
  level: string,
  targetName: string,
  topic: string,
  register: string,
): Promise<{ title_en: string; plan: Omit<SessionPlan, "phrases"> } | null> {
  const system = buildSessionPlanSystem(level, targetName, register);
  const user = `Design the session about: ${topic}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw =
      attempt === 0
        ? await callGroqJson(system, user, 2048)
        : await callGeminiJson(system, user, 2048);
    const parsed = parseJson<PlanReply>(raw);
    if (!parsed) {
      console.error(
        `[api/speaking/session] plan attempt ${attempt + 1}/3 unparseable (raw ${raw ? `${raw.length} chars` : "null"})`,
      );
      continue;
    }
    const title = String(parsed.title_en ?? "").trim();
    const scene = String(parsed.scene ?? "").trim();
    const role = String(parsed.miomi_role ?? "").trim();
    const objectives = (parsed.objectives ?? []).map((o) => String(o).trim()).filter(Boolean).slice(0, 3);
    const stagesRaw = Array.isArray(parsed.stages) ? parsed.stages : [];
    const stages: SessionStagePlan[] = [];
    for (let i = 0; i < STAGE_IDS.length; i++) {
      const s = stagesRaw[i];
      const stTitle = String(s?.title ?? "").trim();
      const stActivity = String(s?.activity ?? "").trim();
      const stGuidance = String(s?.guidance ?? "").trim();
      if (!stTitle || !stActivity || !stGuidance) break;
      stages.push({ id: STAGE_IDS[i]!, title: stTitle, activity: stActivity, guidance: stGuidance });
    }
    if (title && scene && role && objectives.length === 3 && stages.length === 6) {
      return { title_en: title, plan: { scene, miomi_role: role, objectives, stages } };
    }
    console.error(
      `[api/speaking/session] plan attempt ${attempt + 1}/3 invalid (objectives=${objectives.length}, stages=${stages.length})`,
    );
  }
  return null; // withhold over a thin session
}

async function userTier(supabase: Awaited<ReturnType<typeof createServiceClient>>, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("tier").eq("id", userId).maybeSingle();
  return String(data?.tier ?? "free");
}

export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      level?: string;
      topic?: string;
      register?: string;
      course_position?: number;
      scenario_position?: number;
    };
    const uiLanguage = normalizeUiLanguage(profile.ui_language ?? null);
    const learningTarget = sanitizeTargetLanguage(
      uiLanguage,
      normalizeLearningTarget(profile.learning_target_language),
    );
    const dbLevel = await loadCefrLevel(profile.id);
    const level = clampLevel(req, dbLevel, String(body?.level ?? "").trim().toUpperCase() || null);
    const levelRank = Math.max(0, VALID_LEVELS.indexOf(level));
    const supabase = await createServiceClient();

    // Resolve topic + gate.
    const coursePos = Number(body?.course_position ?? 0);
    const scenarioPos = Number(body?.scenario_position ?? 0);
    let topic = "";
    if (coursePos > 0 && scenarioPos > 0) {
      if (scenarioPos > FREE_SCENARIOS_PER_COURSE) {
        const tier = await userTier(supabase, profile.id);
        if (tier !== "pro" && tier !== "pro_max") {
          return NextResponse.json({ ok: false, reason: "pro_required" }, { status: 200 });
        }
      }
      const { data: spk } = await supabase
        .from("speaking_courses")
        .select("plan")
        .eq("user_id", profile.id)
        .eq("cefr_level", level)
        .eq("learning_target", learningTarget)
        .maybeSingle();
      const courses = ((spk?.plan ?? {}) as { courses?: Array<{ position: number; title_en: string; scenario_titles: string[] }> }).courses ?? [];
      const course = courses.find((c) => c.position === coursePos);
      const scenarioTitle = course?.scenario_titles?.[scenarioPos - 1];
      if (!course || !scenarioTitle) {
        return NextResponse.json({ ok: false, reason: "no_scenario" }, { status: 200 });
      }
      topic = `${course.title_en} — ${scenarioTitle}`;
    } else {
      // ESP LAW: custom sessions (interview prep, business meetings…) are Pro.
      topic = String(body?.topic ?? "").trim().slice(0, 120);
      if (!topic) return NextResponse.json({ ok: false, reason: "no_topic" }, { status: 200 });
      const tier = await userTier(supabase, profile.id);
      if (tier !== "pro" && tier !== "pro_max") {
        return NextResponse.json({ ok: false, reason: "pro_required" }, { status: 200 });
      }
    }

    // REGISTER LAW: validate + level-gate.
    let register = String(body?.register ?? "everyday").trim().toLowerCase();
    if (!(REGISTERS as readonly string[]).includes(register)) register = "everyday";
    if (ADVANCED_REGISTERS.has(register) && levelRank < 2) register = "everyday";

    // ──────────────────────────────────────────────────────────────────────
    // SESSION LIFECYCLE (all tiers, incl. pack buyers): a scenario is entered
    // ONCE. Re-entry resumes the same session or shows its summary — it never
    // re-runs a live session, because live minutes cost real money. New rooms
    // are capped by a monthly budget (Pro 1, Pro Max 3; free is blocked above).
    // ──────────────────────────────────────────────────────────────────────
    if (coursePos > 0 && scenarioPos > 0) {
      // Finished already? (goals_done >= 3, tracked on the course progress.)
      const { data: courseRow } = await supabase
        .from("speaking_courses")
        .select("progress")
        .eq("user_id", profile.id)
        .eq("cefr_level", level)
        .eq("learning_target", learningTarget)
        .maybeSingle();
      const completedMap =
        ((courseRow?.progress ?? {}) as {
          completed?: Record<string, { completed_at?: string | null }>;
        }).completed ?? {};
      const alreadyDone = !!completedMap[`${coursePos}-${scenarioPos}`]?.completed_at;

      // Newest session row for this exact scenario, if any.
      const { data: prior } = await supabase
        .from("speaking_sessions")
        .select("id, plan_snapshot")
        .eq("user_id", profile.id)
        .eq("course_position", coursePos)
        .eq("scenario_position", scenarioPos)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (alreadyDone) {
        // Summary-only: never re-run a finished scenario (no cost, all tiers).
        return NextResponse.json(
          { ok: true, completed: true, sessionId: (prior?.id as string) ?? null },
          { status: 200 },
        );
      }
      if (prior) {
        // In progress: resume the SAME session — no new row, no budget burn.
        const snap = (prior.plan_snapshot ?? {}) as {
          plan?: SessionPlan;
          title_en?: string;
          cefr_level?: string;
          learning_target?: string;
          register?: string;
        };
        if (snap.plan) {
          return NextResponse.json({
            ok: true,
            sessionId: prior.id as string,
            title_en: snap.title_en ?? topic,
            level: snap.cefr_level ?? level,
            learningTarget: snap.learning_target ?? learningTarget,
            register: snap.register ?? register,
            plan: snap.plan,
          });
        }
        // Snapshot missing (legacy row) → fall through and (re)create below.
      }
    }

    // New room → monthly allowance first (it refills), then a bought pack credit.
    {
      const allowance = profile.tier === "pro" ? 1 : profile.tier === "pro_max" ? 3 : 0;
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("speaking_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", monthStart.toISOString());

      if ((count ?? 0) >= allowance) {
        // Monthly allowance spent. Fall back to purchased room credits, if any.
        const { data: prof } = await supabase
          .from("profiles")
          .select("room_credits")
          .eq("id", profile.id)
          .maybeSingle();
        const credits = prof?.room_credits ?? 0;
        if (credits <= 0) {
          return NextResponse.json({ ok: false, reason: "rooms_limit" }, { status: 200 });
        }
        // Consume exactly one — guarded so it can't drop below zero under a race —
        // and record the spend. Only a brand-new room reaches here (resume returns
        // earlier), so an N-pack yields exactly N rooms.
        const { data: spent } = await supabase
          .from("profiles")
          .update({ room_credits: credits - 1 })
          .eq("id", profile.id)
          .eq("room_credits", credits)
          .select("id")
          .maybeSingle();
        if (!spent) {
          return NextResponse.json({ ok: false, reason: "rooms_limit" }, { status: 200 });
        }
        await supabase
          .from("room_credit_ledger")
          .insert({ user_id: profile.id, delta: -1, reason: "consume", ref: null });
      }
    }

    // SMART LIBRARY: bank-first, generate once, share with everyone.
    const slug = slugify(topic);
    let libraryId: string | null = null;
    let titleEn = "";
    let plan: SessionPlan | null = null;
    const { data: hit } = await supabase
      .from("session_library")
      .select("id, title_en, plan")
      .eq("cefr_level", level)
      .eq("learning_target", learningTarget)
      .eq("topic_slug", slug)
      .eq("register", register)
      .maybeSingle();
    if (hit) {
      libraryId = hit.id as string;
      titleEn = (hit.title_en as string) ?? topic;
      plan = (hit.plan as SessionPlan) ?? null;
    } else {
      const targetName = learningTarget === "en" ? "English" : "Thai";
      const generated = await withBudget("session.plan", profile.id, profile.tier, () =>
        generatePlan(level, targetName, topic, register),
      );
      if (!generated) return NextResponse.json({ ok: false, reason: "plan_failed" }, { status: 200 });
      // Helper phrases pass the SAME accuracy gate as lessons.
      let phrases = await withBudget("session.phrases", profile.id, profile.tier, () =>
        buildExtraPhrases({
          topic: `phrases a person actually says during: ${topic}`,
          cefrLevel: level,
          learningTarget,
          exclude: [],
          count: 5,
        }),
      );
      if (phrases.length < 3) {
        // One more honest attempt before giving up — entry must not feel flaky.
        const more = await withBudget("session.phrases", profile.id, profile.tier, () =>
          buildExtraPhrases({
            topic: `phrases a person actually says during: ${topic}`,
            cefrLevel: level,
            learningTarget,
            exclude: phrases.map((p) => p.en),
            count: 5,
          }),
        );
        phrases = [...phrases, ...more].slice(0, 5);
      }
      if (phrases.length < 4) {
        return NextResponse.json({ ok: false, reason: "content_incomplete" }, { status: 200 });
      }
      plan = { ...generated.plan, phrases };
      titleEn = generated.title_en;
      const { data: inserted, error: insErr } = await supabase
        .from("session_library")
        .insert({
          cefr_level: level,
          learning_target: learningTarget,
          topic_slug: slug,
          register,
          title_en: titleEn,
          plan,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        // Unique-key race: another request banked it first — reuse theirs.
        const { data: again } = await supabase
          .from("session_library")
          .select("id, title_en, plan")
          .eq("cefr_level", level)
          .eq("learning_target", learningTarget)
          .eq("topic_slug", slug)
          .eq("register", register)
          .maybeSingle();
        if (!again) {
          console.error("[api/speaking/session] library insert failed:", insErr?.message);
          return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
        }
        libraryId = again.id as string;
        titleEn = (again.title_en as string) ?? titleEn;
        plan = (again.plan as SessionPlan) ?? plan;
      } else {
        libraryId = inserted.id as string;
      }
    }
    if (!libraryId || !plan) return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });

    const { data: session, error: sesErr } = await supabase
      .from("speaking_sessions")
      .insert({
        user_id: profile.id,
        library_id: libraryId,
        course_position: coursePos > 0 ? coursePos : null,
        scenario_position: scenarioPos > 0 ? scenarioPos : null,
        status: "ready",
        results: {},
        plan_snapshot: {
          title_en: titleEn,
          cefr_level: level,
          learning_target: learningTarget,
          register,
          plan,
        },
      })
      .select("id")
      .single();
    if (sesErr || !session) {
      console.error("[api/speaking/session] session insert failed:", sesErr?.message);
      return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
    }
    return NextResponse.json({
      ok: true,
      sessionId: session.id as string,
      title_en: titleEn,
      level,
      learningTarget,
      register,
      plan,
    });
  } catch (err) {
    console.error("[api/speaking/session] failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ session: null, sessions: [] });
  try {
    const supabase = await createServiceClient();
    const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
    if (id) {
      // Re-entering a LIVE room (run=1) requires a current paid plan — a
      // downgraded account can't walk back into a room it opened while Pro.
      // (Plain summary views omit run=1 and stay open to every tier.)
      const forRun = req.nextUrl.searchParams.get("run") === "1";
      if (forRun && profile.tier !== "pro" && profile.tier !== "pro_max") {
        return NextResponse.json({ session: null, reason: "pro_required" });
      }
      const { data, error } = await supabase
        .from("speaking_sessions")
        .select("id, library_id, course_position, scenario_position, status, results, created_at, completed_at, plan_snapshot")
        .eq("id", id)
        .eq("user_id", profile.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ session: null });
      // Library if it still exists; otherwise the frozen snapshot — user
      // history never depends on the shared library's lifecycle.
      let lib: Record<string, unknown> | null = null;
      if (data.library_id) {
        const { data: libRow } = await supabase
          .from("session_library")
          .select("title_en, cefr_level, learning_target, register, plan")
          .eq("id", data.library_id as string)
          .maybeSingle();
        lib = (libRow as Record<string, unknown> | null) ?? null;
      }
      if (!lib) {
        const snap = (data.plan_snapshot ?? {}) as Record<string, unknown>;
        lib = snap.plan ? snap : null;
      }
      return NextResponse.json({ session: { ...data, library: lib } });
    }
    const { data, error } = await supabase
      .from("speaking_sessions")
      .select("id, library_id, course_position, scenario_position, status, results, created_at, completed_at, plan_snapshot")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    const libIds = [...new Set((data ?? []).map((s) => s.library_id as string).filter(Boolean))];
    const titles = new Map<string, string>();
    if (libIds.length) {
      const { data: libs } = await supabase
        .from("session_library")
        .select("id, title_en")
        .in("id", libIds);
      for (const l of libs ?? []) titles.set(l.id as string, (l.title_en as string) ?? "");
    }
    const sessions = (data ?? []).map((s) => {
      const snap = (s.plan_snapshot ?? {}) as { title_en?: string };
      return {
        id: s.id as string,
        title_en: titles.get((s.library_id as string) ?? "") || snap.title_en || "",
        status: (s.status as string) ?? "ready",
        course_position: (s.course_position as number | null) ?? null,
        scenario_position: (s.scenario_position as number | null) ?? null,
        results: (s.results ?? {}) as Record<string, unknown>,
        created_at: s.created_at as string,
        completed_at: (s.completed_at as string | null) ?? null,
      };
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[api/speaking/session] read failed:", err);
    return NextResponse.json({ session: null, sessions: [] });
  }
}

export async function PATCH(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, reason: "signin_required" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      objectives_done?: number[];
      notes?: Array<{ kind: string; note: string }>;
      minutes?: number;
      exit_done?: boolean;
    };
    const id = String(body?.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, reason: "no_session" }, { status: 200 });
    const supabase = await createServiceClient();
    const { data: row, error: rowErr } = await supabase
      .from("speaking_sessions")
      .select("id, results, status")
      .eq("id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) return NextResponse.json({ ok: false, reason: "no_session" }, { status: 200 });

    const results = (row.results ?? {}) as Record<string, unknown>;
    if (Array.isArray(body.objectives_done)) {
      results.objectives_done = [...new Set(body.objectives_done.map((n) => Number(n)).filter((n) => n >= 0 && n <= 2))];
    }
    if (Array.isArray(body.notes)) {
      results.notes = body.notes
        .map((n) => ({ kind: n?.kind === "grow" ? "grow" : "glow", note: String(n?.note ?? "").trim() }))
        .filter((n) => n.note)
        .slice(0, 6);
    }
    if (typeof body.minutes === "number") {
      results.minutes = Math.max(0, Math.min(120, Math.round(body.minutes)));
    }
    if (typeof body.exit_done === "boolean") {
      results.exit_done = body.exit_done;
    }
    if (Array.isArray((body as { learned?: unknown }).learned)) {
      results.learned = ((body as { learned?: unknown[] }).learned ?? [])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    const status =
      body.status === "completed" || body.status === "in_progress" ? body.status : (row.status as string);
    const { error: upErr } = await supabase
      .from("speaking_sessions")
      .update({
        results,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (upErr) {
      console.error("[api/speaking/session] results update failed:", upErr.message);
      return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/speaking/session] results failed:", err);
    return NextResponse.json({ ok: false, reason: "store_failed" }, { status: 200 });
  }
}
