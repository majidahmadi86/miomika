// Pin to Singapore — closer to Thai users than default iad1.
export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { v2 } from "@google-cloud/speech";
import type { protos } from "@google-cloud/speech";
import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { log, logError } from "@/lib/debug/log";

const PROJECT_ID = "miomika";
/** Chirp 2 GA in asia-southeast1 (~1.1s vs ~2.3s Chirp 3 in us). */
const CHIRP2_LOCATION = "asia-southeast1";
const CHIRP2_MODEL = "chirp_2";
/**
 * Chirp 2 fallback. Use language-agnostic `["auto"]` so the fallback path
 * (hit when Groq is rate-limited) doesn't clip the English half of
 * code-switched Thai/English speech. Chirp 3's constrained multi-locale
 * (`["th-TH","en-US"]`) isn't available on Chirp 2.
 */
const CHIRP2_LANGUAGE_CODES = ["auto"] as const;

// Lazy clients — constructing at module load fails Next 16's page-data
// collection step when env vars are absent (build-time).
let _googleSpeechClient: v2.SpeechClient | null = null;
let _groq: Groq | null = null;

function getGoogleSpeechClient(): v2.SpeechClient | null {
  if (_googleSpeechClient) return _googleSpeechClient;
  const credsJson = process.env.GOOGLE_TTS_CREDENTIALS;
  if (!credsJson) return null;
  const credentials = JSON.parse(credsJson) as Record<string, unknown>;
  _googleSpeechClient = new v2.SpeechClient({
    credentials,
    apiEndpoint: `${CHIRP2_LOCATION}-speech.googleapis.com`,
  });
  return _googleSpeechClient;
}

function getGroq(): Groq | null {
  if (_groq) return _groq;
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  _groq = new Groq({ apiKey: key });
  return _groq;
}

type ExplicitLang = "th" | "en" | null;

function extractGoogleTranscript(
  response: protos.google.cloud.speech.v2.IRecognizeResponse,
): string {
  const parts: string[] = [];
  for (const result of response.results ?? []) {
    const transcript = result.alternatives?.[0]?.transcript;
    if (transcript) parts.push(transcript);
  }
  return parts.join(" ").trim();
}

function googleErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function googleErrorDetails(err: unknown): { status: number | string; message: string } {
  if (err && typeof err === "object") {
    const o = err as { code?: number; status?: number | string; message?: string };
    return {
      status: o.code ?? o.status ?? "unknown",
      message: o.message ?? googleErrorMessage(err),
    };
  }
  return { status: "unknown", message: googleErrorMessage(err) };
}

function logGroqFallback(
  status: number | string,
  message: string,
): void {
  const payload = {
    status,
    message,
    model: "whisper-large-v3-turbo",
    next: "google_chirp2",
  };
  console.log("[voice.transcribe] groq failed, falling back", payload);
  log("voice.transcribe", "groq failed, falling back", payload);
}

function logChirp2Fallback(
  status: number | string,
  message: string,
  languageCodes: string[],
): void {
  const payload = {
    status,
    message,
    model: CHIRP2_MODEL,
    location: CHIRP2_LOCATION,
    languageCodes,
    next: "groq_whisper",
  };
  console.log("[voice.transcribe] chirp_2 failed, falling back", payload);
  log("voice.transcribe", "chirp_2 failed, falling back", payload);
}

async function recognizeGoogle(
  audioBytes: Buffer,
  languageCodes: string[],
  model: string,
  location: string,
): Promise<string> {
  const client = getGoogleSpeechClient();
  if (!client) throw new Error("GOOGLE_TTS_CREDENTIALS missing");
  const recognizer = `projects/${PROJECT_ID}/locations/${location}/recognizers/_`;
  const config: protos.google.cloud.speech.v2.IRecognitionConfig = {
    autoDecodingConfig: {},
    model,
    languageCodes,
  };
  const [response] = await client.recognize({
    recognizer,
    config,
    content: audioBytes,
  });
  return extractGoogleTranscript(response);
}

async function transcribeWithGoogle(
  audioBytes: Buffer,
): Promise<{
  text: string;
  servedBy: "google_chirp2";
  model: string;
  location: string;
  languageCodes: string[];
}> {
  const languageCodes = [...CHIRP2_LANGUAGE_CODES];

  try {
    const text = await recognizeGoogle(
      audioBytes,
      languageCodes,
      CHIRP2_MODEL,
      CHIRP2_LOCATION,
    );
    if (text.length === 0) {
      logChirp2Fallback("empty", "empty_google_transcription", languageCodes);
      throw new Error("empty_google_transcription");
    }
    return {
      text,
      servedBy: "google_chirp2",
      model: CHIRP2_MODEL,
      location: CHIRP2_LOCATION,
      languageCodes,
    };
  } catch (e) {
    if (googleErrorMessage(e) !== "empty_google_transcription") {
      const { status, message } = googleErrorDetails(e);
      logChirp2Fallback(status, message, languageCodes);
    }
    throw e;
  }
}

