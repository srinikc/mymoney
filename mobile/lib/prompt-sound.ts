// ── prompt-sound (Mobile) ────────────────────────────────────────────────
// Short feedback tones for the assistant wake word (enable/disable/trigger).
// Uses expo-audio with small bundled WAV assets — fully offline.

import { createAudioPlayer, setAudioModeAsync } from "expo-audio"

export type PromptSound = "enable" | "disable" | "wake"

const sources: Record<PromptSound, number> = {
  enable: require("../../assets/sounds/enable.wav"),
  disable: require("../../assets/sounds/disable.wav"),
  wake: require("../../assets/sounds/wake.wav"),
}

const players: Record<PromptSound, ReturnType<typeof createAudioPlayer> | null> = {
  enable: null,
  disable: null,
  wake: null,
}

let modeConfigured = false

async function ensureMode() {
  if (modeConfigured) return
  try {
    await setAudioModeAsync({ playsInSilentMode: true })
    modeConfigured = true
  } catch {
    // Best-effort — audio feedback must never break the caller.
  }
}

/**
 * Play a short bundled prompt tone.
 *
 * - "enable": two ascending notes — listening armed
 * - "disable": one low note — listening stopped
 * - "wake": three-note chime — wake word detected
 */
export async function playPromptSound(kind: PromptSound) {
  try {
    await ensureMode()
    let player = players[kind]
    if (!player) {
      player = createAudioPlayer(sources[kind])
      players[kind] = player
    }
    player.seekTo(0)
    player.play()
  } catch {
    // Best-effort — audio feedback must never break the caller.
  }
}