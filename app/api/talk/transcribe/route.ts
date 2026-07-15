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
import { checkRateLimit, identityFromRequest } from "@/lib/security/rate-limit";
import { withUsage, recordUsage } from "@/lib/usage/ledger";

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

// Phrases Whisper tends to emit when it's fed silence or pure noise — it echoes
// its own conditioning prompt or a stock filler (these are the classic Whisper
// "silence hallucinations": the prompt echo, plus stock English fillers like
// "thanks for watching" / "I'm sorry"). If a transcription IS one of these (and
// nothing else), it's noise, not the user — drop it. Backstop to the confidence
// gate below, for the cases where Whisper sounds confident about its phantom.
const HALLUCINATION_PHRASES = [
  "บทสนทนาภาษาไทย",
  "thai and english",
  "bilingual conversation",
  "ภาษาไทยและภาษาอังกฤษ",
  "ภาษาไทยและภาษาไทย",
  "i'm sorry",
  "thanks for watching",
  "thank you for watching",
  "thank you for watching.",
  "please subscribe",
  "subscribe to my channel",
];

/** True if the transcript is empty, a bare echo of a known filler, or a degenerate repeat. */
function looksHallucinated(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return true;
  // Pure echo of a stock phrase (allow trivial trailing punctuation/spacing).
  const stripped = t.replace(/[.\s।ๆ]+$/g, "");
  if (HALLUCINATION_PHRASES.some((p) => stripped === p.toLowerCase().replace(/[.\s]+$/g, ""))) return true;
  // Degenerate repetition: the same short token repeated with little else
  // (e.g. "ภาษาไทยและภาษาไทย"). If one token is >70% of the content, it's noise.
  const tokens = t.split(/[\s,]+/).filter(Boolean);
  if (tokens.length >= 4) {
    const counts = new Map<string, number>();
    for (const tok of tokens) counts.set(tok, (counts.get(tok) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top / tokens.length > 0.7) return true;
  }
  return false;
}

/**
 * Confidence gate. Whisper hallucinates words out of silence/noise; those
 * segments carry a high no_speech_prob and/or a very low avg_logprob. This
 * catches the phantoms by CONFIDENCE — regardless of the exact words — which a
 * fixed phrase-list can't (it's why "I'm sorry" slipped through before).
 * Conservative thresholds so real (even quiet) speech is never dropped.
 */
function isLowConfidenceSpeech(
  segments: Array<{ no_speech_prob?: number; avg_logprob?: number }>,
): boolean {
  if (segments.length === 0) return false;
  const noSpeech = segments.map((s) => s.no_speech_prob ?? 0);
  const logprob = segments.map((s) => s.avg_logprob ?? 0);
  const avgNoSpeech = noSpeech.reduce((a, b) => a + b, 0) / noSpeech.length;
  const avgLogprob = logprob.reduce((a, b) => a + b, 0) / logprob.length;
  // High no-speech probability = it was basically silence. Very low logprob =
  // the model had no idea and guessed. Either, on its own, means "not real speech".
  return avgNoSpeech > 0.6 || avgLogprob < -1.2;
}

/**
 * Measure the loudness of a PCM WAV buffer (peak + RMS, 0..1 full-scale).
 * Returns null if the buffer isn't parseable 16-bit PCM (then we just transcribe
 * normally — never block on a parse failure). This is how we tell "the user
 * actually spoke" from "the mic was open on a silent room": speech has real
 * peaks; silence/ambient noise does not. Catching silence HERE means it never
 * reaches Whisper, which is the only reliable way to stop Whisper inventing
 * words out of nothing (a downstream text filter can't — it sounds confident).
 */
function measureWavLoudness(wav: Buffer): { peak: number; rms: number } | null {
  if (wav.length < 44) return null;
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") return null;
  // Walk chunks to find 'data' (header size varies when extra chunks are present).
  let offset = 12;
  let dataStart = -1;
  let dataLen = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "data") {
      dataStart = offset + 8;
      dataLen = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) return null;
  const end = Math.min(dataStart + dataLen, wav.length);
  let sumSq = 0;
  let peak = 0;
  let n = 0;
  for (let i = dataStart; i + 1 < end; i += 2) {
    const s = wav.readInt16LE(i) / 32768;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    sumSq += s * s;
    n++;
  }
  if (n === 0) return null;
  return { peak, rms: Math.sqrt(sumSq / n) };
}

