// ── Assistant Orchestrator ──────────────────────────────────────────────
// Central coordinator for the unified assistant.
// Handles both text and voice input, routes to the right handler,
// and manages conversation state.

import type {
  OrchestratorInput,
  OrchestratorOutput,
  AssistantIntent,
  ParsedEntities,
  ToolCall,
  MessageMetadata,
  AssistantPendingAction,
} from "@/shared/assistant"
import { detectIntent } from "../deterministic/intent-parser"
import { extractCategory, extractVendor } from "../deterministic/entity-extractor"
import { generateResponse } from "./response-templates"
import { executeTool, executeConfirmedAction } from "../tools/executor"
import { getToolByName } from "../tools/registry"
import { getRiskLevel } from "./confirmation"
import {
  createConversation,
  addMessage,
  getPendingAction,
} from "./conversation"

// ── Main Orchestrator ───────────────────────────────────────────────────

/**
 * Process a user input (text or voice) through the unified assistant.
 */
export async function processInput(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const startTime = Date.now()
  let source: "deterministic" | "llm" = "deterministic"

  // 1. Get or create conversation
  let conversationId = input.conversationId
  if (!conversationId) {
    const conv = await createConversation({
      userId: input.userId,
      profileId: input.profileId,
      modality: input.modality,
      currentPage: input.pageRoute || undefined,
    })
    conversationId = conv.id
  }

  // 2. Save user message
  await addMessage({
    conversationId,
    role: "user",
    content: input.text,
    modality: input.modality,
  })

  // 3. Parse intent using deterministic engine
  const parsed = detectIntent(input.text, input.language)

  // 4. Enhance entities with category/vendor extraction
  const enhancedEntities: ParsedEntities = {
    ...parsed.entities,
    category: parsed.entities.category || extractCategory(input.text),
    vendor: parsed.entities.vendor || extractVendor(input.text),
  }

  // 5. Route based on intent type
  let response = ""
  let pendingAction: AssistantPendingAction | undefined
  const toolCalls: ToolCall[] = []

  const isReadIntent = [
    "query_spending", "query_budget", "query_goals", "query_net_worth",
    "query_health", "query_investments", "query_income", "query_subscriptions",
    "query_transactions",
  ].includes(parsed.intent)

  const isWriteIntent = [
    "add_expense", "add_income", "set_budget", "update_budget",
    "add_goal", "update_goal", "add_investment", "add_subscription", "add_insurance",
  ].includes(parsed.intent)

  // ── Write intents: use tools with confirmation ──────────────────────
  if (isWriteIntent) {
    const toolName = getToolForIntent(parsed.intent)
    if (toolName) {
      const tool = getToolByName(toolName)
      if (tool) {
        const args = buildToolArgs(parsed.intent, enhancedEntities)
        const result = await executeTool(toolName, args, {
          userId: input.userId,
          profileId: input.profileId,
          conversationId,
          language: input.language,
        }, { conversationId })

        toolCalls.push({ tool: toolName, args, result })

        const toolData = result.data as Record<string, unknown> | undefined
        if (toolData?.pendingActionId) {
          const action = await getPendingAction(toolData.pendingActionId as number, input.userId)
          if (action) {
            pendingAction = action as AssistantPendingAction
            response = result.message || formatConfirmationMessage(toolName, args)
          }
        } else if (result.success) {
          response = result.message || generateResponse(parsed.intent, enhancedEntities, input.language)
        } else {
          response = result.message || result.error || "Something went wrong."
        }
      }
    }
  }

  // ── Read intents: query DB directly for real data ───────────────────
  if (isReadIntent && !response) {
    try {
      const { getReadResponse } = await import("./read-handler")
      const readResult = await getReadResponse(parsed.intent, input.userId, input.profileId, input.language, enhancedEntities)
      response = readResult
    } catch {
      response = generateResponse(parsed.intent, enhancedEntities, input.language)
    }
  }

  // ── Domain queries: any MyMoney data, deterministic (no LLM) ────────
  let navigation: { path: string; label: string } | undefined
  if (parsed.intent === "query_domain" && !response) {
    try {
      const { READ_DOMAINS, getDomainResponse } = await import("./domains")
      const domain = READ_DOMAINS.find((d) => d.key === enhancedEntities.domain)
      if (domain) {
        response = await getDomainResponse(domain, {
          userId: input.userId,
          profileId: input.profileId,
          entities: enhancedEntities,
        })
      }
    } catch {
      // fall through to template
    }
    if (!response) response = generateResponse("unknown", enhancedEntities, input.language)
  }

  // ── Navigation: "open budgets", "go to loans" ───────────────────────
  if (parsed.intent === "navigate") {
    const { resolveNavigation } = await import("./domains")
    const nav = resolveNavigation(input.text)
    if (nav) {
      navigation = { path: nav.path, label: nav.label }
      response = `Opening **${nav.label}**…`
    } else {
      response = "Which page would you like to open? Try \"open budgets\" or \"go to investments\"."
    }
  }

  // ── Greeting / small_talk / help: template response ─────────────────
  if (!isReadIntent && !isWriteIntent && parsed.intent !== "unknown" && parsed.intent !== "query_domain" && parsed.intent !== "navigate" && !response) {
    response = generateResponse(parsed.intent, enhancedEntities, input.language)
  }

  // ── Unknown intent: try LLM with full financial context FIRST ──────
  if (parsed.intent === "unknown" && !response) {
    // Only build the (expensive) financial context if an LLM is actually
    // configured for this user — otherwise skip straight to a template.
    let hasLlm = false
    try {
      const { getConfig } = await import("@/lib/get-config")
      const [openai, anthropic, opencode, baseUrl] = await Promise.all([
        getConfig("OPENAI_API_KEY", input.userId),
        getConfig("ANTHROPIC_API_KEY", input.userId),
        getConfig("OPENCODE_API_KEY", input.userId),
        getConfig("LLM_BASE_URL", input.userId),
      ])
      hasLlm = Boolean(openai || anthropic || opencode || baseUrl)
    } catch {
      hasLlm = false
    }

    if (hasLlm) {
      try {
        const { getFinancialContext } = await import("./financial-context")
        const { buildFinancialPrompt } = await import("@/lib/prompt-builder")
        const { queryLLM } = await import("@/lib/llm")

        const context = await getFinancialContext(input.userId, input.profileId)
        const prompt = buildFinancialPrompt(input.text, context)
        const llmResponse = await queryLLM(prompt, input.userId)

        if (llmResponse && llmResponse.trim()) {
          response = llmResponse.trim()
          source = "llm"
        }
      } catch {
        // LLM not available
      }
    }

    // Fallback to template only if LLM didn't respond
    if (!response) {
      response = generateResponse("unknown", enhancedEntities, input.language)
    }
  }

  // 6. Build metadata
  const latencyMs = Date.now() - startTime
  const metadata: MessageMetadata = {
    intent: parsed.intent,
    confidence: parsed.confidence,
    entities: enhancedEntities as unknown as Record<string, unknown>,
    latencyMs,
    language: input.language,
    ...(navigation ? { navigation } : {}),
  }

  // 7. Save assistant message
  await addMessage({
    conversationId,
    role: "assistant",
    content: response,
    modality: input.modality,
    source,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    metadata,
  })

  // 8. Return output
  return {
    conversationId,
    response,
    pendingAction,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    source,
    metadata,
  }
}

