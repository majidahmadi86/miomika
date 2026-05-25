"use client";

export type TtsLang = "th" | "en";

const VOICE_CACHE: { th?: SpeechSynthesisVoice; en?: SpeechSynthesisVoice; loaded?: boolean } = {};

const THAI_VOICE_PRIORITY = ["Kanya", "Premwadee", "Narisa", "th-TH", "Thai"];
const ENGLISH_VOICE_PRIORITY = [
  "Google US English",
  "Samantha",
  "Karen",
  "Microsoft Aria",
  "Microsoft Jenny",
  "en-US",
  "en-GB",
];

function pickVoice(voices: SpeechSynthesisVoice[], lang: TtsLang): SpeechSynthesisVoice | undefined {
  const priority = lang === "th" ? THAI_VOICE_PRIORITY : ENGLISH_VOICE_PRIORITY;
  for (const needle of priority) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(needle.toLowerCase()) ||
        v.lang.toLowerCase().includes(needle.toLowerCase()),
    );
    if (match) return match;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang));
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

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopTts(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  activeUtterance = null;
  window.speechSynthesis.cancel();
}

export async function speak(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }
  if (!VOICE_CACHE.loaded) await preloadTtsVoices();

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "th" ? "th-TH" : "en-US";
  const voice = lang === "th" ? VOICE_CACHE.th : VOICE_CACHE.en;
  if (voice) utter.voice = voice;
  utter.rate = lang === "th" ? 0.95 : 1.0;
  utter.pitch = 1.15;
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

// Language detection: Thai unicode block vs Latin.
export function detectLang(text: string): TtsLang {
  const thaiChars = text.match(/[\u0E00-\u0E7F]/g);
  const latinChars = text.match(/[a-zA-Z]/g);
  const thaiCount = thaiChars?.length ?? 0;
  const latinCount = latinChars?.length ?? 0;
  if (thaiCount === 0 && latinCount === 0) return "en";
  return thaiCount > latinCount ? "th" : "en";
}

// Detect explicit language switch commands.
export function detectLangSwitchCommand(text: string): TtsLang | null {
  const lower = text.toLowerCase().trim();
  if (/(พูด|คุย|สอน).*ไทย/.test(text) || /ไทยหน่อย/.test(text)) return "th";
  if (/(พูด|คุย|สอน).*(อังกฤษ|english)/.test(text)) return "en";
  if (/speak.*(thai|ไทย)|in thai|switch.*thai|teach.*thai/.test(lower)) return "th";
  if (/speak.*english|in english|switch.*english|teach.*english/.test(lower)) return "en";
  return null;
}
