// Generate short prompt-tone WAV files for the mobile assistant.
// Runs once via: node scripts/generate-prompt-sounds.mjs
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SAMPLE_RATE = 22050
const outDir = join(__dirname, "..", "mobile", "assets", "sounds")
mkdirSync(outDir, { recursive: true })

function encodeWav(samples) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2)
  }
  return buffer
}

function tone(freq, durationSec, volume = 0.25, delaySec = 0) {
  const total = Math.floor((delaySec + durationSec + 0.05) * SAMPLE_RATE)
  const samples = new Array(total).fill(0)
  const start = Math.floor(delaySec * SAMPLE_RATE)
  const n = Math.floor(durationSec * SAMPLE_RATE)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = Math.min(1, t / 0.01) * Math.min(1, (durationSec - t) / 0.03)
    samples[start + i] = Math.sin(2 * Math.PI * freq * t) * volume * Math.max(0, env)
  }
  return samples
}

function mix(...tracks) {
  const len = Math.max(...tracks.map((t) => t.length))
  const out = new Array(len).fill(0)
  for (const track of tracks) {
    for (let i = 0; i < track.length; i++) out[i] += track[i]
  }
  return out
}

// enable: two ascending notes
const enable = mix(tone(880, 0.12), tone(1320, 0.16, 0.25, 0.12))
// disable: one low note
const disable = tone(440, 0.16, 0.25)
// wake: three-note chime
const wake = mix(tone(1046, 0.1), tone(1318, 0.1, 0.25, 0.1), tone(1568, 0.2, 0.25, 0.2))

const files = { enable: enable, disable: disable, wake: wake }
for (const [name, samples] of Object.entries(files)) {
  const filePath = join(outDir, `${name}.wav`)
  writeFileSync(filePath, encodeWav(samples))
  console.log(`Wrote ${filePath} (${samples.length} samples)`)
}