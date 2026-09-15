import type { VoiceConfidence, VoiceEntity, VoiceIntent, VoiceResult } from "@/shared/voice"

// ── LLM prompt ────────────────────────────────────────────────────────────
export function buildVoicePrompt(text: string, language: string, page?: string): string {
  const pageLine = page ? `\nThe user is currently on the "${page}" page of the app — use it only as a soft hint when the intent is ambiguous.` : ""
  return [
    "You are MyMoney Voice Assistant, part of a personal finance app for Indian users.",
    `The user spoke (or typed) this in language code "${language}":`,
    `"${text}"`,
    pageLine,
    "",
    "Decide the INTENT, then either produce an ANSWER (for a question) or extract an ENTRY (for adding/recording something).",
    "",
    "INTENTS:",
    `- "query": a question about their finances (spending, budgets, goals, net worth, savings, advice).`,
    `- "add_expense": recording money spent. e.g. "spent 250 on groceries at Big Bazaar", "paid 1200 for electricity bill".`,
    `- "add_income": recording money received. e.g. "received 50000 salary", "got 2000 interest".`,
    `- "set_budget": setting a monthly budget limit for a category. e.g. "set budget 5000 for groceries".`,
    `- "add_goal" / "add_subscription" / "add_investment" / "add_insurance": only if clearly indicated.`,
    `- "unknown": if you cannot tell what they want.`,
    "",
    `For "query": write a short, helpful answer (2-4 sentences) IN THE USER'S LANGUAGE (${language}), using Indian numbering (lakhs, crores). Set "answer".`,
    "For add/set intents: extract the ENTITY:",
    `- Amounts in rupees as a plain number (250). "2.5k" → 2500, "1 lakh" → 100000. Parse numbers written in any Indian script.`,
    `- "today"/"yesterday" → the actual date (YYYY-MM-DD).`,
    `- Guess the category if obvious (groceries, dining, transport, rent, utilities, medical, shopping, entertainment...).`,
    `- Payment mode if mentioned (UPI, cash, card, bank transfer).`,
    `- For "set_budget", the month is the current month unless the user says otherwise.`,
    `- If the user mentions repeating every month (e.g. "every month", "monthly"), set entity.recurring=true (and recurrenceCount if a number of months is given).`,
    "",
    "Respond with ONLY a single JSON object (no markdown, no extra text):",
    '{"intent":"...","confidence":"high|medium|low","entity":{...},"answer":"..."}',
    "- confidence reflects how sure you are about the intent and the extracted fields.",
    "- For query intent, omit entity. For add intents, omit answer.",
  ].join("\n")
}

// ── Robust JSON extraction ────────────────────────────────────────────────
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = String(text || "").replaceAll(/```json|```/g, "").trim()
  const start = cleaned.indexOf("{")
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === "\\") escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as Record<string, unknown>
        } catch {
          return null
        }
      }
    }
  }
  return null
}

const INTENTS: VoiceIntent[] = [
  "query", "add_expense", "add_income", "set_budget",
  "add_goal", "add_subscription", "add_investment", "add_insurance", "unknown",
]

function asIntent(v: unknown): VoiceIntent {
  const s = String(v ?? "").trim()
  return (INTENTS as string[]).includes(s) ? (s as VoiceIntent) : "unknown"
}

function asConfidence(v: unknown): VoiceConfidence {
  const s = String(v ?? "").trim().toLowerCase()
  return s === "high" || s === "medium" || s === "low" ? s : "low"
}

function asAmount(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.round(v * 100) / 100
  if (typeof v === "string") {
    const n = Number(String(v).replaceAll(/[\s,₹]/g, ""))
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100) / 100
  }
  return undefined
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined
  return undefined
}

function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

// Validate + sanitize the raw LLM output into a typed VoiceResult.
export function parseVoiceResponse(text: string, language: string, page?: string): VoiceResult | null {
  const raw = extractJsonObject(text)
  if (!raw) return null
  const intent = asIntent(raw.intent)
  const confidence = asConfidence(raw.confidence)

  const result: VoiceResult = {
    intent,
    confidence,
    language,
    page,
    source: "llm",
  }

  if (typeof raw.answer === "string" && raw.answer.trim()) {
    result.answer = raw.answer.trim()
  }

  if (raw.entity && typeof raw.entity === "object") {
    const e = raw.entity as Record<string, unknown>
    const entity: VoiceEntity = {}
    const type = asString(e.type)
    if (type) entity.type = type as VoiceEntity["type"]
    const amount = asAmount(e.amount)
    if (amount !== undefined) entity.amount = amount
    const name = asString(e.name)
    if (name) entity.name = name
    const vendor = asString(e.vendor)
    if (vendor) entity.vendor = vendor
    const description = asString(e.description)
    if (description) entity.description = description
    const category = asString(e.category)
    if (category) entity.category = category
    const subCategory = asString(e.subCategory)
    if (subCategory) entity.subCategory = subCategory
    const person = asString(e.person)
    if (person) entity.person = person
    const date = asString(e.date)
    if (date) entity.date = date
    const paymentMode = asString(e.paymentMode)
    if (paymentMode) entity.paymentMode = paymentMode
    const bankAccount = asString(e.bankAccount)
    if (bankAccount) entity.bankAccount = bankAccount
    const notes = asString(e.notes)
    if (notes) entity.notes = notes
    const incomeType = asString(e.incomeType)
    if (incomeType) entity.incomeType = incomeType as VoiceEntity["incomeType"]
    const sourceCategory = asString(e.sourceCategory)
    if (sourceCategory) entity.sourceCategory = sourceCategory
    const budgetMonth = asNumber(e.budgetMonth)
    if (budgetMonth !== undefined) entity.budgetMonth = budgetMonth
    const budgetYear = asNumber(e.budgetYear)
    if (budgetYear !== undefined) entity.budgetYear = budgetYear
    const recurring = asBool(e.recurring)
    if (recurring !== undefined) entity.recurring = recurring
    const recurrenceCount = asNumber(e.recurrenceCount)
    if (recurrenceCount !== undefined) entity.recurrenceCount = recurrenceCount
    result.entity = entity
  }

  // If an add/set intent produced no entity, treat as unknown.
  if (intent !== "query" && intent !== "unknown" && !result.entity) {
    result.intent = "unknown"
  }

  return result
}

