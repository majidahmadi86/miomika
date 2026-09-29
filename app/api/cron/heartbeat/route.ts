import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isCronAuthorized } from "@/lib/security/safe-compare";
import { logError } from "@/lib/debug/log";

/**
 * Supabase keep-alive. Runs once a day via Vercel Cron (see vercel.json,
 * 03:00 UTC = 10:00 Bangkok). The free plan pauses a project after 7 days
 * without real DB activity, and the care dispatcher can go quiet for weeks
 * when nobody is in its 1..14 day window, so this does one guaranteed
 * write (upsert system_heartbeat) and one read (count profiles) every day.
 *
 * Auth: same as /api/care/dispatch, "Authorization: Bearer <CRON_SECRET>".
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const beatAt = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("system_heartbeat")
      .upsert({ id: "main", beat_at: beatAt, source: "vercel-cron" }, { onConflict: "id" });
    if (upsertError) {
      const missing = upsertError.code === "42P01" || upsertError.code === "PGRST205";
      const message = missing
        ? "system_heartbeat table missing · run the keep-alive SQL in Supabase"
        : `heartbeat upsert failed: ${upsertError.message}`;
      logError("cron/heartbeat", message, upsertError);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }

    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (countError) {
      logError("cron/heartbeat", "profiles count failed", countError);
      return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, beat_at: beatAt, profiles: count ?? 0 });
  } catch (err) {
    logError("cron/heartbeat", "heartbeat crashed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
