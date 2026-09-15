// ── TTS client ──────────────────────────────────────────────────────────
// Prefers the natural server-side voice (/api/tts, Microsoft Edge neural),
// and transparently falls back to the browser Web Speech API.

"use client"

import { speak as webSpeak, stopSpeaking as webStop, isTtsSupported } from "./speech-synthesis"
import { defaultEdgeVoice } from "@/shared/tts-voices"

let currentAudio: HTMLAudioElement | null = null
let currentAbort: AbortController | null = null
let currentObjectUrl: string | null = null

function cleanupAudio(): void {
  if (currentObjectUrl) {
    try { URL.revokeObjectURL(currentObjectUrl) } catch { /* ignore */ }
    currentObjectUrl = null
  }
  currentAudio = null
}

/**
 * Speak text aloud. Tries the natural server voice first; on any failure
 * (offline, 502, autoplay blocked) falls back to browser speech. Calls
 * `onEnd` exactly once when playback finishes.
 */
export async function speakText(
  text: string,
  lang = "en-IN",
  voice?: string,
  onEnd?: () => void,
): Promise<void> {
  stopTts()
  const clean = text.trim()
  if (!clean) {
    onEnd?.()
    return
  }

  try {
    const controller = new AbortController()
    currentAbort = controller
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, lang, voice: voice || defaultEdgeVoice(lang) }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`tts http ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    currentObjectUrl = url
    const audio = new Audio(url)
    currentAudio = audio

    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (currentAudio === audio) cleanupAudio()
      onEnd?.()
    }
    audio.addEventListener("ended", finish)
    audio.addEventListener("error", finish)

    await audio.play()
    // Safety net: if ended/error never fire, continue the conversation anyway.
    const estimate = Math.min(30_000, Math.max(3000, clean.length * 80)) + 2000
    setTimeout(() => { if (!done && currentAudio === audio) finish() }, estimate)
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      onEnd?.()
      return
    }
    if (isTtsSupported()) webSpeak(clean, lang, onEnd)
    else onEnd?.()
  }
}

/** Stop any in-progress speech (server audio and/or browser speech). */
export function stopTts(): void {
  try { currentAbort?.abort() } catch { /* ignore */ }
  currentAbort = null
  try { currentAudio?.pause() } catch { /* ignore */ }
  cleanupAudio()
  webStop()
}
