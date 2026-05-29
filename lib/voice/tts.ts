"use client";

export type TtsLang = "th" | "en";

export type SpeakOptions = {
  speakingRate?: number;
};

const VOICE_CACHE: { th?: SpeechSynthesisVoice; en?: SpeechSynthesisVoice; loaded?: boolean } = {};

// Ranked by perceived naturalness on real devices (Android Chrome, iOS Safari, Desktop Chrome).
// "Google" and "Microsoft Natural/Neural" voices generally sound the most human.
// "Online" voices (suffix on Microsoft) are higher quality than offline.
const THAI_VOICE_PRIORITY = [
  "Google ภาษาไทย",
  "Microsoft Premwadee Online",
  "Microsoft Niwat Online",
  "Microsoft Achara Online",
  "Premwadee",
  "Niwat",
  "Achara",
  "Kanya",
  "Narisa",
  "Thai",
  "th-TH",
];

const ENGLISH_VOICE_PRIORITY = [
  "Google US English",
  "Google UK English Female",
  "Microsoft Aria Online",
  "Microsoft Jenny Online",
  "Microsoft Ava Online",
  "Microsoft Emma Online",
  "Samantha",
  "Karen",
  "Allison",
  "Ava",
  "Aria",
  "Jenny",
  "en-US",
  "en-GB",
];

const RETRY_DELAYS_MS = [0, 250, 400];

let speakInFlight: AbortController | null = null;

function pickVoice(voices: SpeechSynthesisVoice[], lang: TtsLang): SpeechSynthesisVoice | undefined {
  const priority = lang === "th" ? THAI_VOICE_PRIORITY : ENGLISH_VOICE_PRIORITY;
  for (const needle of priority) {
    const lowerNeedle = needle.toLowerCase();
    const match = voices.find((v) => v.name.toLowerCase().includes(lowerNeedle));
    if (match) return match;
  }
  const femaleHints = ["female", "woman", "aria", "jenny", "samantha", "karen", "ava", "premwadee", "achara"];
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  for (const hint of femaleHints) {
    const match = langVoices.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return langVoices[0];
}

function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}

export async function preloadTtsVoices(): Promise<void> {
  const voices = await ensureVoicesLoaded();
  VOICE_CACHE.th = pickVoice(voices, "th");
  VOICE_CACHE.en = pickVoice(voices, "en");
  VOICE_CACHE.loaded = true;
}

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopTts(): void {
  if (typeof window === "undefined") return;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  activeUtterance = null;
  window.speechSynthesis?.cancel();
}

async function fetchServerAudio(
  text: string,
  lang: TtsLang,
  signal: AbortSignal,
  speakingRate?: number,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal.aborted) return null;
    const delay = RETRY_DELAYS_MS[attempt] ?? 800;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (signal.aborted) return null;
    try {
      const body: { text: string; lang: TtsLang; speakingRate?: number } = { text, lang };
      if (speakingRate !== undefined) {
        body.speakingRate = speakingRate;
      }
      const res = await fetch("/api/talk/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "(no body)");
        console.error(`[tts] server returned ${res.status}:`, body);
        continue;
      }
      const data = (await res.json()) as { audio?: unknown };
      if (typeof data.audio === "string" && data.audio.length > 0) {
        return data.audio;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return null;
    }
  }
  return null;
}

async function trySpeakViaServer(
  text: string,
  lang: TtsLang,
  signal: AbortSignal,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
  speakingRate?: number,
): Promise<boolean> {
  const audioBase64 = await fetchServerAudio(text, lang, signal, speakingRate);
  if (!audioBase64 || signal.aborted) return false;

  return new Promise((resolve) => {
    const el = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    activeAudio = el;

    const fail = () => {
      el.pause();
      el.currentTime = 0;
      activeAudio = null;
      resolve(false);
    };

    const onAbort = () => {
      el.pause();
      el.currentTime = 0;
      activeAudio = null;
      resolve(false);
    };

    signal.addEventListener("abort", onAbort, { once: true });

    el.onended = () => {
      signal.removeEventListener("abort", onAbort);
      activeAudio = null;
      if (!signal.aborted) callbacks?.onEnd?.();
      resolve(!signal.aborted);
    };
    el.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      fail();
    };

    void el.play().catch(fail);
  });
}

async function speakViaBrowser(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
  speakingRate?: number,
): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    callbacks?.onEnd?.();
    return;
  }
  if (!VOICE_CACHE.loaded) await preloadTtsVoices();

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "th" ? "th-TH" : "en-US";
  const voice = lang === "th" ? VOICE_CACHE.th : VOICE_CACHE.en;
  if (voice) utter.voice = voice;
  utter.rate = speakingRate ?? (lang === "th" ? 0.92 : 1.0);
  utter.pitch = lang === "th" ? 1.05 : 1.12;
  utter.volume = 1.0;

  utter.onstart = () => callbacks?.onStart?.();
  utter.onend = () => {
    if (activeUtterance === utter) activeUtterance = null;
    callbacks?.onEnd?.();
  };
  utter.onerror = () => {
    if (activeUtterance === utter) activeUtterance = null;
    callbacks?.onError?.();
  };

  activeUtterance = utter;
  window.speechSynthesis.speak(utter);
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

  if (speakInFlight) {
    speakInFlight.abort();
    speakInFlight = null;
  }
  stopTts();

  const ctrl = new AbortController();
  speakInFlight = ctrl;
  const { signal } = ctrl;
  const speakingRate = options?.speakingRate;

  callbacks?.onStart?.();

  try {
    const serverOk = await trySpeakViaServer(text, lang, signal, callbacks, speakingRate);
    if (signal.aborted) return;
    if (serverOk) return;

    console.warn("[tts] FALLBACK FIRED — server failed after retries. Browser voice will play.");
    await speakViaBrowser(text, lang, callbacks, speakingRate);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return;
    callbacks?.onError?.();
  } finally {
    if (speakInFlight === ctrl) {
      speakInFlight = null;
    }
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
