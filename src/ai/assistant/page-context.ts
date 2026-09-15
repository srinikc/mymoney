// ── Page Context Resolver ──────────────────────────────────────────────
// Maps routes to their capabilities and suggested prompts.

import type { PageContext } from "@/shared/assistant"

const PAGE_CONTEXTS: Record<string, PageContext> = {
  "/": {
    route: "/",
    name: "Dashboard",
    capabilities: [
      "query_spending",
      "query_net_worth",
      "query_health",
      "query_goals",
      "query_income",
      "query_investments",
    ],
    suggestedPrompts: [
      "How much did I spend this month?",
      "What's my net worth?",
      "How's my financial health?",
      "What's my savings rate?",
    ],
  },
  "/dashboard": {
    route: "/dashboard",
    name: "Dashboard",
    capabilities: [
      "query_spending",
      "query_net_worth",
      "query_health",
      "query_goals",
      "query_income",
      "query_investments",
    ],
    suggestedPrompts: [
      "How much did I spend this month?",
      "What's my net worth?",
      "How's my financial health?",
      "What's my savings rate?",
    ],
  },
  "/budgets": {
    route: "/budgets",
    name: "Budgets",
    capabilities: [
      "query_budget",
      "set_budget",
      "update_budget",
    ],
    suggestedPrompts: [
      "Am I over budget?",
      "Which budget is almost full?",
      "Set budget for food at 5000",
      "What's my total budget?",
    ],
  },
  "/goals": {
    route: "/goals",
    name: "Goals",
    capabilities: [
      "query_goals",
      "add_goal",
      "update_goal",
    ],
    suggestedPrompts: [
      "How's my emergency fund?",
      "When will I reach my goal?",
      "Add a new savings goal",
      "What are my active goals?",
    ],
  },
  "/investments": {
    route: "/investments",
    name: "Investments",
    capabilities: [
      "query_investments",
      "add_investment",
    ],
    suggestedPrompts: [
      "How are my investments doing?",
      "What's my portfolio return?",
      "Add a new investment",
      "Show my investment breakdown",
    ],
  },
  "/income": {
    route: "/income",
    name: "Income",
    capabilities: [
      "query_income",
      "add_income",
    ],
    suggestedPrompts: [
      "What's my total income?",
      "Add a new income source",
      "How does this month compare?",
    ],
  },
  "/net-worth": {
    route: "/net-worth",
    name: "Net Worth",
    capabilities: [
      "query_net_worth",
    ],
    suggestedPrompts: [
      "What's my net worth?",
      "Show my assets and liabilities",
      "How has my net worth changed?",
    ],
  },
  "/expenses": {
    route: "/expenses",
    name: "Expenses",
    capabilities: [
      "query_spending",
      "add_expense",
    ],
    suggestedPrompts: [
      "How much did I spend today?",
      "Add an expense",
      "What's my biggest expense category?",
    ],
  },
  "/health": {
    route: "/health",
    name: "Financial Health",
    capabilities: [
      "query_health",
    ],
    suggestedPrompts: [
      "What's my health score?",
      "How can I improve my finances?",
      "Am I saving enough?",
    ],
  },
  "/insights": {
    route: "/insights",
    name: "Insights",
    capabilities: [
      "query_spending",
      "query_budget",
    ],
    suggestedPrompts: [
      "Show my spending trends",
      "What are my unusual expenses?",
      "How does this month compare?",
    ],
  },
  "/subscriptions": {
    route: "/subscriptions",
    name: "Subscriptions",
    capabilities: [
      "query_subscriptions",
      "add_subscription",
    ],
    suggestedPrompts: [
      "What are my active subscriptions?",
      "How much do I spend on subscriptions?",
      "Add a new subscription",
    ],
  },
  "/insurance": {
    route: "/insurance",
    name: "Insurance",
    capabilities: [
      "add_insurance",
    ],
    suggestedPrompts: [
      "What insurance do I have?",
      "Add a new insurance policy",
      "Do I have enough coverage?",
    ],
  },
}

// Fallback for unknown routes
const DEFAULT_CONTEXT: PageContext = {
  route: "/",
  name: "MyMoney",
  capabilities: [
    "query_spending",
    "query_net_worth",
    "query_health",
    "query_goals",
    "add_expense",
    "add_income",
  ],
  suggestedPrompts: [
    "How much did I spend?",
    "What's my net worth?",
    "Add an expense",
    "Set a budget",
  ],
}

/**
 * Resolve page context from a route string.
 * Returns a structured PageContext with capabilities and suggested prompts.
 */
export function resolvePageContext(route?: string | null): PageContext {
  if (!route) return DEFAULT_CONTEXT

  // Normalize route: remove query params, hash, trailing slash
  const normalized = route.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/"

  // Try exact match first
  if (PAGE_CONTEXTS[normalized]) {
    return PAGE_CONTEXTS[normalized]
  }

  // Try prefix match (e.g. "/budgets/123" -> "/budgets")
  for (const [prefix, ctx] of Object.entries(PAGE_CONTEXTS)) {
    if (normalized.startsWith(prefix + "/") || normalized.startsWith(prefix + "?")) {
      return { ...ctx, route: normalized }
    }
  }

  return { ...DEFAULT_CONTEXT, route: normalized }
}

/**
 * Get capabilities for a given route.
 */
export function getCapabilitiesForRoute(route?: string | null): string[] {
  return resolvePageContext(route).capabilities
}

/**
 * Get suggested prompts for a given route.
 */
export function getSuggestedPrompts(route?: string | null): string[] {
  return resolvePageContext(route).suggestedPrompts
}