async function transcribeWithGroq(
  audioBlob: File,
  explicitLang: ExplicitLang,
): Promise<string> {
  const groq = getGroq();
  if (!groq) throw new Error("GROQ_API_KEY missing");
  const transcribeOpts: Parameters<Groq["audio"]["transcriptions"]["create"]>[0] = {
    file: audioBlob,
    model: "whisper-large-v3-turbo",
    response_format: "json",
    temperature: 0,
    prompt: "บทสนทนาภาษาไทยและภาษาอังกฤษ Thai and English bilingual conversation.",
  };
  if (explicitLang) transcribeOpts.language = explicitLang;
  const result = await groq.audio.transcriptions.create(transcribeOpts);
  return (result.text ?? "").trim();
}

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
  const handlerEnteredAt = Date.now();

  const groqKey = process.env.GROQ_API_KEY;
  const googleCredsJson = process.env.GOOGLE_TTS_CREDENTIALS;
  log("voice.transcribe", "start", {
    groqKeyPresent: !!groqKey,
    googleCredsPresent: !!googleCredsJson,
  });
  if (!googleCredsJson && !groqKey) {
    log("voice.transcribe", "no transcription backend configured");
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
  const uploadReadMs = Date.now() - handlerEnteredAt;

  const langHint = typeof clientLang === "string" ? clientLang : null;
  const explicitLang: ExplicitLang =
    langHint === "th" || langHint === "th-TH"
      ? "th"
      : langHint === "en" || langHint === "en-US"
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
  const audioBytes = Buffer.from(await audioBlob.arrayBuffer());

  if (groqKey) {
    try {
      const recognizeStart = Date.now();
      const text = await transcribeWithGroq(audioBlob, explicitLang);
      const recognizeMs = Date.now() - recognizeStart;
      log("voice.transcribe", "asr-split", { uploadReadMs, recognizeMs });
      const latency = Date.now() - start;
      log("voice.transcribe", "transcribed", {
        latency,
        length: text.length,
        preview: text.slice(0, 40),
        servedBy: "groq_whisper",
        model: "whisper-large-v3-turbo",
        languageCodes: explicitLang
          ? [explicitLang === "th" ? "th-TH" : "en-US"]
          : ["th-TH", "en-US"],
      });

      if (text.length === 0) {
        logGroqFallback("empty", "empty_groq_transcription");
        throw new Error("empty_groq_transcription");
      }
      log("voice.transcribe", "success", {
        textLen: text.length,
        language: explicitLang ?? "auto",
        servedBy: "groq_whisper",
        model: "whisper-large-v3-turbo",
      });
      return NextResponse.json({ text, servedBy: "groq_whisper" });
    } catch (e) {
      log("voice.transcribe", "groq error, falling back to chirp", {
        message: googleErrorMessage(e),
      });
      logError("voice.transcribe", "groq failed", e);
      Sentry.captureException(e, { tags: { stage: "groq.transcribe" } });
    }
  }

  if (googleCredsJson) {
    try {
      const recognizeStart = Date.now();
      const google = await transcribeWithGoogle(audioBytes);
      const recognizeMs = Date.now() - recognizeStart;
      log("voice.transcribe", "asr-split", { uploadReadMs, recognizeMs });
      const latency = Date.now() - start;
      log("voice.transcribe", "transcribed", {
        latency,
        length: google.text.length,
        preview: google.text.slice(0, 40),
        servedBy: google.servedBy,
        model: google.model,
        location: google.location,
        languageCodes: google.languageCodes,
      });
      log("voice.transcribe", "success", {
        textLen: google.text.length,
        language: explicitLang ?? "auto",
        servedBy: google.servedBy,
        model: google.model,
        location: google.location,
        languageCodes: google.languageCodes,
      });
      return NextResponse.json({ text: google.text, servedBy: google.servedBy });
    } catch (e) {
      log("voice.transcribe", "google error after groq fallback", {
        message: googleErrorMessage(e),
      });
      logError("voice.transcribe", "google failed", e);
      Sentry.captureException(e, { tags: { stage: "google.transcribe" } });
    }
  }

  return NextResponse.json(
    { error: "transcribe_failed", detail: "groq_and_google_unavailable_or_failed" },
    { status: 500 },
  );
}
