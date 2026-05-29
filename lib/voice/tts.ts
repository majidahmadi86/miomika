"use client";

export type TtsLang = "th" | "en";

export type SpeakOptions = {
  speakingRate?: number;
};

const RETRY_DELAYS_MS = [0, 250, 400];

import { getSharedAudioOrchestrator } from "@/lib/conversation/audio";

async function fetchServerAudio(
  text: string,
  lang: TtsLang,
  speakingRate?: number,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt] ?? 800;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    try {
      const body: { text: string; lang: TtsLang; speakingRate?: number } = { text, lang };
      if (speakingRate !== undefined) body.speakingRate = speakingRate;
      const res = await fetch("/api/talk/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "(no body)");
        console.error(`[tts] server returned ${res.status}:`, errBody);
        continue;
      }
      const data = (await res.json()) as { audio?: unknown };
      if (typeof data.audio === "string" && data.audio.length > 0) {
        return data.audio;
      }
    } catch (e) {
      console.error("[tts] fetch threw:", e);
    }
  }
  return null;
}

export async function preloadTtsVoices(): Promise<void> {
  const { preloadAudioVoices } = await import("@/lib/conversation/audio");
  await preloadAudioVoices();
}

export function stopTts(): void {
  getSharedAudioOrchestrator().killAll();
}

export async function speak(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
  options?: SpeakOptions,
): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  const audio = getSharedAudioOrchestrator();
  audio.killAll();

  await new Promise((r) => setTimeout(r, 50));

  const speakingRate = options?.speakingRate;
  callbacks?.onStart?.();

  try {
    const audioBase64 = await fetchServerAudio(text, lang, speakingRate);

    if (audioBase64) {
      await audio.playMp3Base64(audioBase64);
      callbacks?.onEnd?.();
      return;
    }

    console.warn("[tts] FALLBACK FIRED — server failed after retries. Browser voice will play.");
    await audio.playBrowserTts(text, lang, speakingRate);
    callbacks?.onEnd?.();
  } catch (e) {
    console.error("[tts] speak error:", e);
    callbacks?.onError?.();
  }
}

export function detectLang(text: string): TtsLang {
  const thaiChars = text.match(/[\u0E00-\u0E7F]/g);
  const latinChars = text.match(/[a-zA-Z]/g);
  const thaiCount = thaiChars?.length ?? 0;
  const latinCount = latinChars?.length ?? 0;
  if (thaiCount === 0 && latinCount === 0) return "en";
  return thaiCount > latinCount ? "th" : "en";
}

export function detectLangSwitchCommand(text: string): TtsLang | null {
  const lower = text.toLowerCase().trim();
  if (/(พูด|คุย|สอน).*ไทย/.test(text) || /ไทยหน่อย/.test(text)) return "th";
  if (/(พูด|คุย|สอน).*(อังกฤษ|english)/.test(text)) return "en";
  if (/speak.*(thai|ไทย)|in thai|switch.*thai|teach.*thai/.test(lower)) return "th";
  if (/speak.*english|in english|switch.*english|teach.*english/.test(lower)) return "en";
  return null;
}
