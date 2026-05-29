"use client";

import type { ResponseLength } from "@/components/talk/Toolbox";
import type { PronunciationLessonPayload } from "@/components/talk/PronunciationCardV1";
import type { VocabularyEntry } from "@/components/talk/WordCardV3";
import type { TalkConfig } from "@/lib/talk/modes";
import { speak, stopTts, type TtsLang } from "@/lib/voice/tts";
import { pickIceBreaker, pickMasteryAdvanced, pickMasteryCelebration } from "@/lib/voice/warmth";
import { getSharedAudioOrchestrator } from "@/lib/conversation/audio";
import { isLikelyHallucination } from "@/lib/conversation/hallucination";
import {
  createSessionId,
  loadSession,
  saveSession,
  shouldResume,
} from "@/lib/conversation/session";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConversationState =
  | "AWAITING_FIRST_GESTURE"
  | "OPENING"
  | "IDLE"
  | "USER_SPEAKING"
  | "TRANSCRIBING"
  | "AI_THINKING"
  | "AI_SPEAKING"
  | "INTERRUPTED"
  | "ERROR";

export type VadConfig = {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  redemptionMs: number;
};

export type IntroducedWordPayload = {
  word: string;
  word_th: string;
  word_en: string;
  cefr_level: string | null;
  emoji: string | null;
  mastery_level?: number;
};

export type MasteryEventPayload = {
  type: "introduced" | "advanced" | "mastered" | "none";
  word?: string;
  newStage?: number;
} | null;

export type CanvasMessage =
  | { id: string; kind: "mini_cat"; textTh: string; textEn: string }
  | { id: string; kind: "practice"; word: VocabularyEntry; position: number; total: number; topic?: string }
  | { id: string; kind: "pronunciation"; lesson: PronunciationLessonPayload; heardText?: string | null }
  | { id: string; kind: "user_said"; text: string };

export type MiomiApiResponse = {
  content?: string;
  servedVia?: string;
  wordCard?: IntroducedWordPayload | null;
  masteryEvent?: MasteryEventPayload;
  pronunciationLesson?: PronunciationLessonPayload | null;
  replyLanguage?: "th" | "en";
  userSpeaksLanguage?: "th" | "en";
};

export type OrchestratorCallbacks = {
  onMicStart: () => void;
  onMicStop: () => void;
  onVadConfig: (config: VadConfig) => void;
  onGuestLimit?: () => void;
  onGuestExchange?: () => void;
  onMasteryToast?: (toast: { th: string; en: string }) => void;
  onWordsIntroduced?: (words: string[]) => void;
};

export type ConversationOrchestratorOptions = {
  userId: string | null;
  isGuest: boolean;
  authReady: boolean;
  uiLang: "th" | "en";
  isThaiLeadUser: boolean;
  ttsOn: boolean;
  config: TalkConfig;
  respLength: ResponseLength;
  guestExchanges: number;
  guestLimit: number;
  callbacks: OrchestratorCallbacks;
};

const BUFFER_WINDOW_MS = 600;
const ERROR_RECOVERY_MS = 800;
const TRANSCRIBE_TIMEOUT_MS = 8000;
const ENGINE_TIMEOUT_MS = 12000;
const TTS_TIMEOUT_MS = 10000;
const DEDUP_WINDOW_MS = 3000;

const VAD_NORMAL: VadConfig = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  redemptionMs: 1200,
};

const VAD_INTERRUPT: VadConfig = {
  positiveSpeechThreshold: 0.65,
  negativeSpeechThreshold: 0.45,
  redemptionMs: 300,
};

