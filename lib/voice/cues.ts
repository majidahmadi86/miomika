"use client";

import { fetchTtsClip, playWarmClip, type TtsLang } from "@/lib/voice/tts";

/** Very short on-brand fillers — each under ~1s when synthesized. */
const THINKING_CUE_TEXTS: Record<TtsLang, readonly string[]> = {
  th: ["อืม~", "อืมม~", "เอ่อ~", "เดี๋ยวดูนะคะ~", "น่าสนใจจังเลย~", "หนูฟังอยู่ค่า~"],
  en: ["Mm~", "Mmhm~", "Hmm~", "Let's see~", "Oh~", "Okay~"],
};

let rotateIdx = 0;
const thinkingAudioCache: Partial<Record<TtsLang, string[]>> = {};
const preloadInFlight: Partial<Record<TtsLang, Promise<void>>> = {};

// SVG / synth-based tones — no asset files needed.
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
  } catch { return null; }
  return audioCtx;
}

function tone(freq: number, durationMs: number, volume = 0.08): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch { /* ignore */ }
}

/** Soft chime when mic opens — "your turn". */
export function cueListening(): void { tone(880, 130); }

/** Soft double tone when a turn times out — "sorry, try again". */
export function cueSorry(): void {
  tone(330, 110, 0.06);
  window.setTimeout(() => tone(392, 140, 0.06), 130);
}

/** Synthesize and cache rotating thinking fillers via server TTS. */
export async function preloadThinkingCues(lang: TtsLang): Promise<void> {
  if (typeof window === "undefined") return;
  if (thinkingAudioCache[lang]?.length) return;
  const existing = preloadInFlight[lang];
  if (existing) return existing;

  const job = (async () => {
    const texts = THINKING_CUE_TEXTS[lang];
    const clips = await Promise.all(texts.map((text) => fetchTtsClip(text, lang)));
    const ready = clips.filter((c): c is string => typeof c === "string" && c.length > 0);
    if (ready.length > 0) thinkingAudioCache[lang] = ready;
  })();

  preloadInFlight[lang] = job;
  try {
    await job;
  } finally {
    delete preloadInFlight[lang];
  }
}

/** Play one cached thinking cue (rotates). Returns false if nothing cached. */
export async function playThinkingCue(lang: TtsLang): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let cached = thinkingAudioCache[lang];
  if (!cached?.length) {
    await preloadThinkingCues(lang);
    cached = thinkingAudioCache[lang];
  }
  if (!cached?.length) return false;
  const clip = cached[rotateIdx % cached.length]!;
  rotateIdx += 1;
  return playWarmClip(clip);
}