// ── Confirm/Reject Actions ──────────────────────────────────────────────

export async function confirmAction(
  pendingActionId: number,
  userId: number,
  profileId: number
): Promise<{ success: boolean; message: string; toolCalls?: ToolCall[] }> {
  const result = await executeConfirmedAction(pendingActionId, { userId, profileId })

  if (result.success) {
    const data = result.data as Record<string, unknown> | undefined
    return {
      success: true,
      message: result.message || "Action completed successfully.",
      toolCalls: [{ tool: (data?.toolName as string) || "unknown", args: (data?.args as Record<string, unknown>) || {}, result }],
    }
  }
  return {
    success: false,
    message: result.error || "Failed to execute action.",
  }
}

export async function rejectAction(
  pendingActionId: number,
  userId: number
): Promise<boolean> {
  const { rejectPendingAction } = await import("./conversation")
  return rejectPendingAction(pendingActionId, userId)
}

// ── Helper Functions ────────────────────────────────────────────────────

function getToolForIntent(intent: AssistantIntent): string | null {
  const intentToolMap: Record<AssistantIntent, string> = {
    add_expense: "add_expense",
    add_income: "add_income",
    set_budget: "set_budget",
    update_budget: "update_budget",
    add_goal: "add_goal",
    update_goal: "update_goal",
    add_investment: "add_investment",
    add_subscription: "add_subscription",
    add_insurance: "add_insurance",
    greeting: "",
    small_talk: "",
    help: "",
    query_spending: "query_spending",
    query_budget: "query_budget",
    query_goals: "query_goals",
    query_net_worth: "query_net_worth",
    query_health: "query_health",
    query_investments: "query_investments",
    query_income: "query_income",
    query_subscriptions: "query_subscriptions",
    query_transactions: "query_transactions",
    query_domain: "",
    navigate: "",
    unknown: "",
  }
  return intentToolMap[intent] || null
}

