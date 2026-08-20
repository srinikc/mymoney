import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

// Helper: income expected for an arbitrary month (reused from /api/income/summary).
async function getMonthIncome(profileId: number, month: number, year: number): Promise<number> {
  const sources = await prisma.incomeSource.findMany({ where: profileId ? { profileId } : {} })
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 1)
  let income = 0
  for (const source of sources) {
    switch (source.type) {
      case "monthly": {
        income += source.amount
        break
      }
      case "yearly": {
        if (source.startDate && source.startDate.getMonth() === month - 1 && source.startDate.getFullYear() === year) {
          income += source.amount
        }
        break
      }
      case "onetime": {
        if (source.startDate && source.startDate >= monthStart && source.startDate < monthEnd) {
          income += source.amount
        }
        break
      }
      case "variable": {
        income += source.amount
        break
      }
    }
  }
  return income
}

// Sum of expenses in a month for a category (+ optional sub-category).
async function getCategorySpent(profileId: number, categoryId: number, month: number, year: number, subCategory?: string | null): Promise<number> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)
  const where: Record<string, unknown> = {
    categoryId,
    date: { gte: startDate, lt: endDate },
    profileId,
  }
  if (subCategory) where.subCategory = subCategory
  const agg = await prisma.expense.aggregate({ where, _sum: { amount: true } })
  return agg._sum.amount || 0
}

export async function GET(req: Request) {
  try {
    const { profileId } = await getAuthContext()
    const { searchParams } = new URL(req.url)
    const month = Number.parseInt(searchParams.get("month") || "")
    const year = Number.parseInt(searchParams.get("year") || "")

    const now = new Date()
    const selMonth = month >= 1 && month <= 12 ? month : now.getMonth() + 1
    const selYear = year >= 1970 ? year : now.getFullYear()

    // Previous month (handle January -> December of prior year).
    const prevDate = new Date(selYear, selMonth - 2, 1)
    const prevMonth = prevDate.getMonth() + 1
    const prevYear = prevDate.getFullYear()

    // Common categories = categories with expenses in the last 3 months (preceding
    // the selected month) OR that already have a budget for the selected month.
    const threeMonthsAgo = new Date(selYear, selMonth - 4, 1)
    const monthStart = new Date(selYear, selMonth - 1, 1)
    const monthEnd = new Date(selYear, selMonth, 1)

    const [recentExpenses, existingBudgets] = await Promise.all([
      prisma.expense.groupBy({
        by: ["categoryId", "subCategory"],
        where: {
          profileId,
          date: { gte: threeMonthsAgo, lt: monthStart },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.budget.findMany({
        where: { profileId, month: selMonth, year: selYear },
        include: { category: true },
      }),
    ])

    const categoryIds = new Set<number>(recentExpenses.map((r) => r.categoryId))
    for (const b of existingBudgets) categoryIds.add(b.categoryId)
    const categories = await prisma.category.findMany({
      where: { id: { in: [...categoryIds] }, type: "expense" },
      orderBy: { name: "asc" },
    })

    // Build rows: one per category+subCategory combo that is "common" or has a budget.
    const rows: {
      categoryId: number
      category: { id: number; name: string; icon: string; color: string }
      subCategory: string | null
      lastMonthSpend: number
      currentBudget: number | null
      currentSpent: number
      budgetId: number | null
    }[] = []
    const seen = new Set<string>()

    const addRow = async (categoryId: number, subCategory: string | null) => {
      const key = `${categoryId}::${subCategory || ""}`
      if (seen.has(key)) return
      const cat = categories.find((c) => c.id === categoryId)
      if (!cat) return
      seen.add(key)
      const existingBudget = existingBudgets.find((b) => b.categoryId === categoryId && (b.subCategory || null) === (subCategory || null))
      const [lastMonthSpend, currentSpent] = await Promise.all([
        getCategorySpent(profileId, categoryId, prevMonth, prevYear, subCategory),
        getCategorySpent(profileId, categoryId, selMonth, selYear, subCategory),
      ])
      rows.push({
        categoryId,
        category: { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color },
        subCategory,
        lastMonthSpend,
        currentBudget: existingBudget?.amount ?? null,
        currentSpent,
        budgetId: existingBudget?.id ?? null,
      })
    }

    // First add rows that already have a budget this month, then recent-spend categories.
    for (const b of existingBudgets) {
      await addRow(b.categoryId, b.subCategory || null)
    }
    for (const r of recentExpenses) {
      await addRow(r.categoryId, r.subCategory || null)
    }

    // Totals for the selected month and the previous month.
    const [curBudgetAgg, curSpentAgg, prevBudgetAgg, prevSpentAgg] = await Promise.all([
      prisma.budget.aggregate({ where: { profileId, month: selMonth, year: selYear }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { profileId, date: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
      prisma.budget.aggregate({ where: { profileId, month: prevMonth, year: prevYear }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { profileId, date: { gte: new Date(prevYear, prevMonth - 1, 1), lt: new Date(prevYear, prevMonth, 1) } }, _sum: { amount: true } }),
    ])

    const income = await getMonthIncome(profileId, selMonth, selYear)

    return NextResponse.json({
      overview: true,
      month: selMonth,
      year: selYear,
      income,
      commonCategories: rows,
      totals: {
        current: { budget: curBudgetAgg._sum.amount || 0, spent: curSpentAgg._sum.amount || 0 },
        lastMonth: { budget: prevBudgetAgg._sum.amount || 0, spent: prevSpentAgg._sum.amount || 0 },
      },
    })
  } catch (e) {
    return handleAuthError(e)
  }
}