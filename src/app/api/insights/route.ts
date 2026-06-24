import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const yearParam = searchParams.get("year")
  const monthParam = searchParams.get("month")
  const quarterParam = searchParams.get("quarter")

  const year = yearParam ? parseInt(yearParam) : currentYear
  const month = monthParam ? parseInt(monthParam) - 1 : undefined
  const quarter = quarterParam ? parseInt(quarterParam) : undefined

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const yearFilter = { gte: yearStart, lt: yearEnd }

  const monthlyFilter = month !== undefined
    ? { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) }
    : quarter !== undefined
      ? { gte: new Date(year, (quarter - 1) * 3, 1), lt: new Date(year, quarter * 3, 1) }
      : yearFilter

  const [
    totalExpensesAgg,
    monthlyExpensesAgg,
    yearlyExpensesAgg,
    categories,
    budgets,
    goals,
    investments,
    recentExpenses,
  ] = await Promise.all([
    yearParam
      ? prisma.expense.aggregate({ where: { date: yearFilter }, _sum: { amount: true } })
      : prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({
      where: { date: monthlyFilter },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: yearFilter },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ where: { type: "expense" } }),
    prisma.budget.findMany({
      where: { month: currentMonth + 1, year: currentYear },
      include: { category: true },
    }),
    prisma.goal.findMany({ where: { status: "active" } }),
    prisma.investment.findMany(),
    prisma.expense.findMany({
      where: { date: yearFilter },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ])

  const totalExpenses = totalExpensesAgg._sum.amount || 0
  const monthlyExpense = monthlyExpensesAgg._sum.amount || 0
  const yearlyExpense = yearlyExpensesAgg._sum.amount || 0

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const budgetUtilization = totalBudget > 0 ? (monthlyExpense / totalBudget) * 100 : 0

  const totalInvestments = investments.reduce((s, i) => s + i.amount, 0)
  const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0)
  const investmentReturns = totalCurrentValue - totalInvestments

  const activeGoals = goals.length
  const goalProgress = goals.length > 0
    ? goals.reduce((s, g) => s + (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0), 0) / goals.length
    : 0

  const categoryExpenses = await Promise.all(
    categories.map(async (cat) => {
      const agg = await prisma.expense.aggregate({
        where: { categoryId: cat.id, date: yearFilter },
        _sum: { amount: true },
      })
      return { name: cat.name, amount: agg._sum.amount || 0, color: cat.color }
    })
  )
  const categoryBreakdown = categoryExpenses.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)

  const topCategories = categoryBreakdown.slice(0, 5).map((c) => ({
    ...c,
    percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
  }))

  const monthlyTrend = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const start = new Date(year, i, 1)
      const end = new Date(year, i + 1, 1)
      return prisma.expense.aggregate({
        where: { date: { gte: start, lt: end } },
        _sum: { amount: true },
      }).then((agg) => ({
        month: start.toLocaleString("en-US", { month: "short" }),
        amount: agg._sum.amount || 0,
      }))
    })
  )

  return NextResponse.json({
    totalExpenses,
    totalIncome: 0,
    monthlyExpense,
    monthlyBudget: totalBudget,
    budgetUtilization,
    yearlyExpense,
    activeGoals,
    goalProgress: Math.round(goalProgress),
    totalInvestments,
    investmentReturns,
    topCategories,
    monthlyTrend,
    categoryBreakdown,
    recentExpenses,
  })
}
