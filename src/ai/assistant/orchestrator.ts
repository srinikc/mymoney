// ── Assistant Orchestrator ──────────────────────────────────────────────
// Central coordinator for the unified assistant.
// Handles both text and voice input, routes to the right handler,
// and manages conversation state.

import type {
  OrchestratorInput,
  OrchestratorOutput,
  ParsedEntities,
  ToolCall,
  MessageMetadata,
  AssistantPendingAction,
  AssistantAwaiting,
} from "@/shared/assistant"
import { detectIntent } from "../deterministic/intent-parser"
import { extractCategory, extractVendor } from "../deterministic/entity-extractor"
import { generateResponse } from "./response-templates"
import { executeConfirmedAction } from "../tools/executor"
import {
  createConversation,
  addMessage,
  getRecentMessages,
  createPendingAction,
} from "./conversation"
import {
  startDraft,
  advanceDraft,
  applyFieldAnswer,
  executeDraft,
  parseYesNo,
  intentToWriteKind,
  type Draft,
  type WriteKind,
} from "./write-flow"

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

  // 5. Multi-turn conversation state (collect fields / confirm / offer)
  let response = ""
  let newAwaiting: AssistantAwaiting | undefined
  const kind = intentToWriteKind(parsed.intent)
  try {
    const recent = await getRecentMessages(conversationId, 6)
    const lastAssistant = [...recent].reverse().find((m) => m.role === "assistant")
    const awaiting = lastAssistant?.metadata?.awaiting
    if (awaiting) {
      const yn = parseYesNo(input.text)
      if (awaiting.mode === "offer") {
        if (yn === true) {
          const draft = startDraft(awaiting.draft.kind as WriteKind, enhancedEntities)
          const adv = advanceDraft(draft)
          response = adv.question
          newAwaiting = adv
        } else if (yn === false) {
          response = "Okay, cancelled."
        }
      } else if (awaiting.mode === "field" && awaiting.field) {
        const draft = applyFieldAnswer(awaiting.draft as Draft, awaiting.field, input.text)
        const adv = advanceDraft(draft)
        response = adv.question
        newAwaiting = adv
      } else if (awaiting.mode === "confirm") {
        if (yn === true) {
          response = await executeDraft(awaiting.draft as Draft, { userId: input.userId, profileId: input.profileId })
        } else if (yn === false) {
          response = "Okay, cancelled."
        }
      }
    }
  } catch {
    // Context unavailable — fall through to normal handling.
  }

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

  // ── Write intents: deterministic multi-turn draft (no LLM) ──────────
  if (isWriteIntent && !response && kind) {
    const draft = startDraft(kind, enhancedEntities)
    const adv = advanceDraft(draft)
    response = adv.question
    newAwaiting = adv
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

  // Offer to add when a read finds nothing (keeps the conversation moving).
  if (isReadIntent && response && !newAwaiting) {
    const offerMap: Record<string, WriteKind> = {
      query_investments: "add_investment",
      query_goals: "add_goal",
      query_subscriptions: "add_subscription",
    }
    const offerKind = offerMap[parsed.intent]
    if (offerKind && /(haven'?t|don'?t have|no .*(yet|tracked|recorded|active))/i.test(response)) {
      newAwaiting = { mode: "offer", draft: { kind: offerKind, fields: {} }, question: "Would you like to add one?" }
      response = `${response}\n\nWould you like to add one? (yes / no)`
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

  // 6. When a draft is ready to confirm, also expose a clickable pending
  // action so the user can Confirm/Cancel with a button (in addition to
  // replying "yes"/"no" by voice or text).
  if (newAwaiting?.mode === "confirm" && !pendingAction) {
    try {
      pendingAction = await createPendingAction({
        conversationId,
        userId: input.userId,
        profileId: input.profileId,
        toolName: newAwaiting.draft.kind,
        args: newAwaiting.draft.fields,
        riskLevel: "low",
      })
    } catch {
      // The card is optional — the conversational yes/no still works.
    }
  }

  // 7. Build metadata
  const latencyMs = Date.now() - startTime
  const metadata: MessageMetadata = {
    intent: parsed.intent,
    confidence: parsed.confidence,
    entities: enhancedEntities as unknown as Record<string, unknown>,
    latencyMs,
    language: input.language,
    ...(navigation ? { navigation } : {}),
    ...(newAwaiting ? { awaiting: newAwaiting } : {}),
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
