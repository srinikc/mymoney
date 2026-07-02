import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export interface RecurrenceReportItem {
  type: string
  count: number
  totalAmount: number
  examples: string[]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")
  const month = searchParams.get("month")
  const quarter = searchParams.get("quarter")

  // Build date filter
  const now = new Date()
  const currentYear = now.getFullYear()
  const y = year ? Number.parseInt(year) : currentYear

  let dateFilter: Record<string, Date> | undefined

  if (month) {
    const m = Number.parseInt(month)
    dateFilter = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    }
  } else if (quarter) {
    const q = Number.parseInt(quarter)
    dateFilter = {
      gte: new Date(y, (q - 1) * 3, 1),
      lt: new Date(y, q * 3, 1),
    }
  } else {
    dateFilter = {
      gte: new Date(y, 0, 1),
      lt: new Date(y + 1, 0, 1),
    }
  }

  // Fetch all expenses in the date range
  const expenses = await prisma.expense.findMany({
    where: { date: dateFilter },
    include: { category: true },
    orderBy: { date: "desc" },
  })

  // Group by recurrenceType
  const grouped = new Map<string, { count: number; totalAmount: number; vendors: string[] }>()

  for (const expense of expenses) {
    const type = expense.recurrenceType || "onetime"
    if (!grouped.has(type)) {
      grouped.set(type, { count: 0, totalAmount: 0, vendors: [] })
    }
    const entry = grouped.get(type)!
    entry.count++
    entry.totalAmount += expense.amount
    if (expense.vendor && !entry.vendors.includes(expense.vendor)) {
      entry.vendors.push(expense.vendor)
    }
  }

  // Build result
  const typeOrder = ["monthly", "quarterly", "yearly", "onetime"]
  const result: RecurrenceReportItem[] = typeOrder
    .filter((t) => grouped.has(t))
    .map((t) => {
      const entry = grouped.get(t)!
      return {
        type: t.charAt(0).toUpperCase() + t.slice(1),
        count: entry.count,
        totalAmount: entry.totalAmount,
        examples: entry.vendors.slice(0, 3),
      }
    })

  // Add any other types not in the standard order
  for (const [type, entry] of grouped.entries()) {
    if (!typeOrder.includes(type)) {
      result.push({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: entry.count,
        totalAmount: entry.totalAmount,
        examples: entry.vendors.slice(0, 3),
      })
    }
  }

  return NextResponse.json({ data: result, total: expenses.length })
}
