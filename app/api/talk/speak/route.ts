// Pin to Singapore — closer to Thai users than default iad1.
export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 25;

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { createServiceClient } from "@/lib/supabase/service";
import { log, logError } from "@/lib/debug/log";

type Lang = "th" | "en";
type VoicePref = "female" | "male";

function mapVoice(lang: Lang, voice: VoicePref): { voiceName: string; languageCode: string } {
  if (lang === "th") {
    return {
      languageCode: "th-TH",
      voiceName: voice === "male" ? "th-TH-Chirp3-HD-Charon" : "th-TH-Chirp3-HD-Leda",
    };
  }
  return {
    languageCode: "en-US",
    voiceName: voice === "male" ? "en-US-Chirp3-HD-Charon" : "en-US-Chirp3-HD-Leda",
  };
}

const VOLUME_GAIN_DB = 10.0;

function buildCacheKey(
  normalizedText: string,
  lang: Lang,
  voiceName: string,
  speakingRate: number,
  volumeGainDb: number,
): string {
  const raw = `${normalizedText}|${lang}|${voiceName}|${speakingRate}|${volumeGainDb}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * POST /api/talk/speak
 *
 * Accepts JSON { text, lang, voice?, voiceName?, speakingRate? }. Returns { audio: base64, cached: boolean }.
 * 3-strike cache: MP3 stored only after the 3rd request for the same phrase.
 */
export async function POST(request: NextRequest) {
  Sentry.setTag("flow", "voice");

  const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS;
  if (!credentialsJson) {
    log("voice.speak", "GOOGLE_TTS_CREDENTIALS missing");
    return NextResponse.json({ error: "tts_not_configured" }, { status: 500 });
  }

  let body: {
    text?: unknown;
    lang?: unknown;
    voice?: unknown;
    voiceName?: unknown;
    speakingRate?: unknown;
  };
  try {
    body = await request.json();
  } catch (e) {
    logError("voice.speak", "json parse failed", e);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const lang = body.lang;
  if (lang !== "th" && lang !== "en") {
    return NextResponse.json({ error: "invalid_lang" }, { status: 400 });
  }

  const voicePref: VoicePref =
    body.voice === "male" ? "male" : "female";

  const mapped = mapVoice(lang, voicePref);
  const explicitVoiceName =
    typeof body.voiceName === "string" ? body.voiceName.trim() : "";
  const voiceName = explicitVoiceName || mapped.voiceName;
  const languageCode = mapped.languageCode;

  const defaultSpeakingRate = 0.90;
  const speakingRate =
    typeof body.speakingRate === "number" &&
    body.speakingRate >= 0.5 &&
    body.speakingRate <= 1.5
      ? body.speakingRate
      : defaultSpeakingRate;

  const cacheKey = buildCacheKey(text, lang, voiceName, speakingRate, VOLUME_GAIN_DB);

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (e) {
    logError("voice.speak", "service client unavailable", e);
    return NextResponse.json({ error: "tts_failed" }, { status: 500 });
  }

  // --- Cache read ---
  const { data: cached, error: readError } = await supabase
    .from("tts_cache")
    .select("id, audio_base64, request_count")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (readError) {
    logError("voice.speak", "[tts.speak] cache read failed:", readError);
  }

  if (cached?.audio_base64) {
    const { error: updateError } = await supabase
      .from("tts_cache")
      .update({
        request_count: (cached.request_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cached.id);

    if (updateError) {
      logError("voice.speak", "[tts.speak] cache write failed:", updateError);
    }

    return NextResponse.json({ audio: cached.audio_base64, cached: true });
  }

  // --- Cache miss (no row, or row without audio yet) — synthesize via Google ---
  let audioBase64: string;
  try {
    const credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
    const client = new TextToSpeechClient({ credentials });

    const synthPromise = client.synthesizeSpeech({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate,
        volumeGainDb: VOLUME_GAIN_DB,
        // Chirp3-HD voices reject pitch — omit entirely.
      },
    });
    const timeoutPromise = new Promise<never>((_, rej) => {
      setTimeout(() => rej(new Error("synth_timeout")), 9000);
    });
    const [response] = await Promise.race([synthPromise, timeoutPromise]);

    if (!response.audioContent) {
      throw new Error("Google TTS returned empty audioContent");
    }

    const bytes =
      response.audioContent instanceof Uint8Array
        ? response.audioContent
        : Buffer.from(response.audioContent as string, "base64");
    audioBase64 = Buffer.from(bytes).toString("base64");
    if (!audioBase64) {
      throw new Error("Google TTS returned empty base64 audio");
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (detail === "synth_timeout") {
      log("voice.speak", "google timeout (9s)");
      return NextResponse.json({ error: "synth_timeout" }, { status: 503 });
    }
    const stack =
      e instanceof Error && e.stack ? e.stack.slice(0, 200) : String(e).slice(0, 200);
    console.error("[tts.speak] google synth failed:", detail, e);
    logError("voice.speak", "google tts failed", e);
    Sentry.captureException(e, { tags: { stage: "google.tts" } });
    return NextResponse.json({ error: "tts_failed", detail, stack }, { status: 500 });
  }

  // --- 3-strike cache write ---
  // Hits 1–2: counter row only (audio_base64 empty). Hit 3+: store the MP3.
  const now = new Date().toISOString();

  if (!cached) {
    const { error: insertError } = await supabase.from("tts_cache").insert({
      cache_key: cacheKey,
      text,
      lang,
      voice: voiceName,
      audio_base64: "",
      request_count: 1,
      last_used_at: now,
    });
    if (insertError) {
      logError("voice.speak", "[tts.speak] cache write failed:", insertError);
    }
  } else {
    const nextCount = (cached.request_count ?? 0) + 1;
    const { error: updateError } = await supabase
      .from("tts_cache")
      .update({
        request_count: nextCount,
        last_used_at: now,
        ...(nextCount >= 3 ? { audio_base64: audioBase64 } : {}),
      })
      .eq("id", cached.id);

    if (updateError) {
      logError("voice.speak", "[tts.speak] cache write failed:", updateError);
    }
  }

  return NextResponse.json({ audio: audioBase64, cached: false });
}