function stripForTts(text: string): string {
  return text
    .replace(/~/g, "")
    .replace(/\*+/g, "")
    .replace(/_+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toVocabularyEntry(word: IntroducedWordPayload): VocabularyEntry {
  return {
    id: word.word_en,
    word_en: word.word_en,
    word_th: word.word_th,
    cefr_level: word.cefr_level ?? undefined,
    emoji: word.emoji ?? undefined,
  };
}

function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export class ConversationOrchestrator {
  private state: ConversationState;
  private sessionId: string;
  private stateListeners = new Set<(state: ConversationState) => void>();
  private messageListeners = new Set<(msg: CanvasMessage) => void>();
  private destroyed = false;

  private conversationLang: TtsLang;
  private wordsIntroduced: string[] = [];
  private exchangeCount = 0;
  private activePronunciationId: string | null = null;
  private isPracticeAttempt = false;

  private transcriptBuffer = "";
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingInterruptText: string | null = null;

  private engineAbort: AbortController | null = null;
  private lastEngineText: string | null = null;
  private lastEngineTime = 0;
  private inflightEngine: Promise<void> | null = null;

  private errorTimer: ReturnType<typeof setTimeout> | null = null;
  private opts: ConversationOrchestratorOptions;

  constructor(opts: ConversationOrchestratorOptions) {
    this.opts = opts;
    this.conversationLang = opts.isThaiLeadUser ? "th" : "en";

    const resume = shouldResume();
    const stored = loadSession();
    if (resume && stored) {
      this.sessionId = stored.sessionId;
      this.state = "AWAITING_FIRST_GESTURE";
    } else {
      this.sessionId = createSessionId();
      this.state = "AWAITING_FIRST_GESTURE";
    }
  }

  getState(): ConversationState {
    return this.state;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getConversationLang(): TtsLang {
    return this.conversationLang;
  }

  onStateChange(cb: (state: ConversationState) => void): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  onMessage(cb: (msg: CanvasMessage) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  updateOptions(partial: Partial<ConversationOrchestratorOptions>): void {
    this.opts = { ...this.opts, ...partial };
  }

  setTtsOn(on: boolean): void {
    this.opts.ttsOn = on;
    if (!on) {
      getSharedAudioOrchestrator().killAll();
      stopTts();
    }
  }

  /** User's first tap — unlocks browser audio and starts or resumes session. */
  onFirstGesture(): void {
    if (this.destroyed) return;
    if (this.state !== "AWAITING_FIRST_GESTURE") return;

    try {
      new Audio().play().catch(() => {});
    } catch {
      /* ignore */
    }

    if (shouldResume()) {
      this.transition("IDLE");
      this.applyVadConfig(VAD_NORMAL);
      this.opts.callbacks.onMicStart();
      return;
    }

    this.transition("OPENING");
    this.playOpening();
  }

  onSpeechStart(): void {
    if (this.destroyed) return;

    if (this.state === "AI_SPEAKING") {
      getSharedAudioOrchestrator().killAll();
      stopTts();
      this.transition("INTERRUPTED");
      this.transition("USER_SPEAKING");
      this.applyVadConfig(VAD_NORMAL);
      return;
    }

    if (this.state === "AI_THINKING") {
      this.engineAbort?.abort();
      this.engineAbort = null;
      if (this.transcriptBuffer) {
        this.pendingInterruptText = this.transcriptBuffer;
      }
      this.clearBufferTimer();
      this.transition("USER_SPEAKING");
      this.applyVadConfig(VAD_NORMAL);
      return;
    }

    if (
      this.state === "IDLE" ||
      this.state === "USER_SPEAKING" ||
      this.state === "INTERRUPTED"
    ) {
      if (this.state !== "USER_SPEAKING") {
        this.transition("USER_SPEAKING");
      }
    }
  }

  onSpeechEnd(audio: Float32Array): void {
    if (this.destroyed) return;
    if (this.state !== "USER_SPEAKING" && this.state !== "INTERRUPTED") return;
    void this.transcribeAudio(audio);
  }

  submitText(text: string): void {
    if (this.destroyed || !this.opts.authReady) return;
    if (this.isGuestLocked()) {
      this.opts.callbacks.onGuestLimit?.();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.state === "AWAITING_FIRST_GESTURE") {
      this.onFirstGesture();
    }

    this.emitUserMessage(trimmed);
    this.enqueueTranscript(trimmed);
  }

  onOrbTap(): void {
    if (this.destroyed) return;

    if (this.isGuestLocked()) {
      this.opts.callbacks.onGuestLimit?.();
      return;
    }

    if (this.state === "AWAITING_FIRST_GESTURE") {
      this.onFirstGesture();
      return;
    }

    if (this.state === "AI_SPEAKING" || this.state === "OPENING") {
      getSharedAudioOrchestrator().killAll();
      stopTts();
      this.transition("IDLE");
      return;
    }

    if (this.state === "USER_SPEAKING") {
      this.opts.callbacks.onMicStop();
      this.transition("IDLE");
      return;
    }

    if (this.state === "IDLE") {
      this.opts.callbacks.onMicStart();
    }
  }

  stopAudio(): void {
    getSharedAudioOrchestrator().killAll();
    stopTts();
  }

  setPracticeAttempt(active: boolean): void {
    this.isPracticeAttempt = active;
  }

  clearSession(): void {
    this.sessionId = createSessionId();
    this.exchangeCount = 0;
    this.wordsIntroduced = [];
    this.activePronunciationId = null;
    this.pendingInterruptText = null;
    this.transcriptBuffer = "";
    this.clearBufferTimer();
    this.transition("OPENING");
    this.playOpening();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.engineAbort?.abort();
    this.clearBufferTimer();
    if (this.errorTimer) clearTimeout(this.errorTimer);
    getSharedAudioOrchestrator().killAll();
    stopTts();
    saveSession(this.sessionId, Date.now(), { sessionEndReason: "user_left" });
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private transition(next: ConversationState): void {
    if (this.destroyed || this.state === next) return;
    this.state = next;
    for (const cb of this.stateListeners) cb(next);

    if (next === "AI_SPEAKING") {
      this.applyVadConfig(VAD_INTERRUPT);
      this.opts.callbacks.onMicStart();
    } else if (next === "AI_THINKING") {
      this.applyVadConfig(VAD_NORMAL);
      this.opts.callbacks.onMicStart();
    } else if (next === "OPENING" || next === "TRANSCRIBING") {
      this.opts.callbacks.onMicStop();
    } else if (next === "IDLE") {
      this.applyVadConfig(VAD_NORMAL);
      this.opts.callbacks.onMicStart();
    } else if (next === "ERROR") {
      this.opts.callbacks.onMicStop();
      if (this.errorTimer) clearTimeout(this.errorTimer);
      this.errorTimer = setTimeout(() => {
        if (!this.destroyed) this.transition("IDLE");
      }, ERROR_RECOVERY_MS);
    }
  }

  private applyVadConfig(config: VadConfig): void {
    this.opts.callbacks.onVadConfig(config);
  }

  private emitMessage(msg: CanvasMessage): void {
    for (const cb of this.messageListeners) cb(msg);
  }

  private isGuestLocked(): boolean {
    return this.opts.isGuest && this.opts.guestExchanges >= this.opts.guestLimit;
  }

  private playOpening(): void {
    const iceBreaker = pickIceBreaker();
    const openerLang = this.opts.isThaiLeadUser ? "th" : "en";
    this.conversationLang = openerLang;

    this.emitMessage({
      id: crypto.randomUUID(),
      kind: "mini_cat",
      textTh: iceBreaker.th,
      textEn: iceBreaker.en,
    });

    if (!this.opts.ttsOn) {
      this.transition("IDLE");
      return;
    }

    const speakText = stripForTts(openerLang === "th" ? iceBreaker.th : iceBreaker.en);
    window.setTimeout(() => {
      if (this.destroyed || this.state !== "OPENING") return;
      void speak(speakText, openerLang, {
        onEnd: () => {
          if (!this.destroyed && this.state === "OPENING") this.transition("IDLE");
        },
        onError: () => {
          if (!this.destroyed && this.state === "OPENING") this.transition("IDLE");
        },
      });
    }, 1200);
  }

  private async transcribeAudio(audio: Float32Array): Promise<void> {
    if (this.isGuestLocked()) {
      this.opts.callbacks.onGuestLimit?.();
      return;
    }

    const wavBlob = float32ToWav(audio, 16000);
    if (wavBlob.size < 2000) {
      this.transition("IDLE");
      return;
    }

    this.transition("TRANSCRIBING");

    try {
      const form = new FormData();
      form.append("audio", wavBlob, "utterance.wav");
      form.append("language", "auto");

      const res = await fetchWithTimeout(
        "/api/talk/transcribe",
        { method: "POST", body: form, credentials: "include", cache: "no-store" },
        TRANSCRIBE_TIMEOUT_MS,
      );

      if (this.destroyed) return;

      if (!res.ok) {
        this.transition("ERROR");
        return;
      }

      const json = (await res.json()) as { text?: string };
      const text = (json.text ?? "").trim();

      if (!text) {
        this.transition("IDLE");
        return;
      }

      this.emitUserMessage(text);
      this.enqueueTranscript(text);
    } catch (e) {
      console.error("[orch] transcribe error:", e);
      if (!this.destroyed) this.transition("ERROR");
    }
  }

  private emitUserMessage(text: string): void {
    if (this.opts.isGuest) {
      this.opts.callbacks.onGuestExchange?.();
    }
    this.emitMessage({ id: crypto.randomUUID(), kind: "user_said", text });
  }

  private enqueueTranscript(text: string): void {
    const userLang = this.conversationLang;

    if (
      isLikelyHallucination(text, userLang, this.isPracticeAttempt)
    ) {
      console.log(`[orch] dropped hallucination: "${text}"`);
      this.transition("IDLE");
      return;
    }

    if (this.transcriptBuffer) {
      this.transcriptBuffer = `${this.transcriptBuffer}, ${text}`;
    } else if (this.pendingInterruptText) {
      this.transcriptBuffer = `${this.pendingInterruptText}, ${text}`;
      this.pendingInterruptText = null;
    } else {
      this.transcriptBuffer = text;
    }

    this.clearBufferTimer();
    this.bufferTimer = setTimeout(() => {
      this.bufferTimer = null;
      const combined = this.transcriptBuffer;
      this.transcriptBuffer = "";
      if (combined) void this.sendToEngine(combined);
    }, BUFFER_WINDOW_MS);
  }

  private clearBufferTimer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
  }

  private async sendToEngine(text: string): Promise<void> {
    const now = Date.now();
    if (
      text === this.lastEngineText &&
      now - this.lastEngineTime < DEDUP_WINDOW_MS &&
      this.inflightEngine
    ) {
      return this.inflightEngine;
    }

    this.lastEngineText = text;
    this.lastEngineTime = now;

    const promise = this.doEngineCall(text);
    this.inflightEngine = promise;
    try {
      await promise;
    } finally {
      if (this.inflightEngine === promise) this.inflightEngine = null;
    }
  }

  private async doEngineCall(text: string): Promise<void> {
    if (this.isGuestLocked()) {
      this.opts.callbacks.onGuestLimit?.();
      return;
    }

    this.transition("AI_THINKING");
    this.engineAbort = new AbortController();
    const signal = this.engineAbort.signal;

    try {
      const res = await fetchWithTimeout(
        "/api/miomi",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: text }],
            sessionId: this.sessionId,
            sessionInstruction: this.buildSessionInstruction(),
            sessionContext: {
              exchangeNumber: this.exchangeCount,
              wordsIntroduced: this.wordsIntroduced,
            },
          }),
          signal,
        },
        ENGINE_TIMEOUT_MS,
        signal,
      );

      if (this.destroyed || signal.aborted) return;
      if (!res.ok) throw new Error("api failed");

      const data = (await res.json()) as MiomiApiResponse;
      if (signal.aborted) return;

      this.exchangeCount += 1;
      saveSession(this.sessionId, Date.now());

      await this.handleEngineResponse(data);
    } catch (e) {
      if (signal.aborted) return;
      console.error("[orch] engine error:", e);
      this.emitMessage({
        id: crypto.randomUUID(),
        kind: "mini_cat",
        textTh: "หนูขอโทษค่า~ มีบางอย่างผิดพลาด",
        textEn: "Sorry~ something went wrong.",
      });
      if (!this.destroyed) this.transition("ERROR");
    } finally {
      if (this.engineAbort?.signal === signal) this.engineAbort = null;
    }
  }

  private buildSessionInstruction(): string {
    const { config, respLength } = this.opts;
    const speakLang = this.conversationLang;
    const lengthRule =
      respLength === "short"
        ? "Under 25 words."
        : respLength === "detailed"
          ? "60-100 words, thorough."
          : "Under 50 words.";
    const langRule =
      speakLang === "th"
        ? "The user spoke in Thai. Respond in Thai ONLY. Be warm and natural."
        : "The user spoke in English. Respond in English ONLY. Be warm and natural. Do NOT add Thai unless they ask to learn Thai.";
    const levelRule =
      "CRITICAL: Mirror the user's language level. Look at the complexity, vocabulary, and sentence length of their LAST message. If they used simple words and short sentences, reply with simple words and short sentences. If they used advanced vocabulary, you can match it. Never speak above their level. Beginners get short, warm, easy replies — like a kind friend, not a textbook.";
    const modeRule =
      config.mode === "teach"
        ? `You are in Teach mode. The user is learning ${config.teach.learning === "th" ? "Thai" : "English"} at ${config.teach.level} level.`
        : config.mode === "social"
          ? `You are in Social mode. ${config.social.channel ? `Channel: ${config.social.channel}.` : ""} ${config.social.niche ? `Niche: ${config.social.niche}.` : ""}`
          : config.mode === "translate"
            ? "You are in Translator mode. Always provide translations with romanization."
            : config.mode === "chat"
              ? "You are in Just-chat mode. Be warm, present, brief, no teaching."
              : "Auto mode. Detect what the user needs and respond accordingly.";
    return `You are Miomi, a warm kawaii cat companion. ${modeRule} ${langRule} ${levelRule} ${lengthRule} Always end with one question or invitation.`;
  }

  private async handleEngineResponse(data: MiomiApiResponse): Promise<void> {
    const speakLang = this.conversationLang;
    const replyLang: TtsLang = data.replyLanguage ?? data.userSpeaksLanguage ?? speakLang;
    this.conversationLang = replyLang;

    const content = data.content ?? "";
    const parts = content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    const primary = parts[0] ?? content;
    const secondary = parts[1] ?? "";
    let textTh = replyLang === "th" ? primary : secondary;
    let textEn = replyLang === "en" ? primary : secondary;

    const mastery = data.masteryEvent;
    if (mastery?.type === "advanced" && mastery.word) {
      const advTh = pickMasteryAdvanced(mastery.word, "th");
      const advEn = pickMasteryAdvanced(mastery.word, "en");
      if (replyLang === "th") {
        textTh = [primary, advTh].filter(Boolean).join("\n\n");
      } else {
        textEn = [primary, advEn].filter(Boolean).join("\n\n");
      }
    }

    this.emitMessage({
      id: crypto.randomUUID(),
      kind: "mini_cat",
      textTh: textTh || primary,
      textEn: textEn || primary,
    });

    if (mastery?.type === "mastered" && mastery.word) {
      void import("@/lib/celebration/burst")
        .then(({ triggerCelebration }) => {
          triggerCelebration({
            intensity: "high",
            miomi_state: "excited",
            duration_ms: 1400,
          });
        })
        .catch(() => {});
      this.opts.callbacks.onMasteryToast?.({
        th: `${pickMasteryCelebration(mastery.word, "th")} +5 ✦`,
        en: `${pickMasteryCelebration(mastery.word, "en")} +5 ✦`,
      });
    }

    const pronunciationLesson = data.pronunciationLesson;
    if (
      pronunciationLesson &&
      typeof pronunciationLesson.word === "string" &&
      Array.isArray(pronunciationLesson.syllables)
    ) {
      const pronId = crypto.randomUUID();
      this.activePronunciationId = pronId;
      window.setTimeout(() => {
        if (this.destroyed) return;
        this.emitMessage({
          id: pronId,
          kind: "pronunciation",
          lesson: pronunciationLesson,
          heardText: null,
        });
      }, 500);
    }

    const wordCard = data.wordCard;
    if (
      wordCard &&
      typeof wordCard.word_en === "string" &&
      typeof wordCard.word_th === "string"
    ) {
      const position = wordCard.mastery_level ?? 1;
      window.setTimeout(() => {
        if (this.destroyed) return;
        this.emitMessage({
          id: crypto.randomUUID(),
          kind: "practice",
          word: toVocabularyEntry(wordCard),
          position,
          total: 3,
        });
        if (!this.wordsIntroduced.includes(wordCard.word_en)) {
          this.wordsIntroduced = [...this.wordsIntroduced, wordCard.word_en];
          this.opts.callbacks.onWordsIntroduced?.(this.wordsIntroduced);
        }
      }, 600);
    }

    const rawSpeakText = replyLang === "th" ? (textTh || primary) : (textEn || primary);
    const speakText = stripForTts(rawSpeakText);

    if (data.servedVia === "guest_limit") {
      this.opts.callbacks.onGuestLimit?.();
    }

    if (!this.opts.ttsOn || !speakText) {
      this.transition("IDLE");
      return;
    }

    this.transition("AI_SPEAKING");

    const ttsAbort = new AbortController();
    const ttsTimeout = window.setTimeout(() => ttsAbort.abort(), TTS_TIMEOUT_MS);

    try {
      await Promise.race([
        speak(speakText, replyLang, {
          onEnd: () => {
            if (!this.destroyed && this.state === "AI_SPEAKING") this.transition("IDLE");
          },
          onError: () => {
            if (!this.destroyed && this.state === "AI_SPEAKING") this.transition("IDLE");
          },
        }),
        new Promise<void>((_, reject) => {
          ttsAbort.signal.addEventListener("abort", () => reject(new Error("tts timeout")));
        }),
      ]);
    } catch (e) {
      console.error("[orch] tts error:", e);
      if (!this.destroyed && this.state === "AI_SPEAKING") this.transition("ERROR");
    } finally {
      clearTimeout(ttsTimeout);
    }
  }
}

/** Map orchestrator state to legacy MicState for UI components. */
export function mapOrchStateToMic(state: ConversationState): "idle" | "listening" | "processing" | "speaking" {
  switch (state) {
    case "USER_SPEAKING":
    case "INTERRUPTED":
      return "listening";
    case "TRANSCRIBING":
    case "AI_THINKING":
      return "processing";
    case "OPENING":
    case "AI_SPEAKING":
      return "speaking";
    default:
      return "idle";
  }
}

/** Map orchestrator state to VoiceOrb state. */
export function mapOrchStateToOrb(
  state: ConversationState,
  locked: boolean,
): "idle" | "listening" | "thinking" | "speaking" | "locked" {
  if (locked) return "locked";
  switch (state) {
    case "USER_SPEAKING":
    case "INTERRUPTED":
      return "listening";
    case "TRANSCRIBING":
    case "AI_THINKING":
      return "thinking";
    case "OPENING":
    case "AI_SPEAKING":
      return "speaking";
    default:
      return "idle";
  }
}
