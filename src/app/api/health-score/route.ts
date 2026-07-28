import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // --- Savings Rate (30% of score) ---
  const totalIncomeAgg = await prisma.expense.aggregate({
    where: { date: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) }, amount: { lt: 0 } },
    _sum: { amount: true },
  })
  const totalExpenseAgg = await prisma.expense.aggregate({
    where: { date: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const totalIncome = Math.abs(totalIncomeAgg._sum.amount || 0)
  const totalExpense = totalExpenseAgg._sum.amount || 0
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

  // --- Budget Adherence (25% of score) ---
  const budgets = await prisma.budget.findMany({
    where: { month: currentMonth, year: currentYear },
  })
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const monthlyExpenseAgg = await prisma.expense.aggregate({
    where: { date: { gte: new Date(currentYear, currentMonth - 1, 1), lt: new Date(currentYear, currentMonth, 1) }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const monthlyExpense = monthlyExpenseAgg._sum.amount || 0
  const budgetAdherence = totalBudget > 0 ? Math.max(0, 100 - (monthlyExpense / totalBudget) * 100) : 50

  // --- Diversification (25% of score) ---
  const categories = await prisma.category.findMany({ where: { type: "expense" } })
  const categoryExpenses = await Promise.all(
    categories.map(async (cat) => {
      const agg = await prisma.expense.aggregate({
        where: { categoryId: cat.id, date: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) } },
        _sum: { amount: true },
      })
      return { name: cat.name, amount: agg._sum.amount || 0 }
    })
  )
  const activeCategories = categoryExpenses.filter((c) => c.amount > 0).length
  const totalCategories = categories.length
  // More categories with spending = better diversification
  const diversification = totalCategories > 0 ? (activeCategories / totalCategories) * 100 : 50

  // --- Emergency Fund (20% of score) ---
  // Approximate: if investments exist, score is higher
  const investments = await prisma.investment.findMany()
  const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0)
  const monthlyAvg = monthlyExpense || 1
  const monthsOfCoverage = monthlyAvg > 0 ? totalInvestments / monthlyAvg : 0
  // Target: 6 months of expenses
  const emergencyFund = Math.min(100, (monthsOfCoverage / 6) * 100)

  // Composite score (weighted)
  const score = Math.round(
    savingsRate * 0.3 + budgetAdherence * 0.25 + diversification * 0.25 + emergencyFund * 0.2
  )

  return NextResponse.json({
    score: Math.min(100, Math.max(0, score)),
    savingsRate: Math.min(100, Math.max(0, Math.round(savingsRate))),
    budgetAdherence: Math.min(100, Math.max(0, Math.round(budgetAdherence))),
    diversification: Math.min(100, Math.max(0, Math.round(diversification))),
    emergencyFund: Math.min(100, Math.max(0, Math.round(emergencyFund))),
  })
}
