/**
 * Pre-warm tts_cache with fixed warmth phrases (instant replay on cache hit).
 * Run: npm run prewarm:tts
 * Idempotent — skips keys that already have audio_base64.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { createClient } from "@supabase/supabase-js";
import {
  PRAISE_ALL,
  RECOVERY_RETURN,
  RECOVERY_STRUGGLE,
  ICE_BREAKERS_FIRST,
  ICE_BREAKERS_RETURNING,
  HUMOR_SOFT,
  HOME_REACT_TAP,
  HOME_REACT_DRAG,
  HOME_REACT_LOWFUEL,
  GUIDANCE_GUEST_LIMIT_NEAR,
  GUIDANCE_GUEST_LIMIT_HIT,
  TALK_FREE_LIMIT_CONTINUE,
  GUIDANCE_IDLE,
  GUIDANCE_STREAK,
  GUIDANCE_MASTERY,
} from "../lib/voice/warmth.ts";

const ROOT = process.cwd();
const SPEAKING_RATE = 0.9;
const VOLUME_GAIN_DB = 4.0;
const SYNTH_DELAY_MS = 150;
/** ~$16 / 1M chars (Chirp3-HD ballpark for ops logging). */
const EST_COST_PER_CHAR_USD = 16 / 1_000_000;

const WARMTH_SOURCES = [
  { label: "PRAISE_ALL", items: PRAISE_ALL },
  { label: "RECOVERY_RETURN", items: RECOVERY_RETURN },
  { label: "RECOVERY_STRUGGLE", items: RECOVERY_STRUGGLE },
  { label: "ICE_BREAKERS_FIRST", items: ICE_BREAKERS_FIRST },
  { label: "ICE_BREAKERS_RETURNING", items: ICE_BREAKERS_RETURNING },
  { label: "HUMOR_SOFT", items: HUMOR_SOFT },
  { label: "HOME_REACT_TAP", items: HOME_REACT_TAP },
  { label: "HOME_REACT_DRAG", items: HOME_REACT_DRAG },
  { label: "HOME_REACT_LOWFUEL", items: HOME_REACT_LOWFUEL },
  { label: "GUIDANCE_GUEST_LIMIT_NEAR", items: GUIDANCE_GUEST_LIMIT_NEAR },
  { label: "GUIDANCE_GUEST_LIMIT_HIT", items: GUIDANCE_GUEST_LIMIT_HIT },
  { label: "TALK_FREE_LIMIT_CONTINUE", items: TALK_FREE_LIMIT_CONTINUE },
  { label: "GUIDANCE_IDLE", items: GUIDANCE_IDLE },
  { label: "GUIDANCE_STREAK", items: GUIDANCE_STREAK },
  { label: "GUIDANCE_MASTERY", items: GUIDANCE_MASTERY },
];

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function requireEnv(name) {
  const val = process.env[name]?.trim();
  if (!val) {
    console.error(`[prewarm:tts] FATAL — ${name} is missing (set in env or .env.local)`);
    process.exit(1);
  }
  return val;
}

function voiceNameForLang(lang) {
  return lang === "th" ? "th-TH-Chirp3-HD-Leda" : "en-US-Chirp3-HD-Leda";
}

function languageCodeForLang(lang) {
  return lang === "th" ? "th-TH" : "en-US";
}

