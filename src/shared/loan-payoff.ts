import { prisma } from "@/lib/prisma"

// ── Loan Payoff Strategy ────────────────────────────────────────────
// Avalanche (highest interest first) vs Snowball (smallest balance first)

export type PayoffStrategy = "avalanche" | "snowball"

export interface LoanPayoffResult {
  strategy: PayoffStrategy
  loans: LoanPayoffItem[]
  totalOutstanding: number
  totalInterestSaved: number
  debtFreeAge: number | null
  recommendation: string
  timeline: { month: number; balance: number; interestPaid: number; principalPaid: number }[]
}

export interface LoanPayoffItem {
  id: number
  name: string
  type: string
  principal: number
  interestRate: number
  remainingAmount: number
  emiAmount: number
  endDate: Date | null
  priority: number // rank based on strategy
  totalInterestIfMinPay: number
  totalInterestIfPrepay: number
  interestSaved: number
  payoffOrder: string // "1st", "2nd", "3rd"
}

export async function calculateLoanPayoff(
  profileId: number,
  strategy: PayoffStrategy = "avalanche",
): Promise<LoanPayoffResult> {
  const [loans, profile] = await Promise.all([
    prisma.loan.findMany({
      where: { profileId, status: "active" },
      select: {
        id: true, name: true, type: true, principal: true, interestRate: true,
        tenureMonths: true, emiAmount: true, startDate: true, endDate: true,
        remainingAmount: true,
      },
    }),
    prisma.profile.findUnique({
      where: { id: profileId },
      select: { dateOfBirth: true },
    }),
  ])

  const currentAge = profile?.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  // Calculate remaining amounts if not set
  const activeLoans = loans.map((loan) => {
    const remaining = Number(loan.remainingAmount || loan.principal)
    return { ...loan, calculatedRemaining: remaining }
  })

  // Sort based on strategy
  const sorted = [...activeLoans].sort((a, b) => {
    if (strategy === "avalanche") {
      return b.interestRate - a.interestRate // highest first
    }
    return a.calculatedRemaining - b.calculatedRemaining // smallest first
  })

  const totalOutstanding = sorted.reduce((s, l) => s + l.calculatedRemaining, 0)

  // Calculate interest for each loan
  const loanItems: LoanPayoffItem[] = sorted.map((loan, idx) => {
    const monthlyRate = loan.interestRate / 100 / 12
    const remaining = loan.calculatedRemaining
    const emi = Number(loan.emiAmount)

    // Simple interest calculation for remaining term
    let totalInterestMinPay = 0
    let balance = remaining
    const months = loan.tenureMonths || 60
    for (let m = 0; m < months && balance > 0; m++) {
      const interest = balance * monthlyRate
      const principal = Math.min(emi - interest, balance)
      totalInterestMinPay += interest
      balance -= principal
    }

    // Simulate prepaying this loan first (using freed EMI from higher-priority loans)
    let totalInterestPrepay = 0
    balance = remaining
    // Assume 20% extra payment per month for prepayment simulation
    const extraPayment = emi * 0.2
    for (let m = 0; m < months && balance > 0; m++) {
      const interest = balance * monthlyRate
      const principal = Math.min(emi + extraPayment - interest, balance)
      totalInterestPrepay += interest
      balance -= principal
    }

    return {
      id: loan.id,
      name: loan.name,
      type: loan.type,
      principal: Number(loan.principal),
      interestRate: Number(loan.interestRate),
      remainingAmount: remaining,
      emiAmount: emi,
      endDate: loan.endDate,
      priority: idx + 1,
      totalInterestIfMinPay: Math.round(totalInterestMinPay),
      totalInterestIfPrepay: Math.round(totalInterestPrepay),
      interestSaved: Math.round(totalInterestMinPay - totalInterestPrepay),
      payoffOrder: `${idx + 1}${getOrdinalSuffix(idx + 1)}`,
    }
  })

  const totalInterestSaved = loanItems.reduce((s, l) => s + l.interestSaved, 0)

  // Debt-free age calculation
  let debtFreeAge: number | null = null
  if (currentAge) {
    const longestLoan = [...activeLoans].sort((a, b) => (b.tenureMonths || 0) - (a.tenureMonths || 0))[0]
    if (longestLoan) {
      const monthsToPayoff = longestLoan.tenureMonths || 60
      debtFreeAge = currentAge + Math.ceil(monthsToPayoff / 12)
    }
  }

  // Build timeline (first 12 months)
  const timeline: LoanPayoffResult["timeline"] = []
  let runningBalance = totalOutstanding
  const avgMonthlyRate = activeLoans.length > 0
    ? activeLoans.reduce((s, l) => s + Number(l.interestRate), 0) / activeLoans.length / 100 / 12
    : 0
  const totalEMI = activeLoans.reduce((s, l) => s + Number(l.emiAmount), 0)

  for (let m = 1; m <= 12; m++) {
    const interestPaid = runningBalance * avgMonthlyRate
    const principalPaid = Math.min(totalEMI - interestPaid, runningBalance)
    runningBalance = Math.max(0, runningBalance - principalPaid)
    timeline.push({
      month: m,
      balance: Math.round(runningBalance),
      interestPaid: Math.round(interestPaid),
      principalPaid: Math.round(principalPaid),
    })
  }

  // Recommendation
  let recommendation = ""
  if (strategy === "avalanche") {
    recommendation = `Avalanche strategy: Pay off ${loanItems[0]?.name || "highest interest loan"} first to save ₹${totalInterestSaved.toLocaleString("en-IN")} in total interest.`
  } else {
    recommendation = `Snowball strategy: Pay off ${loanItems[0]?.name || "smallest balance loan"} first for quick wins. Total interest saved: ₹${totalInterestSaved.toLocaleString("en-IN")}.`
  }

  if (debtFreeAge && debtFreeAge <= 60) {
    recommendation += ` You'll be debt-free by age ${debtFreeAge}, well before retirement.`
  } else if (debtFreeAge) {
    recommendation += ` Warning: Debt-free age ${debtFreeAge} is after typical retirement age. Consider accelerating payments.`
  }

  return {
    strategy,
    loans: loanItems,
    totalOutstanding: Math.round(totalOutstanding),
    totalInterestSaved: Math.round(totalInterestSaved),
    debtFreeAge,
    recommendation,
    timeline,
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

// ── Recommended strategy based on user profile ──────────────────────

export function recommendStrategy(riskTolerance?: string): PayoffStrategy {
  if (riskTolerance === "aggressive") return "avalanche"
  if (riskTolerance === "conservative") return "snowball"
  // Default: avalanche for financially disciplined users
  return "avalanche"
}
