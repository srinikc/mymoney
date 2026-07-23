export const PLANS = {
  free: { name: "Free", price: 0, profiles: 1, features: ["Basic tracking", "Manual import"] },
  pro: { name: "Pro", price: 499, currency: "INR", profiles: 3, features: ["Everything in Free", "AI insights", "Gmail parsing", "Auto-linking", "Tax optimization", "What-if simulator", "LLM Chatbot (50/mo)"] },
  enterprise: { name: "Enterprise", price: 1999, currency: "INR", profiles: 10, features: ["Everything in Pro", "Unlimited LLM", "Admin console", "Account Aggregator", "Dedicated support"] },
} as const

export type PlanId = keyof typeof PLANS
