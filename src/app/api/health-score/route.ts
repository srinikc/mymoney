import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export const runtime = "nodejs"

/**
 * GET /api/health-score
 *
 * Financial Health Score (0-100) with 4 weighted metrics:
 *   - Savings Rate (30%): (income - expenses) / income for current year
 *   - Budget Adherence (25%): how well monthly spending stays within budgets
 *   - Spending Control (25%): consistency of spending across months (low variance = good)
 *   - Emergency Fund (20%): liquid cash + bank balance vs monthly expenses (target: 6 months)
 */
export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const yearStart = new Date(currentYear, 0, 1)
  const yearEnd = new Date(currentYear + 1, 0, 1)
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 1)

  // ── Savings Rate (30% of score) ──────────────────────────────────────────
  const [totalIncomeAgg, totalExpenseAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { profileId, date: { gte: yearStart, lt: yearEnd }, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { profileId, date: { gte: yearStart, lt: yearEnd }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
  ])
  const totalIncome = Math.abs(totalIncomeAgg._sum.amount || 0)
  const totalExpense = totalExpenseAgg._sum.amount || 0
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

  // ── Budget Adherence (25% of score) ──────────────────────────────────────
  const budgets = await prisma.budget.findMany({
    where: { profileId, month: currentMonth, year: currentYear },
  })
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const monthlyExpenseAgg = await prisma.expense.aggregate({
    where: { profileId, date: { gte: monthStart, lt: monthEnd }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const monthlyExpense = monthlyExpenseAgg._sum.amount || 0
  // null = no budgets set (UI should show "Set up budgets" state)
  const budgetAdherence = totalBudget > 0
    ? Math.max(0, Math.min(100, 100 - (monthlyExpense / totalBudget) * 100))
    : null

  // ── Spending Control (25% of score) ──────────────────────────────────────
  // Measure month-over-month spending consistency (lower variance = better control)
  const monthlyExpenses: number[] = []
  for (let m = 1; m <= 12; m++) {
    const mStart = new Date(currentYear, m - 1, 1)
    const mEnd = new Date(currentYear, m, 1)
    const agg = await prisma.expense.aggregate({
      where: { profileId, date: { gte: mStart, lt: mEnd }, amount: { gt: 0 } },
      _sum: { amount: true },
    })
    monthlyExpenses.push(agg._sum.amount || 0)
  }
  const activeMonths = monthlyExpenses.filter((e) => e > 0)
  let spendingControl = 50 // default if no data
  if (activeMonths.length >= 2) {
    const avg = activeMonths.reduce((s, e) => s + e, 0) / activeMonths.length
    const variance = activeMonths.reduce((s, e) => s + Math.pow(e - avg, 2), 0) / activeMonths.length
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0 // coefficient of variation
    // CV of 0 = perfect control (100), CV of 1+ = poor control (0)
    spendingControl = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)))
  }

  // ── Emergency Fund (20% of score) ────────────────────────────────────────
  // Use liquid assets: bank accounts + cash balance (NOT investments)
  const [bankAccounts, cashBalances] = await Promise.all([
    prisma.bankAccount.findMany({ where: { profileId }, select: { balance: true } }),
    prisma.cashBalance.findMany({ where: { profileId }, select: { amount: true } }),
  ])
  const totalLiquid = bankAccounts.reduce((s, b) => s + b.balance, 0)
    + cashBalances.reduce((s, c) => s + c.amount, 0)
  const monthlyAvg = monthlyExpense || 1
  const monthsOfCoverage = monthlyAvg > 0 ? totalLiquid / monthlyAvg : 0
  // Target: 6 months of expenses covered
  const emergencyFund = Math.min(100, Math.round((monthsOfCoverage / 6) * 100))

  // ── Composite score (weighted) ────────────────────────────────────────────
  const weights = { savingsRate: 0.3, budgetAdherence: 0.25, spendingControl: 0.25, emergencyFund: 0.2 }
  const budgetScore = budgetAdherence ?? 50 // if no budgets, use neutral 50 for composite
  const score = Math.round(
    Math.min(100, Math.max(0, savingsRate)) * weights.savingsRate
    + Math.min(100, Math.max(0, budgetScore)) * weights.budgetAdherence
    + spendingControl * weights.spendingControl
    + emergencyFund * weights.emergencyFund
  )

  return NextResponse.json({
    score: Math.min(100, Math.max(0, score)),
    savingsRate: Math.min(100, Math.max(0, Math.round(savingsRate))),
    budgetAdherence: budgetAdherence !== null ? Math.min(100, Math.max(0, Math.round(budgetAdherence))) : null,
    spendingControl,
    emergencyFund,
    monthsOfCoverage: Math.round(monthsOfCoverage * 10) / 10,
    totalLiquid,
    monthlyExpense: Math.round(monthlyExpense),
  })
}
