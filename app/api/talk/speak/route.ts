// Pin to Singapore — closer to Thai users than default iad1.
export const preferredRegion = ["sin1", "hnd1"];
export const runtime = "nodejs";
export const maxDuration = 15;

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
      voiceName: voice === "male" ? "th-TH-Neural2-D" : "th-TH-Neural2-C",
    };
  }
  return {
    languageCode: "en-US",
    voiceName: voice === "male" ? "en-US-Neural2-D" : "en-US-Neural2-F",
  };
}

function buildCacheKey(normalizedText: string, lang: Lang, voiceName: string): string {
  const raw = `${normalizedText}|${lang}|${voiceName}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * GET /api/talk/speak — temporary: list Thai Google TTS voices for selection.
 */
export async function GET() {
  const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS;
  if (!credentialsJson) {
    log("voice.speak", "GOOGLE_TTS_CREDENTIALS missing");
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  try {
    const credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
    const client = new TextToSpeechClient({ credentials });

    const [response] = await client.listVoices({ languageCode: "th-TH" });

    const voices = (response.voices ?? [])
      .map((v) => ({
        name: v.name ?? "",
        ssmlGender: v.ssmlGender ?? "SSML_VOICE_GENDER_UNSPECIFIED",
        naturalSampleRateHertz: v.naturalSampleRateHertz ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(voices);
  } catch (e) {
    logError("voice.speak", "list voices failed", e);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}

/**
 * POST /api/talk/speak
 *
 * Accepts JSON { text, lang, voice? }. Returns { audio: base64, cached: boolean }.
 * 3-strike cache: MP3 stored only after the 3rd request for the same phrase.
 */
export async function POST(request: NextRequest) {
  Sentry.setTag("flow", "voice");

  const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS;
  if (!credentialsJson) {
    log("voice.speak", "GOOGLE_TTS_CREDENTIALS missing");
    return NextResponse.json({ error: "tts_not_configured" }, { status: 500 });
  }

  let body: { text?: unknown; lang?: unknown; voice?: unknown };
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

  const { voiceName, languageCode } = mapVoice(lang, voicePref);
  const cacheKey = buildCacheKey(text, lang, voiceName);

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

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: lang === "th" ? 0.95 : 1.0,
        pitch: 0,
      },
    });

    if (!response.audioContent) {
      throw new Error("Google TTS returned empty audioContent");
    }

    const bytes =
      response.audioContent instanceof Uint8Array
        ? response.audioContent
        : Buffer.from(response.audioContent as string, "base64");
    audioBase64 = Buffer.from(bytes).toString("base64");
  } catch (e) {
    logError("voice.speak", "google tts failed", e);
    Sentry.captureException(e, { tags: { stage: "google.tts" } });
    return NextResponse.json({ error: "tts_failed" }, { status: 500 });
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
