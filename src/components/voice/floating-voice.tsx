"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Mic,
  MicOff,
  X,
  Check,
  Volume2,
  Loader2,
  RotateCcw,
  Bot,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSpeechRecognition } from "./use-speech-recognition"
import { SUPPORTED_LANGUAGES, type VoiceResult } from "@/shared/voice"

const LANG_STORAGE_KEY = "mymoney-voice-lang"

type VoiceState = "idle" | "listening" | "processing" | "result" | "error"

function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

function intentLabel(intent: string): string {
  switch (intent) {
    case "add_expense": return "Expense"
    case "add_income": return "Income"
    case "set_budget": return "Budget"
    case "query": return "Query"
    default: return "Unknown"
  }
}

function intentColor(intent: string): string {
  switch (intent) {
    case "add_expense": return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
    case "add_income": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
    case "set_budget": return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
    case "query": return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400"
    default: return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400"
  }
}

function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
}

export function FloatingVoice() {
  const [isOpen, setIsOpen] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null)
  const [language, setLanguage] = useState("en-IN")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const queryClient = useQueryClient()
  const panelRef = useRef<HTMLDivElement>(null)

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    start,
    stop,
    reset: resetSTT,
  } = useSpeechRecognition(language)

  // Restore language from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY)
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        setLanguage(stored)
      }
    } catch { /* ignore */ }
  }, [])

  const handleLanguageChange = (code: string) => {
    setLanguage(code)
    try { localStorage.setItem(LANG_STORAGE_KEY, code) } catch { /* ignore */ }
  }

  // Map STT errors to component error
  useEffect(() => {
    if (sttError) {
      setError(sttError)
      setVoiceState("error")
    }
  }, [sttError])

  // When speech recognition ends with a transcript, send to API
  useEffect(() => {
    if (voiceState === "processing" && transcript.trim()) {
      sendToAPI(transcript.trim())
    } else if (voiceState === "processing" && !transcript.trim()) {
      setVoiceState("idle")
      setError("No speech detected")
    }
  }, [voiceState, transcript])

  const sendToAPI = async (text: string) => {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language,
          page: window.location.pathname,
        }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const result: VoiceResult = await res.json()
      setVoiceResult(result)
      setVoiceState("result")
    } catch {
      setError("Failed to process voice input")
      setVoiceState("error")
    }
  }

  const handleMicClick = () => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser")
      setVoiceState("error")
      return
    }
    setError(null)
    setSaved(false)
    if (voiceState === "listening") {
      stop()
      setVoiceState("processing")
    } else {
      resetSTT()
      start()
      setVoiceState("listening")
    }
  }

  const handleConfirm = async () => {
    if (!voiceResult?.entity) return
    const { intent, entity } = voiceResult
    try {
      switch (intent) {
      case "add_expense": {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: entity.date || new Date().toISOString().split("T")[0],
            amount: entity.amount,
            categoryName: entity.category || "Other",
            vendor: entity.vendor || "",
            description: entity.description || "",
            paymentMode: entity.paymentMode || "UPI",
            purpose: entity.category || undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to save expense")
        }
      
      break;
      }
      case "add_income": {
        const res = await fetch("/api/income/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: entity.vendor || entity.name || "Income",
            amount: entity.amount,
            type: entity.incomeType || "onetime",
            categoryName: entity.category,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to save income")
        }
      
      break;
      }
      case "set_budget": {
        // Budget requires categoryId — fetch category tree to resolve
        const catRes = await fetch("/api/budgets")
        const catData = await catRes.json()
        const categories = catData.categories || catData || []
        const match = categories.find(
          (c: any) => c.name?.toLowerCase() === entity.category?.toLowerCase(),
        )
        if (!match) throw new Error(`Category "${entity.category}" not found. Please set this budget on the Budgets page.`)
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: match.id,
            month: entity.budgetMonth || new Date().getMonth() + 1,
            year: entity.budgetYear || new Date().getFullYear(),
            amount: entity.amount,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to save budget")
        }
      
      break;
      }
      default: {
        // query or unknown — nothing to save
        return
      }
      }

      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["income"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["insights"] }),
      ])

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setVoiceState("idle")
        setVoiceResult(null)
        resetSTT()
      }, 2000)
    } catch (e: any) {
      setError(e.message || "Failed to save")
      setVoiceState("error")
    }
  }

  const handleRestart = () => {
    setVoiceState("idle")
    setVoiceResult(null)
    setSaved(false)
    setError(null)
    resetSTT()
  }

  const handleSpeakAnswer = () => {
    if (voiceResult?.answer) speak(voiceResult.answer, language)
  }

  const handleClose = () => {
    setIsOpen(false)
    stop()
    setVoiceState("idle")
    setVoiceResult(null)
    setSaved(false)
    setError(null)
    resetSTT()
  }

  return (
    <>
      {/* ─── FAB ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
        aria-label={isOpen ? "Close voice assistant" : "Open voice assistant"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>

      {/* ─── Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-42 right-6 z-50 flex w-[400px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            style={{ maxHeight: "min(600px, calc(100vh - 200px))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-white" />
                <span className="font-semibold text-white">Voice Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-xs text-white outline-none backdrop-blur-sm focus:border-white/60"
                  aria-label="Voice language"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="text-gray-900">
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* ── Not supported ── */}
              {!isSupported && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MicOff className="mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Speech recognition not supported
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Try Chrome, Edge, or Safari
                  </p>
                </div>
              )}

              {/* ── Idle state ── */}
              {isSupported && voiceState === "idle" && !voiceResult && (
                <div className="flex flex-col items-center justify-center py-6">
                  <button
                    onClick={handleMicClick}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-all hover:bg-emerald-200 hover:scale-105 dark:bg-emerald-900/30 dark:text-emerald-400"
                    aria-label="Start listening"
                  >
                    <Mic className="h-8 w-8" />
                  </button>
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    Tap to speak
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Try: &ldquo;Spent 250 on groceries at Big Bazaar&rdquo;
                  </p>
                </div>
              )}

              {/* ── Listening state ── */}
              {voiceState === "listening" && (
                <div className="flex flex-col items-center justify-center py-6">
                  <button
                    onClick={handleMicClick}
                    className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:bg-red-600"
                    aria-label="Stop listening"
                  >
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />
                    <Mic className="h-8 w-8 relative z-10" />
                  </button>
                  <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
                    Listening...
                  </p>
                  {(interimTranscript || transcript) && (
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 text-center italic">
                      &ldquo;{transcript}{interimTranscript}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* ── Processing state ── */}
              {voiceState === "processing" && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Processing...
                  </p>
                  {transcript && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center italic max-w-xs">
                      &ldquo;{transcript}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* ── Result state ── */}
              {voiceState === "result" && voiceResult && (
                <div className="space-y-3">
                  {/* Transcript */}
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      I heard
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 italic">
                      &ldquo;{transcript}&rdquo;
                    </p>
                  </div>

                  {/* Intent + entities */}
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${intentColor(voiceResult.intent)}`}>
                        {intentLabel(voiceResult.intent)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {voiceResult.confidence} confidence
                      </span>
                    </div>

                    {voiceResult.entity && (
                      <div className="space-y-1 text-sm">
                        {voiceResult.entity.amount != null && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Amount</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {formatCurrency(voiceResult.entity.amount)}
                            </span>
                          </div>
                        )}
                        {voiceResult.entity.category && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Category</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {voiceResult.entity.category}
                            </span>
                          </div>
                        )}
                        {voiceResult.entity.vendor && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Vendor</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {voiceResult.entity.vendor}
                            </span>
                          </div>
                        )}
                        {voiceResult.entity.date && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Date</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {voiceResult.entity.date}
                            </span>
                          </div>
                        )}
                        {voiceResult.entity.paymentMode && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Payment</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {voiceResult.entity.paymentMode}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {voiceResult.answer && (
                      <div className="mt-2 rounded-md bg-indigo-50 p-2.5 dark:bg-indigo-900/20">
                        <div className="flex items-start gap-2">
                          <Bot className="h-4 w-4 mt-0.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          <p className="text-sm text-indigo-800 dark:text-indigo-300">
                            {voiceResult.answer}
                          </p>
                        </div>
                        <button
                          onClick={handleSpeakAnswer}
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          <Volume2 className="h-3 w-3" />
                          Read aloud
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Saved feedback */}
                  {saved && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                      <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Saved!
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  {!saved && voiceResult.entity && voiceResult.intent !== "query" && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleRestart}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Re-record
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                        Confirm &amp; Save
                      </button>
                    </div>
                  )}

                  {!saved && voiceResult.intent === "query" && (
                    <button
                      onClick={handleRestart}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Mic className="h-4 w-4" />
                      Ask another question
                    </button>
                  )}
                </div>
              )}

              {/* ── Error state ── */}
              {voiceState === "error" && error && (
                <div className="flex flex-col items-center justify-center py-6">
                  <MicOff className="mb-3 h-10 w-10 text-red-400" />
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
                    {error}
                  </p>
                  <button
                    onClick={handleRestart}
                    className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Footer — mic button for quick restart */}
            {isSupported && voiceState !== "listening" && voiceState !== "processing" && (
              <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                <button
                  onClick={handleMicClick}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <Mic className="h-4 w-4" />
                  {voiceResult ? "Speak again" : "Start listening"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
