import type { ParsedEmail } from "./gmail"

export interface ParserKeywords {
  purchase?: string[]
  gold?: string[]
  silver?: string[]
  upi?: string[]
  bank?: string[]
  salary?: string[]
  mutualFund?: string[]
  insurance?: string[]
  subscription?: string[]
  tax?: string[]
  trade?: string[]
}

export const DEFAULT_KEYWORDS: ParserKeywords = {
  purchase: ["order", "placed", "shipped", "delivered", "purchase", "receipt", "invoice", "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq"],
  gold: ["gold", "24k", "22k", "916", "sovereign gold", "gold coin", "gold bar", "tanishq", "mmtc", "pamp", "caratlane", "gold loan", "digital gold"],
  silver: ["silver", "silver coin", "silver bar", "silver biscuit", "999 silver"],
  upi: ["upi", "paid", "payment", "debited", "transaction"],
  bank: ["debited", "credited", "transaction", "withdrawal", "deposit", "trf", "imps", "neft", "rtgs"],
  salary: ["salary", "payslip", "payroll", "wage", "salary credit"],
  mutualFund: ["mutual fund", "folio", "nav", "sip", "redemption", "dividend", "cams", "kfintech"],
  insurance: ["insurance", "premium", "policy", "renewal", "cover"],
  subscription: ["subscription", "renewal", "billed", "monthly", "annual"],
  tax: ["form 16", "itr", "income tax", "tax return", "26as", "ais", "tax credit"],
  trade: ["bought", "sold", "trade", "order", "executed", "zerodha", "groww", "upstox"],
}

export interface ParsedTransaction {
  type: "expense" | "income" | "investment" | "insurance" | "subscription" | "tax_document" | "salary" | "asset"
  date: Date
  amount: number
  description: string
  vendor?: string
  category?: string
  balance?: number          // extracted from "Available Balance" in bank alerts
  accountNumber?: string    // extracted from "A/c XX1234" in bank alerts
  metadata?: Record<string, any>
}

function extractAmount(text: string): number | null {
  const patterns = [
    /(?:Rs|₹|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Rs|₹|INR)/i,
    /(?:amount|total|sum|value|paid|credited|debited)\s*(?:is|:)?\s*(?:Rs|₹|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return Number.parseFloat(m[1].replace(/,/g, ""))
  }
  return null
}

function contains(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((k) => lower.includes(k.toLowerCase()))
}

export function parseUPIPayment(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.upi || DEFAULT_KEYWORDS.upi!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const vendorMatch = text.match(/paid\s+(?:Rs|₹|INR)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s*(?:to|at|for)?\s*([A-Za-z0-9\s]+?)(?:\s+(?:using|via|on|from|.|$))/i)
  const vendor = vendorMatch?.[1]?.trim() || email.from

  return { type: "expense", date: email.date, amount, description: email.subject || `UPI payment to ${vendor}`, vendor, category: "Other" }
}

function extractBalance(text: string): number | null {
  const patterns = [
    /(?:available|avl|closing)\s*(?:balance|bal)\s*(?:is|:)?\s*(?:rs|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /balance\s*(?:is|:)?\s*(?:rs|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return Number.parseFloat(m[1].replace(/,/g, ""))
  }
  return null
}

function extractAccountNumber(text: string): string | null {
  const patterns = [
    /(?:a\/c|account|ac)\s*(?:no|#|:)?\s*(x?[0-9]{4,})/i,
    /(?:x+)([0-9]{4})\b/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1]
  }
  return null
}

export function parseBankTransaction(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.bank || DEFAULT_KEYWORDS.bank!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const isCredit = contains(text, ["credited", "deposit", "cr"])
  const vendorMatch = text.match(/(?:to|from|at|for)\s*([A-Za-z0-9\s\-]+?)(?:\s+(?:on|ref|by|via|.|$))/i)
  const vendor = vendorMatch?.[1]?.trim() || email.from

  return {
    type: isCredit ? "income" : "expense",
    date: email.date,
    amount,
    description: email.subject || `Bank ${isCredit ? "credit" : "debit"}`,
    vendor,
    category: isCredit ? "Income" : "Other",
    balance: extractBalance(text) ?? undefined,
    accountNumber: extractAccountNumber(text) ?? undefined,
  }
}

export function parseSalaryEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = (email.bodyText || "") + " " + email.subject
  if (!contains(text, kw?.salary || DEFAULT_KEYWORDS.salary!)) return null

  const amount = extractAmount(text) || extractAmount(email.subject)
  if (!amount) return null

  return { type: "salary", date: email.date, amount, description: email.subject || "Salary credit", vendor: email.from.split("<")[0]?.trim() || email.from, category: "Salary", metadata: { source: "email", employer: email.from } }
}

export function parseMutualFundEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.mutualFund || DEFAULT_KEYWORDS.mutualFund!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const isPurchase = contains(text, ["purchase", "sip", "investment", "additional purchase"])
  const isDividend = contains(text, ["dividend", "income distribution"])

  return { type: "investment", date: email.date, amount, description: email.subject || "Mutual fund transaction", vendor: email.from, category: isDividend ? "Dividend" : "Investment", metadata: { investmentType: "mutual_fund", action: isPurchase ? "buy" : isDividend ? "dividend" : "other" } }
}

export function parseInsuranceEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.insurance || DEFAULT_KEYWORDS.insurance!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  return { type: "insurance", date: email.date, amount, description: email.subject || "Insurance premium", vendor: email.from, category: "Insurance", metadata: { source: "email" } }
}

