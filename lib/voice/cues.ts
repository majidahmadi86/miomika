"use client";

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
