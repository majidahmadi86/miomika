/**
 * PCM capture @ 16 kHz, playback @ 24 kHz via gapless AudioWorklet ring buffer.
 */
export class MediaHandler {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private captureWorklet: AudioWorkletNode | null = null;
  private playbackWorklet: AudioWorkletNode | null = null;
  private inputGain: GainNode | null = null;
  private playbackActive = false;
  private playbackIdleTimer: ReturnType<typeof setTimeout> | null = null;
  isRecording = false;

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

  /** Resume + load worklets — must run from the gesture that starts a live session. */
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
    try {
      await this.audioContext.audioWorklet.addModule("/pcm-playback-processor.js");
    } catch {
      /* module already registered */
    }
    this.ensurePlaybackNode();
  }

  private ensurePlaybackNode(): void {
    if (!this.audioContext || this.playbackWorklet) return;
    this.playbackWorklet = new AudioWorkletNode(this.audioContext, "pcm-playback-processor");
    this.playbackWorklet.connect(this.audioContext.destination);
  }

  async initializeAudio(): Promise<void> {
    await this.unlockPlayback();
  }

  private setMicMuted(muted: boolean): void {
    if (this.inputGain) {
      this.inputGain.gain.value = muted ? 0 : 1;
    }
  }

  private markPlaybackActive(): void {
    this.playbackActive = true;
    this.setMicMuted(true);
    if (this.playbackIdleTimer) {
      clearTimeout(this.playbackIdleTimer);
      this.playbackIdleTimer = null;
    }
    this.playbackIdleTimer = setTimeout(() => {
      this.playbackActive = false;
      this.setMicMuted(false);
      this.playbackIdleTimer = null;
    }, 280);
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
    this.captureWorklet = new AudioWorkletNode(this.audioContext, "pcm-processor");

    this.captureWorklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!this.isRecording || this.playbackActive) return;
      const downsampled = this.downsampleBuffer(
        event.data,
        this.audioContext!.sampleRate,
        16000,
      );
      const pcm16 = this.convertFloat32ToInt16(downsampled);
      onAudioData(pcm16);
    };

    source.connect(this.inputGain);
    this.inputGain.connect(this.captureWorklet);
    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;
    this.captureWorklet.connect(muteGain);
    muteGain.connect(this.audioContext.destination);

    this.isRecording = true;
  }

  stopAudio(): void {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.captureWorklet) {
      this.captureWorklet.disconnect();
      this.captureWorklet = null;
    }
    if (this.inputGain) {
      this.inputGain.disconnect();
      this.inputGain = null;
    }
  }

  playAudio(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
    this.ensurePlaybackNode();
    if (!this.playbackWorklet) return;

    const pcmData = new Int16Array(arrayBuffer);
    this.playbackWorklet.port.postMessage({ type: "pcm", data: pcmData }, [pcmData.buffer]);
    this.markPlaybackActive();
  }

  stopAudioPlayback(): void {
    if (this.playbackIdleTimer) {
      clearTimeout(this.playbackIdleTimer);
      this.playbackIdleTimer = null;
    }
    this.playbackActive = false;
    this.setMicMuted(false);
    this.playbackWorklet?.port.postMessage({ type: "clear" });
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
