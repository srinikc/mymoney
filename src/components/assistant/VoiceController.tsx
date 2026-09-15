// ── VoiceController ─────────────────────────────────────────────────────
// Mic button with STT integration. Conversational mode — continuous
// listening so the user can keep talking without clicking again.

"use client"

import { Mic, MicOff } from "lucide-react"
import { useSpeechRecognition } from "@/components/voice/use-speech-recognition"
import { useState, useEffect, useCallback, useRef } from "react"
import { playPromptSound } from "@/lib/prompt-sound"

interface VoiceControllerProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  /** Bumped externally (e.g. wake word) to start listening automatically. */
  listenSignal?: number
}

export function VoiceController({ onTranscript, disabled, listenSignal }: VoiceControllerProps) {
  const [language, setLanguage] = useState("en-IN")
  const { isSupported, isListening, transcript, interimTranscript, error, start, stop, reset } =
    useSpeechRecognition(language)

  // Send transcript when recognition produces final text
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript)
      reset()
    }
  }, [transcript, onTranscript, reset])

  // Stop listening when disabled (e.g., while AI is responding)
  useEffect(() => {
    if (disabled && isListening) {
      stop()
    }
  }, [disabled, isListening, stop])

  // Auto-start listening when the wake word fires (handoff from KWS to STT).
  const lastSignalRef = useRef(0)
  useEffect(() => {
    if (!listenSignal || listenSignal === lastSignalRef.current) return
    lastSignalRef.current = listenSignal
    if (!isSupported || disabled) return
    playPromptSound("enable")
    start()
  }, [listenSignal, isSupported, disabled, start])

  const handleClick = useCallback(() => {
    if (isListening) {
      stop()
      playPromptSound("disable")
    } else {
      playPromptSound("enable")
      start()
    }
  }, [isListening, stop, start])

  if (!isSupported) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Voice input isn&apos;t supported in this browser — please type your question.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300"
      >
        <option value="en-IN">English</option>
        <option value="hi-IN">हिन्दी</option>
        <option value="kn-IN">ಕನ್ನಡ</option>
        <option value="ta-IN">தமிழ்</option>
        <option value="te-IN">తెలుగు</option>
        <option value="bn-IN">বাংলা</option>
        <option value="mr-IN">मराठी</option>
        <option value="ur-IN">اردو</option>
        <option value="ml-IN">മലയാളം</option>
        <option value="gu-IN">ગુજરાતી</option>
        <option value="pa-IN">ਪੰਜਾਬੀ</option>
        <option value="or-IN">ଓଡ଼ିଆ</option>
      </select>

      {/* Mic button — pulsing when listening */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        } disabled:opacity-50`}
        title={isListening ? "Stop listening" : "Start listening"}
      >
        {isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Interim transcript */}
      {isListening && interimTranscript && (
        <p className="text-xs text-gray-500 italic truncate max-w-[200px]">
          {interimTranscript}
        </p>
      )}

      {/* Status */}
      {isListening && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Listening...
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
