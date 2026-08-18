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
  purchase: ["order", "placed", "shipped", "delivered", "purchase", "receipt", "invoice", "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq", "swiggy", "zomato", "blinkit", "bigbasket", "dmart", "jiomart", "reliance", "amazonpay", "shop", "store", "retail", "e-receipt", "gst invoice", "order confirmed", "your order", "payment received", "thank you for your order", "placed on", "your receipt"],
  gold: ["gold", "24k", "22k", "916", "sovereign gold", "gold coin", "gold bar", "tanishq", "mmtc", "pamp", "caratlane", "gold loan", "digital gold", "gold price", "18k", "14k", "jewellery", "jewelry"],
  silver: ["silver", "silver coin", "silver bar", "silver biscuit", "999 silver", "925", "sterling silver", "silver price"],
  upi: ["upi", "paid", "payment", "debited", "ref", "gpay", "google pay", "phonepe", "paytm", "bhimp", "trxn", "txn id", "transaction id", "ref no", "money sent", "money received", "paid to", "received from", "bank transfer", "bhim"],
  bank: ["debited", "credited", "withdrawal", "deposit", "trf", "imps", "neft", "rtgs", "available balance", "a/c debited", "a/c credited", "withdrawn", "deposited", "transferred", "transfer", "balance", "avail bal", "bank alert", "account statement", "mini statement", "salary credited", "cash deposit", "cheque", "pos", "card swipe", "auto debit"],
  salary: ["salary", "payslip", "payroll", "wage", "salary credit", "hra", "ctc", "stipend", "salary credited", "salary paid", "payslip for"],
  mutualFund: ["mutual fund", "folio", "nav", "sip", "redemption", "dividend", "cams", "kfintech", "mfcentral", "switch", "lumpsum", "folio number", "mutual fund statement", "nav statement"],
  insurance: ["insurance", "premium", "policy", "renewal", "policy renewal", "premium paid", "sum assured", "claim", "maturity", "insurer", "policyholder", "insurance premium", "policy document"],
  subscription: ["subscription", "renewal", "billed", "monthly", "annual", "membership", "plan", "auto-renew", "recurring", "billing", "bill", "due", "payment", "charged", "auto renewal"],
  tax: ["form 16", "itr", "income tax", "tax return", "26as", "ais", "tax credit", "advance tax", "tds", "gst", "tax invoice", "salary certificate", "15g", "15h", "capital gains", "income tax statement", "investment declaration"],
  trade: ["bought", "sold", "trade", "order", "executed", "zerodha", "groww", "upstox", "shares", "equity", "nse", "bse", "dp", "holdings", "broker", "dematerialized", "stock", "contract note"],
}

const NOISE_SENDERS = [
  "indeed.com",
  "linkedin.com",
  "naukri.com",
  "glassdoor.com",
  "monster.com",
  "timesjobs.com",
  "shine.com",
  "foundit.in",
  "topcv.com",
  "careers360.com",
  "greatlearning",
  "coursera.org",
  "udemy.com",
  "upgrad.com",
  "newsletter",
  "no-reply@facebook",
  "facebookmail.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "googleplay",
]

function isNoiseEmail(email: ParsedEmail): boolean {
  const from = email.from.toLowerCase()
  return NOISE_SENDERS.some((d) => from.includes(d))
}

// Phrases that indicate a promotional/news/update email rather than a real
// transaction. Bank "news", "updates", "offers" and similar get matched by
// keyword searches but must NOT become expenses.
const MARKETING_NOISE = [
  "newsletter",
  "subscribe",
  "unsubscribe",
  "view this email",
  "view in browser",
  "you are receiving this email",
  "you're receiving this",
  "offers",
  "exclusive offer",
  "special offer",
  "promotional",
  "marketing",
  "festive offer",
  "new feature",
  "new product",
  "we are excited",
  "we're excited",
  "introducing",
  "important update",
  "service update",
  "system maintenance",
  "scheduled maintenance",
  "fraud awareness",
  "tips to protect",
  "never share your",
  "secure your account",
  "update your kyc",
  "kyc update",
  "account upgrade",
  "upgrade your",
  "new look",
  "recently launched",
  "read our blog",
  "follow us on",
  "connect with us",
  "happy new year",
  "diwali offers",
]

function isMarketingNoise(email: ParsedEmail): boolean {
  const text = (email.bodyText || "").toLowerCase() + " " + (email.subject || "").toLowerCase()
  return MARKETING_NOISE.some((p) => text.includes(p))
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
  source?: "upi" | "bank" | "purchase" | "salary" | "insurance" | "subscription" | "investment" | "asset" | "tax"
  metadata?: Record<string, unknown>
}

