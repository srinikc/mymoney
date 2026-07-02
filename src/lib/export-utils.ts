import type { Expense } from "@/types"
import { formatIndianCurrency } from "@/lib/format"

export interface XlsxSheet {
  name: string
  data: Record<string, unknown>[]
}

/**
 * Generate category-wise sheets + a summary sheet from expenses.
 */
export function generateCategorySheets(expenses: Expense[]): XlsxSheet[] {
  const sheets: XlsxSheet[] = []

  // Group expenses by category
  const grouped = new Map<string, Expense[]>()
  for (const expense of expenses) {
    const cat = expense.category?.name || "Uncategorized"
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(expense)
  }

  // Category sheets
  for (const [category, catExpenses] of grouped.entries()) {
    sheets.push({
      name: category.length > 31 ? category.slice(0, 31) : category,
      data: formatSheetData(catExpenses, category),
    })
  }

  // Summary sheet
  const summaryData: Record<string, unknown>[] = []
  let grandTotal = 0
  for (const [category, catExpenses] of grouped.entries()) {
    const total = catExpenses.reduce((s, e) => s + e.amount, 0)
    const count = catExpenses.length
    grandTotal += total
    summaryData.push({
      Category: category,
      Count: count,
      Total: formatIndianCurrency(total),
    })
  }
  summaryData.push({
    Category: "GRAND TOTAL",
    Count: expenses.length,
    Total: formatIndianCurrency(grandTotal),
  })

  sheets.unshift({
    name: "Summary",
    data: summaryData,
  })

  return sheets
}

/**
 * Format expense data for a sheet row.
 */
export function formatSheetData(expenses: Expense[], _category: string): Record<string, unknown>[] {
  return expenses.map((e) => ({
    Date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
    Amount: formatIndianCurrency(e.amount),
    Category: e.category?.name || "",
    Vendor: e.vendor || "",
    Description: e.description || "",
    "Payment Mode": e.paymentMode || "",
    Person: e.person || "",
    "Recurrence": e.recurrenceType || "onetime",
    Notes: e.notes || "",
  }))
}
