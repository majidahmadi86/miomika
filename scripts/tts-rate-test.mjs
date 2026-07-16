/**
 * Throwaway ear-test: Miomi's Leda voice at four speaking rates so Mike can
 * PICK her tonation by listening, not guessing.
 * Run: node scripts/tts-rate-test.mjs   (uses .env.local GCP creds like tts-prosody-test)
 * Output: leda_th_080.mp3 / 085 / 09 (current default) / 1.mp3, same for EN.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const ROOT = process.cwd();
function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}
loadEnvLocal();
const creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON);
const client = new TextToSpeechClient({ credentials: creds, projectId: process.env.GCP_PROJECT_ID });

const SAMPLES = [
  { lang: "th", voice: "th-TH-Chirp3-HD-Leda", code: "th-TH", text: "สวัสดีค่ะ! วันนี้เป็นยังไงบ้างคะ กินข้าวหรือยังเอ่ย อุ๊ย ถ้ายังไม่กิน หนูจะงอนนะคะ" },
  { lang: "en", voice: "en-US-Chirp3-HD-Leda", code: "en-US", text: "Hello! How is your day going? Have you eaten yet? Ooh, if you have not, I might get a little pouty." },
];
const RATES = [0.8, 0.85, 0.9, 1.0];

for (const s of SAMPLES) {
  for (const rate of RATES) {
    const [res] = await client.synthesizeSpeech({
      input: { text: s.text },
      voice: { languageCode: s.code, name: s.voice },
      audioConfig: { audioEncoding: "MP3", speakingRate: rate },
    });
    const file = `leda_${s.lang}_${String(rate).replace(".", "")}.mp3`;
    writeFileSync(join(ROOT, file), res.audioContent, "binary");
    console.log("wrote", file);
  }
}
console.log("Done. Listen and pick the rate where she sounds most like herself.");
