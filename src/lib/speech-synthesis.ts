// ── Text-to-Speech (browser) ────────────────────────────────────────────
// Free, on-device TTS via the Web Speech Synthesis API. Works offline for
// installed voices and supports Indian languages where the OS provides them.

"use client"

/** Whether the browser supports speech synthesis. */
export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

const VOICE_KEY = "mm-assistant-voice"

/** All installed voices (empty until the browser has loaded them). */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return []
  try {
    return window.speechSynthesis.getVoices()
  } catch {
    return []
  }
}

/** The user's chosen voice name, if any. */
export function getSelectedVoiceName(): string | null {
  try {
    return localStorage.getItem(VOICE_KEY)
  } catch {
    return null
  }
}

/** Persist the user's chosen voice name. */
export function setSelectedVoiceName(name: string): void {
  try {
    if (name) localStorage.setItem(VOICE_KEY, name)
    else localStorage.removeItem(VOICE_KEY)
  } catch {
    /* ignore */
  }
}

/** Pick the most natural-sounding voice for a language. */
function pickVoice(language: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices()
  if (voices.length === 0) return null
  const selectedName = getSelectedVoiceName()
  const selected = selectedName ? voices.find((v) => v.name === selectedName) : null
  if (selected) return selected

  const langVoices = voices.filter((v) => v.lang === language || v.lang.startsWith(language.slice(0, 2)))
  const pool = langVoices.length > 0 ? langVoices : voices
  // Prefer the higher-quality voices shipped by Chrome/Edge/macOS.
  return (
    pool.find((v) => /natural|neural|online|premium|enhanced/i.test(v.name)) ??
    pool.find((v) => /google/i.test(v.name)) ??
    pool[0]
  )
}

/**
 * Strip markdown/emojis so the spoken output sounds natural.
 */
function cleanForSpeech(text: string): string {
  return text
    .replaceAll(/[#*>_`]+/g, "")
    .replaceAll(/[\u{10000}-\u{10FFFF}]/gu, "") // emojis (non-BMP)
    .replaceAll(/[–—•-]/g, ",")
    .replaceAll(/\s+/g, " ")
    .trim()
}

/**
 * Speak `text` aloud. Calls `onEnd` when finished (or immediately if TTS is
 * unavailable), so callers can chain the next conversational turn.
 */
export function speak(text: string, language = "en-IN", onEnd?: () => void): void {
  if (!isTtsSupported()) {
    onEnd?.()
    return
  }
  const clean = cleanForSpeech(text)
  if (!clean) {
    onEnd?.()
    return
  }
  let done = false
  const finish = () => {
    if (done) return
    done = true
    onEnd?.()
  }
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = language
    utterance.rate = 1
    utterance.pitch = 1
    const voice = pickVoice(language)
    if (voice) utterance.voice = voice
    if (onEnd) {
      utterance.addEventListener("end", finish)
      utterance.addEventListener("error", finish)
      // Safety net: some browsers have no installed voices and never fire
      // 'end'/'error'. Fall back to an estimated duration so the
      // conversational loop still continues.
      const estimateMs = Math.min(20_000, Math.max(2500, clean.length * 70))
      setTimeout(finish, estimateMs)
    }
    window.speechSynthesis.speak(utterance)
  } catch {
    finish()
  }
}

/** Stop any in-progress speech. */
export function stopSpeaking(): void {
  if (isTtsSupported()) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
}
