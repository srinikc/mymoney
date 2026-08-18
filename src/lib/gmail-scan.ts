import type { ParserKeywords } from "./gmail-parser"
import type { PrismaClient } from "@prisma/client"

// Stored in the GmailScan.transactions JSON column (JSON-safe: date is a string)
export interface ScanTransaction {
  type: string
  date: string
  amount: number
  description: string
  vendor?: string
  category?: string
  messageId: string
  emailSubject?: string
  emailSnippet?: string
  emailFrom?: string
  alreadyExists?: boolean
  source?: "upi" | "bank" | "purchase" | "salary" | "insurance" | "subscription" | "investment" | "asset" | "tax"
}

// Same-day comparison for date fields
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Loads all existing records for the profile once so we can match against
// them in-memory for thousands of scan results (avoids a query per row).
export interface ExistingData {
  expenses: { date: Date; amount: number; vendor: string | null }[]
  incomeSources: { name: string; amount: number; startDate: Date | null }[]
  insurances: { provider: string | null; premium: number }[]
  subscriptions: { provider: string | null; amount: number }[]
  investments: { name: string; amount: number; purchaseDate: Date | null }[]
  assets: { name: string; currentValue: number; purchaseDate: Date | null }[]
  taxDocuments: { label: string | null }[]
}

export async function loadExistingData(prisma: PrismaClient, profileId: number): Promise<ExistingData> {
  const where = { profileId }
  const [expenses, incomeSources, insurances, subscriptions, investments, assets, taxDocuments] =
    await Promise.all([
      prisma.expense.findMany({ where, select: { date: true, amount: true, vendor: true } }),
      prisma.incomeSource.findMany({ where, select: { name: true, amount: true, startDate: true } }),
      prisma.insurance.findMany({ where, select: { provider: true, premium: true } }),
      prisma.subscription.findMany({ where, select: { provider: true, amount: true } }),
      prisma.investment.findMany({ where, select: { name: true, amount: true, purchaseDate: true } }),
      prisma.asset.findMany({ where, select: { name: true, currentValue: true, purchaseDate: true } }),
      prisma.taxDocument.findMany({ where, select: { label: true } }),
    ])
  return { expenses, incomeSources, insurances, subscriptions, investments, assets, taxDocuments }
}

// In-memory check for whether a parsed transaction already exists in the app
export function alreadyInAppData(
  data: ExistingData,
  t: Pick<ScanTransaction, "type" | "date" | "amount" | "vendor" | "description" | "category">,
): boolean {
  const date = new Date(t.date)
  const amount = t.amount
  const vendor = (t.vendor || "").toLowerCase()

  const vendorMatches = (stored: string | null | undefined): boolean => {
    if (!vendor || !stored) return false
    const s = stored.toLowerCase()
    return s.includes(vendor) || vendor.includes(s)
  }

  switch (t.type) {
    case "expense":
      return data.expenses.some((e) => e.amount === amount && sameDay(e.date, date) && vendorMatches(e.vendor))
    case "income":
    case "salary":
      return data.incomeSources.some(
        (s) => Math.abs(s.amount - amount) < 0.01 && (!vendor || (s.name || "").toLowerCase().includes(vendor)),
      )
    case "insurance":
      return data.insurances.some((s) => Math.abs(s.premium - amount) < 0.01 && vendorMatches(s.provider))
    case "subscription":
      return data.subscriptions.some((s) => Math.abs(s.amount - amount) < 0.01 && vendorMatches(s.provider))
    case "investment":
      return data.investments.some(
        (s) => Math.abs(s.amount - amount) < 0.01 && s.purchaseDate && sameDay(s.purchaseDate, date) && (!vendor || (s.name || "").toLowerCase().includes(vendor)),
      )
    case "asset":
      return data.assets.some(
        (s) => Math.abs(s.currentValue - amount) < 0.01 && s.purchaseDate && sameDay(s.purchaseDate, date) && (!vendor || (s.name || "").toLowerCase().includes(vendor)),
      )
    case "tax_document":
      return data.taxDocuments.some((s) => s.label && (t.description || "").toLowerCase().includes(s.label.toLowerCase()))
    default:
      return false
  }
}

const BATCH_SIZE = 25

export interface ScanOptions {
  // "since-last" (default) scans emails from the previous scan's start until
  // now; "3m" | "6m" | "1y" | "18m" | "all" scan fixed windows; "custom" uses
  // the from/to dates (YYYY-MM-DD).
  range?: "since-last" | "3m" | "6m" | "1y" | "18m" | "all" | "custom"
  from?: string
  to?: string
}

