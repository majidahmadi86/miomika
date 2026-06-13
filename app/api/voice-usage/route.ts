export const runtime = "nodejs";
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { recordVoiceSeconds } from "@/lib/live/voice-allowance";

/**
 * POST /api/voice-usage  { seconds: number }
 * Records elapsed LIVE-voice seconds to the per-week ledger. Server-side write
 * (service client) so a page refresh or client tampering cannot reset usage.
 * Best-effort: a failure here must never break the user's session.
 */
export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ ok: true }); // guests not minute-metered
  try {
    const body = (await req.json().catch(() => ({}))) as { seconds?: number };
    const seconds = Number(body?.seconds ?? 0);
    if (seconds > 0) {
      const supabase = await createServiceClient();
      await recordVoiceSeconds(supabase, profile.id, seconds);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never surface accounting errors
  }
}
