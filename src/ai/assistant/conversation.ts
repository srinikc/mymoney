// ── Conversation Manager ────────────────────────────────────────────────
// Handles DB read/write for assistant conversations, messages, and pending actions.

import { prisma } from "@/lib/prisma"
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantPendingAction,
  ConversationModality,
  MessageRole,
  MessageModality,
  MessageSource,
  RiskLevel,
  PendingActionStatus,
  ToolCall,
  MessageMetadata,
} from "@/shared/assistant"

// ── Conversations ───────────────────────────────────────────────────────

/**
 * Create a new conversation.
 */
export async function createConversation(params: {
  userId: number
  profileId: number
  modality?: ConversationModality
  currentPage?: string
  title?: string
}): Promise<AssistantConversation> {
  const conv = await prisma.assistantConversation.create({
    data: {
      userId: params.userId,
      profileId: params.profileId,
      modality: params.modality || "text",
      currentPage: params.currentPage,
      title: params.title,
    },
  })
  return conv as AssistantConversation
}

/**
 * Get a conversation by ID.
 */
export async function getConversation(
  id: number,
  userId: number
): Promise<AssistantConversation | null> {
  const conv = await prisma.assistantConversation.findFirst({
    where: { id, userId, isActive: true },
  })
  return conv as AssistantConversation | null
}

/**
 * List active conversations for a user.
 */
export async function listConversations(
  userId: number,
  profileId: number,
  limit = 20
): Promise<AssistantConversation[]> {
  const convs = await prisma.assistantConversation.findMany({
    where: { userId, profileId, isActive: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })
  return convs as AssistantConversation[]
}

/**
 * Update a conversation's metadata.
 */
export async function updateConversation(
  id: number,
  userId: number,
  data: {
    title?: string
    modality?: ConversationModality
    currentPage?: string
    isActive?: boolean
  }
): Promise<AssistantConversation | null> {
  const conv = await prisma.assistantConversation.updateMany({
    where: { id, userId },
    data,
  })
  if (conv.count === 0) return null
  return getConversation(id, userId)
}

/**
 * Delete a conversation (soft delete by setting isActive = false).
 */
export async function deleteConversation(
  id: number,
  userId: number
): Promise<boolean> {
  const result = await prisma.assistantConversation.updateMany({
    where: { id, userId },
    data: { isActive: false },
  })
  return result.count > 0
}

// ── Messages ────────────────────────────────────────────────────────────

/**
 * Add a message to a conversation.
 */
export async function addMessage(params: {
  conversationId: number
  role: MessageRole
  content: string
  modality: MessageModality
  source?: MessageSource
  toolCalls?: ToolCall[]
  metadata?: MessageMetadata
}): Promise<AssistantMessage> {
  const msg = await prisma.assistantMessage.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      modality: params.modality,
      source: params.source,
      toolCalls: params.toolCalls ? JSON.parse(JSON.stringify(params.toolCalls)) : undefined,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
    },
  })

  // Update conversation's updatedAt timestamp
  await prisma.assistantConversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  })

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role as MessageRole,
    content: msg.content,
    modality: msg.modality as MessageModality,
    source: msg.source as MessageSource | undefined,
    toolCalls: msg.toolCalls ? (msg.toolCalls as unknown as ToolCall[]) : undefined,
    metadata: msg.metadata ? (msg.metadata as unknown as MessageMetadata) : undefined,
    createdAt: msg.createdAt,
  }
}

/**
 * Get messages for a conversation (with pagination).
 */
export async function getMessages(
  conversationId: number,
  limit = 50,
  offset = 0
): Promise<AssistantMessage[]> {
  const msgs = await prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  })
  return msgs.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as MessageRole,
    content: m.content,
    modality: m.modality as MessageModality,
    source: m.source as MessageSource | undefined,
    toolCalls: m.toolCalls ? (m.toolCalls as unknown as ToolCall[]) : undefined,
    metadata: m.metadata ? (m.metadata as unknown as MessageMetadata) : undefined,
    createdAt: m.createdAt,
  }))
}

/**
 * Get the last N messages for a conversation (for context window).
 */
export async function getRecentMessages(
  conversationId: number,
  count = 10
): Promise<AssistantMessage[]> {
  const msgs = await prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: count,
  })
  return msgs.reverse().map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as MessageRole,
    content: m.content,
    modality: m.modality as MessageModality,
    source: m.source as MessageSource | undefined,
    toolCalls: m.toolCalls ? (m.toolCalls as unknown as ToolCall[]) : undefined,
    metadata: m.metadata ? (m.metadata as unknown as MessageMetadata) : undefined,
    createdAt: m.createdAt,
  }))
}

// ── Pending Actions ─────────────────────────────────────────────────────

/**
 * Create a pending action that requires confirmation.
 */
export async function createPendingAction(params: {
  conversationId: number
  userId: number
  profileId: number
  toolName: string
  args: Record<string, unknown>
  riskLevel: RiskLevel
  expiresInMinutes?: number
}): Promise<AssistantPendingAction> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresInMinutes || 10))

  const action = await prisma.assistantPendingAction.create({
    data: {
      conversationId: params.conversationId,
      userId: params.userId,
      profileId: params.profileId,
      toolName: params.toolName,
      args: JSON.parse(JSON.stringify(params.args)),
      riskLevel: params.riskLevel,
      expiresAt,
    },
  })
  return action as AssistantPendingAction
}

/**
 * Get a pending action by ID.
 */
export async function getPendingAction(
  id: number,
  userId: number
): Promise<AssistantPendingAction | null> {
  const action = await prisma.assistantPendingAction.findFirst({
    where: { id, userId, status: "pending" },
  })
  if (!action) return null
  // Check if expired
  if (action.expiresAt < new Date()) {
    await prisma.assistantPendingAction.update({
      where: { id },
      data: { status: "expired" },
    })
    return null
  }
  return action as AssistantPendingAction
}

/**
 * Confirm a pending action.
 */
export async function confirmPendingAction(
  id: number,
  userId: number
): Promise<AssistantPendingAction | null> {
  const action = await prisma.assistantPendingAction.updateMany({
    where: { id, userId, status: "pending" },
    data: { status: "confirmed" },
  })
  if (action.count === 0) return null
  const updated = await prisma.assistantPendingAction.findUnique({ where: { id } })
  return updated as AssistantPendingAction | null
}

/**
 * Reject a pending action.
 */
export async function rejectPendingAction(
  id: number,
  userId: number
): Promise<boolean> {
  const result = await prisma.assistantPendingAction.updateMany({
    where: { id, userId, status: "pending" },
    data: { status: "rejected" },
  })
  return result.count > 0
}

/**
 * Expire old pending actions (run periodically).
 */
export async function expireStaleActions(): Promise<number> {
  const result = await prisma.assistantPendingAction.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  })
  return result.count
}
