import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [
    incomeSources,
    investments,
    assets,
    liabilities,
    loans,
    bankAccounts,
    fixedDeposits,
    cashBalances,
    subscriptions,
    insurances,
    goals,
    budgets,
    budgetSpend,
  ] = await Promise.all([
    prisma.incomeSource.findMany({ where: { profileId }, include: { category: true } }),
    prisma.investment.findMany({ where: { profileId } }),
    prisma.asset.findMany({ where: { profileId }, select: { currentValue: true } }),
    prisma.liability.findMany({ where: { profileId }, select: { amount: true } }),
    prisma.loan.findMany({ where: { profileId } }),
    prisma.bankAccount.findMany({ where: { profileId }, select: { balance: true } }),
    prisma.fixedDeposit.findMany({ where: { profileId }, select: { maturityAmount: true, principal: true } }),
    prisma.cashBalance.findMany({ where: { profileId }, select: { amount: true } }),
    prisma.subscription.findMany({ where: { profileId } }),
    prisma.insurance.findMany({ where: { profileId } }),
    prisma.goal.findMany({ where: { profileId, status: "active" } }),
    prisma.budget.findMany({
      where: { profileId, month: currentMonth, year: currentYear },
      include: { category: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        profileId,
        date: { gte: new Date(currentYear, currentMonth - 1, 1), lt: new Date(currentYear, currentMonth, 1) },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    }),
  ])

  // ── Income ──────────────────────────────────────────────
  const monthlySources = incomeSources.filter((s) => s.type === "monthly" || s.type === "variable")
  const annualSources = incomeSources.filter((s) => s.type === "yearly" || s.type === "onetime")
  const totalMonthlyIncome = monthlySources.reduce((s, src) => s + (src.amount || 0), 0)
  const totalAnnualIncome = totalMonthlyIncome * 12 + annualSources.reduce((s, src) => s + src.amount, 0)
  const income = {
    totalMonthlyIncome,
    totalAnnualIncome,
    sourceCount: incomeSources.length,
    sources: incomeSources.map((s) => ({
      name: s.name,
      type: s.type,
      amount: s.amount,
      category: s.category?.name || null,
    })),
  }

  // ── Investments ─────────────────────────────────────────
  const totalInvested = investments.reduce((s, i) => s + i.amount, 0)
  const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0)
  const byTypeMap = new Map<string, { type: string; invested: number; current: number; count: number }>()
  for (const inv of investments) {
    const t = inv.type || "other"
    if (!byTypeMap.has(t)) byTypeMap.set(t, { type: t, invested: 0, current: 0, count: 0 })
    const e = byTypeMap.get(t)!
    e.invested += inv.amount
    e.current += inv.currentValue
    e.count++
  }
  const investmentsData = {
    totalInvested,
    totalCurrentValue,
    returns: totalCurrentValue - totalInvested,
    returnsPct: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0,
    count: investments.length,
    byType: [...byTypeMap.values()].sort((a, b) => b.current - a.current),
  }

  // ── Net worth ───────────────────────────────────────────
  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)
  const totalLoans = loans.reduce((s, l) => s + (l.remainingAmount ?? l.principal), 0)
  const totalBank = bankAccounts.reduce((s, b) => s + b.balance, 0)
  const totalFD = fixedDeposits.reduce((s, f) => s + (f.maturityAmount ?? f.principal), 0)
  const totalCash = cashBalances.reduce((s, c) => s + c.amount, 0)
  const grandAssets = totalAssets + totalCurrentValue + totalBank + totalFD + totalCash
  const grandLiabilities = totalLiabilities + totalLoans
  const netWorth = {
    netWorth: grandAssets - grandLiabilities,
    totalAssets: grandAssets,
    totalLiabilities: grandLiabilities,
    totalLoans,
    breakdown: { userAssets: totalAssets, investments: totalCurrentValue, bank: totalBank, fixedDeposits: totalFD, cash: totalCash },
  }

  // ── Loans ───────────────────────────────────────────────
  const loansData = {
    total: totalLoans,
    count: loans.length,
    monthlyEMI: loans.reduce((s, l) => s + l.emiAmount, 0),
    byLoan: loans.map((l) => ({
      name: l.name,
      type: l.type,
      principal: l.principal,
      interestRate: l.interestRate,
      tenureMonths: l.tenureMonths,
      emiAmount: l.emiAmount,
    })),
  }

  // ── Subscriptions ───────────────────────────────────────
  const activeSubs = subscriptions.filter((s) => s.status === "active")
  const monthlyRecurring = activeSubs.reduce((s, sub) => {
    switch (sub.billingCycle) {
    case "monthly": return s + sub.amount
    case "quarterly": return s + sub.amount / 3
    case "yearly": return s + sub.amount / 12
    case "weekly": return s + sub.amount * (52 / 12)
    default: return s + sub.amount
    }
  }, 0)
  const subscriptionsData = {
    totalMonthlyRecurring: monthlyRecurring,
    totalAnnualRecurring: monthlyRecurring * 12,
    activeCount: activeSubs.length,
    count: subscriptions.length,
    bySubscription: subscriptions.map((s) => ({
      name: s.name,
      provider: s.provider,
      amount: s.amount,
      billingCycle: s.billingCycle,
      status: s.status,
      nextDueDate: s.nextDueDate,
    })),
  }

  // ── Insurance ───────────────────────────────────────────
  const totalPremium = insurances.reduce((s, i) => s + i.premium, 0)
  const annualPremium = insurances.reduce((s, i) => {
    switch (i.premiumFrequency) {
    case "monthly": return s + i.premium * 12
    case "quarterly": return s + i.premium * 4
    default: return s + i.premium
    }
  }, 0)
  const insuranceData = {
    totalPremium,
    annualPremium,
    count: insurances.length,
    byInsurance: insurances.map((i) => ({
      name: i.name,
      type: i.type,
      provider: i.provider,
      premium: i.premium,
      premiumFrequency: i.premiumFrequency,
      sumAssured: i.sumAssured,
      renewalDate: i.renewalDate,
    })),
  }

  // ── Goals ───────────────────────────────────────────────
  const goalsData = {
    active: goals.length,
    avgProgress: goals.length > 0
      ? goals.reduce((s, g) => s + (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0), 0) / goals.length
      : 0,
    byGoal: goals.map((g) => ({
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      progress: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
      deadline: g.deadline,
      category: g.category,
    })),
  }

  // ── Budgets (current month adherence) ───────────────────
  const spendMap = new Map(budgetSpend.map((b) => [b.categoryId, b._sum.amount || 0]))
  const budgetRows = budgets.map((b) => {
    const spent = spendMap.get(b.categoryId) || 0
    return { category: b.category.name, budget: b.amount, spent, pct: b.amount > 0 ? (spent / b.amount) * 100 : 0 }
  })
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalBudgetSpent = budgetRows.reduce((s, r) => s + r.spent, 0)
  const budgetData = {
    month: currentMonth,
    year: currentYear,
    totalBudget,
    totalSpent: totalBudgetSpent,
    utilization: totalBudget > 0 ? (totalBudgetSpent / totalBudget) * 100 : 0,
    byCategory: budgetRows.sort((a, b) => b.pct - a.pct),
  }

  // ── Tax (Section 80C) ───────────────────────────────────
  const taxSavingInvestments = investments.filter((i) =>
    ["ppf", "elss", "epf", "nsc", "tax saving", "tax saver"].some((k) => i.name?.toLowerCase().includes(k))
  ).reduce((s, i) => s + i.amount, 0)
  const taxData = {
    invested80C: taxSavingInvestments,
    utilization80C: Math.min(100, (taxSavingInvestments / 150_000) * 100),
    target80C: 150_000,
    remaining80C: Math.max(0, 150_000 - taxSavingInvestments),
  }

  return NextResponse.json({
    income,
    investments: investmentsData,
    netWorth,
    loans: loansData,
    subscriptions: subscriptionsData,
    insurance: insuranceData,
    goals: goalsData,
    budgets: budgetData,
    tax: taxData,
  })
}