// ── English regex fallback (no LLM configured) ────────────────────────────
const AMOUNT_RE = /(?:₹|rs\.?|inr|rupees?)?\s*(\d[\d,.]*)\s*(k|thousand|lakh|lac|cr|crore)?/i

function parseAmountWord(word: string): number {
  const n = Number(word.replaceAll(/[\s,₹]/g, ""))
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function extractAmount(text: string): number | undefined {
  const m = text.match(AMOUNT_RE)
  if (!m) return undefined
  let n = parseAmountWord(m[1])
  const unit = (m[2] || "").toLowerCase()
  if (unit.startsWith("k")) n *= 1000
  else if (unit.startsWith("thousand")) n *= 1000
  else if (unit.startsWith("lakh") || unit.startsWith("lac")) n *= 100000
  else if (unit.startsWith("cr") || unit.startsWith("crore")) n *= 10000000
  return n > 0 ? Math.round(n * 100) / 100 : undefined
}

function toDate(s: string): string {
  const d = new Date()
  if (s === "yesterday") d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}

export function detectVoiceIntentRegex(text: string, language: string, page?: string): VoiceResult {
  const lower = String(text || "").toLowerCase()
  const amount = extractAmount(lower)

  const isBudget = /budget|limit|set\s+\d.*\bfor\b|allocate/.test(lower)
  const isExpense = /spent|spend|paid|bought|purchase|purchased|debit|expense|bill|fee|cost|for\s+\w+\s+at\b/.test(lower)
  const isIncome = /received|got|credited|income|salary|interest|refund|bonus/.test(lower)
  const isQuestion = /how much|what|how|tell|show|summary|status|total|my|analyse|analyze|compare/.test(lower)

  let intent: VoiceIntent = "unknown"
  if (isBudget && amount) intent = "set_budget"
  else if (isIncome && amount) intent = "add_income"
  else if (isExpense && amount) intent = "add_expense"
  else if (isQuestion) intent = "query"

  const result: VoiceResult = { intent, confidence: intent === "unknown" ? "low" : "medium", language, page, source: "regex" }

  if (intent === "query") {
    result.answer = "I can help with that, but a full answer needs the AI assistant connected. Add an LLM API key in Settings → API Keys, or check the Dashboard, Budgets, Goals, and Reports pages for this information."
    return result
  }

  if (amount) {
    const entity: VoiceEntity = { amount }
    switch (intent) {
    case "add_expense": {
      entity.type = "expense"
      entity.paymentMode = /upi/.test(lower) ? "UPI" : /cash/.test(lower) ? "Cash" : /card/.test(lower) ? "Card" : undefined
      // Extract the vendor from the ORIGINAL text (preserve case), then trim
      // trailing temporal/stop words that the greedy match may have grabbed.
      const vendorMatch = text.match(/(?:at|from)\s+([a-z][\d a-z]{1,40})/i)
      if (vendorMatch) {
        const v = vendorMatch[1].replace(/\s+(today|yesterday|tomorrow|this|last|next|on|via|using|with|for|and|in)\b.*$/i, "").trim()
        if (v) entity.vendor = v
      }
      if (/today/.test(lower)) entity.date = toDate("today")
      else if (/yesterday/.test(lower)) entity.date = toDate("yesterday")
      if (/every month|monthly|recurring/.test(lower)) entity.recurring = true
    
    break;
    }
    case "add_income": {
      entity.type = "income"
      entity.incomeType = /monthly/.test(lower) ? "monthly" : /yearly|annual/.test(lower) ? "yearly" : "onetime"
    
    break;
    }
    case "set_budget": {
      entity.type = "budget"
      const catMatch = lower.match(/(?:for|budget for)\s+([a-z][\d a-z]{1,40})/i)
      if (catMatch) entity.category = catMatch[1].trim()
    
    break;
    }
    // No default
    }
    result.entity = entity
  }

  return result
}