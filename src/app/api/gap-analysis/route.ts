import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { formatCurrencyFull } from "@/lib/utils"

const QuerySchema = z.object({
  profileId: z.coerce.number().optional(),
})

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
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const incomeAgg = await prisma.expense.aggregate({
      where: { ...profileFilter, date: { gte: threeMonthsAgo }, amount: { lt: 0 } },
      _sum: { amount: true },
    })
    const expenseAgg = await prisma.expense.aggregate({
      where: { ...profileFilter, date: { gte: threeMonthsAgo }, amount: { gt: 0 } },
      _sum: { amount: true },
    })
    const monthlyIncome = (Math.abs(incomeAgg._sum.amount || 0)) / 3
    const monthlyExpense = (expenseAgg._sum.amount || 0) / 3

    const investments = await prisma.investment.findMany({ where: { ...profileFilter, status: "active" } })
    const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0)

    const assets = await prisma.asset.findMany({ where: { ...profileFilter } })
    const totalLiquidAssets = assets.filter((a) => ["savings", "cash", "bank"].includes(a.type.toLowerCase())).reduce((s, a) => s + a.currentValue, 0)

    const liabilities = await prisma.liability.findMany({ where: { ...profileFilter } })
    const totalDebt = liabilities.reduce((s, l) => s + l.amount, 0)

    const goals = await prisma.goal.findMany({ where: { ...profileFilter, status: "active" } })
    const plans = await prisma.plan.findMany({ where: { ...profileFilter, status: "active" } })

    const gaps = []

    // Emergency fund gap
    const emergencyTarget = monthlyExpense * 6
    const emergencyCurrent = totalLiquidAssets + totalInvested * 0.3
    const emergencyGap = Math.max(0, emergencyTarget - emergencyCurrent)
    const emergencyMonths = monthlyExpense > 0 ? emergencyCurrent / monthlyExpense : 0

    let emergencyStatus: string
    if (emergencyMonths >= 6) emergencyStatus = "good"
    else if (emergencyMonths >= 3) emergencyStatus = "warning"
    else emergencyStatus = "critical"

    gaps.push({
      category: "emergency",
      status: emergencyStatus,
      title: "Emergency Fund",
      currentValue: `${emergencyMonths.toFixed(1)} months (${formatCurrencyFull(Math.round(emergencyCurrent))})`,
      targetValue: `6 months (${formatCurrencyFull(Math.round(emergencyTarget))})`,
      gap: formatCurrencyFull(Math.round(emergencyGap)),
      gapAmount: Math.round(emergencyGap),
      actionItems: [
        emergencyGap > 0 ? `Save ₹${Math.round(emergencyGap / 6).toLocaleString("en-IN")}/month for 6 months.` : "Emergency fund is fully funded.",
        "Keep funds in a high-interest savings account.",
        "Review quarterly to adjust for changing expenses.",
      ],
    })

    // Insurance gap
    const hasInsurance = goals.some((g) => g.category?.toLowerCase().includes("insurance")) || plans.some((p) => p.category?.toLowerCase().includes("insurance") || p.name?.toLowerCase().includes("insurance"))
    const idealCover = monthlyIncome * 120
    const insuranceStatus = hasInsurance ? "good" : "critical"

    gaps.push({
      category: "insurance",
      status: insuranceStatus,
      title: "Insurance Coverage",
      currentValue: hasInsurance ? "Has some coverage" : "No insurance found",
      targetValue: `Term: ${formatCurrencyFull(Math.round(idealCover))} + Health: ₹5L`,
      gap: hasInsurance ? "Review coverage adequacy" : formatCurrencyFull(Math.round(idealCover)),
      gapAmount: hasInsurance ? 0 : Math.round(idealCover),
      actionItems: [
        "Get term life insurance of 10-15x annual income.",
        "Get family health insurance of ₹5L minimum.",
        "Consider critical illness cover.",
      ],
    })

    // Tax gap
    const taxSavingInvestments = investments.filter((i) =>
      ["ppf", "elss", "epf", "nsc", "tax saving", "tax saver"].some((k) => i.name?.toLowerCase().includes(k))
    ).reduce((s, i) => s + i.amount, 0)
    const taxGap = Math.max(0, 150_000 - taxSavingInvestments)
    const taxUtilization = Math.min(100, (taxSavingInvestments / 150_000) * 100)

    let taxStatus: string
    if (taxUtilization >= 90) taxStatus = "good"
    else if (taxUtilization >= 50) taxStatus = "warning"
    else taxStatus = "critical"

    gaps.push({
      category: "tax",
      status: taxStatus,
      title: "Tax Planning (Section 80C)",
      currentValue: taxSavingInvestments > 0 ? `${formatCurrencyFull(Math.round(taxSavingInvestments))} (${taxUtilization.toFixed(0)}%)` : "No tax-saving investments",
      targetValue: "₹1.5 lakh (100%)",
      gap: formatCurrencyFull(Math.round(taxGap)),
      gapAmount: Math.round(taxGap),
      actionItems: [
        taxGap > 0 ? `Invest ₹${Math.round(taxGap).toLocaleString("en-IN")} more in ELSS/PPF.` : "You're maximizing 80C.",
        "Open a PPF account for tax-free returns.",
        "Check 80D for health insurance premium deductions.",
      ],
    })

    // Debt gap
    const dti = monthlyIncome > 0 ? ((totalDebt * 0.02) / monthlyIncome) * 100 : 0
    let debtStatus: string
    if (totalDebt === 0 || dti <= 30) debtStatus = "good"
    else if (dti <= 50) debtStatus = "warning"
    else debtStatus = "critical"

    gaps.push({
      category: "debt",
      status: debtStatus,
      title: "Debt-to-Income Ratio",
      currentValue: totalDebt > 0 ? `${dti.toFixed(1)}% (${formatCurrencyFull(Math.round(totalDebt))} total)` : "No debt",
      targetValue: "Below 30%",
      gap: dti > 30 ? `${(dti - 30).toFixed(1)}% over limit` : "On track",
      gapAmount: Math.round(Math.max(0, (totalDebt * 0.02) - (monthlyIncome * 0.3))),
      actionItems: [
        totalDebt === 0 ? "No debt — maintain this." : "Pay off high-interest debt first.",
        "Consider debt consolidation.",
      ],
    })

    return NextResponse.json({
      gaps,
      summary: {
        total: gaps.length,
        good: gaps.filter((g) => g.status === "good").length,
        warning: gaps.filter((g) => g.status === "warning").length,
        critical: gaps.filter((g) => g.status === "critical").length,
      },
    })
  } catch (error) {
    console.error("Gap analysis error:", error)
    return NextResponse.json({ error: "Failed to perform gap analysis" }, { status: 500 })
  }
}
