export interface FinancialContext {
  totalExpenses: number
  monthlyAverage: number
  topCategories: { name: string; amount: number }[]
  budgetStatus: { name: string; spent: number; limit: number }[]
  goals: { name: string; target: number; saved: number }[]
  recentTransactions: { date: string; description: string; amount: number }[]
  netWorth: { assets: number; liabilities: number }
  healthScore?: number
  totalIncome?: number
  savingsRate?: number
  investments?: { name: string; amount: number; currentValue: number }[]
}

export function buildFinancialPrompt(userMessage: string, context: FinancialContext): string {
  const netWorthValue = context.netWorth.assets - context.netWorth.liabilities
  const monthCount = context.recentTransactions.length > 0 ? 1 : 0

  return `You are MyMoney AI, a personal finance assistant for Indian users.
Answer in simple English. Use Indian numbering (lakhs, crores).
Be concise and actionable. Use emojis sparingly and only where appropriate.

USER'S FINANCIAL CONTEXT:
- Total expenses (all time): ₹${context.totalExpenses.toLocaleString("en-IN")}
- Monthly average: ₹${context.monthlyAverage.toLocaleString("en-IN")}
- Total income (estimated): ₹${(context.totalIncome ?? 0).toLocaleString("en-IN")}
- Savings rate: ${context.savingsRate?.toFixed(1) ?? "N/A"}%
- Top spending categories: ${context.topCategories.map((c) => `${c.name} (₹${c.amount.toLocaleString("en-IN")})`).join(", ")}
- Budget status: ${context.budgetStatus.map((b) => `${b.name}: ₹${b.spent.toLocaleString("en-IN")}/₹${b.limit.toLocaleString("en-IN")}`).join(", ")}
- Goals: ${context.goals.map((g) => `${g.name}: ₹${g.saved.toLocaleString("en-IN")}/₹${g.target.toLocaleString("en-IN")}`).join(", ")}
- Net worth: ₹${netWorthValue.toLocaleString("en-IN")}
- Health score: ${context.healthScore ?? "N/A"}/100
- Recent transactions (last ${monthCount > 0 ? context.recentTransactions.length : "N/A"}): ${context.recentTransactions.slice(0, 5).map((t) => `${t.date} — ${t.description || "N/A"} — ₹${t.amount.toLocaleString("en-IN")}`).join(" | ")}
- Investments: ${(context.investments ?? []).map((i) => `${i.name}: ₹${i.amount.toLocaleString("en-IN")} (current: ₹${i.currentValue.toLocaleString("en-IN")})`).join(", ") || "None"}

User question: ${userMessage}`
}
