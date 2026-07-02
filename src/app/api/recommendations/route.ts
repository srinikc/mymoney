import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { formatCurrencyFull } from "@/lib/utils"

const QuerySchema = z.object({
  profileId: z.coerce.number().optional(),
})

export interface Recommendation {
  id: string
  category: "savings" | "budget" | "investment" | "debt" | "emergency" | "insurance" | "tax"
  priority: "high" | "medium" | "low"
  title: string
  description: string
  action: string
  impact: string
  estimatedSavings?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      profileId: searchParams.get("profileId") ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }
    const { profileId } = parsed.data

    const profileFilter = profileId ? { profileId } : {}
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const incomeAgg = await prisma.expense.aggregate({
      where: { ...profileFilter, date: { gte: threeMonthsAgo }, amount: { lt: 0 } },
      _sum: { amount: true },
    })
    const expenseAgg = await prisma.expense.aggregate({
      where: { ...profileFilter, date: { gte: threeMonthsAgo }, amount: { gt: 0 } },
      _sum: { amount: true },
    })
    const totalIncome = Math.abs(incomeAgg._sum.amount || 0)
    const totalExpenses = expenseAgg._sum.amount || 0
    const monthlyIncome = totalIncome > 0 ? totalIncome / 3 : 0
    const monthlyExpense = totalExpenses > 0 ? totalExpenses / 3 : 0
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0

    const budgets = await prisma.budget.findMany({
      where: { ...profileFilter, month: currentMonth, year: currentYear },
    })

    const monthlyExpensesByCat = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        ...profileFilter,
        date: { gte: new Date(currentYear, currentMonth - 1, 1), lt: new Date(currentYear, currentMonth, 1) },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    })
    const expenseMap = new Map(monthlyExpensesByCat.map((e) => [e.categoryId, e._sum.amount || 0]))

    const categories = await prisma.category.findMany({ where: { type: "expense" } })

    const investments = await prisma.investment.findMany({
      where: { ...profileFilter, status: "active" },
    })
    const totalInvested = investments.reduce((s, i) => s + i.amount, 0)

    const assets = await prisma.asset.findMany({ where: { ...profileFilter } })
    const totalAssets = assets.reduce((s, a) => s + a.amount, 0)

    const liabilities = await prisma.liability.findMany({ where: { ...profileFilter } })
    const totalDebt = liabilities.reduce((s, l) => s + l.amount, 0)

    const goals = await prisma.goal.findMany({
      where: { ...profileFilter, status: "active" },
    })
    const plans = await prisma.plan.findMany({
      where: { ...profileFilter, status: "active" },
    })

    // Generate recommendations
    const recommendations: Recommendation[] = []
    let idCounter = 0
    const nextId = () => `rec-${++idCounter}`

    // Savings
    if (savingsRate < 10) {
      recommendations.push({
        id: nextId(),
        category: "savings",
        priority: "high",
        title: "Increase Your Savings Rate",
        description: `Your current savings rate is ${savingsRate.toFixed(1)}%, below the recommended 20%.`,
        action: `Save at least ₹${(monthlyIncome * 0.2).toFixed(0)}/month by cutting non-essentials by 10%.`,
        impact: "Improves financial security.",
        estimatedSavings: Math.round(monthlyIncome * 0.1),
      })
    } else if (savingsRate < 20) {
      recommendations.push({
        id: nextId(),
        category: "savings",
        priority: "medium",
        title: "Optimize Your Savings Rate",
        description: `Your savings rate of ${savingsRate.toFixed(1)}% is good. Increase to 20%+.`,
        action: `Auto-debit ₹${(monthlyIncome * 0.2 - monthlyExpense).toFixed(0)} to savings on payday.`,
        impact: "Faster goal achievement.",
        estimatedSavings: Math.round(monthlyIncome * 0.2 - monthlyExpense),
      })
    }

    // Budget
    const overspentBudgets = budgets.filter((b) => {
      const spent = expenseMap.get(b.categoryId) || 0
      return spent > b.amount
    })
    for (const budget of overspentBudgets.slice(0, 3)) {
      const cat = categories.find((c) => c.id === budget.categoryId)
      const spent = expenseMap.get(budget.categoryId) || 0
      const overspend = spent - budget.amount
      recommendations.push({
        id: nextId(),
        category: "budget",
        priority: "high",
        title: `Review ${cat?.name || "Unknown"} Budget`,
        description: `Overspent by ${formatCurrencyFull(overspend)} (budget: ${formatCurrencyFull(budget.amount)}).`,
        action: `Reduce ${cat?.name || "category"} spending by ${formatCurrencyFull(overspend)} next month.`,
        impact: "Keeps spending under control.",
        estimatedSavings: Math.round(overspend),
      })
    }

    // Emergency fund
    const monthsOfCoverage = monthlyExpense > 0 ? (totalAssets) / monthlyExpense : 0
    if (monthsOfCoverage < 3) {
      recommendations.push({
        id: nextId(),
        category: "emergency",
        priority: "high",
        title: "Build Emergency Fund Immediately",
        description: `You have ${monthsOfCoverage.toFixed(1)} months of expenses saved (target: 3-6 months).`,
        action: `Save ₹${(monthlyExpense * 6).toFixed(0)} in a separate savings account.`,
        impact: "Protects against emergencies.",
        estimatedSavings: 0,
      })
    } else if (monthsOfCoverage < 6) {
      recommendations.push({
        id: nextId(),
        category: "emergency",
        priority: "medium",
        title: "Strengthen Emergency Fund",
        description: `You have ${monthsOfCoverage.toFixed(1)} months saved. Aim for 6 months.`,
        action: `Build until you reach ₹${(monthlyExpense * 6).toFixed(0)} in liquid savings.`,
        impact: "Provides complete financial safety net.",
        estimatedSavings: 0,
      })
    }

    // Investment
    const investmentRatio = monthlyIncome > 0 ? (totalInvested / (monthlyIncome * 12)) * 100 : 0
    if (investmentRatio < 10) {
      recommendations.push({
        id: nextId(),
        category: "investment",
        priority: "high",
        title: "Start Investing Regularly",
        description: `Your investments (${formatCurrencyFull(totalInvested)}) are below 10% of annual income.`,
        action: "Start a monthly SIP in a NIFTY 50 index fund.",
        impact: "Long-term wealth creation.",
        estimatedSavings: 0,
      })
    } else if (investmentRatio < 20) {
      recommendations.push({
        id: nextId(),
        category: "investment",
        priority: "medium",
        title: "Increase Investment Allocation",
        description: `Your investments are ${investmentRatio.toFixed(1)}% of income. Aim for 20%+.`,
        action: "Increase SIP amounts by 5-10%. Add mid-cap or international funds.",
        impact: "Accelerates wealth building.",
        estimatedSavings: 0,
      })
    }

    // Debt
    const estimatedMonthlyEMI = totalDebt * 0.02
    const debtToIncome = monthlyIncome > 0 ? (estimatedMonthlyEMI / monthlyIncome) * 100 : 0
    if (debtToIncome > 40) {
      recommendations.push({
        id: nextId(),
        category: "debt",
        priority: "high",
        title: "Reduce High Debt Burden",
        description: `DTI ratio is ${debtToIncome.toFixed(1)}% (safe: <30%). Total debt: ${formatCurrencyFull(totalDebt)}.`,
        action: "Prioritize high-interest debt repayment. Consider consolidation.",
        impact: "Frees up cash flow.",
        estimatedSavings: Math.round(estimatedMonthlyEMI * 0.3),
      })
    } else if (debtToIncome > 30) {
      recommendations.push({
        id: nextId(),
        category: "debt",
        priority: "medium",
        title: "Monitor Debt Levels",
        description: `DTI ratio is ${debtToIncome.toFixed(1)}%. Manageable but be cautious.`,
        action: "Pay off one loan entirely in the next 6 months.",
        impact: "Prevents debt burden.",
        estimatedSavings: Math.round(estimatedMonthlyEMI * 0.1),
      })
    }

    // Insurance
    const hasInsuranceGoal = goals.some((g) => g.category?.toLowerCase().includes("insurance"))
    const hasInsurancePlan = plans.some((p) => p.category?.toLowerCase().includes("insurance") || p.name?.toLowerCase().includes("insurance"))
    if (!hasInsuranceGoal && !hasInsurancePlan) {
      recommendations.push({
        id: nextId(),
        category: "insurance",
        priority: "high",
        title: "Get Health & Life Insurance",
        description: "No insurance goals or plans found. Essential for financial protection.",
        action: "Get term life (10-15x annual income) and health insurance (₹5L+).",
        impact: "Protects your family.",
        estimatedSavings: 0,
      })
    }

    // Tax
    recommendations.push({
      id: nextId(),
      category: "tax",
      priority: "low",
      title: "Optimize Tax Savings (Section 80C)",
      description: "Claim deductions up to ₹1.5 lakh under Section 80C.",
      action: "Maximize 80C via ELSS, PPF, EPF. Check 80D for health insurance premiums.",
      impact: "Saves up to ₹46,800 (30% bracket).",
      estimatedSavings: 46_800,
    })

    recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })

    return NextResponse.json({
      recommendations,
      summary: {
        total: recommendations.length,
        high: recommendations.filter((r) => r.priority === "high").length,
        medium: recommendations.filter((r) => r.priority === "medium").length,
        low: recommendations.filter((r) => r.priority === "low").length,
      },
    })
  } catch (error) {
    console.error("Recommendations error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
