"use client";

export type TtsLang = "th" | "en";

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

function pickVoice(voices: SpeechSynthesisVoice[], lang: TtsLang): SpeechSynthesisVoice | undefined {
  const priority = lang === "th" ? THAI_VOICE_PRIORITY : ENGLISH_VOICE_PRIORITY;
  // First pass: exact substring match on the priority list, in order.
  for (const needle of priority) {
    const lowerNeedle = needle.toLowerCase();
    const match = voices.find((v) => v.name.toLowerCase().includes(lowerNeedle));
    if (match) return match;
  }
  // Second pass: female voices in the right language (sound less robotic on average).
  const femaleHints = ["female", "woman", "aria", "jenny", "samantha", "karen", "ava", "premwadee", "achara"];
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  for (const hint of femaleHints) {
    const match = langVoices.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  // Third pass: any voice in the right language.
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
  // Server warm-up skipped — /api/talk/speak would synthesize audio and cost credits.
}

// Module-level singleton: only ONE audio source plays at a time.
let __audioGen = 0;
let __activeAudio: HTMLAudioElement | null = null;
let __supersede: (() => void) | null = null;

// Shared Web Audio playback chain: element → compressor → makeup gain → destination.
let __playbackCtx: AudioContext | null = null;
let __playbackCompressor: DynamicsCompressorNode | null = null;
let __playbackSource: MediaElementAudioSourceNode | null = null;
let __playbackUnlocked = false;

function getPlaybackCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (__playbackCtx) return __playbackCtx;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;

    const gain = ctx.createGain();
    gain.gain.value = 1.7;

    compressor.connect(gain);
    gain.connect(ctx.destination);

    __playbackCtx = ctx;
    __playbackCompressor = compressor;
  } catch {
    return null;
  }
  return __playbackCtx;
}

/** Resume shared AudioContext after a user gesture (mobile autoplay policy). */
export function unlockTtsPlayback(): void {
  const ctx = getPlaybackCtx();
  if (!ctx || __playbackUnlocked) return;
  void ctx.resume().then(() => {
    __playbackUnlocked = true;
  }).catch(() => {});
}

function disconnectPlaybackSource(): void {
  if (!__playbackSource) return;
  try {
    __playbackSource.disconnect();
  } catch {
    /* ignore */
  }
  __playbackSource = null;
}

function routeElementThroughPlayback(el: HTMLAudioElement): void {
  const ctx = getPlaybackCtx();
  if (!ctx || !__playbackCompressor) return;
  disconnectPlaybackSource();
  try {
    __playbackSource = ctx.createMediaElementSource(el);
    __playbackSource.connect(__playbackCompressor);
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
  } catch {
    __playbackSource = null;
  }
}

if (typeof window !== "undefined") {
  const onFirstGesture = () => {
    unlockTtsPlayback();
  };
  window.addEventListener("pointerdown", onFirstGesture, { once: true, passive: true });
  window.addEventListener("keydown", onFirstGesture, { once: true, passive: true });
}

// Global "is Miomi audibly speaking right now" flag.
// Read synchronously by /talk to gate VAD.
let __isSpeaking = false;
const __speakingListeners = new Set<(speaking: boolean) => void>();

export function isSpeakingNow(): boolean {
  return __isSpeaking;
}

export function subscribeSpeaking(cb: (speaking: boolean) => void): () => void {
  __speakingListeners.add(cb);
  return () => __speakingListeners.delete(cb);
}

function setSpeaking(value: boolean) {
  if (__isSpeaking === value) return;
  __isSpeaking = value;
  __speakingListeners.forEach((cb) => {
    try { cb(value); } catch { /* ignore */ }
  });
}

export function killAllAudio(): void {
  __audioGen += 1;
  disconnectPlaybackSource();
  if (__activeAudio) {
    try {
      __activeAudio.pause();
      __activeAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    __activeAudio = null;
  }
  if (__supersede) {
    const s = __supersede;
    __supersede = null;
    s();
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  setSpeaking(false);
}

export function stopTts(): void {
  if (typeof window === "undefined") return;
  killAllAudio();
}

async function fetchServerAudio(text: string, lang: TtsLang): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    try {
      const res = await fetch("/api/talk/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, lang }),
      });
      if (res.status === 503) {
        if (attempt === maxAttempts - 1) {
          console.warn("[tts] server 503, falling back to browser");
        }
        continue;
      }
      if (!res.ok) continue;
      const data = (await res.json()) as { audio?: unknown };
      if (typeof data.audio === "string" && data.audio.length > 0) {
        return data.audio;
      }
    } catch {
      // retry below
    }
  }
  return null;
}

