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

/** Fetch one short server MP3 (base64) for pre-warm / thinking cues. */
export async function fetchTtsClip(text: string, lang: TtsLang): Promise<string | null> {
  return fetchServerAudio(text, lang);
}

async function fetchServerAudio(text: string, lang: TtsLang): Promise<string | null> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    try {
      const res = await fetch("/api/talk/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
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

/**
 * Play one pre-warmed MP3 without superseding other audio (thinking cue).
 * Sets speaking for echo guard; full reply `speak()` may kill this via `killAllAudio`.
 */
export async function playWarmClip(audioBase64: string): Promise<boolean> {
  const gen = __audioGen;
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
      setSpeaking(false);
      resolve(ok);
    };
    el.onended = () => finish(true);
    el.onerror = () => finish(false);
    routeElementThroughPlayback(el);
    unlockTtsPlayback();
    setSpeaking(true);
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

/** Speak a full reply: first sentence ASAP when cleanly splittable; otherwise identical to `speak()`. */
export async function speakReply(
  text: string,
  lang: TtsLang,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    callbacks?.onEnd?.();
    return;
  }
  const chunks = splitReplyIntoTtsChunks(trimmed);
  if (chunks.length <= 1) {
    return speak(trimmed, lang, callbacks);
  }
  await speakChunkedSequence(chunks, lang, callbacks);
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
