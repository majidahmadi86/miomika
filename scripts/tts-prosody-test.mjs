/**
 * Throwaway: test Chirp3-HD-Leda SSML <prosody>/<break> on synthesizeSpeech.
 * Run: node scripts/tts-prosody-test.mjs
 * Output: plain_th.mp3, ssml_th.mp3, plain_en.mp3, ssml_en.mp3 (cwd)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const ROOT = process.cwd();

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
    file: "plain_th.mp3",
    voice: { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda" },
    input: {
      text: "สวัสดีค่ะ วันนี้เป็นยังไงบ้างคะ หนูดีใจที่ได้เจอคุณนะคะ",
    },
  },
  {
    file: "ssml_th.mp3",
    voice: { languageCode: "th-TH", name: "th-TH-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>สวัสดีค่ะ~ <break time="250ms"/> <prosody pitch="+3st" rate="95%">วันนี้เป็นยังไงบ้างคะ</prosody> <break time="200ms"/> <prosody pitch="-1st">หนูดีใจที่ได้เจอคุณนะคะ</prosody></speak>',
    },
  },
  {
    file: "plain_en.mp3",
    voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
    input: {
      text: "Hi! How are you today? I'm so happy to see you.",
    },
  },
  {
    file: "ssml_en.mp3",
    voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
    input: {
      ssml:
        '<speak>Hi! <break time="250ms"/> <prosody pitch="+3st">How are you today?</prosody> <break time="200ms"/> <prosody pitch="-1st">I\'m so happy to see you.</prosody></speak>',
    },
  },
];

function formatError(err) {
  if (err instanceof Error) {
    const parts = [err.message];
    if (err.stack) parts.push(err.stack);
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

const results = [];

for (const c of cases) {
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

    const outPath = join(ROOT, c.file);
    writeFileSync(outPath, bytes);
    results.push({ file: c.file, status: "ok", bytes: bytes.length });
    console.log(`OK  ${c.file} — ${bytes.length} bytes`);
  } catch (err) {
    const detail = formatError(err);
    results.push({ file: c.file, status: "error", error: detail });
    console.error(`ERR ${c.file}:\n${detail}\n`);
  }
}

console.log("\n--- summary ---");
for (const r of results) {
  if (r.status === "ok") {
    console.log(`${r.file}: SUCCESS (${r.bytes} bytes)`);
  } else {
    console.log(`${r.file}: ERROR`);
  }
}
