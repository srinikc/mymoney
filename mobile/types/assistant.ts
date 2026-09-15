// ── Assistant Types (Mobile) ────────────────────────────────────────────
// Types for the unified assistant (mobile version).

export type ConversationModality = "text" | "voice" | "mixed"
export type MessageModality = "text" | "voice"
export type AssistantSource = "deterministic" | "llm"
export type AssistantRole = "user" | "assistant"

export interface AssistantMessage {
  id: number
  conversationId: number
  role: AssistantRole
  content: string
  modality: MessageModality
  source?: AssistantSource
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface AssistantPendingAction {
  id: number
  toolName: string
  args: Record<string, unknown>
  riskLevel: "low" | "medium" | "high"
}

export interface OrchestratorOutput {
  conversationId: number
  response: string
  source: AssistantSource
  pendingAction?: AssistantPendingAction
  toolCalls?: Array<{
    toolName: string
    args: Record<string, unknown>
    result?: { success: boolean }
  }>
  metadata?: Record<string, unknown>
}
