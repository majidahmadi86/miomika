/**
 * PCM capture @ 16 kHz, playback @ 24 kHz ? ported from spike-live/media-handler.js.
 */
import { logEvent } from "@/lib/debug/event-bus";

const PLAYBACK_RATE = 24000;
const SCHEDULE_AHEAD_S = 0.04;
const CHUNK_FADE_SAMPLES = 64;

export class MediaHandler {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private inputGain: GainNode | null = null;
  private nextStartTime = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private playbackActive = false;
  /** True from first model PCM chunk until turn_complete + full drain — gates mic across inter-chunk gaps. */
  private modelTurnActive = false;
  private turnCompleteReceived = false;
  private pendingAfterDrain: Array<() => void> = [];
  private micSendSuspended = false;
  private lastMicForward: boolean | null = null;
  private modelTurnIdleSince: number | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  isRecording = false;

  constructor() {
    this.watchdogTimer = setInterval(() => this.tickModelTurnWatchdog(), 200);
  }

  private logMicForwardFlip(): void {
    const forward = this.shouldForwardMicToGemini();
    if (forward === this.lastMicForward) return;
    this.lastMicForward = forward;
    logEvent({
      kind: "mic",
      level: "info",
      message: `shouldForwardMicToGemini=${forward}`,
      data: {
        isRecording: this.isRecording,
        modelTurnActive: this.modelTurnActive,
        micSendSuspended: this.micSendSuspended,
      },
    });
  }

  private setModelTurnActive(active: boolean, reason: string): void {
    if (this.modelTurnActive === active) return;
    this.modelTurnActive = active;
    logEvent({
      kind: "state",
      level: "info",
      message: `modelTurnActive=${active}`,
      data: { reason },
    });
    this.logMicForwardFlip();
  }

  /** Force-clear model-turn gate (invitation drain, watchdog). */
  clearModelTurnGate(reason: string): void {
    this.setModelTurnActive(false, reason);
    this.turnCompleteReceived = false;
    this.modelTurnIdleSince = null;
    this.flushDeferredAfterDrain();
  }

  private tickModelTurnWatchdog(): void {
    if (!this.modelTurnActive) {
      this.modelTurnIdleSince = null;
      return;
    }
    if (this.isPlaybackActive()) {
      this.modelTurnIdleSince = null;
      return;
    }
    const now = Date.now();
    if (this.modelTurnIdleSince === null) {
      this.modelTurnIdleSince = now;
      return;
    }
    if (now - this.modelTurnIdleSince >= 1500) {
      logEvent({
        kind: "state",
        level: "warn",
        message: "modelTurnActive watchdog force-clear",
        data: { idleMs: now - this.modelTurnIdleSince },
      });
      this.clearModelTurnGate("watchdog idle 1500ms");
    }
  }

  /** True when mic PCM may be forwarded to Gemini (harness + replay guard). */
  shouldForwardMicToGemini(): boolean {
    return this.isRecording && !this.modelTurnActive && !this.micSendSuspended;
  }

  isModelTurnActive(): boolean {
    return this.modelTurnActive;
  }

  /** Card replay / speaker-bleed guard ? model turns during suspension must be discarded. */
  isMicSendSuspended(): boolean {
    return this.micSendSuspended;
  }

  /** Call synchronously inside a user-gesture handler before any await. */
  primeAudioContext(): void {
    if (typeof window === "undefined") return;
    if (!this.audioContext) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  }

  /** Resume + load worklet ? must run from the gesture that starts a live session. */
  async unlockPlayback(): Promise<void> {
    this.primeAudioContext();
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    try {
      await this.audioContext.audioWorklet.addModule("/pcm-processor.js");
    } catch {
      /* module already registered */
    }
  }

  async initializeAudio(): Promise<void> {
    await this.unlockPlayback();
  }

