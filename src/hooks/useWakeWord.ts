// ── useWakeWord (Web) ───────────────────────────────────────────────────
// Wake word detection using Sherpa-ONNX WASM (free, offline, Apache 2.0).
// Listens for the admin-configured wake word continuously while enabled.
//
// Architecture:
// - WASM runtime loaded from /wasm/ directory (self-hosted)
// - KWS model processes audio in real-time (no internet needed)
// - AudioWorkletNode for non-blocking audio processing
//
// Cost: ₹0 (free forever, no API keys, no subscription)

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { initSherpaWasm, createKwsInstance, type KwsInstance } from "@/lib/sherpa-kws"

interface UseWakeWordReturn {
  /** Whether wake word detection is enabled */
  isActive: boolean
  /** Whether wake word was just detected */
  isTriggered: boolean
  /** Error message if wake word init failed */
  error: string | null
  /** Loading progress (0-1) during WASM/model init */
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

export function useWakeWord(): UseWakeWordReturn {
  const [isActive, setIsActive] = useState(false)
  const [isTriggered, setIsTriggered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadProgress, setLoadProgress] = useState<number | null>(null)

  const isActiveRef = useRef(false)
  const kwsRef = useRef<KwsInstance | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const resetTrigger = useCallback(() => {
    setIsTriggered(false)
  }, [])

  const cleanup = useCallback(() => {
    // Disconnect worklet node
    if (workletNodeRef.current) {
      try {
        // eslint-disable-next-line unicorn/prefer-add-event-listener -- onmessage is required: addEventListener silently drops AudioWorklet port messages in some browsers (verified).
        workletNodeRef.current.port.onmessage = null
        workletNodeRef.current.disconnect()
      } catch { /* ignore */ }
      workletNodeRef.current = null
    }

    // Disconnect source node
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch { /* ignore */ }
      sourceNodeRef.current = null
    }

    // Stop media stream tracks
    if (streamRef.current) {
      try {
        for (const track of streamRef.current.getTracks()) track.stop()
      } catch { /* ignore */ }
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch { /* ignore */ }
      audioContextRef.current = null
    }

    // Destroy KWS instance
    if (kwsRef.current) {
      try {
        kwsRef.current.destroy()
      } catch { /* ignore */ }
      kwsRef.current = null
    }
  }, [])

  const startListening = useCallback(async () => {
    try {
      setError(null)
      setLoadProgress(0)
      cleanup()

      // Step 1: Request microphone access FIRST so the browser permission
      // prompt appears immediately. (Previously this happened only after the
      // ~13MB WASM runtime + ~6.5MB model had downloaded, delaying the prompt
      // by 10s+ and making it look like nothing was happening.)
      setLoadProgress(0.05)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })
      streamRef.current = mediaStream

      // Step 2: Initialize WASM (~13MB, cached after first load)
      setLoadProgress(0.3)
      const ready = await initSherpaWasm()
      if (!ready) {
        throw new Error("Failed to load Sherpa-ONNX WASM module")
      }

      // Step 3: Fetch current wake word config from server (admin-configurable)
      setLoadProgress(0.5)
      let keywordsContent: string | undefined
      try {
        const res = await fetch("/api/admin/wake-word")
        const data = await res.json()
        if (data.bpeTokens) {
          // Server returned pre-tokenized BPE content — use it directly.
          // Label must be a single token (no spaces) or the native parser fails.
          const phrase = (data.phrase || "Hey My Money").trim()
          const label = phrase.replaceAll(/\s+/g, "_")
          keywordsContent = `${data.bpeTokens} @${label}`
        }
      } catch {
        // Fall back to the static keywords file
      }

      // Step 4: Create KWS instance with model files
      setLoadProgress(0.75)
      const kws = await createKwsInstance(
        "/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01/mymoney_keywords.txt",
        keywordsContent,
      )
      if (!kws) {
        throw new Error("Failed to create KWS instance")
      }
      kwsRef.current = kws

      // Step 5: Set up audio processing. Use the device's NATIVE sample rate —
      // the worklet resamples to 16kHz, so requesting a 16kHz AudioContext
      // (which browsers may ignore, breaking detection) is unnecessary.
      setLoadProgress(0.9)
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Ensure the context is running. Browsers start an AudioContext suspended
      // unless created directly inside a user gesture; startListening runs after
      // async awaits, so the original click gesture is lost. Without resume(),
      // the AudioWorklet process() never fires and no audio reaches the KWS.
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      const source = audioContext.createMediaStreamSource(mediaStream)
      sourceNodeRef.current = source

      const processSamples = (samples: Float32Array) => {
        if (!isActiveRef.current || !kwsRef.current) return
        const keyword = kwsRef.current.processAudio(samples)
        if (keyword) {
          setIsTriggered(true)
        }
      }

      // `?v=2` busts the long-lived immutable cache for the previous worklet
      // (which did not resample to 16kHz).
      await audioContext.audioWorklet.addModule("/wasm/wake-word-processor.js?v=2")
      const workletNode = new AudioWorkletNode(audioContext, "wake-word-processor")
      workletNodeRef.current = workletNode

      // Use the onmessage property — addEventListener silently drops messages
      // on this port in some browsers (verified), while onmessage delivers.
      // eslint-disable-next-line unicorn/prefer-add-event-listener
      workletNode.port.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "audio") {
          processSamples(event.data.samples as Float32Array)
        }
      }

      source.connect(workletNode)
      workletNode.connect(audioContext.destination)

      setLoadProgress(1)
      isActiveRef.current = true
      setIsActive(true)
    } catch (err: unknown) {
      console.error("Wake word init failed:", err)
      setError(err instanceof Error ? err.message : "Failed to start wake word detection")
      setIsActive(false)
      isActiveRef.current = false
      setLoadProgress(null)
      cleanup()
    }
  }, [cleanup])

  const stopListening = useCallback(() => {
    isActiveRef.current = false
    setIsActive(false)
    setIsTriggered(false)
    setLoadProgress(null)
    cleanup()
  }, [cleanup])

  const toggle = useCallback(() => {
    if (isActiveRef.current) {
      stopListening()
    } else {
      startListening()
    }
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