function playMp3OnElement(el: HTMLAudioElement, audioBase64: string, gen: number): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onErr);
      resolve(gen === __audioGen && ok);
    };
    const onEnded = () => finish(true);
    const onErr = () => finish(false);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onErr);
    el.src = `data:audio/mp3;base64,${audioBase64}`;
    void el.play().catch(() => finish(false));
  });
}

/** Play one server MP3 chunk without killing a multi-chunk sequence. */
function playServerAudioChunk(
  audioBase64: string,
  gen: number,
  manageSpeakingFlag: boolean,
): Promise<boolean> {
  return new Promise((resolve) => {
    const el = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    __activeAudio = el;
    const teardown = () => {
      disconnectPlaybackSource();
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      __activeAudio = null;
    };
    const finish = (ok: boolean) => {
      if (gen !== __audioGen) {
        teardown();
        resolve(false);
        return;
      }
      teardown();
      resolve(ok);
    };
    el.onended = () => finish(true);
    el.onerror = () => finish(false);
    routeElementThroughPlayback(el);
    unlockTtsPlayback();
    if (manageSpeakingFlag) setSpeaking(true);
    void el.play().catch(() => finish(false));
  });
}

async function trySpeakViaServer(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<boolean> {
  const audioBase64 = await fetchServerAudio(text, lang);
  if (!audioBase64) return false;

  return new Promise((resolve) => {
    killAllAudio();
    const myGen = ++__audioGen;
    __supersede = () => {
      __supersede = null;
      resolve(true);
    };
    void playServerAudioChunk(audioBase64, myGen, true).then((ok) => {
      if (myGen !== __audioGen) return;
      __supersede = null;
      setSpeaking(false);
      if (ok) callbacks?.onEnd?.();
      resolve(ok);
    });
  });
}

const THAI_CLOSING_PARTICLE =
  /(?<=(?:นะคะ|นะครับ|ค่ะ|ค่า|ครับ|จ้า|นะ|ฮะ|คะ)(?:~|ๆ)?)\s+(?=[\u0E00-\u0E7F])/;

function isCleanTtsChunkSplit(chunks: string[]): boolean {
  if (chunks.length < 2) return false;
  for (const c of chunks) {
    const t = c.trim();
    if (t.length < 2) return false;
    if (!/[\u0E00-\u0E7FA-Za-z]/.test(t)) return false;
  }
  return true;
}

function splitAtSentenceBoundaries(text: string): string[] {
  const out: string[] = [];
  for (const block of text.split(/\n+/)) {
    const para = block.trim();
    if (!para) continue;
    const parts = para.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
    out.push(...parts);
  }
  return out;
}

function splitAtThaiClosingParticles(text: string): string[] {
  if (!/[\u0E00-\u0E7F]/.test(text)) return [];
  return text
    .split(THAI_CLOSING_PARTICLE)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Split a reply for gapless multi-chunk TTS; returns one element when no clean split exists. */
export function splitReplyIntoTtsChunks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const bySentence = splitAtSentenceBoundaries(trimmed);
  if (isCleanTtsChunkSplit(bySentence)) return bySentence;

  const byParticle = splitAtThaiClosingParticles(trimmed);
  if (isCleanTtsChunkSplit(byParticle)) return byParticle;

  return [trimmed];
}

async function speakChunkedSequence(
  chunks: string[],
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<void> {
  killAllAudio();
  callbacks?.onStart?.();
  const myGen = ++__audioGen;
  setSpeaking(true);

  let aborted = false;
  __supersede = () => {
    aborted = true;
  };

  const finish = (ok: boolean) => {
    if (myGen !== __audioGen) return;
    __supersede = null;
    setSpeaking(false);
    if (ok) callbacks?.onEnd?.();
    else callbacks?.onError?.();
  };

  const restFetches = chunks.slice(1).map((chunk) => fetchServerAudio(chunk, lang));
  const firstAudio = await fetchServerAudio(chunks[0]!, lang);
  if (aborted || myGen !== __audioGen) return;
  if (!firstAudio) {
    console.warn("[tts] server TTS failed; one-voice policy: staying silent");
    finish(false);
    return;
  }

  const el = new Audio();
  __activeAudio = el;
  routeElementThroughPlayback(el);
  unlockTtsPlayback();

  const firstOk = await playMp3OnElement(el, firstAudio, myGen);
  if (aborted || myGen !== __audioGen) return;
  if (!firstOk) {
    disconnectPlaybackSource();
    __activeAudio = null;
    finish(false);
    return;
  }

  const restAudios = await Promise.all(restFetches);
  if (aborted || myGen !== __audioGen) return;

  for (const audio of restAudios) {
    if (!audio) {
      console.warn("[tts] server TTS failed; one-voice policy: staying silent");
      disconnectPlaybackSource();
      __activeAudio = null;
      finish(false);
      return;
    }
    if (aborted || myGen !== __audioGen) return;
    const ok = await playMp3OnElement(el, audio, myGen);
    if (aborted || myGen !== __audioGen) return;
    if (!ok) {
      disconnectPlaybackSource();
      __activeAudio = null;
      finish(false);
      return;
    }
  }

  disconnectPlaybackSource();
  __activeAudio = null;
  finish(true);
}

/** Strip written laughter, stage directions, emojis, and markdown before TTS. */
export function stripForTts(text: string): string {
  let s = text;
  // Parenthetical asides and *stage directions* are for the eyes, not the voice.
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\*[^*]+\*/g, " ");
  // Laughter — match even when glued to other scripts (no word-boundary needed),
  // and lone "ha"/"haha"/"ha ha"/"hehe"/"lol"/"55+".
  s = s.replace(/(?:ha\s*){2,}/gi, " ");
  s = s.replace(/\bha\b/gi, " ");
  s = s.replace(/(?:he){2,}/gi, " ");
  s = s.replace(/\b(?:lol|lmao|rofl|haha|hahaha|hehe)\b/gi, " ");
  s = s.replace(/ฮ+(?:า|่า)?(?:ฮ+(?:า|่า)?)*/g, " ");
  s = s.replace(/5{2,}/g, " ");
  // Emoji, pictographs, dingbats, arrows, variation selectors, ZWJ, gender signs —
  // invisible-to-meaning but spoken as "smiling face" / garbled noise by Leda.
  s = s.replace(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{2640}\u{2642}\u{FE0F}]/gu,
    " ",
  );
  // Leftover markdown / decoration that would be read aloud as stray symbols.
  s = s.replace(/[*_`#>~|]+/g, " ");
  // Her name reads as "MY-omi" in Leda — spell it phonetically so it says "Mee-oh-mi".
  s = s.replace(/\bMiomi\b/gi, "Mee-oh-mee");
  s = s.replace(/Mio-?mi/gi, "Mee-oh-mee");
  s = s.replace(/มิโอมิ/g, "มิ-โอ-มิ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ─── PER-SEGMENT LANGUAGE ROUTING ────────────────────────────────────────────
// Google Chirp3-HD has SEPARATE Thai and English voices — it cannot code-switch.
// So a bilingual reply is split into ordered Thai / English runs, each synthesized
// in its matching voice. Two safety nets keep this robust:
//   • lone Thai final-particles (even with punctuation) are folded into a neighbour
//     so they're never voiced alone (a solo "ค่ะ" renders as an unstable "ka-a"/"ha");
//   • if ANY segment fails to synthesize, we fall back to ONE single-voice call of
//     the whole reply, so she is never cut off mid-sentence.

export type LangSegment = { text: string; lang: TtsLang };

function letterCount(s: string): number {
  return (s.match(/[\u0E00-\u0E7FA-Za-z]/g) ?? []).length;
}

// A Thai run that is NOTHING but sentence-final particles (optionally wrapped in
// spaces / punctuation like "ค่ะ!" or ", คะ"). Synthesized alone these become a
// drawn-out "kâ-à" / breathy "ha"; they must ride along with their neighbour.
const PUNCT = "[\\s~ๆฯ!?.,…:;\"'()\\-]";
const THAI_PARTICLE_ONLY = new RegExp(
  `^${PUNCT}*(?:ค่ะ|ค่า|คะ|ค๊ะ|คับ|ครับ|นะคะ|นะค้าบ|นะ|น่ะ|จ้ะ|จ้า|จ๊ะ|จ๋า|ฮะ|สิ|ล่ะ|ละ|เหรอ|หรอ|เนอะ)+${PUNCT}*$`,
);

function isMergeableFragment(seg: LangSegment): boolean {
  const t = seg.text.trim();
  // Too small to deserve its own clip, OR a lone Thai final-particle.
  if (letterCount(t) < 2) return true;
  if (seg.lang === "th" && THAI_PARTICLE_ONLY.test(t)) return true;
  return false;
}

/**
 * Split text into ordered Thai/English segments by script.
 * Neutral characters (spaces, digits, punctuation) attach to the current run.
 * Mergeable fragments (sub-2-letter runs, or lone Thai final-particles) are
 * folded into a neighbour so we never synthesize a stray fragment alone.
 * `fallback` voices any all-neutral text.
 */
export function segmentByLanguage(text: string, fallback: TtsLang): LangSegment[] {
  const segs: LangSegment[] = [];
  let curLang: TtsLang | null = null;
  let buf = "";

  const push = () => {
    if (buf.trim()) segs.push({ text: buf, lang: curLang ?? fallback });
    buf = "";
  };

  for (const ch of text) {
    const c: TtsLang | null = /[\u0E00-\u0E7F]/.test(ch)
      ? "th"
      : /[A-Za-z]/.test(ch)
        ? "en"
        : null;
    if (c === null) {
      buf += ch; // neutral sticks to the run in progress
      continue;
    }
    if (curLang !== null && c !== curLang) push();
    curLang = c;
    buf += ch;
  }
  push();

  if (segs.length <= 1) {
    if (segs.length === 1) return segs;
    return text.trim() ? [{ text, lang: fallback }] : [];
  }

  // Backward-merge fragments into the previous segment (kept in its language).
  const out: LangSegment[] = [];
  for (const seg of segs) {
    if (out.length > 0 && isMergeableFragment(seg)) {
      const prev = out[out.length - 1]!;
      out[out.length - 1] = { ...prev, text: prev.text + seg.text };
    } else {
      out.push(seg);
    }
  }
  // A mergeable FIRST run has no previous neighbour — fold it forward into the next.
  if (out.length > 1 && isMergeableFragment(out[0]!)) {
    const first = out.shift()!;
    out[0] = { ...out[0]!, text: first.text + out[0]!.text };
  }
  return out;
}

/**
 * Speak ordered language segments, each in its own voice.
 * COMPLETENESS GUARANTEE: prefetch all segments; if ANY fails to synthesize,
 * fall back to ONE single-voice call of the whole reply (`fullText` in
 * `fallbackLang`) so she never stops mid-sentence. Only onError if even that fails.
 */
async function speakSegments(
  segments: LangSegment[],
  fullText: string,
  fallbackLang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<void> {
  killAllAudio();
  callbacks?.onStart?.();
  const myGen = ++__audioGen;
  setSpeaking(true);

  let aborted = false;
  __supersede = () => {
    aborted = true;
  };
  const stale = () => aborted || myGen !== __audioGen;

  const finish = (ok: boolean) => {
    if (myGen !== __audioGen) return;
    __supersede = null;
    disconnectPlaybackSource();
    __activeAudio = null;
    setSpeaking(false);
    if (ok) callbacks?.onEnd?.();
    else callbacks?.onError?.();
  };

  // Prefetch every segment in parallel, each in its own voice — latency ≈ slowest leg.
  const audios = await Promise.all(segments.map((seg) => fetchServerAudio(seg.text, seg.lang)));
  if (stale()) return;

  const el = new Audio();
  __activeAudio = el;
  routeElementThroughPlayback(el);
  unlockTtsPlayback();

  // If any segment failed, abandon per-segment and speak the WHOLE reply in one
  // voice — completeness beats per-word voice accuracy for this one reply.
  if (audios.some((a) => !a)) {
    console.warn("[tts] a segment failed; falling back to single-voice full reply");
    const full = await fetchServerAudio(fullText, fallbackLang);
    if (stale()) return;
    if (!full) {
      finish(false);
      return;
    }
    const ok = await playMp3OnElement(el, full, myGen);
    if (stale()) return;
    finish(ok);
    return;
  }

  // All segments ready — play them gaplessly in order on one element.
  let anyPlayed = false;
  for (const audio of audios) {
    if (stale()) return;
    const ok = await playMp3OnElement(el, audio!, myGen);
    if (stale()) return;
    if (ok) anyPlayed = true;
  }
  finish(anyPlayed);
}

/**
 * Speak a full reply with correct per-language voices.
 * Cleans → segments by script → plays each segment in its matching voice,
 * with a single-voice full-reply fallback if any segment fails.
 * Single-language replies take the fast straight path.
 */
export async function speakReply(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<void> {
  const clean = stripForTts(text.trim());
  if (!clean) {
    callbacks?.onEnd?.();
    return;
  }
  const segments = segmentByLanguage(clean, lang);
  if (segments.length === 0) {
    callbacks?.onEnd?.();
    return;
  }
  if (segments.length === 1) {
    // Single-language reply — lowest-latency straight path.
    return speak(segments[0]!.text, segments[0]!.lang, callbacks);
  }
  await speakSegments(segments, clean, lang, callbacks);
}

export async function speak(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  killAllAudio();
  callbacks?.onStart?.();

  const serverOk = await trySpeakViaServer(text, lang, callbacks);
  if (!serverOk) {
    console.warn("[tts] server TTS failed; one-voice policy: staying silent");
    callbacks?.onEnd?.();
  }
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
