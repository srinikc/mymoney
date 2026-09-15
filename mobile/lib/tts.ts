// ── TTS (Mobile) ────────────────────────────────────────────────────────
// Free, on-device text-to-speech via expo-speech (OS voices).

import * as Speech from "expo-speech"

let speakingRef = false

function cleanForSpeech(text: string): string {
  return text
    .replaceAll(/[*_`#>\-\u2013\u2014]+/g, "")
    .replace(/[\u{10000}-\u{10FFFF}]/gu, "")
    .replaceAll("•", ",")
    .replaceAll(/\s+/g, " ")
    .trim()
}

/** Speak text aloud; calls onEnd when finished (or immediately if empty). */
export function speakText(text: string, lang = "en-IN", onEnd?: () => void): void {
  const clean = cleanForSpeech(text)
  if (!clean) {
    onEnd?.()
    return
  }
  try {
    speakingRef = true
    Speech.stop()
    Speech.speak(clean, {
      language: lang,
      rate: 1,
      onDone: () => { if (speakingRef) onEnd?.() },
      onError: () => { if (speakingRef) onEnd?.() },
    })
  } catch {
    onEnd?.()
  }
}

/** Stop any in-progress speech. */
export function stopTts(): void {
  speakingRef = false
  try {
    Speech.stop()
  } catch {
    /* ignore */
  }
}