function buildToolArgs(
  intent: AssistantIntent,
  entities: ParsedEntities
): Record<string, unknown> {
  const args: Record<string, unknown> = {}

  if (entities.amount !== undefined) args.amount = entities.amount
  if (entities.category) args.category = entities.category
  if (entities.vendor) args.vendor = entities.vendor
  if (entities.date) args.date = entities.date
  if (entities.paymentMode) args.paymentMode = entities.paymentMode
  if (entities.description) args.description = entities.description

  switch (intent) {
    case "add_expense":
      args.purpose = entities.description || ""
      break
    case "add_income":
      args.name = entities.name || entities.vendor || "Income"
      args.type = entities.type || "monthly"
      break
    case "set_budget":
    case "update_budget":
      args.month = entities.month || new Date().getMonth() + 1
      args.year = entities.year || new Date().getFullYear()
      break
    case "add_goal":
      args.targetAmount = entities.amount
      args.name = entities.name || "Goal"
      break
  }

  return args
}

function formatConfirmationMessage(
  toolName: string,
  args: Record<string, unknown>
): string {
  const riskLevel = getRiskLevel(toolName)
  const riskEmoji = { none: "", low: "", medium: "", high: "" }[riskLevel]
  const prefix = riskEmoji ? `${riskEmoji} ` : ""

  switch (toolName) {
    case "add_expense": {
      const amt = args.amount ? `₹${args.amount}` : ""
      const cat = args.category ? ` for ${args.category}` : ""
      const vendor = args.vendor ? ` at ${args.vendor}` : ""
      const purpose = args.purpose ? ` — ${args.purpose}` : ""
      if (!args.amount) return `${prefix}I understood you want to add an expense. How much did you spend?`
      return `${prefix}Add ${amt} expense${cat}${vendor}${purpose}?`
    }
    case "add_income": {
      const amt = args.amount ? `₹${args.amount}` : ""
      const name = args.name && args.name !== "Income" ? ` from ${args.name}` : ""
      if (!args.amount) return `${prefix}I understood you want to add income. How much did you receive?`
      return `${prefix}Add ${amt} income${name}?`
    }
    case "set_budget": {
      const amt = args.amount ? `₹${args.amount}` : ""
      const cat = args.category ? ` for ${args.category}` : ""
      if (!args.amount) return `${prefix}I understood you want to set a budget. What's the budget amount?`
      return `${prefix}Set ${amt} budget${cat}?`
    }
    case "add_goal": {
      const amt = args.targetAmount ? `₹${args.targetAmount}` : ""
      const name = args.name && args.name !== "Goal" ? args.name : ""
      if (!args.targetAmount) return `${prefix}I understood you want to add a goal. What's the target amount?`
      return `${prefix}Add goal${name ? ` "${name}"` : ""} with target ${amt}?`
    }
    case "add_investment": {
      const amt = args.amount ? `₹${args.amount}` : ""
      const name = args.name || args.category || ""
      if (!args.amount) return `${prefix}I understood you want to add an investment. How much?`
      return `${prefix}Add ${amt} investment${name ? ` in ${name}` : ""}?`
    }
    default:
      return `${prefix}Confirm this action?`
  }
}
