export interface QueryTemplate {
  category: string
  queries: string[]
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    category: "Spending",
    queries: [
      "How much did I spend last month?",
      "What's my top spending category?",
      "Show me my dining expenses",
      "Compare spending this month vs last month",
      "What did I spend the most on this month?",
    ],
  },
  {
    category: "Budgets",
    queries: [
      "Am I over any budget this month?",
      "How much budget do I have left?",
      "Which budget am I closest to exceeding?",
      "Show my budget progress",
      "How can I stay within my budgets?",
    ],
  },
  {
    category: "Goals",
    queries: [
      "How is my emergency fund goal progressing?",
      "When will I reach my savings goal?",
      "Am I saving enough each month?",
      "How to set better financial goals?",
    ],
  },
  {
    category: "Insights",
    queries: [
      "Suggest ways to save money",
      "Where can I cut expenses?",
      "Is my spending healthy?",
      "How can I improve my finances?",
      "What's my savings rate?",
      "Give me a financial health tip",
    ],
  },
  {
    category: "Net Worth",
    queries: [
      "What's my current net worth?",
      "How has my net worth changed?",
      "What are my biggest assets?",
      "How can I increase my net worth?",
    ],
  },
  {
    category: "Investments",
    queries: [
      "How are my investments performing?",
      "Should I invest more?",
      "What's a good investment strategy?",
    ],
  },
]
