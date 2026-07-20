"use client";

// "Try saying this" — the real pronunciation check on word cards.
//
// HONEST FRAMING (locked): this is a RECOGNITION check — "did a Thai-trained
// ear understand you" — via the same STT the talk loop uses. It is NOT
// phoneme/tone scoring; UI copy must never claim otherwise.
//
// Flow: tap → mic records up to ~3.5s (or tap again to stop) → downsample to
// 16k mono WAV → POST /api/talk/transcribe (existing endpoint, existing rate
// limits, no LLM call) → local normalize + compare against the target text →
// verdict rendered on the card. Cost per attempt ≈ one short STT call.

import { useEffect, useRef, useState } from "react";

const MINT_SOFT = "#E7F3EF", MINT_DEEP = "#1F7A68";
const GOLD_BG = "#FBF3DF", GOLD = "#8A6D1F";
const PINK_DEEP = "#993556", PINK_SOFT = "#FBEAF0";
const Q = "'Quicksand', system-ui, sans-serif";
const TH_FONT = "'Noto Sans Thai', 'Quicksand', system-ui, sans-serif";

const MAX_MS = 3500;

type Phase = "idle" | "listening" | "checking" | "pass" | "almost" | "silent";

type Copy = { idle: string; listening: string; checking: string; pass: string; almost: string; silent: string; retry: string };
const COPY_EN: Copy = {
  idle: "Try saying this",
  listening: "Listening... tap when done",
  checking: "Checking...",
  pass: "Sounds great! Miomi understood you perfectly",
  almost: "Almost! Listen once more and try again",
  silent: "I couldn't hear you. Try once more",
  retry: "Try again",
};
const COPY_TH: Copy = {
  idle: "ลองพูดดูนะคะ",
  listening: "กำลังฟังค่ะ แตะอีกครั้งเมื่อพูดจบ",
  checking: "กำลังเช็คค่ะ",
  pass: "เยี่ยมมากค่ะ ฟังชัดเจนเลย",
  almost: "เกือบแล้วค่ะ ฟังอีกครั้งแล้วลองใหม่นะคะ",
  silent: "ไม่ได้ยินเลยค่ะ ลองอีกครั้งนะคะ",
  retry: "ลองอีกครั้ง",
};

/** Latin consonant skeleton — for matching STT's English-homophone guesses
 * ("duck my") against a Thai word's romanization ("dok mai"): consonants carry
 * the identity, vowel spelling is where STT and romanization disagree. */
function skeleton(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "").replace(/[aeiouy]/g, "");
}

