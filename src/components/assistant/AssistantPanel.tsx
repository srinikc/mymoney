// ── AssistantPanel ──────────────────────────────────────────────────────
// Slide-out panel for the unified assistant.

"use client"

import { useState, useEffect } from "react"
import { X, Trash2, Mic, MicOff } from "lucide-react"
import { resolvePageContext } from "@/ai/assistant/page-context"
import { useAssistant } from "./useAssistant"
import { ConversationView } from "./ConversationView"
import { TextComposer } from "./TextComposer"
import { VoiceController } from "./VoiceController"
import { SuggestionChips } from "./SuggestionChips"
import { ConfirmationCard } from "./ConfirmationCard"

interface AssistantPanelProps {
  isOpen: boolean
  onClose: () => void
  wakeWordActive?: boolean
  wakeWordError?: string | null
  loadProgress?: number | null
  onToggleWakeWord?: () => void
}

export function AssistantPanel({ isOpen, onClose, wakeWordActive, onToggleWakeWord }: AssistantPanelProps) {
  const {
    messages,
    isLoading,
    error,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    clearMessages,
  } = useAssistant()

  const [suggestions, setSuggestions] = useState<string[]>([])

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

  if (!isOpen) return null

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

        {/* Suggestions (only show when no messages) */}
        {messages.length === 0 && (
          <SuggestionChips suggestions={suggestions} onSelect={sendMessage} />
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Voice controls */}
          <div className="px-4 pt-3">
            <VoiceController onTranscript={(text) => sendMessage(text, "voice")} disabled={isLoading} />
          </div>

          {/* Text input */}
          <TextComposer onSend={(text) => sendMessage(text, "text")} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
