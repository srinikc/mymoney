// ── useAssistant Hook (Mobile) ──────────────────────────────────────────
// React hook for the unified assistant API (mobile version).

import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import api from "../api/client"
import type {
  OrchestratorOutput,
  AssistantMessage,
  AssistantPendingAction,
  ConversationModality,
  MessageModality,
} from "../types/assistant"

interface UseAssistantReturn {
  messages: AssistantMessage[]
  isLoading: boolean
  error: string | null
  conversationId: number | null
  pendingAction: AssistantPendingAction | null
  sendMessage: (text: string, modality?: ConversationModality) => Promise<void>
  confirmAction: () => Promise<void>
  rejectAction: () => Promise<void>
  clearMessages: () => void
}

export function useAssistant(): UseAssistantReturn {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [pendingAction, setPendingAction] = useState<AssistantPendingAction | null>(null)
  const queryClient = useQueryClient()

  const sendMessage = useCallback(
    async (text: string, modality: ConversationModality = "text") => {
      if (!text.trim() || isLoading) return

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
        const response = await api.post<OrchestratorOutput>("/api/assistant/message", {
          text: text.trim(),
          modality,
          conversationId,
        })

        const result = response.data

        if (!conversationId) {
          setConversationId(result.conversationId)
        }

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

        if (result.pendingAction) {
          setPendingAction(result.pendingAction)
        }

        if (result.toolCalls?.some((tc) => tc.result?.success)) {
          queryClient.invalidateQueries({ queryKey: ["expenses"] })
          queryClient.invalidateQueries({ queryKey: ["income"] })
          queryClient.invalidateQueries({ queryKey: ["budgets"] })
          queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        }
      } catch (err) {
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
      const response = await api.post(`/api/assistant/confirm/${pendingAction.id}`)
      const result = response.data as { message?: string }

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

      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["income"] })
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm action")
    } finally {
      setIsLoading(false)
    }
  }, [pendingAction, conversationId, queryClient])

  const rejectAction = useCallback(async () => {
    if (!pendingAction) return

    try {
      await api.post(`/api/assistant/reject/${pendingAction.id}`)

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
    setMessages([])
    setConversationId(null)
    setPendingAction(null)
    setError(null)
  }, [])

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
  }
}
