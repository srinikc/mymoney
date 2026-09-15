// ── Capability Registry ─────────────────────────────────────────────────
// Maps capabilities to tool definitions. Used by the orchestrator to route
// intents to the correct tools based on page context.

import type { ToolDefinition } from "@/shared/assistant"

/**
 * Registry of all capabilities and their associated tools.
 * Key = capability name, Value = tool definitions that provide this capability.
 */
export const CAPABILITY_REGISTRY: Record<string, string[]> = {
  // Expense capabilities
  add_expense: ["add_expense"],
  query_spending: ["query_spending", "query_spending_category", "query_spending_period"],

  // Income capabilities
  add_income: ["add_income"],
  query_income: ["query_income"],

  // Budget capabilities
  set_budget: ["set_budget"],
  update_budget: ["update_budget"],
  query_budget: ["query_budget", "query_budget_status", "query_budget_closest"],

  // Goal capabilities
  add_goal: ["add_goal"],
  update_goal: ["update_goal"],
  query_goals: ["query_goals", "query_goal_progress"],

  // Investment capabilities
  add_investment: ["add_investment"],
  query_investments: ["query_investments", "query_investment_portfolio"],

  // Subscription capabilities
  add_subscription: ["add_subscription"],
  query_subscriptions: ["query_subscriptions"],

  // Insurance capabilities
  add_insurance: ["add_insurance"],

  // Net worth capabilities
  query_net_worth: ["query_net_worth"],

  // Health capabilities
  query_health: ["query_health"],
}

/**
 * Get tool names that provide a given capability.
 */
export function getToolsForCapability(capability: string): string[] {
  return CAPABILITY_REGISTRY[capability] || []
}

/**
 * Get all capabilities that a set of tools can provide.
 */
export function getCapabilitiesForTools(toolNames: string[]): string[] {
  const capabilities: string[] = []
  for (const [cap, tools] of Object.entries(CAPABILITY_REGISTRY)) {
    if (tools.some((t) => toolNames.includes(t))) {
      capabilities.push(cap)
    }
  }
  return capabilities
}

/**
 * Check if a capability is available given the current page context.
 */
export function isCapabilityAvailable(
  capability: string,
  pageCapabilities: string[]
): boolean {
  return pageCapabilities.includes(capability)
}
