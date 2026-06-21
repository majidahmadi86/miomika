export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

// POST: record a level-check result (history → growth + share) and, when the learner
// accepts it (setLevel), anchor their CEFR on the profile so the curriculum + brain use it.
export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, reason: "signin_required" },
      { status: 401 },
    );
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      level?: string;
      score?: number;
      total?: number;
      breakdown?: unknown;
      setLevel?: boolean;
    };
    const level = String(body.level ?? "").toUpperCase();
    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json({ ok: false, reason: "bad_level" }, { status: 200 });
    }
    const score = Math.min(999, Math.max(0, Math.floor(Number(body.score ?? 0))));
    const total = Math.min(999, Math.max(1, Math.floor(Number(body.total ?? 1))));

    const supabase = await createServiceClient();
    await supabase.from("level_checks").insert({
      user_id: profile.id,
      level,
      score,
      total,
      breakdown: body.breakdown ?? null,
    });
    if (body.setLevel === true) {
      await supabase
        .from("profiles")
        .update({ cefr_level: level })
        .eq("id", profile.id);
    }
    return NextResponse.json({ ok: true, level, saved: body.setLevel === true });
  } catch (err) {
    console.error("[test] save result failed:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 200 });
  }
}

// GET: the learner's recent level-check history, for the Tests surface + dashboard badge.
export async function GET() {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, reason: "signin_required" },
      { status: 401 },
    );
  }
  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("level_checks")
      .select("level, score, total, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    return NextResponse.json({ ok: true, checks: data ?? [] });
  } catch (err) {
    console.error("[test] history failed:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 200 });
  }
}
