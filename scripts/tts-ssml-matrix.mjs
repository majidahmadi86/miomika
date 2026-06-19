/**
 * Throwaway: isolate which SSML tags are safe on Chirp3-HD-Leda.
 * Run: node scripts/tts-ssml-matrix.mjs
 * Output: scripts/out/<ARM>.mp3
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "scripts", "out");

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

loadEnvLocal();

const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS;
if (!credentialsJson) {
  console.error("GOOGLE_TTS_CREDENTIALS missing (set in env or .env.local)");
  process.exit(1);
}

const credentials = JSON.parse(credentialsJson);
const client = new TextToSpeechClient({ credentials });

const audioConfig = {
  audioEncoding: "MP3",
  speakingRate: 0.9,
  volumeGainDb: 4.0,
};

const cases = [
  {
    arm: "EN_V0",
    voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
    input: { text: "Hi! How are you today? I'm so happy to see you." },
  },
  {
    arm: "EN_V1",
    voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>Hi! <break time="250ms"/> How are you today? <break time="200ms"/> I\'m so happy to see you.</speak>',
    },
  },
  {
    arm: "EN_V2",
    voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>Hi! <break time="250ms"/> <prosody rate="95%">How are you today?</prosody> <break time="200ms"/> <prosody rate="95%">I\'m so happy to see you.</prosody></speak>',
    },
  },
  {
    arm: "EN_V3",
    voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>Hi! <break time="250ms"/> <prosody pitch="+3st">How are you today?</prosody> <break time="200ms"/> <prosody pitch="-1st">I\'m so happy to see you.</prosody></speak>',
    },
  },
  {
    arm: "TH_V0",
    voice: { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda" },
    input: {
      text: "สวัสดีค่ะ วันนี้เป็นยังไงบ้างคะ หนูดีใจที่ได้เจอคุณนะคะ",
    },
  },
  {
    arm: "TH_V1",
    voice: { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>สวัสดีค่ะ <break time="250ms"/> วันนี้เป็นยังไงบ้างคะ <break time="200ms"/> หนูดีใจที่ได้เจอคุณนะคะ</speak>',
    },
  },
  {
    arm: "TH_V2",
    voice: { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>สวัสดีค่ะ <break time="250ms"/> <prosody rate="95%">วันนี้เป็นยังไงบ้างคะ</prosody> <break time="200ms"/> <prosody rate="95%">หนูดีใจที่ได้เจอคุณนะคะ</prosody></speak>',
    },
  },
  {
    arm: "TH_V3",
    voice: { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>สวัสดีค่ะ <break time="250ms"/> <prosody pitch="+3st">วันนี้เป็นยังไงบ้างคะ</prosody> <break time="200ms"/> <prosody pitch="-1st">หนูดีใจที่ได้เจอคุณนะคะ</prosody></speak>',
    },
  },
];

function formatError(err) {
  if (err instanceof Error) {
    const parts = [err.message];
    if (err.code) parts.push(`code: ${err.code}`);
    if (err.details) parts.push(`details: ${err.details}`);
    if (err.metadata) {
      try {
        parts.push(`metadata: ${JSON.stringify(err.metadata, null, 2)}`);
      } catch {
        parts.push(`metadata: ${String(err.metadata)}`);
      }
    }
    return parts.join("\n");
  }
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

function probeDurationSeconds(filePath) {
  try {
    execSync("ffprobe -version", { stdio: "ignore" });
  } catch {
    return null;
  }
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8" },
    ).trim();
    const n = parseFloat(out);
    return Number.isFinite(n) ? n.toFixed(3) : null;
  } catch {
    return null;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const results = [];

for (const c of cases) {
  const row = { arm: c.arm, bytes: null, duration: null, error: null };
  try {
    const [response] = await client.synthesizeSpeech({
      input: c.input,
      voice: c.voice,
      audioConfig,
    });

    if (!response.audioContent) {
      throw new Error("Google TTS returned empty audioContent");
    }

    const bytes =
      response.audioContent instanceof Uint8Array
        ? Buffer.from(response.audioContent)
        : Buffer.from(response.audioContent, "base64");

    const outPath = join(OUT_DIR, `${c.arm}.mp3`);
    writeFileSync(outPath, bytes);
    row.bytes = bytes.length;
    row.duration = probeDurationSeconds(outPath);
  } catch (err) {
    row.error = formatError(err);
    console.error(`--- ${c.arm} ERROR ---\n${row.error}\n`);
  }
  results.push(row);
}

console.log("\nARM | bytes | duration(s) | error");
console.log("--- | --- | --- | ---");
for (const r of results) {
  const bytes = r.bytes ?? "—";
  const duration = r.duration ?? "—";
  const error = r.error ? r.error.replace(/\n/g, " ") : "—";
  console.log(`${r.arm} | ${bytes} | ${duration} | ${error}`);
}
