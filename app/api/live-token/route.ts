export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";
import { LIVE_MODEL } from "@/lib/live/live-config";
import { log, logError } from "@/lib/debug/log";

let tokenClient: GoogleGenAI | null = null;

function getTokenClient(): GoogleGenAI | null {
  if (tokenClient) return tokenClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  tokenClient = new GoogleGenAI({ apiKey: key });
  return tokenClient;
}

/**
 * GET /api/live-token
 * Mints a short-lived ephemeral token for Gemini Live.
 * GEMINI_API_KEY stays server-side — browser receives token.name only.
 * Logged-in users only (getServerProfile); guests get 401.
 */
export async function GET() {
  const profile = await getServerProfile();
  if (!profile) {
    log("live-token", "rejected — no profile (guest)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  void touchLastSeen(profile.id);

  const client = getTokenClient();
  if (!client) {
    logError("live-token", "GEMINI_API_KEY missing", new Error("missing env"));
    return NextResponse.json({ error: "Live voice unavailable" }, { status: 503 });
  }

  try {
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    const name = token?.name;
    if (!name) {
      logError("live-token", "mint missing name", new Error("no name"), { token });
      return NextResponse.json({ error: "Token mint failed" }, { status: 500 });
    }

    log("live-token", "minted ephemeral token", { userId: profile.id, model: LIVE_MODEL });
    return NextResponse.json({ token: name, model: LIVE_MODEL });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("live-token", "mint failed", err, { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