export function parseSubscriptionEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.subscription || DEFAULT_KEYWORDS.subscription!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const vendorMatch = text.match(/(?:your|the)\s*([A-Za-z0-9\s]+?)\s*(?:subscription|renewal|plan|membership)/i)
  const vendor = vendorMatch?.[1]?.trim() || email.from

  return { type: "subscription", date: email.date, amount, description: email.subject || "Subscription payment", vendor, category: "Subscriptions", metadata: { source: "email" } }
}

export function parseTaxEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.tax || DEFAULT_KEYWORDS.tax!)) return null

  return { type: "tax_document", date: email.date, amount: 0, description: email.subject || "Tax document", vendor: email.from, category: "Tax", metadata: { source: "email", attachments: email.attachments.map((a) => a.filename) } }
}

export function parseTradeEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.trade || DEFAULT_KEYWORDS.trade!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const isBuy = contains(text, ["bought", "buy", "purchased"])
  const symbolMatch = text.match(/(?:bought|sold|of)\s*([0-9]+)\s*(?:shares?|units?|qty)\s*(?:of|:)?\s*([A-Za-z0-9]+)/i)

  return { type: "investment", date: email.date, amount, description: email.subject || (isBuy ? "Stock purchase" : "Stock sale"), vendor: email.from, category: "Investment", metadata: { investmentType: "stocks", action: isBuy ? "buy" : "sell", symbol: symbolMatch?.[2] || null, quantity: symbolMatch ? Number.parseInt(symbolMatch[1]) : null } }
}

export function parsePurchaseEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.purchase || DEFAULT_KEYWORDS.purchase!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const vendorMatch = text.match(/(?:from|at|by|store|seller)\s*([A-Za-z0-9\s&]+?)(?:\s*(?:for|on|using|via|order|invoice|.|$))/i)
  const vendor = vendorMatch?.[1]?.trim() || email.from

  return { type: "expense", date: email.date, amount, description: email.subject || `Purchase at ${vendor}`, vendor, category: "Shopping", metadata: { source: "email", purchaseType: "goods" } }
}

export function parseGoldEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.gold || DEFAULT_KEYWORDS.gold!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  return { type: "asset", date: email.date, amount, description: email.subject || "Gold purchase", vendor: email.from, category: "Gold", metadata: { assetType: "gold", source: "email" } }
}

export function parseSilverEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.silver || DEFAULT_KEYWORDS.silver!)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  return { type: "asset", date: email.date, amount, description: email.subject || "Silver purchase", vendor: email.from, category: "Silver", metadata: { assetType: "silver", source: "email" } }
}

export function parseEmail(email: ParsedEmail, customKeywords?: ParserKeywords): ParsedTransaction | null {
  const kw = customKeywords || DEFAULT_KEYWORDS
  const parsers = [
    parseSalaryEmail, parseUPIPayment, parseBankTransaction,
    parsePurchaseEmail, parseGoldEmail, parseSilverEmail,
    parseMutualFundEmail, parseTradeEmail,
    parseInsuranceEmail, parseSubscriptionEmail, parseTaxEmail,
  ]
  for (const parser of parsers) {
    const result = parser(email, kw)
    if (result) return result
  }
  return null
}
