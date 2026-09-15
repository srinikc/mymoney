// ── prompt-sound (Web) ───────────────────────────────────────────────────
// Short feedback tones for the assistant wake word (enable/disable/trigger).
// Uses the Web Audio API to synthesize tones — no audio assets, no network,
// works fully offline.

export type PromptSound = "enable" | "disable" | "wake"

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (audioCtx) return audioCtx
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    return null
  }
}

function playTone(freq: number, durationMs: number, volume = 0.15, delayMs = 0) {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    if (ctx.state === "suspended") void ctx.resume()
    const startAt = ctx.currentTime + delayMs / 1000
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + durationMs / 1000 + 0.05)
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect()
      gain.disconnect()
    })
  } catch {
    // Audio feedback is best-effort — never break the caller.
  }
}

/**
 * Play a short synthesized prompt tone.
 *
 * - "enable": two ascending notes — listening armed
 * - "disable": one low note — listening stopped
 * - "wake": three-note chime — wake word detected
 */
export function playPromptSound(kind: PromptSound) {
  switch (kind) {
    case "enable":
      playTone(880, 120)
      playTone(1320, 160, 0.15, 120)
      break
    case "disable":
      playTone(440, 160)
      break
    case "wake":
      playTone(1046, 100)
      playTone(1318, 100, 0.15, 100)
      playTone(1568, 200, 0.15, 200)
      break
  }
}