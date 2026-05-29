"use client";

import type { TtsLang } from "@/lib/voice/tts";
import { preloadTtsVoices } from "@/lib/voice/tts";

type VoiceCache = { th?: SpeechSynthesisVoice; en?: SpeechSynthesisVoice; loaded?: boolean };

const VOICE_CACHE: VoiceCache = {};

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

async function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return existing;
  return new Promise((resolve) => {
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}

async function loadVoiceCache(): Promise<void> {
  if (VOICE_CACHE.loaded) return;
  const voices = await ensureVoicesLoaded();
  VOICE_CACHE.th = pickVoice(voices, "th");
  VOICE_CACHE.en = pickVoice(voices, "en");
  VOICE_CACHE.loaded = true;
}

/**
 * Single source of truth for playback — at most one HTMLAudioElement OR
 * SpeechSynthesisUtterance active at any time.
 */
export class AudioOrchestrator {
  private activeAudio: HTMLAudioElement | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  killAll(): void {
    if (typeof window === "undefined") return;
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
    this.activeUtterance = null;
    window.speechSynthesis?.cancel();
  }

  isPlaying(): boolean {
    if (this.activeAudio && !this.activeAudio.paused) return true;
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
    return false;
  }

  async playMp3Base64(b64: string): Promise<void> {
    this.killAll();
    if (typeof window === "undefined" || !b64) return;

    return new Promise((resolve) => {
      const el = new Audio(`data:audio/mp3;base64,${b64}`);
      this.activeAudio = el;
      const finish = () => {
        if (this.activeAudio === el) this.activeAudio = null;
        resolve();
      };
      el.onended = finish;
      el.onerror = finish;
      void el.play().catch(finish);
    });
  }

  async playBrowserTts(text: string, lang: TtsLang, rate?: number): Promise<void> {
    this.killAll();
    if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;

    await loadVoiceCache();
    window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === "th" ? "th-TH" : "en-US";
      const voice = lang === "th" ? VOICE_CACHE.th : VOICE_CACHE.en;
      if (voice) utter.voice = voice;
      utter.rate = rate ?? (lang === "th" ? 0.92 : 1.0);
      utter.pitch = lang === "th" ? 1.05 : 1.12;
      utter.volume = 1.0;

      utter.onend = () => {
        if (this.activeUtterance === utter) this.activeUtterance = null;
        resolve();
      };
      utter.onerror = () => {
        if (this.activeUtterance === utter) this.activeUtterance = null;
        resolve();
      };

      this.activeUtterance = utter;
      window.speechSynthesis.speak(utter);
    });
  }
}

let sharedInstance: AudioOrchestrator | null = null;

export function getSharedAudioOrchestrator(): AudioOrchestrator {
  if (!sharedInstance) sharedInstance = new AudioOrchestrator();
  return sharedInstance;
}

/** Preload browser voices for AudioOrchestrator fallback paths. */
export async function preloadAudioVoices(): Promise<void> {
  await preloadTtsVoices();
  await loadVoiceCache();
}
