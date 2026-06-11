// Miomika's own sound-effects lib.
// HOUSE RULE: our own smart lib — ZERO dependencies, ZERO audio assets.
// Every effect is synthesized with the Web Audio API: tiny, instant, ours.

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOpts = {
  f: number;
  t: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
};

function tone(c: AudioContext, opts: ToneOpts): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  const start = c.currentTime + opts.t;
  osc.frequency.setValueAtTime(opts.f, start);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, start + opts.dur);
  const peak = opts.gain ?? 0.1;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + opts.dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(start);
  osc.stop(start + opts.dur + 0.05);
}

function play(tones: ToneOpts[]): void {
  const c = audioCtx();
  if (!c) return;
  try {
    for (const t of tones) tone(c, t);
  } catch {
    /* sound is best-effort, never breaking */
  }
}

/** Soft pop — a correct pairing or a right answer. */
export function sfxPop(): void {
  play([{ f: 520, t: 0, dur: 0.1, type: "triangle", glideTo: 790, gain: 0.09 }]);
}

/** Gentle low blip — a miss, never punishing. */
export function sfxWrong(): void {
  play([{ f: 240, t: 0, dur: 0.12, type: "sine", glideTo: 200, gain: 0.06 }]);
}

/** Two-note success — a game completed. */
export function sfxSuccess(): void {
  play([
    { f: 660, t: 0, dur: 0.12, gain: 0.09 },
    { f: 880, t: 0.09, dur: 0.16, gain: 0.09 },
  ]);
}

/** Warm three-note chime — the silver moment. */
export function sfxSilver(): void {
  play([
    { f: 523.25, t: 0, dur: 0.24, gain: 0.09 },
    { f: 659.25, t: 0.08, dur: 0.24, gain: 0.09 },
    { f: 783.99, t: 0.16, dur: 0.3, gain: 0.09 },
  ]);
}

/** Hopeful little lift — almost there, try again. */
export function sfxAlmost(): void {
  play([
    { f: 392, t: 0, dur: 0.16, gain: 0.07 },
    { f: 523.25, t: 0.12, dur: 0.22, gain: 0.08 },
  ]);
}

/** Rising fanfare with a sparkle — the GOLDEN moment. */
export function sfxGold(): void {
  play([
    { f: 523.25, t: 0, dur: 0.22, gain: 0.1 },
    { f: 659.25, t: 0.1, dur: 0.22, gain: 0.1 },
    { f: 783.99, t: 0.2, dur: 0.24, gain: 0.1 },
    { f: 1046.5, t: 0.32, dur: 0.42, gain: 0.11 },
    { f: 1567.98, t: 0.46, dur: 0.3, type: "triangle", gain: 0.05 },
    { f: 2093, t: 0.56, dur: 0.26, type: "triangle", gain: 0.04 },
  ]);
}
