"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(lang = "en-IN"): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<InstanceType<any> | null>(null)
  const langRef = useRef(lang)
  langRef.current = lang

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  useEffect(() => {
    if (!isSupported) return
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let final = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      if (final) setTranscript((prev) => prev + final)
      setInterimTranscript(interim)
    }

    recognition.addEventListener("error", (e: any) => {
      if (e.error === "aborted") return
      setError(
        e.error === "not-allowed"
          ? "Microphone permission denied"
          : e.error === "no-speech"
            ? "No speech detected — try again"
            : e.error,
      )
      setIsListening(false)
    })

    recognition.onend = () => {
      // In continuous mode, onend fires only on error or manual stop.
      // Don't set isListening=false here — let stop() handle it.
    }

    recognitionRef.current = recognition
    return () => {
      try {
        recognition.abort()
      } catch {
        /* ignore */
      }
    }
  }, [isSupported])

  const start = useCallback(() => {
    const r = recognitionRef.current
    if (!r) return
    r.lang = langRef.current
    setError(null)
    setInterimTranscript("")
    try {
      r.start()
      setIsListening(true)
    } catch {
      /* already started */
    }
  }, [])

  const stop = useCallback(() => {
    const r = recognitionRef.current
    if (!r) return
    try {
      r.stop()
    } catch {
      /* ignore */
    }
    setIsListening(false)
    setInterimTranscript("")
  }, [])

  const reset = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  }
}
