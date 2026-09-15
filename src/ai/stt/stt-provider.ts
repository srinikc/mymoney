// ── STT Provider Abstraction ────────────────────────────────────────────
// Unified interface for Speech-to-Text.
// Primary: Browser/device STT (free, works offline)
// Fallback: Server STT (Whisper/Vosk on Render — deploy when needed)

import type { STTProvider, STTResult } from "@/shared/assistant"

// Use any for browser Speech Recognition types to avoid conflicts
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Browser STT (Primary) ───────────────────────────────────────────────

/**
 * Browser/device STT using Web Speech API.
 * Free, works offline on some devices, good accuracy for Hindi/English.
 */
export class BrowserSTTProvider implements STTProvider {
  name = "browser"

  private recognition: any = null
  private resolvePromise: ((result: STTResult) => void) | null = null
  private rejectPromise: ((error: Error) => void) | null = null

  isAvailable(): boolean {
    return typeof window !== "undefined" && (
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    )
  }

  /**
   * Transcribe audio from microphone.
   * Note: This is a one-shot transcription — starts mic, waits for result, stops.
   * For continuous listening, use the useSpeechRecognition hook instead.
   */
  async transcribe(audio: Buffer | string, language: string): Promise<STTResult> {
    if (!this.isAvailable()) {
      throw new Error("Browser STT not available")
    }

    return new Promise((resolve, reject) => {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.recognition = new SpeechRecognitionConstructor()
      this.recognition.lang = language
      this.recognition.continuous = false
      this.recognition.interimResults = false
      this.recognition.maxAlternatives = 1

      this.resolvePromise = resolve
      this.rejectPromise = reject

      this.recognition.onresult = (event: any) => {
        const result = event.results[0]
        if (result.isFinal) {
          const transcript = result[0].transcript
          const confidence = result[0].confidence
          resolve({
            text: transcript,
            confidence,
            language,
          })
        }
      }

      this.recognition.addEventListener("error", (event: any) => {
        reject(new Error(`STT error: ${event.error}`))
      })

      this.recognition.onend = () => {
        // If no result was received, reject
        if (this.rejectPromise) {
          this.rejectPromise(new Error("No speech detected"))
          this.resolvePromise = null
          this.rejectPromise = null
        }
      }

      this.recognition.start()
    })
  }

  /**
   * Stop ongoing recognition.
   */
  stop(): void {
    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }
  }
}

// ── Server STT (Fallback — deploy when needed) ──────────────────────────

/**
 * Server-side STT using Whisper/Vosk.
 * Better accuracy for Indian languages, especially when browser STT fails.
 * Deploy to Render/Railway when needed.
 */
export class ServerSTTProvider implements STTProvider {
  name = "server"
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.STT_TTS_SERVICE_URL || "http://localhost:8000"
  }

  isAvailable(): boolean {
    // Check if server STT service is configured
    return !!process.env.STT_TTS_SERVICE_URL
  }

  async transcribe(audio: Buffer | string, language: string): Promise<STTResult> {
    if (!this.isAvailable()) {
      throw new Error("Server STT not configured. Set STT_TTS_SERVICE_URL env var.")
    }

    const audioBase64 = typeof audio === "string"
      ? audio
      : audio.toString("base64")

    const response = await fetch(`${this.baseUrl}/stt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: audioBase64,
        language,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    if (!response.ok) {
      throw new Error(`Server STT failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      text: data.text,
      confidence: data.confidence || 0.9,
      language,
    }
  }
}

// ── Provider Factory ────────────────────────────────────────────────────

/**
 * Get the best available STT provider.
 * Tries browser first, falls back to server if available.
 */
export function getSTTProvider(): STTProvider {
  const browserSTT = new BrowserSTTProvider()
  if (browserSTT.isAvailable()) {
    return browserSTT
  }

  const serverSTT = new ServerSTTProvider()
  if (serverSTT.isAvailable()) {
    return serverSTT
  }

  // Return browser provider as default (will throw if not available)
  return browserSTT
}
