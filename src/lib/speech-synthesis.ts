// ── Text-to-Speech (browser) ────────────────────────────────────────────
// Free, on-device TTS via the Web Speech Synthesis API. Works offline for
// installed voices and supports Indian languages where the OS provides them.

"use client"

/** Whether the browser supports speech synthesis. */
export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
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
    const voices = window.speechSynthesis.getVoices()
    const exact = voices.find((v) => v.lang === language)
    const prefix = voices.find((v) => v.lang.startsWith(language.slice(0, 2)))
    utterance.voice = exact ?? prefix ?? null
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
