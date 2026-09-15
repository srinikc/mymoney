// ── Financial Context ───────────────────────────────────────────────────
// Gathers financial data from DB for the LLM prompt context.

import { prisma } from "@/lib/prisma"

interface FinancialContext {
  totalExpenses: number
  monthlyAverage: number
  topCategories: Array<{ name: string; amount: number }>
  budgetStatus: Array<{ name: string; spent: number; limit: number }>
  goals: Array<{ name: string; target: number; saved: number }>
  recentTransactions: Array<{ date: string; description: string; amount: number }>
  netWorth: { assets: number; liabilities: number }
  totalIncome: number
  savingsRate: number
  investments: Array<{ name: string; amount: number; currentValue: number }>
  monthlyExpense: number
  monthlyIncome: number
  hasData: boolean
}

export async function getFinancialContext(
  userId: number,
  profileId: number
): Promise<FinancialContext> {
  const profileFilter = { profileId }
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
  const startOfPrevMonth = new Date(currentYear, currentMonth - 2, 1)
  const endOfPrevMonth = new Date(currentYear, currentMonth - 1, 1)

  const [
    totalExpensesAgg,
    monthlyExpensesAgg,
    incomeAgg,
    categoryData,
    budgets,
    goals,
    investments,
    recentExpenses,
    assets,
    liabilities,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: { ...profileFilter, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...profileFilter, date: { gte: startOfMonth }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...profileFilter, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ where: { type: "expense" } }),
    prisma.budget.findMany({
      where: { ...profileFilter, month: currentMonth, year: currentYear },
      include: { category: true },
    }),
    prisma.goal.findMany({
      where: { ...profileFilter, status: "active" },
    }),
    prisma.investment.findMany({
      where: { ...profileFilter, status: "active" },
    }),
    prisma.expense.findMany({
      where: { ...profileFilter, amount: { gt: 0 } },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.asset.findMany({ where: { ...profileFilter } }),
    prisma.liability.findMany({ where: { ...profileFilter } }),
  ])

  const totalExpenses = totalExpensesAgg._sum.amount || 0
  const monthlyExpense = monthlyExpensesAgg._sum.amount || 0
  const totalIncome = Math.abs(incomeAgg._sum.amount || 0)
  const monthlyIncome = totalIncome > 0 ? totalIncome / 12 : 0

  const daysIntoYear = Math.max(1, Math.ceil((now.getTime() - new Date(currentYear, 0, 1).getTime()) / (30 * 24 * 60 * 60 * 1000)))
  const monthlyAverage = totalExpenses > 0 ? totalExpenses / daysIntoYear : 0

  const categoryExpenses = await Promise.all(
    categoryData.map(async (cat) => {
      const agg = await prisma.expense.aggregate({
        where: { ...profileFilter, categoryId: cat.id, amount: { gt: 0 } },
        _sum: { amount: true },
      })
      return { name: cat.name, amount: agg._sum.amount || 0 }
    }),
  )
  const topCategories = categoryExpenses
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const monthlyExpensesByCat = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { ...profileFilter, date: { gte: startOfMonth }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const expenseMap = new Map(monthlyExpensesByCat.map((e) => [e.categoryId, e._sum.amount || 0]))
  const budgetStatus = budgets.map((b) => ({
    name: b.category.name,
    spent: expenseMap.get(b.categoryId) || 0,
    limit: b.amount,
  }))

  const goalsSummary = goals.map((g) => ({
    name: g.name,
    target: g.targetAmount,
    saved: g.currentAmount,
  }))

  const recentTransactions = recentExpenses.map((e) => ({
    date: e.date.toISOString().split("T")[0],
    description: e.description || e.category.name,
    amount: e.amount,
  }))

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)

  const investmentsSummary = investments.map((i) => ({
    name: i.name,
    amount: i.amount,
    currentValue: i.currentValue,
  }))

  const savingsRate = monthlyIncome > 0
    ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
    : 0

  const hasData = totalExpenses > 0 || goals.length > 0 || investments.length > 0 ||
    totalAssets > 0 || totalLiabilities > 0

  return {
    totalExpenses,
    monthlyAverage,
    topCategories,
    budgetStatus,
    goals: goalsSummary,
    recentTransactions,
    netWorth: { assets: totalAssets, liabilities: totalLiabilities },
    totalIncome: monthlyIncome * 12,
    savingsRate,
    investments: investmentsSummary,
    monthlyExpense,
    monthlyIncome,
    hasData,
  }
}
