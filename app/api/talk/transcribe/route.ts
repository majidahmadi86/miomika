// Pin to Singapore — closer to Thai users than default iad1.
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
 * Accepts multipart/form-data with an "audio" field (WAV blob from VAD)
 * and optional "language" field. Returns { text } on success.
 *
 * Guests and logged-in users both allowed. Voice is the conversion
 * mechanism, not a gated feature.
 */
export async function POST(request: NextRequest) {
  Sentry.setTag("flow", "voice");

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    log("voice.transcribe", "GROQ_API_KEY missing");
    return NextResponse.json(
      { error: "transcription_not_configured" },
      { status: 500 },
    );
  }

  // Identify the user if logged in — for logs and future rate limiting.
  // Do NOT block guests.
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
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
    }
  } catch {
    /* guest */
  }

  let audioBlob: File;
  let clientLang: FormDataEntryValue | null = null;
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    clientLang = form.get("language");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "audio_field_missing" }, { status: 400 });
    }
    audioBlob = audio;
  } catch (e) {
    logError("voice.transcribe", "form parse failed", e);
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const explicitLang: "th" | "en" | null =
    clientLang === "th" || clientLang === "th-TH"
      ? "th"
      : clientLang === "en" || clientLang === "en-US"
        ? "en"
        : null;
  log("voice.transcribe", "lang mode", { explicit: explicitLang ?? "auto-bilingual" });

  if (audioBlob.size > 2_000_000) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }
  if (audioBlob.size < 2000) {
    return NextResponse.json({ error: "audio_too_short" }, { status: 400 });
  }

  log("voice.transcribe", "received", {
    user: userEmail ?? "guest",
    userId: userId ?? "anon",
    bytes: audioBlob.size,
    type: audioBlob.type,
    language: explicitLang ?? "auto-bilingual",
  });

  const start = Date.now();
  try {
    const groq = new Groq({ apiKey: groqKey });
    const transcribeOpts: Parameters<Groq["audio"]["transcriptions"]["create"]>[0] = {
      file: audioBlob,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      temperature: 0,
      prompt: "บทสนทนาภาษาไทยและภาษาอังกฤษ Thai and English bilingual conversation.",
    };
    if (explicitLang) transcribeOpts.language = explicitLang;

    const result = await groq.audio.transcriptions.create(transcribeOpts);

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
    logError("voice.transcribe", "groq failed", e);
    Sentry.captureException(e, { tags: { stage: "groq.transcribe" } });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }
}
