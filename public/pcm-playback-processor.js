/** Continuous 24 kHz PCM playback — gapless ring buffer, no per-chunk BufferSource clicks. */
const PLAYBACK_RATE = 24000;

class PCMPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunks = [];
    this.chunkOffset = 0;
    this.ratio = sampleRate / PLAYBACK_RATE;
    this.acc = 0;
    this.lastSample = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === "clear") {
        this.chunks = [];
        this.chunkOffset = 0;
        this.acc = 0;
        this.lastSample = 0;
        return;
      }
      if (msg?.type === "pcm" && msg.data) {
        this.chunks.push(msg.data);
      }
    };
  }

  readSourceSample() {
    while (this.chunks.length > 0) {
      const chunk = this.chunks[0];
      if (this.chunkOffset >= chunk.length) {
        this.chunks.shift();
        this.chunkOffset = 0;
        continue;
      }
      const s = chunk[this.chunkOffset++] / 32768;
      return s;
    }
    return null;
  }

  process(_inputs, outputs) {
    const out = outputs[0]?.[0];
    if (!out) return true;

    for (let i = 0; i < out.length; i++) {
      this.acc += this.ratio;
      while (this.acc >= 1) {
        const s = this.readSourceSample();
        if (s === null) break;
        this.lastSample = s;
        this.acc -= 1;
      }
      out[i] = this.lastSample;
      if (this.chunks.length === 0 && this.acc < 1) {
        this.lastSample = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-playback-processor", PCMPlaybackProcessor);
