// ── AssistantPanel ──────────────────────────────────────────────────────
// Slide-out panel for the unified assistant.

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Trash2, Mic, MicOff, Volume2, VolumeX, Repeat, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import { resolvePageContext } from "@/ai/assistant/page-context"
import { useAssistant } from "./useAssistant"
import { ConversationView } from "./ConversationView"
import { TextComposer } from "./TextComposer"
import { VoiceController } from "./VoiceController"
import { SuggestionChips } from "./SuggestionChips"
import { ConfirmationCard } from "./ConfirmationCard"
import {
  speak,
  stopSpeaking,
  getAvailableVoices,
  getSelectedVoiceName,
  setSelectedVoiceName,
} from "@/lib/speech-synthesis"

interface AssistantPanelProps {
  isOpen: boolean
  onClose: () => void
  wakeWordActive?: boolean
  wakeWordError?: string | null
  loadProgress?: number | null
  onToggleWakeWord?: () => void
  /** Bumped when the wake word fires — starts voice capture for the query. */
  listenSignal?: number
}

export function AssistantPanel({ isOpen, onClose, wakeWordActive, onToggleWakeWord, listenSignal }: AssistantPanelProps) {
  const {
    messages,
    isLoading,
    error,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    clearMessages,
    appendAssistantMessage,
  } = useAssistant()

  const router = useRouter()
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [speakReplies, setSpeakReplies] = useState(true)
  const [conversationMode, setConversationMode] = useState(true)
  const [paused, setPaused] = useState(false)
  const [autoListenKey, setAutoListenKey] = useState(0)
  const [stopSignal, setStopSignal] = useState(0)
  const [voiceName, setVoiceName] = useState("")
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([])
  const lastHandledIdRef = useRef<number | null>(null)
  const wakeWelcomeIdRef = useRef<number | null>(null)

  // Wrap sends so any manual/voice message resumes a paused conversation.
  const send = useCallback(
    (text: string, modality: "text" | "voice" = "text") => {
      setPaused(false)
      return sendMessage(text, modality)
    },
    [sendMessage],
  )

  const pausedRef = useRef(false)
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // Stop everything: speech, listening, and the auto-listen loop.
  const handleStop = useCallback(() => {
    stopSpeaking()
    setStopSignal((n) => n + 1)
    setPaused(true)
  }, [])

  // Load available TTS voices (they arrive asynchronously).
  useEffect(() => {
    const load = () => {
      const list = getAvailableVoices().map((v) => ({ name: v.name, lang: v.lang }))
      setVoices(list)
      setVoiceName(getSelectedVoiceName() ?? "")
    }
    load()
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", load)
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load)
    }
  }, [])

  // Restore preferences
  useEffect(() => {
    try {
      const s = localStorage.getItem("mm-assistant-speak")
      if (s !== null) setSpeakReplies(s === "1")
      const c = localStorage.getItem("mm-assistant-conversation")
      if (c !== null) setConversationMode(c === "1")
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem("mm-assistant-speak", speakReplies ? "1" : "0") } catch { /* ignore */ }
  }, [speakReplies])
  useEffect(() => {
    try { localStorage.setItem("mm-assistant-conversation", conversationMode ? "1" : "0") } catch { /* ignore */ }
  }, [conversationMode])

  // Update suggestions based on current page
  useEffect(() => {
    const updateSuggestions = () => {
      const pageContext = resolvePageContext(window.location.pathname)
      setSuggestions(pageContext.suggestedPrompts)
    }

    updateSuggestions()
    window.addEventListener("popstate", updateSuggestions)
    return () => window.removeEventListener("popstate", updateSuggestions)
  }, [])

  // Wake word fired: greet with the current date/time, speak it, then listen.
  useEffect(() => {
    if (!listenSignal) return
    const now = new Date()
    const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    const welcome = `👋 Welcome! It's ${dateStr}, ${timeStr}. What would you like to do?`
    wakeWelcomeIdRef.current = appendAssistantMessage(welcome)
    const afterSpeech = () => {
      if (conversationMode && !pausedRef.current) setAutoListenKey((k) => k + 1)
    }
    if (speakReplies) speak(welcome, "en-IN", afterSpeech)
    else afterSpeech()
    // Only re-run when the wake signal changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenSignal])

  // On each new assistant reply: navigate if requested, speak it, then
  // (in conversation mode) automatically listen for the next turn.
  useEffect(() => {
    const last = messages.at(-1)
    if (!last || last.role !== "assistant") return
    if (lastHandledIdRef.current === last.id) return
    if (wakeWelcomeIdRef.current === last.id) return // welcome handled above
    lastHandledIdRef.current = last.id
    if (messages.length <= 1) return // skip the opening greeting

    const nav = last.metadata?.navigation
    if (nav) {
      setTimeout(() => {
        router.push(nav.path)
        onClose()
      }, 400)
    }

    const afterSpeech = () => {
      if (conversationMode && !pausedRef.current) setAutoListenKey((k) => k + 1)
    }
    if (speakReplies) speak(last.content, "en-IN", afterSpeech)
    else afterSpeech()
  }, [messages, speakReplies, conversationMode, router, onClose])

  // Stop any speech when the panel closes.
  useEffect(() => {
    if (!isOpen) stopSpeaking()
  }, [isOpen])

  if (!isOpen) return null

  // Only per-turn auto-listen drives VoiceController here; the wake signal is
  // consumed by the welcome effect above (which listens *after* speaking).
  const effectiveListenSignal = autoListenKey

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[400px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                MyMoney Assistant
              </h3>
              <p className="text-xs text-gray-500">
                {messages.length > 0 ? `${messages.length} messages` : "Ready to help"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleWakeWord && (
              <button
                onClick={onToggleWakeWord}
                className={`p-2 rounded-full transition-colors ${
                  wakeWordActive
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                title={wakeWordActive ? "Wake word active — click to disable" : "Enable wake word (Hey My Money)"}
              >
                {wakeWordActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation */}
        <ConversationView messages={messages} isLoading={isLoading} />

        {/* Pending action confirmation */}
        {pendingAction && (
          <ConfirmationCard
            action={pendingAction}
            onConfirm={confirmAction}
            onReject={rejectAction}
            isLoading={isLoading}
          />
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Suggestions (until the user sends something) */}
        {!messages.some((m) => m.role === "user") && (
          <SuggestionChips suggestions={suggestions} onSelect={(t) => void send(t, "text")} />
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Voice controls */}
          <div className="px-4 pt-3">
            <VoiceController
              onTranscript={(text) => void send(text, "voice")}
              disabled={isLoading}
              listenSignal={effectiveListenSignal}
              stopSignal={stopSignal}
            />
          </div>

          {/* Assistant behaviour toggles */}
          <div className="flex flex-wrap items-center gap-2 px-4 pt-2 text-[11px] text-gray-500 dark:text-gray-400">
            <button
              onClick={() => { setSpeakReplies((v) => { if (v) stopSpeaking(); return !v }) }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${speakReplies ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              title={speakReplies ? "Spoken replies: on" : "Spoken replies: off"}
            >
              {speakReplies ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {speakReplies ? "Voice on" : "Voice off"}
            </button>
            <button
              onClick={() => setConversationMode((v) => !v)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${conversationMode ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              title={conversationMode ? "Continuous conversation: on" : "Continuous conversation: off"}
            >
              <Repeat className="w-3.5 h-3.5" />
              {conversationMode ? "Hands-free" : "Manual"}
            </button>
            <button
              onClick={handleStop}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
              title="Stop listening and speaking"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
            {voices.length > 0 && (
              <select
                value={voiceName}
                onChange={(e) => { setVoiceName(e.target.value); setSelectedVoiceName(e.target.value) }}
                className="ml-auto max-w-[150px] rounded-md border border-gray-200 bg-gray-50 px-1.5 py-1 text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                title="Assistant voice"
              >
                <option value="">Default voice</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            )}
          </div>

          {/* Text input */}
          <TextComposer onSend={(text) => void send(text, "text")} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
