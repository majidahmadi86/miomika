export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 10;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";

type LessonProgress = {
  step?: number;
  games?: { say?: boolean; match?: boolean; listen?: boolean; fill?: boolean };
  checkpoint?: { score?: number; total?: number };
  completed_at?: string | null;
};

/** Accept only known, sane progress fields — never store garbage jsonb. */
function sanitizeProgress(raw: unknown): LessonProgress {
  const p = (raw ?? {}) as Record<string, unknown>;
  const out: LessonProgress = {};
  if (
    typeof p.step === "number" &&
    Number.isInteger(p.step) &&
    p.step >= 0 &&
    p.step <= 10
  ) {
    out.step = p.step;
  }
  if (p.games && typeof p.games === "object") {
    const g = p.games as Record<string, unknown>;
    out.games = {
      ...(typeof g.say === "boolean" ? { say: g.say } : {}),
      ...(typeof g.match === "boolean" ? { match: g.match } : {}),
      ...(typeof g.listen === "boolean" ? { listen: g.listen } : {}),
      ...(typeof g.fill === "boolean" ? { fill: g.fill } : {}),
    };
  }
  if (p.checkpoint && typeof p.checkpoint === "object") {
    const c = p.checkpoint as Record<string, unknown>;
    const score = typeof c.score === "number" ? c.score : null;
    const total = typeof c.total === "number" ? c.total : null;
    if (score !== null && total !== null && score >= 0 && total > 0 && score <= total) {
      out.checkpoint = { score, total };
    }
  }
  if (typeof p.completed_at === "string" && !Number.isNaN(Date.parse(p.completed_at))) {
    out.completed_at = p.completed_at;
  }
  return out;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ lesson: null }, { status: 401 });
  try {
    const { id } = await context.params;
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("lessons")
      .select(
        "id, title_en, title_th, topic, color, cefr_level, learning_target, status, position, content, progress",
      )
      .eq("id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ lesson: null }, { status: 404 });
    return NextResponse.json({ lesson: data });
  } catch (err) {
    console.error("[api/lessons/id] get failed:", err);
    return NextResponse.json({ lesson: null }, { status: 200 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { progress?: unknown };
    const incoming = sanitizeProgress(body?.progress);
    const supabase = await createServiceClient();
    const { data: existing, error: readErr } = await supabase
      .from("lessons")
      .select("progress, status")
      .eq("id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) return NextResponse.json({ ok: false }, { status: 404 });
    const prev = (existing.progress ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...prev, ...incoming };
    // games merge deeply so one finished game never erases another
    merged.games = {
      ...((prev.games as Record<string, unknown>) ?? {}),
      ...(incoming.games ?? {}),
    };
    let status = (existing.status as string) ?? "planned";
    if (merged.completed_at) status = "completed";
    else if ((typeof merged.step === "number" && merged.step > 0) || status === "in_progress") {
      status = "in_progress";
    }
    const { error: updErr } = await supabase
      .from("lessons")
      .update({ progress: merged, status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", profile.id);
    if (updErr) throw updErr;
    return NextResponse.json({ ok: true, status, progress: merged });
  } catch (err) {
    console.error("[api/lessons/id] patch failed:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
