/**
 * MiomiTurnClient — cheap turn-based engine (transcribe → /api/miomi → speakReply)
 * exposed behind the SAME interface MiomiLiveClient presents, so app/(app)/talk/page.tsx
 * swaps `new MiomiLiveClient(cb)` → `new MiomiTurnClient(cb)` and nothing else in the
 * page, TurnRuntime, or turn-controller needs to know the transport changed.
 *
 * WHAT IS LIVE (the conversation heartbeat — fundamentals first):
 *   - connect / kickoff greeting
 *   - mic: energy-endpoints the 16k PCM the page already streams via sendAudio(),
 *     turn-in-flight lock (the dropped-turn fix), then POST /api/talk/transcribe
 *   - brain: POST /api/miomi (route owns the language medium — R10 single-owner)
 *   - voice: the proven speakReply() (per-segment routing, particle-fold, compressor)
 *   - word teaching: wordCard → tool_call get_word_to_teach (page renders the card)
 *   - "thinking" UI state during the transcribe→miomi gap (orb no longer freezes)
 *   - emits the exact LiveClientMessage sequence the page's handleLiveMessage expects:
 *       user → (thinking) → [tool_call] → gemini → turn_complete
 *
 * WHAT IS STUBBED FOR PASS 2 (clearly marked `// PASS2`):
 *   - guest-invite CTA drain timing (sendSpeakExact still plays the cue; the
 *     MediaHandler drain wait resolves immediately since we don't use its player)
 *   - Room pace / wrap-up / time-up / lesson-complete hidden turns
 *   - session snapshot / resume continuity  (no reconnect in turn mode)
 *   - member-context / voice-budget enrichment (metering was Live-era, moot here)
 *
 * Voice is played via lib/voice/tts.ts (NOT routed through MediaHandler.playAudio)
 * to preserve the hard-won Leda per-segment sound. Turn timing is therefore owned
 * here: model_transcript flips the orb to "speaking"; turn_complete fires when
 * speakReply() resolves.
 */
"use client";

import { logEvent } from "@/lib/debug/event-bus";
import { log, logError } from "@/lib/debug/log";
import { speakReply, killAllAudio } from "@/lib/voice/tts";
// Reuse the engine-we-stand-in-for's OWN parameter types (callbacks, connect
// opts, sendAudio payload) via TS utilities. Nothing is guessed or redefined —
// the page's existing callbacks object + call sites line up by construction, and
// `... as unknown as MiomiLiveClient` at the construction site needs no other
// page type changes. onStatus is already part of those callbacks.
import { MiomiLiveClient } from "@/lib/live/miomi-client";
import type { LiveClientMessage } from "@/lib/live/miomi-client";

type Callbacks = ConstructorParameters<typeof MiomiLiveClient>[0];
type ConnectOpts = Parameters<MiomiLiveClient["connect"]>[0];
type AudioPayload = Parameters<MiomiLiveClient["sendAudio"]>[0];

// ---------------------------------------------------------------------------
// Endpointing tuning (energy VAD over the 16k PCM the page forwards).
// Conservative on purpose — favour NOT cutting the user off over snappiness.
// These four are the only knobs likely to want a nudge after the first real test.
// ---------------------------------------------------------------------------
const SAMPLE_RATE = 16000;
const START_RMS = 0.018; // onset threshold (int16-normalised RMS)
const END_RMS = 0.012; // offset threshold (hysteresis — lower than onset)
const SILENCE_MS = 850; // trailing silence that ends a turn
const MIN_SPEECH_MS = 320; // shorter than this = misfire, discarded
const MAX_UTTER_MS = 14500; // hard cap (transcribe maxDuration is 15s)
const PREROLL_MS = 250; // keep a little audio before onset

