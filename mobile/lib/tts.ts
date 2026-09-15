// ── TTS (Mobile) ────────────────────────────────────────────────────────
// Prefers the natural Edge neural voice from /api/tts (played via expo-audio),
// falling back to on-device expo-speech if that fails.

import * as Speech from "expo-speech"
import { File, Paths } from "expo-file-system"
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio"
import api from "../api/client"

let player: AudioPlayer | null = null
let statusSub: { remove: () => void } | null = null
let speakToken = 0

function cleanForSpeech(text: string): string {
  return text
    .replaceAll(/[*_`#>\-\u2013\u2014]+/g, "")
    .replace(/[\u{10000}-\u{10FFFF}]/gu, "")
    .replaceAll("•", ",")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function releasePlayer(): void {
  try { player?.pause() } catch { /* ignore */ }
  try { player?.remove() } catch { /* ignore */ }
  player = null
  try { statusSub?.remove() } catch { /* ignore */ }
  statusSub = null
}

/**
 * Speak text aloud. Tries the natural server voice first; on any failure falls
 * back to the OS voice. Calls onEnd exactly once.
 */
export async function speakText(text: string, lang = "en-IN", onEnd?: () => void): Promise<void> {
  const clean = cleanForSpeech(text)
  if (!clean) {
    onEnd?.()
    return
  }
  stopTts()
  const token = ++speakToken

  try {
    const res = await api.post("/api/tts", { text: clean.slice(0, 800), lang }, {
      responseType: "arraybuffer",
      timeout: 30000,
    })
    if (token !== speakToken) return

    const bytes = new Uint8Array(res.data as ArrayBuffer)
    const file = new File(Paths.cache, `assistant-tts-${Date.now()}.mp3`)
    try { if (file.exists) file.delete() } catch { /* ignore */ }
    file.write(bytes)
    if (token !== speakToken) return

    await setAudioModeAsync({ playsInSilentMode: true })
    const p = createAudioPlayer({ uri: file.uri })
    player = p

    let done = false
    const finish = () => {
      if (done) return
      done = true
      releasePlayer()
      onEnd?.()
    }

    statusSub = p.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) finish()
    })
    p.play()
    // Safety net: continue the conversation if playback events never arrive.
    setTimeout(() => { if (token === speakToken && !done) finish() }, 30000)
  } catch {
    if (token !== speakToken) {
      onEnd?.()
      return
    }
    // Fallback to the OS voice.
    try {
      Speech.speak(clean, {
        language: lang,
        rate: 1,
        onDone: () => onEnd?.(),
        onError: () => onEnd?.(),
      })
    } catch {
      onEnd?.()
    }
  }
}

/** Stop any in-progress speech. */
export function stopTts(): void {
  speakToken++
  releasePlayer()
  try { Speech.stop() } catch { /* ignore */ }
}