  async startAudio(onAudioData: (pcm: ArrayBuffer) => void): Promise<void> {
    await this.initializeAudio();
    if (!this.audioContext) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.inputGain = this.audioContext.createGain();
    this.inputGain.gain.value = 1;
    this.audioWorkletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

    this.audioWorkletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!this.shouldForwardMicToGemini()) return;
      const downsampled = this.downsampleBuffer(
        event.data,
        this.audioContext!.sampleRate,
        16000,
      );
      const pcm16 = this.convertFloat32ToInt16(downsampled);
      onAudioData(pcm16);
    };

    source.connect(this.inputGain);
    this.inputGain.connect(this.audioWorkletNode);
    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;
    this.audioWorkletNode.connect(muteGain);
    muteGain.connect(this.audioContext.destination);

    this.isRecording = true;
    this.logMicForwardFlip();
  }

  stopAudio(): void {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.inputGain) {
      this.inputGain.disconnect();
      this.inputGain = null;
    }
    this.logMicForwardFlip();
  }

  private applyChunkFade(samples: Float32Array): void {
    const fade = Math.min(CHUNK_FADE_SAMPLES, Math.floor(samples.length / 4));
    if (fade < 2) return;
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      samples[i] *= t;
      samples[samples.length - 1 - i] *= t;
    }
  }

  private onScheduledSourceEnded(ended: AudioBufferSourceNode): void {
    const idx = this.scheduledSources.indexOf(ended);
    if (idx > -1) this.scheduledSources.splice(idx, 1);
    if (this.scheduledSources.length === 0) {
      this.playbackActive = false;
      if (this.audioContext) {
        this.nextStartTime = this.audioContext.currentTime;
      }
    }
  }

  playAudio(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }

    if (!this.modelTurnActive) {
      this.turnCompleteReceived = false;
    }
    this.setModelTurnActive(true, "playAudio pcm chunk");

    const pcmData = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }
    this.applyChunkFade(float32Data);

    const buffer = this.audioContext.createBuffer(1, float32Data.length, PLAYBACK_RATE);
    buffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    if (this.scheduledSources.length === 0) {
      this.nextStartTime = now + SCHEDULE_AHEAD_S;
    } else if (this.nextStartTime < now) {
      this.nextStartTime = now + SCHEDULE_AHEAD_S;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.playbackActive = true;
    this.scheduledSources.push(source);
    source.onended = () => this.onScheduledSourceEnded(source);
  }

  stopAudioPlayback(): void {
    this.scheduledSources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    });
    this.scheduledSources = [];
    this.playbackActive = false;
    this.setModelTurnActive(false, "stopAudioPlayback");
    this.turnCompleteReceived = false;
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }
    this.flushDeferredAfterDrain();
  }

  /** Call when Gemini signals turn_complete — mic stays gated until PCM fully drains. */
  signalModelTurnComplete(): void {
    this.turnCompleteReceived = true;
  }

  /** Waits for scheduled PCM (including post–turn_complete chunks), then clears model-turn gate. */
  async endModelTurnWhenDrained(maxWaitForStartMs = 3000): Promise<void> {
    if (!this.turnCompleteReceived && !this.modelTurnActive) return;
    await this.waitForTurnAudioThenIdle(maxWaitForStartMs);
    this.setModelTurnActive(false, "endModelTurnWhenDrained");
    this.turnCompleteReceived = false;
    this.flushDeferredAfterDrain();
  }

  /** Queue side effects (hidden nudges) until model output has fully drained. */
  deferUntilPlaybackIdle(fn: () => void): void {
    if (this.modelTurnActive || this.isPlaybackActive()) {
      this.pendingAfterDrain.push(fn);
      return;
    }
    fn();
  }

  private flushDeferredAfterDrain(): void {
    if (this.modelTurnActive || this.isPlaybackActive()) return;
    const batch = this.pendingAfterDrain.splice(0);
    for (const fn of batch) fn();
  }

  isPlaybackActive(): boolean {
    return this.playbackActive || this.scheduledSources.length > 0;
  }

  /** LOCKED 2026-06-05 ? guest 5th-turn invite + sheet wait on playback idle before firing CTA. */
  waitForPlaybackIdle(): Promise<void> {
    if (!this.isPlaybackActive()) return Promise.resolve();
    return new Promise((resolve) => {
      const poll = () => {
        if (!this.isPlaybackActive()) {
          resolve();
          return;
        }
        requestAnimationFrame(poll);
      };
      poll();
    });
  }

  /**
   * LOCKED 2026-06-05 ? guest 5th reply: turn_complete often precedes PCM; wait longer so
   * invitation sendSpeakExact cannot interrupt voiced handoff audio.
   */
  waitForHandoffReplyDrain(maxWaitForStartMs = 2500, settleMs = 120): Promise<void> {
    return this.waitForTurnAudioThenIdle(maxWaitForStartMs)
      .then(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(resolve, settleMs);
          }),
      )
      .then(() => {
        if (this.turnCompleteReceived || this.modelTurnActive) {
          this.setModelTurnActive(false, "waitForHandoffReplyDrain");
          this.turnCompleteReceived = false;
          this.flushDeferredAfterDrain();
        }
      });
  }

  /**
   * LOCKED 2026-06-05 ? turn_complete can arrive before Live PCM is scheduled.
   * Wait for playback to start (if any), then drain fully before the invitation cue.
   */
  waitForTurnAudioThenIdle(maxWaitForStartMs = 3000): Promise<void> {
    const start = Date.now();
    return new Promise((resolve) => {
      const poll = () => {
        if (this.isPlaybackActive()) {
          void this.waitForPlaybackIdle().then(resolve);
          return;
        }
        if (Date.now() - start >= maxWaitForStartMs) {
          resolve();
          return;
        }
        requestAnimationFrame(poll);
      };
      poll();
    });
  }

  /** Suspend mic PCM to Gemini (card replay, speaker bleed guard). */
  suspendMicSend(suspended: boolean): void {
    this.micSendSuspended = suspended;
    if (this.inputGain) {
      this.inputGain.gain.value = suspended ? 0 : 1;
    }
    this.logMicForwardFlip();
  }

  /** @deprecated use suspendMicSend ? kept for callers that only duck gain */
  setInputMuted(muted: boolean): void {
    this.suspendMicSend(muted);
  }

  private downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array {
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
    const buf = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7fff;
    }
    return buf.buffer;
  }
}
