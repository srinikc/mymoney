"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Bot, User, Trash2, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { QUERY_TEMPLATES } from "@/lib/chat-templates"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

const STORAGE_KEY = "mymoney-chat-history"
const MAX_HISTORY = 100

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [showTemplates, setShowTemplates] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load chat history from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[]
        setMessages(parsed.slice(-MAX_HISTORY))
        if (parsed.length > 0) {
          setShowTemplates(false)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save chat history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
    } catch {
      // Ignore storage errors
    }
  }, [messages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])
  }, [])

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text ?? input.trim()
    if (!messageText || isLoading) return

    setInput("")
    setShowTemplates(false)
    setError(null)
    addMessage("user", messageText)

    setIsLoading(true)
    setStreamingContent("")

    // Create abort controller
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      const assistantResponse = data.response || "I'm not sure how to respond to that."

      // Simulate streaming display effect
      const words = assistantResponse.split(" ")
      let displayed = ""
      for (let i = 0; i < words.length; i++) {
        if (abortControllerRef.current?.signal.aborted) break
        displayed += (i > 0 ? " " : "") + words[i]
        setStreamingContent(displayed)
        // Small delay for streaming effect (skip if message is short)
        if (words.length > 5) {
          await new Promise((resolve) => setTimeout(resolve, 15))
        }
      }

      if (!abortControllerRef.current?.signal.aborted) {
        addMessage("assistant", assistantResponse)
        setStreamingContent("")
      }
    } catch (error_) {
      if (error_ instanceof DOMException && error_.name === "AbortError") {
        return
      }
      const errorMsg = error_ instanceof Error ? error_.message : "Something went wrong. Please try again."
      setError(errorMsg)
      addMessage("assistant", `⚠️ ${errorMsg}`)
    } finally {
      setIsLoading(false)
      setStreamingContent("")
      abortControllerRef.current = null
    }
  }, [input, isLoading, addMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setShowTemplates(true)
    setInput("")
    setError(null)
    setStreamingContent("")
    sessionStorage.removeItem(STORAGE_KEY)
  }

  const handleTemplateClick = (query: string) => {
    handleSend(query)
  }

  const inputHeight = Math.min(Math.max(input.split("\n").length, 1), 4)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex w-[400px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            style={{ maxHeight: "600px", height: "min(600px, calc(100vh - 160px))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-white" />
                <span className="font-semibold text-white">MyMoney AI</span>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="New chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && !streamingContent ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Sparkles className="mb-3 h-8 w-8 text-indigo-500" />
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ask me anything about your finances!
                  </p>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    I can help with spending, budgets, goals, and more.
                  </p>

                  {/* Query templates */}
                  {showTemplates && (
                    <div className="w-full space-y-3">
                      {QUERY_TEMPLATES.map((group) => (
                        <div key={group.category}>
                          <p className="mb-1.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {group.category}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.queries.slice(0, 3).map((q) => (
                              <button
                                key={q}
                                onClick={() => handleTemplateClick(q)}
                                className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex max-w-[85%] gap-2 ${
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                            msg.role === "user"
                              ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                              : "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "rounded-tr-sm bg-indigo-600 text-white"
                              : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Streaming message */}
                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[85%] flex-row gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm leading-relaxed text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {streamingContent}
                          <span className="inline-block w-1.5 animate-pulse bg-indigo-500 ml-0.5" style={{ height: "1em" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[85%] flex-row gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800">
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && !isLoading && (
                    <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  rows={1}
                  style={{ height: `${24 * inputHeight}px` }}
                  className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
