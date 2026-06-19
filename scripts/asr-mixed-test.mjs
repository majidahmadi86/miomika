import { v2 } from "@google-cloud/speech";
import Groq from "groq-sdk";
import fs from "node:fs";

const PROJECT_ID = "miomika";
const AUDIO_PATH = "testmixedvoice.mp3";
const audioBytes = fs.readFileSync(AUDIO_PATH);
const creds = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);

async function recognize({ label, apiEndpoint, location, model, languageCodes }) {
  const t0 = Date.now();
  try {
    const client = new v2.SpeechClient({ credentials: creds, apiEndpoint });
    const recognizer = `projects/${PROJECT_ID}/locations/${location}/recognizers/_`;
    const [resp] = await client.recognize({
      recognizer,
      config: { autoDecodingConfig: {}, model, languageCodes },
      content: audioBytes,
    });
    const text = (resp.results ?? []).map(r => r.alternatives?.[0]?.transcript ?? "").join(" ").trim();
    console.log(`\n[${label}] ${Date.now()-t0}ms\n  -> ${text || "(empty)"}`);
  } catch (e) { console.log(`\n[${label}] ERROR ${Date.now()-t0}ms\n  -> ${e?.message ?? e}`); }
}

async function whisper() {
  const t0 = Date.now();
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const res = await groq.audio.transcriptions.create({
      file: fs.createReadStream(AUDIO_PATH),
      model: "whisper-large-v3-turbo",
      response_format: "json",
      temperature: 0,
      prompt: "บทสนทนาภาษาไทยและภาษาอังกฤษ Thai and English bilingual conversation.",
    });
    console.log(`\n[whisper auto] ${Date.now()-t0}ms\n  -> ${(res.text ?? "").trim() || "(empty)"}`);
  } catch (e) { console.log(`\n[whisper auto] ERROR ${Date.now()-t0}ms\n  -> ${e?.message ?? e}`); }
}

console.log("Sample: expected ~ 'Hello สวัสดีครับ สบายดีไหมนะครับ how are you today?'");
await recognize({ label: "chirp_2 asia-southeast1 [th-TH] (CURRENT PROD)", apiEndpoint: "asia-southeast1-speech.googleapis.com", location: "asia-southeast1", model: "chirp_2", languageCodes: ["th-TH"] });
await recognize({ label: "chirp_3 global [th-TH,en-US]", apiEndpoint: "speech.googleapis.com", location: "global", model: "chirp_3", languageCodes: ["th-TH","en-US"] });
await recognize({ label: "chirp_3 us [th-TH,en-US]", apiEndpoint: "us-speech.googleapis.com", location: "us", model: "chirp_3", languageCodes: ["th-TH","en-US"] });
await whisper();
