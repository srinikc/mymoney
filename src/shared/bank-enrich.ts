import type { BankCsvRow } from "@/shared/bank-csv-parser"
import { normalizeDate, amountMatch } from "@/shared/bank-statement"
import { parseBankDesc, buildDescription } from "@/shared/bank-desc-parser"

export interface BankEnrichExpense {
  id: number
  date: Date
  amount: number
  vendor: string | null
  description: string | null
  bankAccount: string | null
}

export type EnrichReason = "context_appended" | "merchant_only" | "self_transfer" | "no" | "none"

export interface EnrichSuggestion {
  expenseId: number
  reason: EnrichReason
  currentDescription: string | null
  merchant: string
  context: string
  proposedDescription: string | null // null => no change
  bank: string
  bankDate: string
  bankNarration: string
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function toIso(raw: string): string | null {
  return normalizeDate(raw)
}

function makeSuggestion(
  exp: BankEnrichExpense,
  bank: string,
  row: BankCsvRow | null,
  reason: EnrichReason,
  merchant: string,
  context: string,
  newDescription: string | null,
): EnrichSuggestion {
  return {
    expenseId: exp.id,
    reason,
    currentDescription: exp.description ?? exp.vendor ?? null,
    proposedDescription: newDescription,
    bank,
    bankDate: row?.date ?? "",
    bankNarration: row?.description ?? "",
    merchant,
    context,
  }
}

/**
 * Match GPay-imported expenses against a bank statement (debit rows).
 * - Amount match within ₹1 (WF3 amt_match tolerance).
 * - Exact bank date == expense date (user chose strict; WF3's close_date
 *   window=3 was tightened to same-day).
 * Returns one suggestion per expense. Rows already carrying the recovered note
 * in their description are marked "already" with no change. Consumers filter
 * out all reasons except "context_appended"/"merchant_only"/"self_transfer"
 * before applying.
 */
export function buildEnrichSuggestions(
  expenses: BankEnrichExpense[],
  bank: string,
  bankRows: BankCsvRow[],
): EnrichSuggestion[] {
  const debitRows = bankRows.filter((r) => r.type === "debit" && r.amount > 0)
  const suggestions: EnrichSuggestion[] = []

  for (const exp of expenses) {
    const expDateKey = dateKey(exp.date)
    let matched = false

    for (const row of debitRows) {
      const bDate = toIso(row.date)
      if (!bDate || bDate !== expDateKey) continue
      if (!amountMatch(exp.amount, row.amount)) continue
      matched = true

      const parsed = parseBankDesc(bank, row.description)
      const current = exp.description ?? exp.vendor ?? null

      if (parsed.selfTransfer) {
        const proposed = "Self Transfer"
        if (current !== proposed) {
          suggestions.push(makeSuggestion(exp, bank, row, "self_transfer", "", "", proposed))
        }
        break
      }

      const proposedFull = buildDescription(parsed.merchant, parsed.context)

      if (!proposedFull) {
        suggestions.push(makeSuggestion(exp, bank, row, "no", parsed.merchant, parsed.context, null))
        break
      }

      // Already carrying the note → nothing to do.
      if (current && current.includes(parsed.context) && parsed.merchant) {
        suggestions.push(makeSuggestion(exp, bank, row, "no", parsed.merchant, parsed.context, null))
        break
      }

      let newDescription: string | null = null
      let reason: EnrichReason = "none"

      if (parsed.context) {
        if (current && !current.includes(parsed.context)) {
          newDescription = `${current} - ${parsed.context}`
          reason = "context_appended"
        } else if (!current) {
          newDescription = proposedFull
          reason = "merchant_only"
        } else {
          reason = "no"
        }
      } else if (!current) {
        newDescription = proposedFull
        reason = "merchant_only"
      } else {
        reason = "no"
      }

      suggestions.push(makeSuggestion(exp, bank, row, reason, parsed.merchant, parsed.context, newDescription))
      break
    }

    if (!matched) {
      suggestions.push(makeSuggestion(exp, bank, null, "none", "", "", null))
    }
  }

  return suggestions
}