// ── useAssistant Hook ───────────────────────────────────────────────────
// React hook for the unified assistant API.

"use client"

import { useState, useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type {
  OrchestratorOutput,
  AssistantMessage,
  AssistantPendingAction,
  ConversationModality,
  MessageModality,
  MessageMetadata,
} from "@/shared/assistant"

/** Initial greeting shown when the panel opens. */
function greetingMessage(): AssistantMessage {
  return {
    id: Date.now(),
    conversationId: 0,
    role: "assistant",
    content:
      "Hi! I'm your MyMoney assistant. Ask about spending, budgets, goals or investments — or tap the mic and just talk.",
    modality: "text",
    createdAt: new Date(),
  }
}

interface UseAssistantReturn {
  // State
  messages: AssistantMessage[]
  isLoading: boolean
  error: string | null
  conversationId: number | null
  pendingAction: AssistantPendingAction | null

  // Actions
  sendMessage: (text: string, modality?: ConversationModality) => Promise<void>
  confirmAction: () => Promise<void>
  rejectAction: () => Promise<void>
  clearMessages: () => void
  setConversationId: (id: number | null) => void
  /** Append a local assistant message (not sent to the API). Returns its id. */
  appendAssistantMessage: (content: string, metadata?: MessageMetadata) => number
}

export function useAssistant(): UseAssistantReturn {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [greetingMessage()])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [pendingAction, setPendingAction] = useState<AssistantPendingAction | null>(null)
  const queryClient = useQueryClient()
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (text: string, modality: ConversationModality = "text") => {
      if (!text.trim() || isLoading) return

      // Add user message immediately
      const userMessage: AssistantMessage = {
        id: Date.now(),
        conversationId: conversationId || 0,
        role: "user",
        content: text.trim(),
        modality: modality as MessageModality,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)
      setPendingAction(null)

      try {
        // Get current page route
        const pageRoute = typeof window !== "undefined" ? window.location.pathname : undefined

        const response = await fetch("/api/assistant/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            modality,
            conversationId,
            pageRoute,
          }),
          signal: abortControllerRef.current?.signal,
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || "Failed to send message")
        }

        const result: OrchestratorOutput = await response.json()

        // Update conversation ID if new
        if (!conversationId) {
          setConversationId(result.conversationId)
        }

        // Add assistant message
        const assistantMessage: AssistantMessage = {
          id: Date.now() + 1,
          conversationId: result.conversationId,
          role: "assistant",
          content: result.response,
          modality: modality as MessageModality,
          source: result.source,
          metadata: result.metadata,
          createdAt: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // Set pending action if present
        if (result.pendingAction) {
          setPendingAction(result.pendingAction)
        }

        // Invalidate related queries for write actions
        if (result.toolCalls?.some((tc) => tc.result?.success)) {
          queryClient.invalidateQueries({ queryKey: ["expenses"] })
          queryClient.invalidateQueries({ queryKey: ["income"] })
          queryClient.invalidateQueries({ queryKey: ["budgets"] })
          queryClient.invalidateQueries({ queryKey: ["dashboard"] })
          queryClient.invalidateQueries({ queryKey: ["goals"] })
          queryClient.invalidateQueries({ queryKey: ["investments"] })
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return // User cancelled
        }
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    },
    [conversationId, isLoading, queryClient]
  )

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/assistant/confirm/${pendingAction.id}`, {
        method: "POST",
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to confirm action")
      }

      const result = await response.json()

      // Add confirmation message
      const confirmMessage: AssistantMessage = {
        id: Date.now(),
        conversationId: conversationId || 0,
        role: "assistant",
        content: result.message || "Action completed successfully.",
        modality: "text",
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, confirmMessage])
      setPendingAction(null)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["income"] })
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["investments"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm action")
    } finally {
      setIsLoading(false)
    }
  }, [pendingAction, conversationId, queryClient])

  const rejectAction = useCallback(async () => {
    if (!pendingAction) return

    try {
      await fetch(`/api/assistant/reject/${pendingAction.id}`, {
        method: "POST",
      })

      // Add rejection message
      const rejectMessage: AssistantMessage = {
        id: Date.now(),
        conversationId: conversationId || 0,
        role: "assistant",
        content: "Action cancelled.",
        modality: "text",
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, rejectMessage])
      setPendingAction(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject action")
    }
  }, [pendingAction, conversationId])

  const clearMessages = useCallback(() => {
    setMessages([greetingMessage()])
    setConversationId(null)
    setPendingAction(null)
    setError(null)
  }, [])

  const appendAssistantMessage = useCallback(
    (content: string, metadata?: MessageMetadata): number => {
      const id = Date.now()
      setMessages((prev) => [
        ...prev,
        {
          id,
          conversationId: conversationId || 0,
          role: "assistant",
          content,
          modality: "text",
          metadata,
          createdAt: new Date(),
        },
      ])
      return id
    },
    [conversationId],
  )

  return {
    messages,
    isLoading,
    error,
    conversationId,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    clearMessages,
    setConversationId,
    appendAssistantMessage,
  }
}
