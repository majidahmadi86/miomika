export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { log } from "@/lib/debug/log";

/**
 * POST /api/teach-word
 * Log-only stub for teach_word tool calls from Gemini Live.
 * Returns { ok: true } — no fake translations back to the model.
 */
export async function POST(req: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let word = "";
  try {
    const body = (await req.json()) as { word?: string };
    word = String(body?.word ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  log("teach-word", "tool call", { userId: profile.id, word });
  return NextResponse.json({ ok: true });
}
