// ── Confirmation Policy ─────────────────────────────────────────────────
// Defines which actions require confirmation and at what risk level.
// All writes require confirmation by default. User can set auto-execute in settings.

import type { RiskLevel } from "@/shared/assistant"

interface ConfirmationPolicyEntry {
  toolName: string
  riskLevel: RiskLevel
  requireConfirmation: boolean
  reason: string
}

/**
 * Confirmation policies for all tools.
 * riskLevel determines UI urgency:
 *   - "none": no confirmation needed (reads)
 *   - "low": simple confirm button
 *   - "medium": confirm with explanation
 *   - "high": confirm with warning + typed confirmation
 */
const CONFIRMATION_POLICIES: Record<string, ConfirmationPolicyEntry> = {
  // ── Reads (no confirmation) ──────────────────────────────────────────
  query_spending: {
    toolName: "query_spending",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_spending_category: {
    toolName: "query_spending_category",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_spending_period: {
    toolName: "query_spending_period",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_budget: {
    toolName: "query_budget",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_budget_status: {
    toolName: "query_budget_status",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_budget_closest: {
    toolName: "query_budget_closest",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_goals: {
    toolName: "query_goals",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_goal_progress: {
    toolName: "query_goal_progress",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_net_worth: {
    toolName: "query_net_worth",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_health: {
    toolName: "query_health",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_investments: {
    toolName: "query_investments",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_investment_portfolio: {
    toolName: "query_investment_portfolio",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_income: {
    toolName: "query_income",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },
  query_subscriptions: {
    toolName: "query_subscriptions",
    riskLevel: "none",
    requireConfirmation: false,
    reason: "Read-only query",
  },

  // ── Writes (all require confirmation) ────────────────────────────────
  add_expense: {
    toolName: "add_expense",
    riskLevel: "low",
    requireConfirmation: true,
    reason: "Creates a new expense record",
  },
  add_income: {
    toolName: "add_income",
    riskLevel: "low",
    requireConfirmation: true,
    reason: "Creates a new income record",
  },
  set_budget: {
    toolName: "set_budget",
    riskLevel: "medium",
    requireConfirmation: true,
    reason: "Sets or overwrites a budget limit",
  },
  update_budget: {
    toolName: "update_budget",
    riskLevel: "medium",
    requireConfirmation: true,
    reason: "Modifies an existing budget",
  },
  add_goal: {
    toolName: "add_goal",
    riskLevel: "low",
    requireConfirmation: true,
    reason: "Creates a new savings goal",
  },
  update_goal: {
    toolName: "update_goal",
    riskLevel: "medium",
    requireConfirmation: true,
    reason: "Modifies a savings goal",
  },
  add_investment: {
    toolName: "add_investment",
    riskLevel: "medium",
    requireConfirmation: true,
    reason: "Creates a new investment record",
  },
  add_subscription: {
    toolName: "add_subscription",
    riskLevel: "low",
    requireConfirmation: true,
    reason: "Creates a new subscription record",
  },
  add_insurance: {
    toolName: "add_insurance",
    riskLevel: "medium",
    requireConfirmation: true,
    reason: "Creates a new insurance record",
  },
}

/**
 * Get the confirmation policy for a tool.
 * Defaults to requiring confirmation if tool is not in the registry.
 */
export function getConfirmationPolicy(toolName: string): ConfirmationPolicyEntry {
  return (
    CONFIRMATION_POLICIES[toolName] || {
      toolName,
      riskLevel: "medium" as RiskLevel,
      requireConfirmation: true,
      reason: "Unknown action — confirmation required",
    }
  )
}

/**
 * Check if a tool requires confirmation.
 */
export function requiresConfirmation(toolName: string, autoExecute = false): boolean {
  if (autoExecute) return false
  const policy = getConfirmationPolicy(toolName)
  return policy.requireConfirmation
}

/**
 * Get the risk level for a tool.
 */
export function getRiskLevel(toolName: string): RiskLevel {
  return getConfirmationPolicy(toolName).riskLevel
}
