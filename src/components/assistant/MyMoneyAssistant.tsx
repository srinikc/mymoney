// ── MyMoneyAssistant ────────────────────────────────────────────────────
// Main assistant component with FAB, panel, and wake word detection.
// Only rendered for authenticated users (never on /login or /setup).

"use client"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { MessageSquare, Mic, MicOff } from "lucide-react"
import { useSession } from "next-auth/react"
import { AssistantPanel } from "./AssistantPanel"
import { useWakeWord } from "@/hooks/useWakeWord"
import { warmupWakeWord } from "@/lib/sherpa-kws"
import { playPromptSound } from "@/lib/prompt-sound"

function MyMoneyAssistantInner() {
  const [isOpen, setIsOpen] = useState(false)
  const [listenSignal, setListenSignal] = useState(0)
  const { isActive: wakeWordActive, isTriggered, error: wakeWordError, loadProgress, toggle: toggleWakeWord, resetTrigger } = useWakeWord()

  const handleClose = useCallback(() => setIsOpen(false), [])
  // Opening the assistant is a strong signal the user will use voice — start
  // warming the wake-word assets so enabling is fast when they do.
  const handleOpen = useCallback(() => {
    setIsOpen(true)
    void warmupWakeWord()
  }, [])

  // Track open state so the wake handler can ignore triggers while the panel
  // is already open (the phrase is still audible in the mic stream, and the
  // mic is now busy with speech-to-text).
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // Wake word: greet + open + hand off to voice capture (only when closed).
  useEffect(() => {
    if (!isTriggered) return
    if (!isOpenRef.current) {
      playPromptSound("wake")
      setIsOpen(true)
      setListenSignal((n) => n + 1)
    }
    resetTrigger()
  }, [isTriggered, resetTrigger])

  // Play enable/disable prompt sound when wake word state changes
  const prevActiveRef = useRef(wakeWordActive)
  useEffect(() => {
    if (wakeWordActive !== prevActiveRef.current) {
      playPromptSound(wakeWordActive ? "enable" : "disable")
      prevActiveRef.current = wakeWordActive
    }
  }, [wakeWordActive])

  return (
    <>
      {/* FAB */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        title="Open Assistant"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <Mic className="w-3 h-3 absolute -bottom-1 -right-1 text-white/80" />
        </div>
      </button>

      {/* Wake word toggle — small button above FAB */}
      <button
        onClick={toggleWakeWord}
        onMouseEnter={() => void warmupWakeWord()}
        className={`fixed bottom-[4.5rem] right-6 z-40 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all ${
          wakeWordActive
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
        }`}
        title={wakeWordActive ? "Wake word active — click to disable" : "Enable wake word (Hey My Money)"}
      >
        {wakeWordActive ? (
          <Mic className="w-4 h-4 animate-pulse" />
        ) : (
          <MicOff className="w-4 h-4" />
        )}
      </button>

      {/* Wake word status indicator */}
      {wakeWordActive && (
        <div className="fixed bottom-[4.5rem] right-[3.25rem] z-40 flex items-center gap-1.5 pointer-events-none">
          {loadProgress !== null && loadProgress < 1 ? (
            <>
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow-sm">
                Loading model... {Math.round(loadProgress * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow-sm">
                Wake word ready
              </span>
            </>
          )}
        </div>
      )}

      {/* Wake word error */}
      {wakeWordError && (
        <div className="fixed bottom-[4.5rem] right-6 z-40 max-w-[200px] text-[10px] text-red-500 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">
          {wakeWordError}
        </div>
      )}

      {/* Panel */}
      <AssistantPanel
        isOpen={isOpen}
        onClose={handleClose}
        wakeWordActive={wakeWordActive}
        wakeWordError={wakeWordError}
        loadProgress={loadProgress}
        onToggleWakeWord={toggleWakeWord}
        listenSignal={listenSignal}
      />
    </>
  )
}

// ── Auth gate ───────────────────────────────────────────────────────────
// Mounts the assistant only after the session is confirmed. This keeps the
// FAB, panel, and (critically) the wake word microphone off public pages
// such as /login and /setup.

function MyMoneyAssistantGate() {
  const { status } = useSession()
  if (status !== "authenticated") return null
  return <MyMoneyAssistantInner />
}

export const MyMoneyAssistant = memo(MyMoneyAssistantGate)
