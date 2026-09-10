// Centralized query keys for React Query. Keys are structured so mutations can
// invalidate related data precisely (e.g. an expense change invalidates the
// dashboard insights, net-worth, and health score).

export const queryKeys = {
  insights: (params: string) => ["insights", params] as const,
  netWorth: () => ["net-worth"] as const,
  bankAccounts: () => ["bank-accounts"] as const,
  cashBalance: () => ["cash-balance"] as const,
  healthScore: () => ["health-score"] as const,
  expenseYears: () => ["expense-years"] as const,
  expenses: (params: string) => ["expenses", params] as const,
  categories: () => ["categories"] as const,
  budgets: (params: string) => ["budgets", params] as const,
  goals: () => ["goals"] as const,
  investments: () => ["investments"] as const,
  incomeSources: () => ["income-sources"] as const,
  incomeSummary: (params: string) => ["income-summary", params] as const,
  emergencyFund: () => ["emergency-fund"] as const,
} as const
