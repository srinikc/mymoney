import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import {
  computeEmergencyFund,
  ESSENTIAL_CATEGORIES,
  recommendJobType,
  monthsForProfile,
  type EmergencyFundResult,
} from "@/shared/emergency-fund"

function getMonthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

export async function GET() {
  try {
    const ctx = await getAuthContext()

    // Average monthly essentials over last 3 months
    const start = getMonthsAgo(3)
    const expenses = await prisma.expense.findMany({
      where: {
        profileId: ctx.profileId,
        deletedAt: null,
        date: { gte: start },
        category: { name: { in: Array.from(ESSENTIAL_CATEGORIES) } },
      },
      select: { amount: true, date: true },
    })

    const totalEssentials = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const monthlyEssentials = expenses.length > 0 ? Math.round(totalEssentials / 3) : 0

    const profile = await prisma.profile.findUnique({
      where: { id: ctx.profileId },
      select: { occupation: true, annualIncome: true, dateOfBirth: true },
    })

    // Existing liquid savings: sum of cashBalances + bankAccounts (savings type)
    const [cashBalances, bankAccounts] = await Promise.all([
      prisma.cashBalance.findMany({
        where: { profileId: ctx.profileId },
        select: { amount: true },
      }),
      prisma.bankAccount.findMany({
        where: { profileId: ctx.profileId },
        select: { balance: true, type: true },
      }),
    ])
    const liquidSavings =
      cashBalances.reduce((s, c) => s + Number(c.amount), 0) +
      bankAccounts
        .filter((b) => b.type === "savings")
        .reduce((s, b) => s + Number(b.balance), 0)

    // Dependents: family members (rough proxy via shared profiles)
    const dependents = await prisma.sharedProfile.count({
      where: { profileId: ctx.profileId },
    })

    const jobType = recommendJobType(profile?.occupation)
    const monthlyIncome = profile?.annualIncome ? profile.annualIncome / 12 : 0

    const result: EmergencyFundResult = computeEmergencyFund({
      monthlyEssentials,
      dependents,
      jobType,
      monthlyIncome,
      existingSavings: liquidSavings,
    })

    return NextResponse.json({
      ...result,
      breakdown: {
        monthlyEssentials,
        sampleCount: expenses.length,
        monthsAnalyzed: 3,
        liquidSavings,
        cashTotal: cashBalances.reduce((s, c) => s + Number(c.amount), 0),
        bankSavingsTotal: bankAccounts
          .filter((b) => b.type === "savings")
          .reduce((s, b) => s + Number(b.balance), 0),
        dependents,
        jobType,
        monthlyIncome,
        recommendedMonths: monthsForProfile(jobType, dependents),
      },
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
