// Shared voice-assistant types. Used by the web app, the mobile app, and the
// /api/voice route so the parsed proposal shape is consistent everywhere.

export type VoiceIntent =
  | "query"
  | "add_expense"
  | "add_income"
  | "set_budget"
  | "add_goal"
  | "add_subscription"
  | "add_investment"
  | "add_insurance"
  | "unknown"

export type VoiceConfidence = "high" | "medium" | "low"

export interface VoiceEntity {
  // The record kind implied by the intent (add_expense -> "expense", etc.)
  type?: "expense" | "income" | "budget" | "goal" | "subscription" | "investment" | "insurance"
  amount?: number
  name?: string
  vendor?: string
  description?: string
  category?: string
  subCategory?: string
  person?: string
  date?: string // YYYY-MM-DD
  paymentMode?: string
  bankAccount?: string
  notes?: string
  // Income-specific
  incomeType?: "monthly" | "yearly" | "onetime" | "variable"
  sourceCategory?: string
  // Budget-specific
  budgetMonth?: number
  budgetYear?: number
  // Recurring
  recurring?: boolean
  recurrenceCount?: number
}

export interface VoiceResult {
  intent: VoiceIntent
  confidence: VoiceConfidence
  language: string
  page?: string
  entity?: VoiceEntity
  answer?: string
  source: "llm" | "regex"
}

export interface SupportedLanguage {
  code: string
  name: string
  label: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en-IN", name: "English", label: "English" },
  { code: "hi-IN", name: "Hindi", label: "हिन्दी" },
  { code: "kn-IN", name: "Kannada", label: "ಕನ್ನಡ" },
  { code: "ta-IN", name: "Tamil", label: "தமிழ்" },
  { code: "te-IN", name: "Telugu", label: "తెలుగు" },
  { code: "bn-IN", name: "Bengali", label: "বাংলা" },
  { code: "mr-IN", name: "Marathi", label: "मराठी" },
  { code: "ur-IN", name: "Urdu", label: "اردو" },
  { code: "ml-IN", name: "Malayalam", label: "മലയാളം" },
  { code: "gu-IN", name: "Gujarati", label: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", label: "ਪੰਜਾਬੀ" },
  { code: "or-IN", name: "Odia", label: "ଓଡ଼ିଆ" },
]

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code)
}