import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"
import { buildFinancialPrompt, type FinancialContext } from "@/lib/prompt-builder"
import { queryLLM } from "@/lib/llm"
import { formatResponse } from "@/lib/response-formatter"

export async function POST(req: NextRequest) {
  try {
    const { profileId, userId } = await getAuthContext()

    const { message, conversationId } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const profileFilter = profileId ? { profileId } : {}

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1)

    // Gather financial context data in parallel
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
      // Total expenses (all time)
      prisma.expense.aggregate({
        where: { ...profileFilter, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      // Current month expenses
      prisma.expense.aggregate({
        where: { ...profileFilter, date: { gte: startOfMonth }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      // Income (negative amounts as income proxy)
      prisma.expense.aggregate({
        where: { ...profileFilter, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      // Categories
      prisma.category.findMany({ where: { type: "expense" } }),
      // Budgets for current month
      prisma.budget.findMany({
        where: { ...profileFilter, month: currentMonth, year: currentYear },
        include: { category: true },
      }),
      // Active goals
      prisma.goal.findMany({
        where: { ...profileFilter, status: "active" },
      }),
      // Active investments
      prisma.investment.findMany({
        where: { ...profileFilter, status: "active" },
      }),
      // Recent expenses
      prisma.expense.findMany({
        where: { ...profileFilter, amount: { gt: 0 } },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
      // Assets
      prisma.asset.findMany({ where: { ...profileFilter } }),
      // Liabilities
      prisma.liability.findMany({ where: { ...profileFilter } }),
    ])

    const totalExpenses = totalExpensesAgg._sum.amount || 0
    const monthlyExpense = monthlyExpensesAgg._sum.amount || 0
    const totalIncome = Math.abs(incomeAgg._sum.amount || 0)
    const monthlyIncome = totalIncome > 0 ? totalIncome / 12 : 0

    // Calculate monthly average based on available data
    const monthlyAverage = totalExpenses > 0
      ? totalExpenses / Math.max(1, Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 0

    // Compute top categories by expense
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

    // Budget status with spent amounts
    const monthlyExpensesByCat = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        ...profileFilter,
        date: { gte: startOfMonth },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    })
    const expenseMap = new Map(monthlyExpensesByCat.map((e) => [e.categoryId, e._sum.amount || 0]))

    const budgetStatus = budgets.map((b) => ({
      name: b.category.name,
      spent: expenseMap.get(b.categoryId) || 0,
      limit: b.amount,
    }))

    // Goals summary
    const goalsSummary = goals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      saved: g.currentAmount,
    }))

    // Recent transactions
    const recentTransactions = recentExpenses.map((e) => ({
      date: e.date.toISOString().split("T")[0],
      description: e.description || e.category.name,
      amount: e.amount,
    }))

    // Net worth
    const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)

    // Investments summary
    const investmentsSummary = investments.map((i) => ({
      name: i.name,
      amount: i.amount,
      currentValue: i.currentValue,
    }))

    // Savings rate
    const savingsRate = monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
      : 0

    // Build financial context
    const context: FinancialContext = {
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
    }

    // Build the prompt
    const prompt = buildFinancialPrompt(message, context)

    // Query the LLM
    const rawResponse = await queryLLM(prompt, Number(userId))

    // Format the response
    const formattedResponse = formatResponse(rawResponse)

    return NextResponse.json({
      response: formattedResponse,
      conversationId: conversationId || crypto.randomUUID(),
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 },
    )
  }
}