function extractAmount(text: string): number | null {
  const patterns = [
    /(?:rs|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs|₹|inr)/i,
    /(?:amount|total|sum|value|paid|credited|debited)\s*(?:is|:)?\s*(?:rs|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return Number.parseFloat(m[1].replaceAll(',', ""))
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

  // Real UPI alerts contain a transaction id/ref or "via UPI"/"using UPI"
  const isUpiAlert = /\bupi\b|ref\s*[#:]|transaction\s*(?:id|ref)\s*[#:]|trxn\b|upto|paytm|phonepe|google\s*pay|gpay|bhimp/i.test(text)
  if (!isUpiAlert) return null

  const amount = extractAmount(text)
  if (!amount) return null

  // Money received (credit/refund) is NOT an expense — it's income
  const isCredit = contains(text, ["received", "credited", "credited to", "refund", "money added", "added to", "received from", "paid into"])
  if (isCredit) {
    return { type: "income", date: email.date, amount, description: email.subject || `UPI credit`, vendor: email.from, category: "Income", source: "upi", metadata: { source: "email", upi: true } }
  }

  const vendorMatch = text.match(/paid\s+(?:rs|₹|inr)?\s*[\d,]+(?:\.\d{1,2})?\s*(?:to|at|for)?\s*([\d\sa-z]+?)\s+(?:using|via|on|from|.|$)/i)
  const vendor = vendorMatch?.[1]?.trim() || email.from

  return { type: "expense", date: email.date, amount, description: email.subject || `UPI payment to ${vendor}`, vendor, category: "Other", source: "upi", metadata: { source: "email", upi: true } }
}

function extractBalance(text: string): number | null {
  const patterns = [
    /(?:available|avl|closing)\s*(?:balance|bal)\s*(?:is|:)?\s*(?:rs|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /balance\s*(?:is|:)?\s*(?:rs|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return Number.parseFloat(m[1].replaceAll(',', ""))
  }
  return null
}

function extractAccountNumber(text: string): string | null {
  const patterns = [
    /(?:a\/c|account|ac)\s*(?:no|#|:)?\s*(x?\d{4,})/i,
    /x+(\d{4})\b/i,
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

  // Real bank transaction alerts have an account number and/or available
  // balance, plus a debit/credit verb. Pure news/update emails don't.
  const hasVerb = contains(text, ["debited", "credited", "withdrawn", "deposited", "trf", "imps", "neft", "rtgs"])
  const hasAccountOrBalance = Boolean(extractAccountNumber(text)) || Boolean(extractBalance(text))
  if (!hasVerb || !hasAccountOrBalance) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const isCredit = contains(text, ["credited", "deposited", "cr"])
  const vendorMatch = text.match(/(?:to|from|at|for)\s*([\d\sa-z-]+?)\s+(?:on|ref|by|via|.|$)/i)
  const vendor = vendorMatch?.[1]?.trim() || email.from

  return {
    type: isCredit ? "income" : "expense",
    date: email.date,
    amount,
    description: email.subject || `Bank ${isCredit ? "credit" : "debit"}`,
    vendor,
    category: isCredit ? "Income" : "Other",
    source: "bank",
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

  const insurerLike = contains(text, ["premium", "policy", "renewal", "sum assured", "insurance cover"])
    && !contains(text, ["cover letter", "cover story", "job", "career", "vacancy"])
  if (!insurerLike && !/insurance|premium/i.test(email.subject)) return null

  return { type: "insurance", date: email.date, amount, description: email.subject || "Insurance premium", vendor: email.from, category: "Insurance", metadata: { source: "email" } }
}

export function parseSubscriptionEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.subscription || DEFAULT_KEYWORDS.subscription!)) return null

  // A real subscription email names the plan/service; generic "renewal/billed"
  // on its own is too loose and catches bank/news mail.
  const namesService = /(?:your|the)\s+([\d\sa-z]+?)\s*(?:subscription|renewal|plan|membership)|(?:netflix|amazon\s*prime|spotify|youtube\s*premium|hotstar|disney|hbo|audible|linkedin|figma|canva|notion|adobe|microsoft\s*365|office|apple\s*(?:one|music|tv)|google\s*one|dropbox|zoom)/i.test(text)
  if (!namesService) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const vendorMatch = text.match(/(?:your|the)\s*([\d\sa-z]+?)\s*(?:subscription|renewal|plan|membership)/i)
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
  const symbolMatch = text.match(/(?:bought|sold|of)\s*(\d+)\s*(?:shares?|units?|qty)\s*(?:of|:)?\s*([\da-z]+)/i)

  return { type: "investment", date: email.date, amount, description: email.subject || (isBuy ? "Stock purchase" : "Stock sale"), vendor: email.from, category: "Investment", metadata: { investmentType: "stocks", action: isBuy ? "buy" : "sell", symbol: symbolMatch?.[2] || null, quantity: symbolMatch ? Number.parseInt(symbolMatch[1]) : null } }
}

export function parsePurchaseEmail(email: ParsedEmail, kw?: ParserKeywords): ParsedTransaction | null {
  const text = email.bodyText || email.subject
  if (!contains(text, kw?.purchase || DEFAULT_KEYWORDS.purchase!)) return null

  // Real purchase confirmations come from a store/brand and/or mention
  // order/invoice numbers. Generic "invoice"/"receipt" in news is filtered out.
  const senderLooksLikeShop = /amazon|flipkart|myntra|ajio|meesho|nykaa|tatacliq|swiggy|zomato|blinkit|dmart|bigbasket|jiomart|reliance|snapdeal|paytm|phonepe|uber|ola|irctc|makemytrip|goibibo|yatra|amazonpay|shop|store|mart|retail/i.test(email.from)
  const hasOrderContext = /order\s*(?:no|#|id|number)?\s*[#:]?\s*[\w-]+|invoice\s*(?:no|#|id)?\s*[#:]?\s*[\w-]+|receipt\s*(?:no|#|id)?\s*[#:]?\s*[\w-]+/i.test(text)
  const hasPurchaseVerb = contains(text, ["you ordered", "order placed", "order confirmed", "order summary", "thank you for your order", "your order", "purchase confirmed", "order details", "placed on", "your receipt", "payment received"])
  if (!senderLooksLikeShop && !hasOrderContext && !hasPurchaseVerb) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const vendorMatch = text.match(/(?:from|at|by|store|seller)\s*([\d\s&a-z]+?)\s*(?:for|on|using|via|order|invoice|.|$)/i)
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
  if (isNoiseEmail(email)) return null
  if (isMarketingNoise(email)) return null
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
