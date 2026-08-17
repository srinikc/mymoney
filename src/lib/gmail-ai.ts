import { queryLLM } from "./llm"
import type { ParsedEmail } from "./gmail"

export interface AiEmailResult {
  index: number
  isFinancial: boolean
  type?: string
  amount?: number
  date?: string
  vendor?: string
  category?: string
  description?: string
  source?: string
  reason?: string
}

const AI_BATCH = 25 // emails read per LLM call

function truncate(s: string, n: number): string {
  const clean = String(s || "").replaceAll(/\s+/g, " ").trim()
  return clean.length > n ? clean.slice(0, n) : clean
}

function stripHtml(html: string): string {
  return String(html || "").replaceAll(/<[^>]*>/g, " ")
}

function buildPrompt(emails: ParsedEmail[]): string {
  const lines = emails.map((e, i) => {
    const body = truncate(stripHtml(e.bodyHtml) || e.bodyText || "", 1000)
    return `${i}. FROM: ${e.from}\nSUBJECT: ${e.subject}\nBODY: ${body}\n`
  })
  return [
    "You are classifying emails for a personal finance app used by Indian users. Your job is to identify ONLY emails that represent a REAL financial transaction that actually happened.",
    "",
    "A real transaction email MUST contain clear evidence of money moving, such as: 'debited', 'credited', 'paid', 'received', 'transferred', 'spent', 'withdrawn', 'deposited', 'auto-debit', 'EMI paid', 'premium paid', 'renewal' of a service you pay for, 'invoice', 'bill', 'receipt', 'tax invoice', 'order confirmed' WITH a concrete amount you paid, or an investment purchase/sale.",
    "",
    "Do NOT classify these as financial (set isFinancial=false):",
    "- Promotional, offer, or marketing emails EVEN IF they mention money: 'waiting for', 'lifetime free', 'grow your savings', 'high-yield FD', 'fuel your dreams', 'exclusive offer', 'special offer', 'pre-approved', 'check eligibility', 'apply now', 'get started', 'introductory rate', 'earn rewards', 'cashback up to', 'off', 'sale', 'flash sale', 'Diwali offers', 'upgrade your', 'credit card waiting', 'card is on the way', 'welcome to', 'thanks for signing up', 'verify your email'.",
    "- Emails that only mention interest rates, APY, gold/silver prices, NAV, or market updates.",
    "- OTP, security alerts, fraud alerts, 2FA, password reset, login notifications.",
    "- Newsletters, job alerts, social media updates, delivery tracking updates (unless a purchase order with amount).",
    "",
    "Rules:",
    "- ONLY mark financial when there is a clear amount the user paid or received AND a transaction verb AND a date. A mere mention of '₹200 off' or '3% interest' is NOT a transaction.",
    "- For tax: only Form 16, ITR, 26AS, AIS, or advance tax receipts count as tax_document (amount can be 0).",
    "- Be conservative: when in doubt, set isFinancial=false.",
    "",
    `Return ONLY a JSON array with ${emails.length} objects, one per email, in the same order.`,
    'Each object: {"index":<email number>,"isFinancial":true|false,"type":"expense|income|salary|insurance|subscription|investment|tax_document|asset or null","amount":<number or null>,"date":"YYYY-MM-DD or null","vendor":"merchant/company or null","category":"category label or null","source":"upi|bank|purchase|salary|insurance|subscription|investment|asset|tax or null","description":"short summary","reason":"why financial or not"}',
    "If isFinancial=false, set type and amount to null.",
    "",
    ...lines,
  ].join("\n")
}

function parseAiResponse(text: string): AiEmailResult[] | null {
  const start = text.indexOf("[")
  const end = text.lastIndexOf("]")
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const arr = JSON.parse(text.slice(start, end + 1))
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

function toNumber(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

// Classifies a batch of parsed emails in ONE LLM call. Returns an array aligned
// with `emails`; a null slot means the LLM gave no usable answer for that email
// (caller should fall back to the keyword parser).
export async function classifyEmailsWithAI(
  emails: ParsedEmail[],
  userId: number,
): Promise<(AiEmailResult | null)[]> {
  const results: (AiEmailResult | null)[] = Array.from({ length: emails.length }, () => null)
  if (emails.length === 0) return results

  for (let i = 0; i < emails.length; i += AI_BATCH) {
    const slice = emails.slice(i, i + AI_BATCH)
    try {
      const raw = await queryLLM(buildPrompt(slice), userId)
      const parsed = parseAiResponse(raw)
      if (!parsed) continue
      for (const r of parsed) {
        const idx = Number(r?.index)
        if (r && Number.isInteger(idx) && idx >= 0 && idx < slice.length) {
          const globalIdx = i + idx
          results[globalIdx] = {
            ...r,
            amount: toNumber(r.amount),
          }
        }
      }
    } catch {
      // leave null — caller falls back to keyword parser
    }
  }
  return results
}
