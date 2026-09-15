import { useState, useCallback, useEffect, useRef } from "react"
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition"

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  start: (lang?: string, continuous?: boolean) => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const continuousRef = useRef(false)

  useEffect(() => {
    setIsSupported(ExpoSpeechRecognitionModule.isRecognitionAvailable())
  }, [])

  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[0]
    if (event.isFinal) {
      setTranscript(result.transcript)
      setInterimTranscript("")
      // In continuous mode, keep isListening true — don't stop
      // In non-continuous mode, stop after result
      if (!continuousRef.current) {
        setIsListening(false)
      }
    } else {
      setInterimTranscript(result.transcript)
    }
  })

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") return
    setError(
      event.error === "not-allowed"
        ? "Microphone permission denied"
        : event.error === "no-speech"
          ? "No speech detected"
          : event.error,
    )
    setIsListening(false)
  })

  useSpeechRecognitionEvent("end", () => {
    // In continuous mode, onend fires only on error or manual stop.
    // Don't set isListening=false here — let stop() handle it.
    if (!continuousRef.current) {
      setIsListening(false)
    }
  })

  useSpeechRecognitionEvent("nomatch", () => {
    setInterimTranscript("")
    // Don't stop in continuous mode
    if (!continuousRef.current) {
      setIsListening(false)
    }
  })

  const start = useCallback(async (lang = "en-IN", continuous = false) => {
    setError(null)
    setInterimTranscript("")
    continuousRef.current = continuous
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) {
      setError("Microphone permission denied")
      return
    }
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous,
    })
    setIsListening(true)
  }, [])

  const stop = useCallback(() => {
    continuousRef.current = false
    ExpoSpeechRecognitionModule.stop()
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