// Runs a background Gmail scan for a given scan id. Updates the GmailScan
// row after every batch so clients polling /api/gmail/scan/status see
// incremental progress. Handles already-imported message ids (diff scan).
export async function runGmailScan(scanId: number, userId: number, profileId: number, options?: ScanOptions): Promise<void> {
  const { prisma } = await import("@/lib/prisma")
  try {
    const { getAccessToken, listAllMessages, getMessage, parseMessage } = await import("@/lib/gmail")
    const { parseEmail, DEFAULT_KEYWORDS } = await import("@/lib/gmail-parser")
    const accessToken = await getAccessToken(userId)

    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: userId, key: "gmail_parser_keywords" } },
      select: { value: true },
    })
    const kw = (setting?.value || DEFAULT_KEYWORDS) as ParserKeywords

    // Load existing app data once so we can flag already-present transactions
    const existing = await loadExistingData(prisma, profileId)

    // Compute the scan window from the selected range. Default: "since-last"
    // (the previous scan's start until now). If there was no previous scan,
    // fall back to the last 18 months.
    const now = new Date()
    const lastScan = await prisma.gmailScan.findFirst({
      where: { userId, status: { in: ["done", "error"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    const range = options?.range || "since-last"

    let afterDate: Date
    if (range === "since-last") {
      // Back-date by a few days so emails that arrived just before the last
      // scan finished are not missed; diff logic still skips the ones already
      // recorded in gmailImportLog.
      const last = lastScan?.createdAt ? new Date(lastScan.createdAt) : null
      afterDate = last
        ? new Date(last.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getFullYear(), now.getMonth() - 18, 1)
    } else if (range === "all") {
      afterDate = new Date(2000, 0, 1)
    } else if (range === "custom" && options?.from) {
      afterDate = new Date(options.from)
    } else {
      const months: Record<string, number> = { "3m": 3, "6m": 6, "1y": 12, "18m": 18 }
      afterDate = new Date(now.getFullYear(), now.getMonth() - (months[range] || 18), 1)
    }
    const beforeDate = range === "custom" && options?.to ? new Date(options.to) : null

    const after = `after:${afterDate.toISOString().slice(0, 10)}`
    const before = beforeDate ? ` before:${beforeDate.toISOString().slice(0, 10)}` : ""

    // Scan ALL emails in the window (date-only query). The AI + keyword parser
    // decide which are real financial transactions, so nothing is missed.
    const queries = [`${after}${before}`]

    // 1. Collect all candidate message ids
    const allMessages = new Map<string, unknown>()
    for (const query of queries) {
      const msgs = await listAllMessages(accessToken, query, 5000)
      for (const m of msgs) {
        if (!allMessages.has(m.id)) allMessages.set(m.id, m)
      }
    }
    const allIds = [...allMessages.keys()]
    const total = allIds.length

    // 2. Diff scan: skip already-imported messages
    const importedLogs = await prisma.gmailImportLog.findMany({
      where: { userId },
      select: { messageId: true },
    })
    const alreadyImported = new Set(importedLogs.map((l) => l.messageId))
    const pendingIds = allIds.filter((id) => !alreadyImported.has(id))
    const alreadyCount = total - pendingIds.length

    await prisma.gmailScan.update({
      where: { id: scanId },
      data: { totalEmails: total, alreadyImported: alreadyCount },
    })

    // 3. Process in batches, updating progress after each batch
    const transactions: ScanTransaction[] = []
    let processed = 0
    const journal: Record<string, { matched: number; alreadyExists: number; imported: number }> = {}

    const bumpJournal = (type: string, field: "matched" | "alreadyExists" | "imported") => {
      if (!journal[type]) journal[type] = { matched: 0, alreadyExists: 0, imported: 0 }
      journal[type][field]++
    }

    for (let i = 0; i < pendingIds.length; i += BATCH_SIZE) {
      const batch = pendingIds.slice(i, i + BATCH_SIZE)
      // Fetch + keyword-parse each message (keyword result is the fallback).
      const fetched = await Promise.all(
        batch.map(async (id) => {
          try {
            const raw = await getMessage(accessToken, id)
            const parsed = parseMessage(raw)
            const kwResult = parseEmail(parsed, kw)
            return { id, raw, parsed, kwResult }
          } catch {
            return null
          }
        }),
      )
      const valid = fetched.filter((f): f is NonNullable<typeof f> => f !== null)

      // AI-classify the whole batch in one LLM call, using full email bodies.
      let aiResults: (import("./gmail-ai").AiEmailResult | null)[] = []
      try {
        const { classifyEmailsWithAI } = await import("./gmail-ai")
        aiResults = await classifyEmailsWithAI(
          valid.map((v) => v.parsed),
          userId,
        )
      } catch {
        aiResults = []
      }

      const results = valid.map((v, idx): ScanTransaction | null => {
        const ai = aiResults[idx] ?? null
        // AI decides: financial → use AI fields; not financial → skip. If AI
        // gave no answer, fall back to the keyword parser.
        if (ai && !ai.isFinancial) return null
        const kwResult = v.kwResult
        const base = ai && ai.isFinancial
          ? {
              type: ai.type || kwResult?.type || "expense",
              amount: ai.amount ?? kwResult?.amount ?? 0,
              description: ai.description || kwResult?.description || v.parsed.subject || "Transaction",
              vendor: ai.vendor || kwResult?.vendor || v.parsed.from,
              category: ai.category || kwResult?.category,
              source: (ai.source || kwResult?.source) as ScanTransaction["source"],
            }
          : kwResult
        if (!base) return null
        const tx: ScanTransaction = {
          type: base.type,
          date: (ai?.date ? new Date(ai.date) : kwResult?.date ?? v.parsed.date).toISOString(),
          amount: base.amount,
          description: base.description,
          vendor: base.vendor,
          category: base.category,
          messageId: v.id,
          emailSubject: v.parsed.subject,
          emailSnippet: v.raw.snippet,
          emailFrom: v.parsed.from,
          source: base.source,
        }
        tx.alreadyExists = alreadyInAppData(existing, tx)
        return tx
      })
      for (const r of results) {
        if (!r) continue
        transactions.push(r)
        bumpJournal(r.type, r.alreadyExists ? "alreadyExists" : "matched")
      }

      processed += batch.length
      await prisma.gmailScan.update({
        where: { id: scanId },
        data: {
          processed,
          parsed: transactions.length,
          transactions: transactions as object,
          journal: journal as object,
        },
      })
    }

    await prisma.gmailScan.update({
      where: { id: scanId },
      data: { status: "done", processed, parsed: transactions.length, journal: journal as object },
    })
  } catch (error) {
    console.error("Gmail background scan error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    await prisma.gmailScan.update({
      where: { id: scanId },
      data: { status: "error", error: message },
    }).catch(() => {})
  }
}