// ── TTS Provider Abstraction ────────────────────────────────────────────
// Unified interface for Text-to-Speech.
// Primary: Browser TTS + Edge TTS (free)
// Fallback: Server TTS (Kokoro/Piper on Render — deploy when needed)

import type { TTSProvider, TTSResult } from "@/shared/assistant"

// ── Browser TTS (Primary) ───────────────────────────────────────────────

/**
 * Browser/device TTS using speechSynthesis API.
 * Free, works offline, but robotic voice quality.
 */
export class BrowserTTSProvider implements TTSProvider {
  name = "browser"

  isAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window
  }

  async synthesize(text: string, language: string): Promise<TTSResult> {
    if (!this.isAvailable()) {
      throw new Error("Browser TTS not available")
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = 1
      utterance.pitch = 1

      // Try to find a voice for the language
      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find((v) => v.lang.startsWith(language.split("-")[0]))
      if (matchingVoice) {
        utterance.voice = matchingVoice
      }

      utterance.onend = () => {
        // Estimate duration (rough: 150 words per minute)
        const wordCount = text.split(/\s+/).length
        const duration = (wordCount / 150) * 60

        resolve({
          audio: Buffer.from(""), // Browser TTS doesn't produce audio buffer
          duration,
          language,
        })
      }

      utterance.addEventListener("error", (event) => {
        reject(new Error(`TTS error: ${event.error}`))
      })

      window.speechSynthesis.speak(utterance)
    })
  }
}

// ── Edge TTS (Free Microsoft API) ───────────────────────────────────────

/**
 * Microsoft Edge TTS — free, natural-sounding voices.
 * Uses the same API as Microsoft Edge's Read Aloud feature.
 * No API key required.
 */
export class EdgeTTSProvider implements TTSProvider {
  name = "edge"

  private voiceMap: Record<string, string> = {
    "en-IN": "en-IN-NeerjaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "kn-IN": "kn-IN-SapnaNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "te-IN": "te-IN-ShrutiNeural",
    "bn-IN": "bn-IN-TanishaaNeural",
    "mr-IN": "mr-IN-AarohiNeural",
    "ur-IN": "ur-IN-UzmaNeural",
    "ml-IN": "ml-IN-SobhanaNeural",
    "gu-IN": "gu-IN-DhwaniNeural",
    "pa-IN": "pa-IN-GurpreetNeural",
    "or-IN": "or-IN-SubhasiniNeural",
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" // Client-side only for now
  }

  async synthesize(text: string, language: string): Promise<TTSResult> {
    // Edge TTS requires a WebSocket connection
    // For now, fall back to browser TTS
    // TODO: Implement Edge TTS WebSocket client when needed
    const browserTTS = new BrowserTTSProvider()
    return browserTTS.synthesize(text, language)
  }
}

// ── Server TTS (Fallback — deploy when needed) ──────────────────────────

/**
 * Server-side TTS using Kokoro/Piper.
 * Natural-sounding voices, supports Indian languages.
 * Deploy to Render/Railway when needed.
 */
export class ServerTTSProvider implements TTSProvider {
  name = "server"
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.STT_TTS_SERVICE_URL || "http://localhost:8000"
  }

  isAvailable(): boolean {
    return !!process.env.STT_TTS_SERVICE_URL
  }

  async synthesize(text: string, language: string): Promise<TTSResult> {
    if (!this.isAvailable()) {
      throw new Error("Server TTS not configured. Set STT_TTS_SERVICE_URL env var.")
    }

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    if (!response.ok) {
      throw new Error(`Server TTS failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      audio: Buffer.from(data.audio, "base64"),
      duration: data.duration || 0,
      language,
    }
  }
}

// ── Provider Factory ────────────────────────────────────────────────────

/**
 * Get the best available TTS provider.
 * Tries Edge TTS first (free, natural), falls back to browser, then server.
 */
export function getTTSProvider(): TTSProvider {
  // Server TTS if configured (best quality)
  const serverTTS = new ServerTTSProvider()
  if (serverTTS.isAvailable()) {
    return serverTTS
  }

  // Edge TTS (free, good quality) — TODO: implement WebSocket client
  // const edgeTTS = new EdgeTTSProvider()
  // if (edgeTTS.isAvailable()) return edgeTTS

  // Browser TTS (free, robotic but works)
  const browserTTS = new BrowserTTSProvider()
  if (browserTTS.isAvailable()) {
    return browserTTS
  }

  // Return browser as default
  return browserTTS
}

/**
 * Play TTS audio in the browser.
 * Handles both buffer-based (server) and utterance-based (browser) TTS.
 */
export async function playTTS(text: string, language: string): Promise<void> {
  const provider = getTTSProvider()

  if (provider.name === "browser") {
    // Browser TTS speaks directly
    await provider.synthesize(text, language)
  } else {
    // Server TTS returns audio buffer — play it
    const result = await provider.synthesize(text, language)
    if (result.audio.length > 0) {
      await playAudioBuffer(result.audio)
    }
  }
}

/**
 * Play an audio buffer in the browser.
 */
async function playAudioBuffer(buffer: Buffer): Promise<void> {
  if (typeof window === "undefined") return

  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(buffer)
  const blob = new Blob([uint8Array], { type: "audio/mpeg" })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)

  return new Promise((resolve, reject) => {
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(url)
      resolve()
    })
    audio.addEventListener("error", (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    })
    audio.play().catch(reject)
  })
}