/** Match app/api/talk/speak/route.ts buildCacheKey exactly. */
function buildCacheKey(text, lang) {
  const trimmed = text.trim();
  const voiceName = voiceNameForLang(lang);
  const raw = `${trimmed}|${lang}|${voiceName}|${SPEAKING_RATE}|${VOLUME_GAIN_DB}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function flattenWarmthPairs() {
  const seen = new Set();
  const pairs = [];
  let skippedTemplated = 0;

  for (const { label, items } of WARMTH_SOURCES) {
    for (const item of items) {
      for (const lang of ["th", "en"]) {
        const text = (item[lang] ?? "").trim();
        if (!text) continue;
        if (text.includes("{")) {
          skippedTemplated++;
          continue;
        }
        const key = `${lang}\0${text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ text, lang, source: label });
      }
    }
  }

  return { pairs, skippedTemplated };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(client, text, lang) {
  const voiceName = voiceNameForLang(lang);
  const [response] = await client.synthesizeSpeech({
    input: { text: text.trim() },
    voice: { languageCode: languageCodeForLang(lang), name: voiceName },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: SPEAKING_RATE,
      volumeGainDb: VOLUME_GAIN_DB,
    },
  });

  if (!response.audioContent) {
    throw new Error("Google TTS returned empty audioContent");
  }

  const bytes =
    response.audioContent instanceof Uint8Array
      ? response.audioContent
      : Buffer.from(response.audioContent, "base64");
  const audioBase64 = Buffer.from(bytes).toString("base64");
  if (!audioBase64) {
    throw new Error("Google TTS returned empty base64 audio");
  }
  return { audioBase64, voiceName };
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const credentialsJson = requireEnv("GOOGLE_TTS_CREDENTIALS");

  const credentials = JSON.parse(credentialsJson);
  const ttsClient = new TextToSpeechClient({ credentials });
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { pairs, skippedTemplated } = flattenWarmthPairs();
  console.log(
    `[prewarm:tts] ${pairs.length} unique fixed phrase×lang pairs (${skippedTemplated} templated strings skipped)`,
  );

  let skipped = 0;
  let generated = 0;
  let generatedChars = 0;
  const total = pairs.length;

  for (let i = 0; i < pairs.length; i++) {
    const { text, lang, source } = pairs[i];
    const cacheKey = buildCacheKey(text, lang);
    const n = i + 1;

    const { data: existing, error: readError } = await supabase
      .from("tts_cache")
      .select("id, audio_base64")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (readError) {
      console.error(`[prewarm:tts] cache read failed (${n}/${total}):`, readError.message);
      process.exit(1);
    }

    if (existing?.audio_base64) {
      skipped++;
      console.log(`[prewarm:tts] ${n}/${total} skip (cached) [${source}] ${lang}: ${text.slice(0, 48)}…`);
      continue;
    }

    console.log(`[prewarm:tts] ${n}/${total} synth [${source}] ${lang}: ${text.slice(0, 48)}…`);

    let audioBase64;
    let voiceName;
    try {
      ({ audioBase64, voiceName } = await synthesize(ttsClient, text, lang));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[prewarm:tts] synth failed (${n}/${total}):`, detail);
      process.exit(1);
    }

    const now = new Date().toISOString();
    const row = {
      cache_key: cacheKey,
      text: text.trim(),
      lang,
      voice: voiceName,
      audio_base64: audioBase64,
      request_count: 1,
      last_used_at: now,
    };

    const { error: writeError } = existing?.id
      ? await supabase.from("tts_cache").update(row).eq("id", existing.id)
      : await supabase.from("tts_cache").insert(row);

    if (writeError) {
      console.error(`[prewarm:tts] cache write failed (${n}/${total}):`, writeError.message);
      process.exit(1);
    }

    generated++;
    generatedChars += text.trim().length;

    if (i < pairs.length - 1) {
      await sleep(SYNTH_DELAY_MS);
    }
  }

  const estCostUsd = generatedChars * EST_COST_PER_CHAR_USD;
  console.log("[prewarm:tts] done");
  console.log(`  total pairs:     ${total}`);
  console.log(`  skipped (warm):  ${skipped}`);
  console.log(`  generated:       ${generated}`);
  console.log(`  synth chars:     ${generatedChars}`);
  console.log(`  est. cost (USD): ~$${estCostUsd.toFixed(4)}`);
}

main().catch((err) => {
  console.error("[prewarm:tts] fatal:", err);
  process.exit(1);
});