// Below this peak amplitude (fraction of full scale) the clip has no real
// speech in it — it's a silent/near-silent room. Real speech into a phone mic
// peaks well above this; quiet rooms sit far below. Conservative so genuine
// (even soft) speech is never dropped.
const SILENCE_PEAK = 0.08;
const SILENCE_RMS = 0.012;

async function transcribeWithGroq(
  audioBlob: File,
  explicitLang: ExplicitLang,
): Promise<string> {
  const groq = getGroq();
  if (!groq) throw new Error("GROQ_API_KEY missing");
  const transcribeOpts: Parameters<Groq["audio"]["transcriptions"]["create"]>[0] = {
    file: audioBlob,
    model: "whisper-large-v3-turbo",
    // verbose_json gives per-segment no_speech_prob / avg_logprob so we can gate
    // on confidence and reject silence-hallucinations no matter what words they are.
    response_format: "verbose_json",
    temperature: 0,
    // NO prompt: any prompt text is what Whisper echoes verbatim when it hears
    // silence/noise (that's where the "Thai-English speech"→"TIE-English speech"
    // phantom came from). The silence gate upstream is the real defense; with no
    // prompt there's nothing to parrot even on a borderline clip.
  };
  if (explicitLang) transcribeOpts.language = explicitLang;
  const result = await groq.audio.transcriptions.create(transcribeOpts);
  const text = (result.text ?? "").trim();
  const segments =
    (result as { segments?: Array<{ no_speech_prob?: number; avg_logprob?: number }> }).segments ?? [];
  if (isLowConfidenceSpeech(segments)) {
    log("voice.transcribe", "dropped low-confidence transcript", { preview: text.slice(0, 60) });
    return "";
  }
  if (looksHallucinated(text)) {
    log("voice.transcribe", "dropped hallucinated transcript", { preview: text.slice(0, 60) });
    return "";
  }
  return text;
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

  // Same defense as /api/talk/speak — bound request FREQUENCY, not just
  // per-request cost, on the endpoint that calls Google's STT directly.
  const rl = await checkRateLimit("transcribe", identityFromRequest(request), 40);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

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
  // 16 kHz mono Int16 WAV → seconds (44-byte header). Used for STT cost estimates.
  const audioSeconds = Math.max(0, (audioBytes.length - 44) / 32000);

  // SILENCE GATE: if the clip has no real speech energy, the mic was open on a
  // quiet room. Return "nothing said" now — never send silence to Whisper/Google,
  // which would otherwise invent phantom words ("I'm sorry", prompt echoes, etc.).
  // The client treats empty text as "say nothing" (MicButton: empty → idle).
  const loudness = measureWavLoudness(audioBytes);
  if (loudness && loudness.peak < SILENCE_PEAK && loudness.rms < SILENCE_RMS) {
    log("voice.transcribe", "silent clip — skipped transcription", {
      peak: Number(loudness.peak.toFixed(4)),
      rms: Number(loudness.rms.toFixed(4)),
    });
    return NextResponse.json({ text: "", silent: true });
  }
  if (loudness) {
    log("voice.transcribe", "loudness", {
      peak: Number(loudness.peak.toFixed(4)),
      rms: Number(loudness.rms.toFixed(4)),
    });
  }

  if (groqKey) {
    try {
      const recognizeStart = Date.now();
      const text = await transcribeWithGroq(audioBlob, explicitLang);
      const recognizeMs = Date.now() - recognizeStart;
      // Usage ledger: STT is a paid call — record it (kind "stt") so voice usage
      // is visible per user in llm_usage and the admin cost tab.
      await withUsage("talk.transcribe", userId, async () => {
        recordUsage({ provider: "groq_whisper", kind: "stt", model: "whisper-large-v3-turbo", audioSeconds, latencyMs: recognizeMs, meta: { path: "talk" } });
      });
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
      // Usage ledger: STT is a paid call — record it (kind "stt") so voice usage
      // is visible per user in llm_usage and the admin cost tab.
      await withUsage("talk.transcribe", userId, async () => {
        recordUsage({ provider: "google_stt", kind: "stt", model: google.model, audioSeconds, latencyMs: recognizeMs, meta: { path: "talk", location: google.location } });
      });
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