/** Fold tone-marked romanization ("dòk-máai") and STT Latin to bare letters. */
function foldLatin(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) d[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

/** Strip everything that STT formatting can disagree on, keep the sounds. */
function normalize(s: string, lang: "th" | "en"): string {
  const noPunct = s.replace(/[.,!?;:'"“”‘’…()\-–]/g, "");
  if (lang === "th") return noPunct.replace(/\s+/g, "");
  return noPunct.toLowerCase().replace(/\s+/g, " ").trim();
}

function downsampleTo16k(chunks: Float32Array[], inRate: number): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const joined = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { joined.set(c, o); o += c.length; }
  if (inRate === 16000) return joined;
  const ratio = inRate / 16000;
  const outLen = Math.floor(joined.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), joined.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += joined[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

function toWav(samples: Float32Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const w = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); w(8, "WAVE");
  w(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function MicIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
    </svg>
  );
}

export function SayItCheck({ text, lang, uiThai, pron, wordEn, autoStart, onRecordingActive }: { text: string; lang: "th" | "en"; uiThai: boolean; pron?: string | null; wordEn?: string | null; autoStart?: boolean; onRecordingActive?: (active: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [heardText, setHeardText] = useState<string>("");
  const c = uiThai ? COPY_TH : COPY_EN;
  const font = uiThai ? TH_FONT : Q;

  const chunksRef = useRef<Float32Array[]>([]);
  const rateRef = useRef(48000);
  const stopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const advancedRef = useRef(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopRef.current?.(); };
  }, []);

  const finishAndCheck = async () => {
    stopRef.current?.();
    stopRef.current = null;
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (!mountedRef.current) return;
    setPhase("checking");
    try {
      const samples = downsampleTo16k(chunksRef.current, rateRef.current);
      chunksRef.current = [];
      const wav = toWav(samples, 16000);
      if (wav.size < 2000) { if (mountedRef.current) setPhase("silent"); return; }
      const form = new FormData();
      form.append("audio", wav, "sayit.wav");
      form.append("language", lang);
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("/api/talk/transcribe", {
        method: "POST", body: form, credentials: "include", cache: "no-store", signal: ctrl.signal,
      });
      window.clearTimeout(t);
      if (!mountedRef.current) return;
      if (!res.ok) { setPhase("silent"); return; }
      const json = (await res.json()) as { text?: string };
      const raw = (json.text ?? "").trim();
      const heard = normalize(raw, lang);
      if (!heard) { setHeardText(""); setPhase("silent"); return; }
      setHeardText(raw);
      const targetNorm = normalize(text, lang);
      // Short tonal words are the hard case: single-word Thai STT is unreliable
      // and an exact match on a 2-3 char word is brutal. Tolerance SCALES with
      // length but never drops below a fair floor — an honest attempt passes,
      // gibberish still fails. (7/20 calibration from real Mike failures on
      // "ช้า"/"ป้ายรถ": correct-sounding tries were rejected.)
      const tolFor = (len: number) => (len <= 4 ? 1 : Math.max(2, Math.round(len / 4)));

      // 1) Direct containment in the target script (either direction — STT may
      //    add or drop a neighbouring particle).
      let ok = heard.includes(targetNorm) || (targetNorm.length > 0 && targetNorm.includes(heard) && heard.length >= Math.ceil(targetNorm.length * 0.7));
      // 2) Near-miss in the same script (missing tone mark / one slipped letter).
      if (!ok) {
        ok = lev(heard, targetNorm) <= tolFor(targetNorm.length);
      }
      // 3) Thai target but Latin transcript (STT returns romanized/English
      //    homophones — "Bye Roth" for ป้ายรถ): compare folded romanization AND
      //    consonant skeletons, both generous, since tones vanish in Latin.
      if (!ok && lang === "th" && pron) {
        const rawFold = foldLatin(raw), pronFold = foldLatin(pron);
        const rawSkel = skeleton(raw), pronSkel = skeleton(pron);
        ok =
          (pronFold.length > 0 && lev(rawFold, pronFold) <= tolFor(pronFold.length)) ||
          (rawFold.length > 0 && pronFold.includes(rawFold) && rawFold.length >= 2) ||
          (pronSkel.length > 0 && lev(rawSkel, pronSkel) <= (pronSkel.length <= 3 ? 1 : 2));
      }
      // 4) English target, romanized/loose transcript — same generous fold.
      if (!ok && lang === "en") {
        const rawFold = foldLatin(raw), tgtFold = foldLatin(text);
        ok = tgtFold.length > 0 && lev(rawFold, tgtFold) <= tolFor(tgtFold.length);
      }
      setPhase(ok ? "pass" : "almost");
      if (ok && wordEn && wordEn.trim() && !advancedRef.current) {
        advancedRef.current = true;
        // A correct pronunciation advances mastery through the same spiral as
        // conversational reuse — practice in Learn/cards now moves the dashboard.
        void fetch("/api/vocab/practiced", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ wordEn: wordEn.trim(), direction: lang === "en" ? "en_to_th" : "th_to_en" }),
        }).catch(() => { /* mastery bump is best-effort */ });
      }
    } catch {
      if (mountedRef.current) setPhase("silent");
    }
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      rateRef.current = ctx.sampleRate;
      chunksRef.current = [];
      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => { chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
      source.connect(proc);
      proc.connect(ctx.destination);
      stopRef.current = () => {
        try { proc.disconnect(); source.disconnect(); } catch { /* already gone */ }
        stream.getTracks().forEach((tr) => tr.stop());
        void ctx.close().catch(() => undefined);
        onRecordingActive?.(false);
      };
      setPhase("listening");
      onRecordingActive?.(true);
      timerRef.current = window.setTimeout(() => { void finishAndCheck(); }, MAX_MS);
    } catch {
      setPhase("silent");
    }
  };

  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = () => {
    if (phase === "listening") { void finishAndCheck(); return; }
    if (phase === "checking") return;
    void start();
  };

  if (phase === "pass" || phase === "almost" || phase === "silent") {
    const good = phase === "pass";
    return (
      <div style={{ marginTop: 10, background: good ? GOLD_BG : PINK_SOFT, borderRadius: 11, padding: "9px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontFamily: font, fontSize: 12.5, fontWeight: 600, color: good ? GOLD : PINK_DEEP, lineHeight: 1.45 }}>{c[phase]}</span>
          <button type="button" onClick={onTap} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: MINT_DEEP, background: MINT_SOFT, border: "none", borderRadius: 99, padding: "6px 11px", cursor: "pointer", flexShrink: 0 }}>
            {c.retry}
          </button>
        </div>
        {heardText ? (
          <p style={{ fontFamily: font, fontSize: 11, fontStyle: "italic", color: good ? "#A08428" : "#B06A85", margin: "4px 0 0" }}>
            {(uiThai ? "หนูได้ยินว่า " : "I heard: ") + "\u201C" + heardText + "\u201D"}
          </p>
        ) : null}
      </div>
    );
  }

  const listening = phase === "listening";
  const checking = phase === "checking";
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={checking}
      style={{
        width: "100%", marginTop: 10, height: 40, borderRadius: 11, border: "none",
        background: listening ? "#C75C86" : "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
        color: "#fff", fontFamily: font, fontSize: 13, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        cursor: checking ? "default" : "pointer", opacity: checking ? 0.75 : 1,
      }}
    >
      <MicIcon color="#fff" />
      {listening ? c.listening : checking ? c.checking : c.idle}
    </button>
  );
}
