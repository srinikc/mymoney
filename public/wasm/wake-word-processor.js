// ── AudioWorklet Processor for Wake Word Detection ──────────────────────
// Runs on a separate audio thread. Captures microphone PCM at the context's
// native sample rate and resamples it to 16 kHz (what the KWS model expects),
// then forwards 100 ms (1600-sample) chunks to the main thread for KWS.
//
// Resampling here is essential: `new AudioContext({ sampleRate: 16000 })` is
// only a request — many devices/browsers ignore it and run at 48 kHz. Feeding
// 48 kHz samples to the KWS as if they were 16 kHz produces wrong features and
// wake word detection never fires.

class WakeWordProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.targetRate = 16000
    // `sampleRate` is a global in AudioWorkletGlobalScope.
    this.inputRate = sampleRate
    this.ratio = this.inputRate / this.targetRate
    this.bufferSize = 1600 // 100 ms at 16 kHz
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
    this.residual = new Float32Array(0)
  }

  emit(sample) {
    this.buffer[this.bufferIndex++] = sample
    if (this.bufferIndex >= this.bufferSize) {
      this.port.postMessage({ type: "audio", samples: this.buffer.slice() })
      this.bufferIndex = 0
    }
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true
    const samples = input[0]

    // Fast path: already 16 kHz.
    if (this.ratio === 1) {
      for (let i = 0; i < samples.length; i++) this.emit(samples[i])
      return true
    }

    // Linear-interpolation resample to 16 kHz, preserving continuity across
    // process() calls via the residual tail.
    const joined = new Float32Array(this.residual.length + samples.length)
    joined.set(this.residual, 0)
    joined.set(samples, this.residual.length)

    const outCount = Math.floor((joined.length - 1) / this.ratio)
    for (let i = 0; i < outCount; i++) {
      const pos = i * this.ratio
      const i0 = Math.floor(pos)
      const frac = pos - i0
      this.emit(joined[i0] * (1 - frac) + joined[i0 + 1] * frac)
    }

    const consumed = Math.floor(outCount * this.ratio)
    this.residual = joined.slice(consumed)
    return true
  }
}

registerProcessor("wake-word-processor", WakeWordProcessor)
