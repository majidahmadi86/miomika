export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { log } from "@/lib/debug/log";

/**
 * POST /api/teach-word
 * Log-only stub for teach_word tool calls from Gemini Live.
 * Returns { ok: true } — no fake translations back to the model.
 * Open to guests (no auth gate); harmless ack with no AI cost.
 */
export async function POST(req: NextRequest) {
  let word = "";
  try {
    const body = (await req.json()) as { word?: string };
    word = String(body?.word ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = await getServerProfile();
  log("teach-word", "tool call", { userId: profile?.id ?? "guest", word });
  return NextResponse.json({ ok: true });
}
