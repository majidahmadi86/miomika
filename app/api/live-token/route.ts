export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { hasVoiceBudget } from "@/lib/live/voice-allowance";
import { assembleMemberContext } from "@/lib/live/member-context";
import { LIVE_MODEL } from "@/lib/live/live-config";
import { liveTokenDurations } from "@/lib/live/token-policy";
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
 * LOCKED 2026-06-05 — Mints a short-lived ephemeral token for Gemini Live.
 * GEMINI_API_KEY stays server-side — browser receives token.name only.
 * Guests allowed (shorter cap as cost backstop, never 401). Do not expose the API key client-side.
 * Do not change without re-verifying the full /talk + guest flow.
 */
export async function GET() {
  const profile = await getServerProfile();
  const isGuest = !profile;

  const client = getTokenClient();
  if (!client) {
    logError("live-token", "GEMINI_API_KEY missing", new Error("missing env"));
    return NextResponse.json({ error: "Live voice unavailable" }, { status: 503 });
  }

  // METERING GATE: a member out of live-voice budget gets no token. Guests are
  // gated by exchange-count elsewhere, not minutes, so they skip this.
  let voiceBudgetInfo: { usedSeconds: number; budgetSeconds: number } | null = null;
  if (profile) {
    try {
      const supabase = await createServiceClient();
      const { ok, usedSeconds, budgetSeconds } = await hasVoiceBudget(supabase, profile.id, profile.tier);
      voiceBudgetInfo = { usedSeconds, budgetSeconds };
      if (!ok) {
        log("live-token", "voice budget exhausted", { userId: profile.id, tier: profile.tier, usedSeconds, budgetSeconds });
        return NextResponse.json(
          { error: "voice_exhausted", reason: "voice_exhausted", usedSeconds, budgetSeconds },
          { status: 200 },
        );
      }
    } catch (err) {
      // Read error: fail CLOSED for free, OPEN for paid (don't strand a payer).
      if (profile.tier !== "pro" && profile.tier !== "pro_max") {
        logError("live-token", "budget check failed — free user blocked", err);
        return NextResponse.json({ error: "voice_check_failed", reason: "voice_exhausted" }, { status: 200 });
      }
      logError("live-token", "budget check failed — paid user allowed through", err);
    }
  }
  const { sessionMinutes, expireMinutes } = liveTokenDurations(isGuest);
  const expireTime = new Date(Date.now() + expireMinutes * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(
    Date.now() + sessionMinutes * 60 * 1000,
  ).toISOString();

  try {
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

    let memberContext = null;
    if (profile) {
      memberContext = await assembleMemberContext(profile);
      void touchLastSeen(profile.id);
    }

    log("live-token", "minted ephemeral token", {
      guest: isGuest,
      userId: profile?.id ?? null,
      model: LIVE_MODEL,
      returning: memberContext?.isReturning ?? false,
    });
    return NextResponse.json({
      token: name,
      model: LIVE_MODEL,
      guest: isGuest,
      memberContext,
      voiceBudget: voiceBudgetInfo, // { usedSeconds, budgetSeconds } | null for guests
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("live-token", "mint failed", err, { error: msg, guest: isGuest });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
