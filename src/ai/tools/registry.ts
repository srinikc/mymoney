// ── Tool Definitions ────────────────────────────────────────────────────
// Defines all tools available to the assistant.
// Each tool has a handler that executes the actual API call.

import type { ToolDefinition } from "@/shared/assistant"

// ── Read Tools (No Confirmation) ────────────────────────────────────────

const querySpendingTool: ToolDefinition = {
  name: "query_spending",
  description: "Get spending summary for a period",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: ["period", "category"],
  confirmRequired: false,
  capabilities: ["query_spending"],
  handler: async () => {
    // This is a simplified version — the orchestrator will handle full context
    return {
      success: true,
      data: { message: "Spending query received" },
      message: "Let me check your spending...",
    }
  },
}

const queryBudgetTool: ToolDefinition = {
  name: "query_budget",
  description: "Get budget status",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: ["category"],
  confirmRequired: false,
  capabilities: ["query_budget", "query_budget_status", "query_budget_closest"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Budget query received" },
      message: "Let me check your budgets...",
    }
  },
}

const queryGoalsTool: ToolDefinition = {
  name: "query_goals",
  description: "Get goals progress",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: ["goalName"],
  confirmRequired: false,
  capabilities: ["query_goals", "query_goal_progress"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Goals query received" },
      message: "Let me check your goals...",
    }
  },
}

const queryNetWorthTool: ToolDefinition = {
  name: "query_net_worth",
  description: "Get net worth summary",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: [],
  confirmRequired: false,
  capabilities: ["query_net_worth"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Net worth query received" },
      message: "Let me calculate your net worth...",
    }
  },
}

const queryHealthTool: ToolDefinition = {
  name: "query_health",
  description: "Get financial health score",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: [],
  confirmRequired: false,
  capabilities: ["query_health"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Health query received" },
      message: "Let me check your financial health...",
    }
  },
}

const queryInvestmentsTool: ToolDefinition = {
  name: "query_investments",
  description: "Get investment portfolio summary",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: [],
  confirmRequired: false,
  capabilities: ["query_investments", "query_investment_portfolio"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Investments query received" },
      message: "Let me check your investments...",
    }
  },
}

const queryIncomeTool: ToolDefinition = {
  name: "query_income",
  description: "Get income summary",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: ["period"],
  confirmRequired: false,
  capabilities: ["query_income"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Income query received" },
      message: "Let me check your income...",
    }
  },
}

const querySubscriptionsTool: ToolDefinition = {
  name: "query_subscriptions",
  description: "Get subscriptions list",
  category: "read",
  riskLevel: "none",
  requiredParams: [],
  optionalParams: [],
  confirmRequired: false,
  capabilities: ["query_subscriptions"],
  handler: async () => {
    return {
      success: true,
      data: { message: "Subscriptions query received" },
      message: "Let me check your subscriptions...",
    }
  },
}

// ── Write Tools (All Require Confirmation) ──────────────────────────────

const addExpenseTool: ToolDefinition = {
  name: "add_expense",
  description: "Record a new expense",
  category: "write",
  riskLevel: "low",
  requiredParams: ["amount"],
  optionalParams: ["vendor", "category", "date", "paymentMode", "description", "purpose"],
  confirmRequired: true,
  capabilities: ["add_expense"],
  handler: async (args) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Auth will be handled by the cookie-based session
        },
        body: JSON.stringify({
          amount: args.amount,
          vendor: args.vendor || args.description || "",
          categoryName: args.category || "Uncategorized",
          date: args.date || new Date().toISOString().split("T")[0],
          paymentMode: args.paymentMode || "cash",
          purpose: args.purpose || "",
          description: args.description || "",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || "Failed to add expense" }
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: `Added ₹${args.amount} expense${args.category ? ` for ${args.category}` : ""}${args.vendor ? ` at ${args.vendor}` : ""}`,
      }
    } catch {
      return { success: false, error: "Failed to add expense" }
    }
  },
}

const addIncomeTool: ToolDefinition = {
  name: "add_income",
  description: "Record a new income",
  category: "write",
  riskLevel: "low",
  requiredParams: ["amount", "name"],
  optionalParams: ["category", "date", "type"],
  confirmRequired: true,
  capabilities: ["add_income"],
  handler: async (args) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/api/income/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: args.name,
          amount: args.amount,
          type: args.type || "monthly",
          categoryName: args.category || "Salary",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || "Failed to add income" }
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: `Added ₹${args.amount} income from ${args.name}`,
      }
    } catch {
      return { success: false, error: "Failed to add income" }
    }
  },
}

const setBudgetTool: ToolDefinition = {
  name: "set_budget",
  description: "Set or update a budget for a category",
  category: "write",
  riskLevel: "medium",
  requiredParams: ["category", "amount"],
  optionalParams: ["month", "year"],
  confirmRequired: true,
  capabilities: ["set_budget", "update_budget"],
  handler: async (args) => {
    try {
      // First, get categories to resolve name to ID
      const catResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/api/categories`)
      const categories = await catResponse.json()

      const category = categories.find(
        (c: { name: string }) => c.name.toLowerCase() === (args.category as string).toLowerCase()
      )

      if (!category) {
        return { success: false, error: `Category "${args.category}" not found` }
      }

      const now = new Date()
      const month = (args.month as number) || now.getMonth() + 1
      const year = (args.year as number) || now.getFullYear()

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/api/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: category.id,
          amount: args.amount,
          month,
          year,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || "Failed to set budget" }
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: `Set ₹${args.amount} budget for ${args.category}${month ? ` in month ${month}` : ""}`,
      }
    } catch {
      return { success: false, error: "Failed to set budget" }
    }
  },
}

// ── Tool Registry ───────────────────────────────────────────────────────

export const ALL_TOOLS: ToolDefinition[] = [
  // Read tools
  querySpendingTool,
  queryBudgetTool,
  queryGoalsTool,
  queryNetWorthTool,
  queryHealthTool,
  queryInvestmentsTool,
  queryIncomeTool,
  querySubscriptionsTool,
  // Write tools
  addExpenseTool,
  addIncomeTool,
  setBudgetTool,
]

/**
 * Get a tool by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name)
}

/**
 * Get tools by category.
 */
export function getToolsByCategory(category: "read" | "write"): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => t.category === category)
}

/**
 * Get tools that provide a capability.
 */
export function getToolsForCapability(capability: string): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => t.capabilities.includes(capability))
}
