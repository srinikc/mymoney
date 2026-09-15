// ── useWakeWord (Mobile) ────────────────────────────────────────────────
// Wake word detection using Sherpa-ONNX native (free, offline, Apache 2.0).
// Listens for the configured phrase (default "Hey MyMoney") when active.
// Automatically stops when app is backgrounded.
//
// Architecture:
// - Native iOS/Android binaries (no WASM)
// - Streaming ASR model processes audio in real-time
// - Real PCM captured via expo-audio AudioStream (no metering proxy)
// - Wake word detected by checking transcribed text for keywords
//
// Cost: ₹0 (free forever, no API keys, no subscription)

import { useState, useEffect, useRef, useCallback } from "react"
import { AppState, AppStateStatus, Platform } from "react-native"
import { useAudioStream } from "expo-audio"

interface UseWakeWordReturn {
  /** Whether wake word detection is enabled */
  isActive: boolean
  /** Whether wake word was just detected (user said "Hey MyMoney") */
  isTriggered: boolean
  /** Error message if wake word init failed */
  error: string | null
  /** Loading progress (0-1) during model init */
  loadProgress: number | null
  /** Toggle wake word on/off */
  toggle: () => void
  /** Explicitly start listening */
  start: () => void
  /** Explicitly stop listening */
  stop: () => void
  /** Reset triggered state (call after handling the trigger) */
  resetTrigger: () => void
}

// Default wake words (used if API fetch fails)
const DEFAULT_WAKE_WORDS = ["hey mymoney", "hey my money", "mymoney", "my money"]

export function useWakeWord(): UseWakeWordReturn {
  const [isActive, setIsActive] = useState(false)
  const [isTriggered, setIsTriggered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadProgress, setLoadProgress] = useState<number | null>(null)

  const isActiveRef = useRef(false)
  const appStateRef = useRef(AppState.currentState)
  const SherpaOnnxRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const wakeWordsRef = useRef<string[]>(DEFAULT_WAKE_WORDS)

  // Fetch current wake word phrase from server on mount
  useEffect(() => {
    fetch("/api/admin/wake-word")
      .then((r) => r.json())
      .then((data) => {
        if (data.phrase) {
          const phrase = data.phrase.toLowerCase()
          // Build wake word variations: full phrase, individual words
          const words = phrase.split(/\s+/).filter(Boolean)
          const variations = [phrase]
          if (words.length > 1) {
            variations.push(words.join(" "))
            // Add individual significant words (skip short ones)
            for (const word of words) {
              if (word.length > 2) variations.push(word)
            }
          }
          wakeWordsRef.current = variations
        }
      })
      .catch(() => {})
  }, [])

  const resetTrigger = useCallback(() => {
    setIsTriggered(false)
  }, [])

  const cleanup = useCallback(async () => {
    if (SherpaOnnxRef.current) {
      try {
        await SherpaOnnxRef.current.ASR.release()
      } catch { /* ignore */ }
      SherpaOnnxRef.current = null
    }
    isInitializedRef.current = false
  }, [])

  const initSherpa = useCallback(async () => {
    try {
      // Dynamic import to avoid issues on web
      const SherpaOnnx = await import("@siteed/sherpa-onnx.rn")
      SherpaOnnxRef.current = SherpaOnnx

      // For mobile, we need to download models to device storage
      // Use a small streaming model for wake word detection
      const modelConfig = {
        modelDir: "sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20",
        modelType: "zipformer2" as const,
        streaming: true,
        numThreads: 2,
        decodingMethod: "greedy_search" as const,
        modelFiles: {
          encoder: "encoder-epoch-99-avg-1.int8.onnx",
          decoder: "decoder-epoch-99-avg-1.onnx",
          joiner: "joiner-epoch-99-avg-1.int8.onnx",
          tokens: "tokens.txt"
        }
      }

      // Initialize ASR
      await SherpaOnnx.ASR.initialize(modelConfig)

      // Create online stream for real-time processing
      await SherpaOnnx.ASR.createOnlineStream()

      isInitializedRef.current = true
      setLoadProgress(1)
      return true
    } catch (err) {
      console.error("Sherpa-ONNX init failed:", err)
      throw err
    }
  }, [])

  // Real-time PCM from the microphone via expo-audio.
  const { stream: audioStream, isStreaming } = useAudioStream(
    Platform.OS === "web"
      ? {}
      : {
          sampleRate: 16000,
          channels: 1,
          encoding: "float32",
          onBuffer: (buffer) => {
            if (!isActiveRef.current || !SherpaOnnxRef.current) return

            const samples = Array.from(new Float32Array(buffer.data))
            if (samples.length === 0) return

            SherpaOnnxRef.current.ASR.acceptWaveform(16000, samples)
              .then(() => SherpaOnnxRef.current.ASR.getResult())
              .then((result: { text?: string }) => {
                const transcript = result?.text?.toLowerCase() || ""
                const isWakeWord = wakeWordsRef.current.some((w) => transcript.includes(w))
                if (isWakeWord && isActiveRef.current) {
                  setIsTriggered(true)
                }
              })
              .catch(() => {})
          },
        },
  )

  const startListening = useCallback(async () => {
    if (Platform.OS === "web") {
      setError("Wake word not supported on web mobile — use desktop browser")
      return
    }

    try {
      setError(null)
      setLoadProgress(0)
      await cleanup()

      // Initialize Sherpa-ONNX
      await initSherpa()

      // Start real PCM capture
      await audioStream?.start()

      isActiveRef.current = true
      setIsActive(true)
    } catch (err: any) {
      console.error("Wake word init failed:", err)
      setError(err?.message || "Failed to start wake word detection")
      setIsActive(false)
      isActiveRef.current = false
      setLoadProgress(null)
      await cleanup()
    }
  }, [initSherpa, cleanup, audioStream])

  const stopListening = useCallback(async () => {
    isActiveRef.current = false
    setIsActive(false)
    setIsTriggered(false)
    setLoadProgress(null)
    if (audioStream) {
      try {
        audioStream.stop()
      } catch { /* ignore */ }
    }
    await cleanup()
  }, [cleanup, audioStream])

  const toggle = useCallback(() => {
    if (isActiveRef.current) {
      stopListening()
    } else {
      startListening()
    }
  }, [startListening, stopListening])

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      // Stop wake word when app goes to background
      if (appStateRef.current === "active" && /inactive|background/.test(nextState)) {
        if (isActiveRef.current) {
          stopListening()
        }
      }
      // Restart wake word when app comes to foreground (if it was active)
      else if (/inactive|background/.test(appStateRef.current) && nextState === "active" && isActiveRef.current) {
        setTimeout(startListening, 500)
      }
      appStateRef.current = nextState
    })

    return () => subscription?.remove()
  }, [startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      cleanup()
    }
  }, [cleanup])

  return { isActive, isTriggered, error, loadProgress, toggle, start: startListening, stop: stopListening, resetTrigger }
}
