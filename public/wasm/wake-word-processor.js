// ── AudioWorklet Processor for Wake Word Detection ──────────────────────
// Runs on a separate audio thread — no main-thread blocking.
// Receives raw PCM float32 samples and forwards them to the main thread
// via postMessage for KWS processing.

class WakeWordProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSize = 1600 // 100ms at 16kHz
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const samples = input[0]
    let offset = 0

    while (offset < samples.length) {
      const remaining = this.bufferSize - this.bufferIndex
      const toCopy = Math.min(remaining, samples.length - offset)
      this.buffer.set(samples.subarray(offset, offset + toCopy), this.bufferIndex)
      this.bufferIndex += toCopy
      offset += toCopy

      if (this.bufferIndex >= this.bufferSize) {
        // Buffer full — send to main thread for KWS processing
        this.port.postMessage({
          type: "audio",
          samples: this.buffer.slice(),
        })
        this.bufferIndex = 0
      }
    }

    return true
  }
}

registerProcessor("wake-word-processor", WakeWordProcessor)
