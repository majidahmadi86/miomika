// Run this function in Singapore — closer to Thai users than the default
// iad1 (USA). Cuts ~250ms round-trip per request.
export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 15;

import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { log, logError } from "@/lib/debug/log";

/**
 * POST /api/talk/transcribe
 *
 * Accepts an audio file (multipart/form-data, field name "audio") and returns
 * the transcribed text via Groq's Whisper Large v3.
 *
 * Why Groq Whisper instead of browser SpeechRecognition:
 *   - Web Speech API is broken on many Android Chrome builds (silent
 *     onstart/onend with no audio delivered). Server-side STT bypasses
 *     the platform inconsistency entirely.
 *   - Groq Whisper is ~$0.0001 per utterance and ~300ms latency. Acceptable
 *     for our usage envelope.
 *   - Works on Samsung Internet, Firefox, every browser with MediaRecorder.
 *
 * Auth: optional. Guests and logged-in users may transcribe.
 *
 * Returns: { text: string } on success, or { error: string } on failure.
 */
export async function POST(request: NextRequest) {
  Sentry.setTag("flow", "voice");

  // Read the session directly from request cookies. We don't use
  // getServerProfile() here because cookies() from next/headers can
  // behave inconsistently in routes that consume a multipart body.
  // This is the canonical Supabase SSR pattern for API routes.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    log("voice.transcribe", "supabase env missing");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // Allow guests AND logged-in users. Voice is part of how Miomi seduces
  // new visitors — gating it behind auth kills the funnel.
  // We still try to identify the user (for logs and future rate limiting)
  // but do NOT block guests.
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          /* no-op */
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      userEmail = user.email ?? null;
    }
  } catch {
    /* guest — fine */
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    log("voice.transcribe", "GROQ_API_KEY missing");
    return NextResponse.json(
      { error: "transcription_not_configured" },
      { status: 500 },
    );
  }

  let audioBlob: File | null = null;
  let language: string | null = null;

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const lang = form.get("language");
    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "audio_field_missing" },
        { status: 400 },
      );
    }
    audioBlob = audio;
    language = typeof lang === "string" ? lang : null;
  } catch (e) {
    logError("voice.transcribe", "failed to parse form", e);
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  // Size guard: max 1 MB. Typical 5-second utterance is ~50 KB at webm/opus.
  if (audioBlob.size > 1_000_000) {
    log("voice.transcribe", "audio too large", { size: audioBlob.size });
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }
  if (audioBlob.size < 1000) {
    log("voice.transcribe", "audio too small", { size: audioBlob.size });
    return NextResponse.json({ error: "audio_too_short" }, { status: 400 });
  }

  log("voice.transcribe", "received", {
    user: userEmail ?? "guest",
    userId: userId ?? "anon",
    bytes: audioBlob.size,
    type: audioBlob.type,
    language: language ?? "auto",
  });

  const start = Date.now();
  try {
    const groq = new Groq({ apiKey });

    const result = await groq.audio.transcriptions.create({
      file: audioBlob,
      model: "whisper-large-v3-turbo",
      // No language hint = Whisper auto-detects. Best for Thai/English mix.
      // If caller explicitly sets language, pass it through.
      ...(language && language !== "auto" ? { language } : {}),
      response_format: "json",
      temperature: 0,
    });

    const text = (result.text ?? "").trim();
    const latency = Date.now() - start;

    log("voice.transcribe", "transcribed", {
      latency,
      length: text.length,
      preview: text.slice(0, 40),
    });

    if (text.length === 0) {
      return NextResponse.json({ error: "empty_transcription" }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    logError("voice.transcribe", "groq call failed", e);
    Sentry.captureException(e, { tags: { stage: "groq.transcribe" } });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }
}
