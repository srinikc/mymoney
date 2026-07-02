import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const SimulateSchema = z.object({
  profileId: z.coerce.number().optional(),
  savingsRateChange: z.number().optional().default(0),
  expenseReduction: z.record(z.string(), z.number()).optional().default({}),
  investmentIncrease: z.number().optional().default(0),
  debtPayoff: z.number().optional().default(0),
  months: z.number().min(1).max(36).optional().default(12),
})

interface ProjectedMonth {
  month: number
  date: string
  savingsRate: number
  budgetAdherence: number
  diversification: number
  emergencyFund: number
  debtToIncome: number
  investmentRatio: number
  overall: number
  totalSavings: number
  totalInvestments: number
  totalDebt: number
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = SimulateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten() }, { status: 400 })
    }

    const { profileId, savingsRateChange, expenseReduction, investmentIncrease, debtPayoff, months } = parsed.data
    const profileFilter = profileId ? { profileId } : {}
    const now = new Date()

    // Gather baseline data
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

    const budgets = await prisma.budget.findMany({
      where: { ...profileFilter, month: now.getMonth() + 1, year: now.getFullYear() },
    })

    const investments = await prisma.investment.findMany({
      where: { ...profileFilter, status: "active" },
    })
    const totalInvested = investments.reduce((s, i) => s + i.amount, 0)
    const totalInvestedValue = investments.reduce((s, i) => s + i.currentValue, 0)

    const assets = await prisma.asset.findMany({ where: { ...profileFilter } })
    const totalAssets = assets.reduce((s, a) => s + a.amount, 0)

    const liabilities = await prisma.liability.findMany({ where: { ...profileFilter } })
    const totalDebtBaseline = liabilities.reduce((s, l) => s + l.amount, 0)

    const categories = await prisma.category.findMany({ where: { type: "expense" } })

    // Baseline scores
    const savingsRateBaseline = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0
    const budgetAdherenceBaseline = budgets.length > 0 ? 100 : 50
    const monthlyAvgExpense = monthlyExpense || 1
    const emergencyFundValueBaseline = monthlyAvgExpense > 0 ? (totalInvestedValue + totalAssets) / monthlyAvgExpense : 0
    const estimatedMonthlyEMI = totalDebtBaseline * 0.02
    const debtToIncomeBaseline = monthlyIncome > 0 ? (estimatedMonthlyEMI / monthlyIncome) * 100 : 0
    const investmentRatioBaseline = monthlyIncome > 0 ? (totalInvested / (monthlyIncome * 12)) * 100 : 0

    // Project forward
    const projected: ProjectedMonth[] = []
    let runningInvestments = totalInvestedValue
    let runningSavings = totalAssets
    let runningDebt = Math.max(0, totalDebtBaseline - debtPayoff)

    for (let m = 1; m <= months; m++) {
      const date = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const monthLabel = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })

      let adjustedMonthlyExpense = monthlyExpense
      const allReduction = expenseReduction["all"]
      if (allReduction === undefined) {
        const catCount = categories.length || 1
        for (const [, reductionPct] of Object.entries(expenseReduction)) {
          const catExpense = monthlyExpense / catCount
          adjustedMonthlyExpense -= catExpense * (reductionPct / 100)
        }
      } else {
        adjustedMonthlyExpense *= (1 - allReduction / 100)
      }

      const adjustedSavingsRate = savingsRateBaseline + savingsRateChange
      const effectiveMonthlyExpense = Math.min(adjustedMonthlyExpense, monthlyIncome - (monthlyIncome * (adjustedSavingsRate / 100)))
      const effectiveMonthlySavings = monthlyIncome - effectiveMonthlyExpense

      runningSavings += effectiveMonthlySavings
      runningInvestments += investmentIncrease * (1 + 0.008 * m)
      runningInvestments += runningSavings * 0.2

      const monthlyEmiPayment = runningDebt * 0.02
      runningDebt = Math.max(0, runningDebt - monthlyEmiPayment)

      const projectedSavingsRate = monthlyIncome > 0 ? ((monthlyIncome - effectiveMonthlyExpense) / monthlyIncome) * 100 : 0
      const projectedBudgetAdherence = budgetAdherenceBaseline
      const projectedDiversification = 80
      const projectedEmergencyFund = monthlyAvgExpense > 0 ? (runningInvestments + runningSavings) / monthlyAvgExpense : 0
      const projectedEMI = runningDebt * 0.02
      const projectedDebtToIncome = monthlyIncome > 0 ? (projectedEMI / monthlyIncome) * 100 : 0
      const projectedInvestmentRatio = monthlyIncome > 0 ? (runningInvestments / (monthlyIncome * 12)) * 100 : 0

      const savingsRateScore = clampScore((projectedSavingsRate / 20) * 100)
      const budgetAdherenceScore = clampScore(projectedBudgetAdherence)
      const diversificationScore = clampScore(projectedDiversification)
      const emergencyFundScore = clampScore((projectedEmergencyFund / 6) * 100)

      let dtiScore: number
      if (projectedDebtToIncome <= 30) dtiScore = 100
      else if (projectedDebtToIncome <= 50) dtiScore = 50 + 50 * ((50 - projectedDebtToIncome) / 20)
      else dtiScore = Math.max(0, 50 * (1 - (projectedDebtToIncome - 50) / 50))
      dtiScore = clampScore(dtiScore)

      const investmentRatioScore = clampScore((projectedInvestmentRatio / 20) * 100)

      const overall = clampScore(
        savingsRateScore * 0.2 +
          budgetAdherenceScore * 0.2 +
          diversificationScore * 0.15 +
          emergencyFundScore * 0.2 +
          dtiScore * 0.15 +
          investmentRatioScore * 0.1
      )

      projected.push({
        month: m,
        date: monthLabel,
        savingsRate: Math.round(projectedSavingsRate * 10) / 10,
        budgetAdherence: Math.round(projectedBudgetAdherence * 10) / 10,
        diversification: Math.round(projectedDiversification * 10) / 10,
        emergencyFund: Math.round(projectedEmergencyFund * 10) / 10,
        debtToIncome: Math.round(projectedDebtToIncome * 10) / 10,
        investmentRatio: Math.round(projectedInvestmentRatio * 10) / 10,
        overall,
        totalSavings: Math.round(runningSavings),
        totalInvestments: Math.round(runningInvestments),
        totalDebt: Math.round(runningDebt),
      })
    }

    return NextResponse.json({
      baseline: {
        savingsRate: Math.round(savingsRateBaseline * 10) / 10,
        budgetAdherence: Math.round(budgetAdherenceBaseline * 10) / 10,
        emergencyFund: Math.round(emergencyFundValueBaseline * 10) / 10,
        debtToIncome: Math.round(debtToIncomeBaseline * 10) / 10,
        investmentRatio: Math.round(investmentRatioBaseline * 10) / 10,
        totalSavings: Math.round(totalAssets),
        totalInvestments: Math.round(totalInvestedValue),
        totalDebt: Math.round(totalDebtBaseline),
        overall: 0,
      },
      projection: projected,
      summary: {
        initialOverall: projected[0]?.overall ?? 0,
        finalOverall: projected.at(-1)?.overall ?? 0,
        improvement: (projected.at(-1)?.overall ?? 0) - (projected[0]?.overall ?? 0),
        totalSavingsAccumulated: projected.at(-1)?.totalSavings ?? 0,
        totalInvestmentsFinal: projected.at(-1)?.totalInvestments ?? 0,
        totalDebtFinal: projected.at(-1)?.totalDebt ?? 0,
      },
    })
  } catch (error) {
    console.error("What-if simulation error:", error)
    return NextResponse.json({ error: "Failed to run simulation" }, { status: 500 })
  }
}
