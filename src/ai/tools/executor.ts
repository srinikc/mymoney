// ── Tool Executor ───────────────────────────────────────────────────────
// Executes tools with validation, auth, and confirmation policy.

import type { ToolContext, ToolResult, RiskLevel } from "@/shared/assistant"
import { getToolByName } from "./registry"
import { requiresConfirmation, getConfirmationPolicy } from "../assistant/confirmation"
import { createPendingAction } from "../assistant/conversation"

/**
 * Execute a tool with validation and confirmation.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  options?: {
    skipConfirmation?: boolean
    conversationId?: number
  }
): Promise<ToolResult> {
  const tool = getToolByName(toolName)
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` }
  }

  // Validate required params
  for (const param of tool.requiredParams) {
    if (args[param] === undefined || args[param] === null || args[param] === "") {
      return {
        success: false,
        error: `Missing required parameter: ${param}`,
        message: `I need a ${param} to complete this action. Can you provide it?`,
      }
    }
  }

  // Check confirmation policy
  const autoExecute = false // TODO: Get from user settings
  if (requiresConfirmation(toolName, autoExecute) && !options?.skipConfirmation) {
    const policy = getConfirmationPolicy(toolName)

    // Create pending action for confirmation
    if (options?.conversationId) {
      const pendingAction = await createPendingAction({
        conversationId: options.conversationId,
        userId: ctx.userId,
        profileId: ctx.profileId,
        toolName,
        args,
        riskLevel: policy.riskLevel,
      })

      return {
        success: true,
        data: { pendingActionId: pendingAction.id },
        message: formatConfirmationMessage(toolName, args, policy.riskLevel),
      }
    }
  }

  // Execute the tool
  try {
    const result = await tool.handler(args, ctx)
    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    }
  }
}

/**
 * Execute a confirmed pending action.
 */
export async function executeConfirmedAction(
  pendingActionId: number,
  ctx: ToolContext
): Promise<ToolResult> {
  const { getPendingAction, confirmPendingAction } = await import("../assistant/conversation")

  const action = await getPendingAction(pendingActionId, ctx.userId)
  if (!action) {
    return { success: false, error: "Pending action not found or expired" }
  }

  // Mark the action confirmed
  await confirmPendingAction(pendingActionId, ctx.userId)

  // Execute it through the deterministic write flow (writes straight to the DB).
  const { executeDraft, intentToWriteKind } = await import("../assistant/write-flow")
  const kind = intentToWriteKind(action.toolName)
  if (!kind) {
    return { success: false, error: `Unknown action: ${action.toolName}` }
  }

  try {
    const message = await executeDraft(
      { kind, fields: (action.args as Record<string, unknown>) || {} },
      { userId: ctx.userId, profileId: ctx.profileId },
    )
    return {
      success: true,
      message,
      data: { toolName: action.toolName, args: action.args },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    }
  }
}

/**
 * Format a confirmation message based on tool name and args.
 */
function formatConfirmationMessage(
  toolName: string,
  args: Record<string, unknown>,
  riskLevel: RiskLevel
): string {
  const riskEmoji = {
    none: "",
    low: "",
    medium: "⚠️",
    high: "🚨",
  }[riskLevel]

  const riskPrefix = riskEmoji ? `${riskEmoji} ` : ""

  switch (toolName) {
    case "add_expense":
      return `${riskPrefix}Add ₹${args.amount} expense${args.category ? ` for ${args.category}` : ""}${args.vendor ? ` at ${args.vendor}` : ""}?`
    case "add_income":
      return `${riskPrefix}Add ₹${args.amount} income from ${args.name || "unknown"}?`
    case "set_budget":
      return `${riskPrefix}Set ₹${args.amount} budget for ${args.category || "unknown category"}?`
    case "update_budget":
      return `${riskPrefix}Update budget for ${args.category || "unknown category"} to ₹${args.amount}?`
    case "add_goal":
      return `${riskPrefix}Create goal "${args.name || "unnamed"}" with target ₹${args.targetAmount || 0}?`
    case "add_investment":
      return `${riskPrefix}Add investment "${args.name || "unnamed"}" worth ₹${args.amount || 0}?`
    case "add_subscription":
      return `${riskPrefix}Add subscription "${args.name || "unnamed"}" at ₹${args.amount || 0}/month?`
    default:
      return `${riskPrefix}Confirm this action?`
  }
}
