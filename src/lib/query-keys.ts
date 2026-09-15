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
  recurrence: (params: string) => ["recurrence", params] as const,
  intelligence: () => ["intelligence"] as const,
  deepInsights: (params: string) => ["deep-insights", params] as const,
  assets: () => ["assets"] as const,
  liabilities: () => ["liabilities"] as const,
  gapAnalysis: () => ["gap-analysis"] as const,
  recommendations: () => ["recommendations"] as const,
  budgetsOverview: (m: number, y: number) => ["budgets-overview", m, y] as const,
  budgetCategoryTree: () => ["categories", "tree"] as const,
} as const
