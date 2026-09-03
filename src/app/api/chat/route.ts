import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"
import { buildFinancialPrompt, type FinancialContext } from "@/lib/prompt-builder"
import { queryLLM } from "@/lib/llm"
import { formatResponse } from "@/lib/response-formatter"
import { generateLocalResponse } from "@/lib/local-chat"

export const runtime = "nodejs"

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
    const startOfPrevMonth = new Date(currentYear, currentMonth - 2, 1)
    const endOfPrevMonth = new Date(currentYear, currentMonth - 1, 1)

    // Gather financial context data in parallel
    const [
      totalExpensesAgg,
      monthlyExpensesAgg,
      prevMonthExpensesAgg,
      incomeAgg,
      categoryData,
      budgets,
      goals,
      investments,
      recentExpenses,
      assets,
      liabilities,
      healthScoreRow,
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
      // Previous month expenses
      prisma.expense.aggregate({
        where: { ...profileFilter, date: { gte: startOfPrevMonth, lt: endOfPrevMonth }, amount: { gt: 0 } },
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
      // Recent expenses (last 20 for richer context)
      prisma.expense.findMany({
        where: { ...profileFilter, amount: { gt: 0 } },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 20,
      }),
      // Assets
      prisma.asset.findMany({ where: { ...profileFilter } }),
      // Liabilities
      prisma.liability.findMany({ where: { ...profileFilter } }),
      // Health score (if computed recently)
      prisma.expense
        .count({ where: { ...profileFilter } })
        .then(async () => {
          // Compute simple health score from data
          return 0
        }),
    ])

    const totalExpenses = totalExpensesAgg._sum.amount || 0
    const monthlyExpense = monthlyExpensesAgg._sum.amount || 0
    const prevMonthExpense = prevMonthExpensesAgg._sum.amount || 0
    const totalIncome = Math.abs(incomeAgg._sum.amount || 0)
    const monthlyIncome = totalIncome > 0 ? totalIncome / 12 : 0

    // Calculate monthly average based on available data
    const daysIntoYear = Math.max(1, Math.ceil((now.getTime() - new Date(currentYear, 0, 1).getTime()) / (30 * 24 * 60 * 60 * 1000)))
    const monthlyAverage = totalExpenses > 0 ? totalExpenses / daysIntoYear : 0

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
    const topCategory = topCategories[0] ?? null

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
    const netWorthValue = totalAssets - totalLiabilities

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

    const hasData = totalExpenses > 0 || goals.length > 0 || investments.length > 0 ||
      totalAssets > 0 || totalLiabilities > 0

    // Build the base context
    const context: FinancialContext & {
      monthlyExpense: number
      monthlyIncome: number
      netWorthValue: number
      topCategory: { name: string; amount: number } | null
      hasData: boolean
    } = {
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
      netWorthValue,
      topCategory,
      hasData,
    }

    // Detect if LLM is configured
    const hasLlm = await checkLlmAvailable(userId)

    let rawResponse: string

    if (hasLlm) {
      // Use real LLM
      const prompt = buildFinancialPrompt(message, context)
      rawResponse = await queryLLM(prompt, Number(userId))
    } else {
      // Use data-driven local response engine
      rawResponse = generateLocalResponse(message, context)
    }

    // Format the response
    const formattedResponse = formatResponse(rawResponse)

    return NextResponse.json({
      response: formattedResponse,
      conversationId: conversationId || crypto.randomUUID(),
      source: hasLlm ? "llm" : "local",
      stats: {
        monthlyExpense,
        monthlyIncome,
        topCategory: topCategory?.name ?? null,
        netWorth: netWorthValue,
        savingsRate,
        activeBudgets: budgetStatus.length,
        activeGoals: goals.length,
        activeInvestments: investments.length,
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 },
    )
  }
}

async function checkLlmAvailable(userId?: number): Promise<boolean> {
  const { getConfig } = await import("@/lib/get-config")
  const provider = await getConfig("LLM_PROVIDER", userId).catch(() => null)
  if (!provider) {
    // Check env var fallback
    return Boolean(
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENCODE_API_KEY,
    )
  }
  if (provider === "local") return true
  // For cloud providers, check key
  const key = await getConfig(
    provider === "claude" ? "ANTHROPIC_API_KEY" :
    provider === "opencode" ? "OPENCODE_API_KEY" :
    "OPENAI_API_KEY",
    userId,
  ).catch(() => null)
  if (key) return true
  // Also check env var
  return Boolean(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENCODE_API_KEY,
  )
}
