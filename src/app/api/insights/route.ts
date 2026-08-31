import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const now = new Date()
  const currentYear = now.getFullYear()

  const yearParam = searchParams.get("year")
  const monthParam = searchParams.get("month")
  const quarterParam = searchParams.get("quarter")

  const year = yearParam ? Number.parseInt(yearParam) : currentYear
  const month = monthParam ? Number.parseInt(monthParam) - 1 : undefined
  const quarter = quarterParam ? Number.parseInt(quarterParam) : undefined

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const yearFilter = { gte: yearStart, lt: yearEnd }

  const monthlyFilter = month === undefined
    ? (quarter === undefined
      ? yearFilter
      : { gte: new Date(year, (quarter - 1) * 3, 1), lt: new Date(year, quarter * 3, 1) })
    : { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) }

  const [
    totalExpensesAgg,
    monthlyExpensesAgg,
    yearlyExpensesAgg,
    categories,
    budgets,
    goals,
    investments,
    recentExpenses,
    incomeSources,
    loans,
    pfInvestments,
  ] = await Promise.all([
    prisma.expense.aggregate({ where: { date: monthlyFilter }, _sum: { amount: true } }),
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
      where: { month: (month ?? 0) + 1, year },
      include: { category: true },
    }),
    prisma.goal.findMany({ where: { status: "active" } }),
    prisma.investment.findMany(),
    prisma.expense.findMany({
      where: { date: monthlyFilter },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.incomeSource.findMany(),
    prisma.loan.findMany({ select: { principal: true } }),
    prisma.investment.findMany({
      where: { type: { in: ["ppf", "nps"] } },
      select: { amount: true, currentValue: true },
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
  const totalPF = pfInvestments.reduce((s, i) => s + (i.currentValue || i.amount), 0)
  const totalLoans = loans.reduce((s, l) => s + l.principal, 0)

  const incomeStart = monthlyFilter.gte
  const incomeEnd = monthlyFilter.lt
  const isSpecificPeriod = month !== undefined || quarter !== undefined
  const periodMultiplier = month !== undefined ? 1 : (quarter !== undefined ? 3 : 12)
  let totalIncome = 0
  for (const source of incomeSources) {
    if (source.type === "monthly") {
      totalIncome += source.amount * periodMultiplier
    } else if (source.type === "variable") {
      totalIncome += (source.amount || 0) * periodMultiplier
    } else {
      // yearly / onetime — only counted when the source start date falls in the selected period
      if (!isSpecificPeriod || (source.startDate && new Date(source.startDate) >= incomeStart && new Date(source.startDate) < incomeEnd)) {
        totalIncome += source.amount
      }
    }
  }

  const activeGoals = goals.length
  const goalProgress = goals.length > 0
    ? goals.reduce((s, g) => s + (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0), 0) / goals.length
    : 0

  const categoryExpenses = await Promise.all(
    categories.map(async (cat) => {
      const agg = await prisma.expense.aggregate({
        where: { categoryId: cat.id, date: monthlyFilter },
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

  const incomeTrend = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(year, i, 1).toLocaleString("en-US", { month: "short" })
    let amount = 0
    for (const source of incomeSources) {
      switch (source.type) {
        case "monthly":
          amount += source.amount
          break
        case "yearly":
        case "onetime":
          if (source.startDate) {
            const sd = new Date(source.startDate)
            if (sd.getMonth() === i && sd.getFullYear() === year) amount += source.amount
          }
          break
        case "variable":
          amount += source.amount || 0
          break
      }
    }
    return { month: monthName, amount }
  })

  return NextResponse.json({
    totalExpenses,
    totalIncome,
    monthlyExpense,
    monthlyBudget: totalBudget,
    budgetUtilization,
    yearlyExpense,
    activeGoals,
    goalProgress: Math.round(goalProgress),
    totalInvestments,
    investmentReturns,
    totalPF,
    totalLoans,
    topCategories,
    monthlyTrend,
    incomeTrend,
    categoryBreakdown,
    recentExpenses,
  })
}
