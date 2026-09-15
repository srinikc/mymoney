// ── Unified Assistant Types ─────────────────────────────────────────────
// Shared types for the MyMoney Assistant (text + voice unified).

// ── Conversation ────────────────────────────────────────────────────────

export type ConversationModality = "text" | "voice" | "mixed"

export interface AssistantConversation {
  id: number
  userId: number
  profileId: number
  title?: string
  modality: ConversationModality
  currentPage?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ── Messages ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system"
export type MessageModality = "text" | "voice"
export type MessageSource = "deterministic" | "llm" | "regex"

export interface AssistantMessage {
  id: number
  conversationId: number
  role: MessageRole
  content: string
  modality: MessageModality
  source?: MessageSource
  toolCalls?: ToolCall[]
  metadata?: MessageMetadata
  createdAt: Date
}

export interface ToolCall {
  tool: string
  args: Record<string, unknown>
  result?: ToolResult
}

export interface MessageMetadata {
  intent?: string
  confidence?: "high" | "medium" | "low"
  entities?: Record<string, unknown>
  latencyMs?: number
  language?: string
  /** When the assistant should navigate the user to a page. */
  navigation?: { path: string; label: string }
}

// ── Pending Actions ─────────────────────────────────────────────────────

export type RiskLevel = "none" | "low" | "medium" | "high"
export type PendingActionStatus = "pending" | "confirmed" | "rejected" | "expired"

export interface AssistantPendingAction {
  id: number
  conversationId: number
  userId: number
  profileId: number
  toolName: string
  args: Record<string, unknown>
  riskLevel: RiskLevel
  status: PendingActionStatus
  expiresAt: Date
  createdAt: Date
}

// ── Tools ───────────────────────────────────────────────────────────────

export type ToolCategory = "read" | "write"

export interface ToolDefinition {
  name: string
  description: string
  category: ToolCategory
  riskLevel: RiskLevel
  requiredParams: string[]
  optionalParams: string[]
  confirmRequired: boolean
  capabilities: string[]
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>
}

export interface ToolContext {
  userId: number
  profileId: number
  conversationId?: number
  language?: string
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  message?: string // natural language response for the user
}

// ── Orchestrator ────────────────────────────────────────────────────────

export interface OrchestratorInput {
  text: string
  modality: MessageModality
  language?: string
  conversationId?: number
  pageRoute?: string
  userId: number
  profileId: number
}

export interface OrchestratorOutput {
  conversationId: number
  response: string
  pendingAction?: AssistantPendingAction
  toolCalls?: ToolCall[]
  source: MessageSource
  metadata: MessageMetadata
}

// ── Page Context ────────────────────────────────────────────────────────

export interface PageContext {
  route: string
  name: string
  capabilities: string[]
  suggestedPrompts: string[]
  relevantData?: Record<string, unknown>
}

// ── Intent Parsing ──────────────────────────────────────────────────────

export type AssistantIntent =
  | "greeting"
  | "small_talk"
  | "help"
  | "add_expense"
  | "add_income"
  | "set_budget"
  | "update_budget"
  | "add_goal"
  | "update_goal"
  | "add_investment"
  | "add_subscription"
  | "add_insurance"
  | "query_spending"
  | "query_budget"
  | "query_goals"
  | "query_net_worth"
  | "query_health"
  | "query_investments"
  | "query_income"
  | "query_subscriptions"
  | "query_transactions"
  | "query_domain"
  | "navigate"
  | "unknown"

export interface ParsedIntent {
  intent: AssistantIntent
  confidence: "high" | "medium" | "low"
  entities: ParsedEntities
}

export interface ParsedEntities {
  amount?: number
  category?: string
  vendor?: string
  description?: string
  date?: string
  paymentMode?: string
  name?: string
  type?: string
  period?: string
  month?: number
  year?: number
  /** Read-domain key (e.g. "loans", "insurance") for query_domain. */
  domain?: string
  /** Target route for a navigate intent (e.g. "/budgets"). */
  path?: string
}

// ── STT/TTS ─────────────────────────────────────────────────────────────

export interface STTProvider {
  name: string
  transcribe(audio: Buffer | string, language: string): Promise<STTResult>
  isAvailable(): boolean
}

export interface STTResult {
  text: string
  confidence: number
  language: string
}

export interface TTSProvider {
  name: string
  synthesize(text: string, language: string): Promise<TTSResult>
  isAvailable(): boolean
}

export interface TTSResult {
  audio: Buffer
  duration: number
  language: string
}