type MiomiResponse = {
  content: string;
  wordCard?: {
    word?: string;
    translation?: string;
    phonetic?: string;
    example?: string;
    [k: string]: unknown;
  } | null;
  sessionContext?: unknown;
  replyLanguage?: "th" | "en";
  [k: string]: unknown;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export class MiomiTurnClient {
  private cb: Callbacks;
  private connected = false;
  private _epochId = 0;

  // connect() config
  private uiLanguage: "th" | "en" = "en";
  private targetLanguage: "th" | "en" = "th";
  private mode: string = "chat";
  private level: string | null = null;

  // conversation state fed back to /api/miomi
  private history: ChatMessage[] = [];
  private sessionContext: unknown = undefined;

  // turn lock — the dropped-turn guard. While a turn is mid-flight
  // (transcribe→miomi→speak) we ignore new endpoints.
  private turnInFlight = false;

  // energy-VAD accumulator
  private buf: Int16Array[] = [];
  private preroll: Int16Array[] = [];
  private prerollSamples = 0;
  private inSpeech = false;
  private speechSamples = 0;
  private silenceSamples = 0;

  get epochId(): number {
    return this._epochId;
  }

  constructor(callbacks: Callbacks) {
    this.cb = callbacks;
  }

  // ---- lifecycle ----------------------------------------------------------

  async connect(opts: ConnectOpts): Promise<void> {
    this._epochId += 1;
    this.uiLanguage = (opts?.uiLanguage as "th" | "en") ?? "en";
    this.targetLanguage = (opts?.targetLanguage as "th" | "en") ?? this.opposite(this.uiLanguage);
    this.mode = (opts?.mode as string) ?? "chat";
    this.level = (opts?.level as string) ?? null;
    this.history = [];
    this.sessionContext = undefined;
    this.resetVad();
    this.connected = true;
    log("turn", "connect", { uiLanguage: this.uiLanguage, mode: this.mode, level: this.level });
    this.cb.onOpen?.();
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
    this.turnInFlight = false;
    this.resetVad();
    try {
      killAllAudio();
    } catch {
      /* ignore */
    }
    // NB: deliberately does NOT call cb.onClose — that path drives the page's
    // Live reconnect/resume machinery, which stays inert in turn mode.
  }

  disconnectIntentionally(): void {
    this.disconnect();
  }

  // ---- mic / endpointing --------------------------------------------------
  // The page streams 16k Int16 PCM here only while the mic is meant to forward
  // (MediaHandler already gates this so we never get Miomi's own audio back).

  sendAudio(pcm: AudioPayload): void {
    if (!this.connected) return;
    if (this.turnInFlight) return; // drop input while a turn is processing (and while she speaks)
    const frame =
      pcm instanceof Int16Array
        ? pcm
        : new Int16Array(pcm as ArrayBuffer);
    if (frame.length === 0) return;

    const rms = this.rms(frame);

    if (!this.inSpeech) {
      // hold a short preroll so we don't clip the attack of the first word
      this.preroll.push(frame);
      this.prerollSamples += frame.length;
      const maxPre = (PREROLL_MS / 1000) * SAMPLE_RATE;
      while (this.prerollSamples - (this.preroll[0]?.length ?? 0) > maxPre && this.preroll.length > 1) {
        const dropped = this.preroll.shift();
        this.prerollSamples -= dropped?.length ?? 0;
      }
      if (rms >= START_RMS) {
        this.inSpeech = true;
        this.speechSamples = 0;
        this.silenceSamples = 0;
        this.buf = [...this.preroll];
        this.preroll = [];
        this.prerollSamples = 0;
        logEvent({ kind: "vad", level: "info", message: "speech start" });
      }
      return;
    }

    // in speech
    this.buf.push(frame);
    this.speechSamples += frame.length;
    if (rms < END_RMS) {
      this.silenceSamples += frame.length;
    } else {
      this.silenceSamples = 0;
    }

    const speechMs = (this.speechSamples / SAMPLE_RATE) * 1000;
    const silenceMs = (this.silenceSamples / SAMPLE_RATE) * 1000;

    if (silenceMs >= SILENCE_MS || speechMs >= MAX_UTTER_MS) {
      const voicedMs = speechMs - silenceMs;
      const utterance = this.drainBuf();
      this.inSpeech = false;
      if (voicedMs < MIN_SPEECH_MS) {
        logEvent({ kind: "vad", level: "warn", message: "misfire too short", data: { voicedMs } });
        return;
      }
      logEvent({ kind: "vad", level: "info", message: "speech end", data: { speechMs } });
      void this.runTurn(utterance);
    }
  }

  // ---- kickoff / greeting -------------------------------------------------

  sendKickoff(lang: "th" | "en", _audience: "first_time" | "returning" = "first_time"): void {
    this.uiLanguage = lang ?? this.uiLanguage;
    void this.runHidden(
      "[kickoff] Greet the user warmly in one or two short sentences and invite them to talk.",
      { isKickoff: true },
    );
  }

  sendSessionKickoff(): void {
    this.sendKickoff(this.uiLanguage, "returning");
  }

  // ---- hidden / scripted turns -------------------------------------------

  sendText(text: string): void {
    if (!text?.trim()) return;
    void this.runTurnFromText(text.trim());
  }

  sendHiddenContext(text: string): void {
    // A nudge the model should weave in on the NEXT reply, not voiced on its own.
    if (!text?.trim()) return;
    this.history.push({ role: "user", content: text.trim() });
  }

  sendHiddenTurn(text: string): void {
    if (!text?.trim()) return;
    void this.runHidden(text.trim(), {});
  }

  sendSpeakExact(text: string): void {
    // Speak this verbatim (guest-invite CTA). Plays in her real voice; emits the
    // orb-speaking + turn_complete so the controller's invitation chain advances.
    if (!text?.trim()) return;
    void this.speakExact(text.trim());
  }

  // ---- PASS2 stubs (interface satisfied so /talk compiles & runs) ---------
  // These keep the heartbeat shippable; each gets real behaviour in pass 2.

  sendRoomPace(_v?: unknown): void {
    /* PASS2 */
  }
  sendPaceChange(_v?: unknown): void {
    /* PASS2 */
  }
  sendRoomWrapUp(_v?: unknown): void {
    /* PASS2 */
  }
  sendLessonComplete(_v?: unknown): void {
    /* PASS2 */
  }
  sendRoomTimeUp(_v?: unknown): void {
    /* PASS2 */
  }
  sendSessionResume(_v?: unknown): void {
    /* PASS2 — no reconnect in turn mode */
  }
  sendResume(_v?: unknown): void {
    /* PASS2 */
  }
  setTeachWordContext(_v?: unknown): void {
    /* PASS2 */
  }
  applyTeachWordResponse(_v?: unknown): void {
    /* PASS2 */
  }
  getMemberContext(): unknown {
    return null; // PASS2
  }
  getVoiceBudget(): unknown {
    return null; // PASS2 — metering was Live-era
  }
  getSessionSnapshot(): unknown {
    return null; // PASS2
  }
  restoreSessionSnapshot(_v?: unknown): void {
    /* PASS2 */
  }
  clearResumeHandle(): void {
    /* PASS2 */
  }

  // =========================================================================
  // internals
  // =========================================================================

  private opposite(l: "th" | "en"): "th" | "en" {
    return l === "th" ? "en" : "th";
  }

  private resetVad(): void {
    this.buf = [];
    this.preroll = [];
    this.prerollSamples = 0;
    this.inSpeech = false;
    this.speechSamples = 0;
    this.silenceSamples = 0;
  }

  private drainBuf(): Int16Array {
    const total = this.buf.reduce((n, c) => n + c.length, 0);
    const out = new Int16Array(total);
    let o = 0;
    for (const c of this.buf) {
      out.set(c, o);
      o += c.length;
    }
    this.buf = [];
    return out;
  }

  private rms(frame: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      const s = frame[i] / 0x8000;
      sum += s * s;
    }
    return Math.sqrt(sum / frame.length);
  }

  private emit(msg: LiveClientMessage): void {
    try {
      this.cb.onMessage?.(msg);
    } catch (e) {
      logError("turn", "onMessage handler threw", e);
    }
  }

  /** Drive the orb's "thinking" state during the transcribe→miomi gap. */
  private signalThinking(): void {
    try {
      (this.cb.onStatus as ((s: { phase: string }) => void) | undefined)?.({
        phase: "thinking",
      });
    } catch {
      /* ignore */
    }
  }

  /** Int16 16k PCM → 44-byte WAV blob for /api/talk/transcribe. */
  private pcmToWav(samples: Int16Array): Blob {
    const dataSize = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const w = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    w(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    w(8, "WAVE");
    w(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    w(36, "data");
    view.setUint32(40, dataSize, true);
    let off = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(off, samples[i], true);
      off += 2;
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  private async transcribe(samples: Int16Array): Promise<string> {
    const wav = this.pcmToWav(samples);
    if (wav.size < 2000) return "";
    const form = new FormData();
    form.append("audio", wav, "utterance.wav");
    form.append("language", "auto");
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch("/api/talk/transcribe", {
        method: "POST",
        body: form,
        credentials: "include",
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) {
        logEvent({ kind: "transcribe", level: "error", message: "failed", data: { status: res.status } });
        return "";
      }
      const json = (await res.json()) as { text?: string };
      return (json.text ?? "").trim();
    } catch (e) {
      logError("turn", "transcribe error", e);
      return "";
    } finally {
      window.clearTimeout(t);
    }
  }

  private async callMiomi(): Promise<MiomiResponse | null> {
    try {
      const res = await fetch("/api/miomi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          messages: this.history.slice(-8),
          mode: this.mode,
          uiLanguage: this.uiLanguage, // stable medium; route owns final medium (R10)
          targetLanguage: this.targetLanguage,
          level: this.level,
          sessionContext: this.sessionContext,
        }),
      });
      if (!res.ok) {
        logEvent({ kind: "network", level: "error", message: `/miomi ${res.status}` });
        return null;
      }
      const json = (await res.json()) as MiomiResponse;
      if (json.sessionContext !== undefined) this.sessionContext = json.sessionContext;
      return json;
    } catch (e) {
      logError("turn", "miomi error", e);
      return null;
    }
  }

  /** A real user turn from endpointed audio. */
  private async runTurn(samples: Int16Array): Promise<void> {
    if (this.turnInFlight) return;
    this.turnInFlight = true;
    try {
      this.signalThinking(); // orb: thinking
      const text = await this.transcribe(samples);
      if (!text) {
        this.emit({ type: "interrupted" } as LiveClientMessage); // bail back to listening
        return;
      }
      await this.runTurnFromText(text, { alreadyThinking: true });
    } finally {
      this.turnInFlight = false;
    }
  }

  /** A user turn whose text is already known (typed, or post-transcribe). */
  private async runTurnFromText(
    text: string,
    opts: { alreadyThinking?: boolean } = {},
  ): Promise<void> {
    const owns = !this.turnInFlight;
    if (owns) this.turnInFlight = true;
    try {
      this.emit({ type: "user", text, finished: true } as LiveClientMessage);
      this.history.push({ role: "user", content: text });
      if (!opts.alreadyThinking) this.signalThinking();

      const reply = await this.callMiomi();
      if (!reply || !reply.content?.trim()) {
        this.emit({ type: "interrupted" } as LiveClientMessage);
        return;
      }
      await this.deliverReply(reply);
    } finally {
      if (owns) this.turnInFlight = false;
    }
  }

  /** A hidden/system turn (kickoff, nudge) — no visible user bubble. */
  private async runHidden(directive: string, opts: { isKickoff?: boolean }): Promise<void> {
    const owns = !this.turnInFlight;
    if (owns) this.turnInFlight = true;
    try {
      this.history.push({ role: "user", content: directive });
      const dirIdx = this.history.length - 1;
      if (!opts.isKickoff) this.signalThinking();
      const reply = await this.callMiomi();
      // drop the hidden directive so it never lingers in visible history
      if (this.history[dirIdx]?.content === directive) this.history.splice(dirIdx, 1);
      if (!reply || !reply.content?.trim()) {
        this.emit({ type: "turn_complete" } as LiveClientMessage);
        return;
      }
      await this.deliverReply(reply);
    } finally {
      if (owns) this.turnInFlight = false;
    }
  }

  /** Common reply path: card → transcript(speaking) → voice → turn_complete. */
  private async deliverReply(reply: MiomiResponse): Promise<void> {
    const content = reply.content.trim();
    this.history.push({ role: "assistant", content });

    // word card → tool_call so the page renders it exactly as in Live
    if (reply.wordCard && (reply.wordCard.word || reply.wordCard.translation)) {
      this.emit({
        type: "tool_call",
        name: "get_word_to_teach",
        args: {},
        result: reply.wordCard,
      } as LiveClientMessage);
    }

    // model_transcript flips the orb to "speaking" + writes the bubble
    this.emit({ type: "gemini", text: content } as LiveClientMessage);

    // her real voice (per-segment Leda) — NOT MediaHandler's raw player
    try {
      await speakReply(content, reply.replyLanguage ?? this.uiLanguage);
    } catch (e) {
      logError("turn", "speakReply error", e);
    }

    this.emit({ type: "turn_complete" } as LiveClientMessage);
  }

  /** Speak verbatim text (guest CTA). */
  private async speakExact(text: string): Promise<void> {
    this.emit({ type: "gemini", text } as LiveClientMessage);
    try {
      await speakReply(text, this.uiLanguage);
    } catch (e) {
      logError("turn", "speakExact error", e);
    }
    this.emit({ type: "turn_complete" } as LiveClientMessage);
  }
}

export default MiomiTurnClient;
