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
import { cached, CACHE_TTL, CacheKeys, cacheDel } from "@/lib/cache"

const OVERRIDES_KEY = "emergency_fund_overrides"

function getMonthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

export async function GET() {
  try {
    const ctx = await getAuthContext()

    const result = await cached(CacheKeys.emergencyFund(ctx.profileId), CACHE_TTL.SHORT, async () => {
      // Load saved overrides from UserSetting
      const savedSetting = await prisma.userSetting.findUnique({
        where: { userId_key: { userId: ctx.userId, key: OVERRIDES_KEY } },
        select: { value: true },
      })
      const savedOverrides = (savedSetting?.value as Record<string, unknown>) || {}

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

      const [cashBalances, bankAccounts] = await Promise.all([
        prisma.cashBalance.findMany({ where: { profileId: ctx.profileId }, select: { amount: true } }),
        prisma.bankAccount.findMany({ where: { profileId: ctx.profileId }, select: { balance: true, type: true } }),
      ])
      const liquidSavings =
        cashBalances.reduce((s, c) => s + Number(c.amount), 0) +
        bankAccounts.filter((b) => b.type === "savings").reduce((s, b) => s + Number(b.balance), 0)

      const sharedCount = await prisma.sharedProfile.count({ where: { profileId: ctx.profileId } })
      const dependents = typeof savedOverrides.dependents === "number" ? savedOverrides.dependents : sharedCount
      const autoJobType = recommendJobType(profile?.occupation)
      const jobType = typeof savedOverrides.jobType === "string" ? savedOverrides.jobType : autoJobType
      const monthlyIncome = profile?.annualIncome ? profile.annualIncome / 12 : 0
      const finalMonthlyEssentials = typeof savedOverrides.monthlyEssentials === "number" ? savedOverrides.monthlyEssentials : monthlyEssentials
      const finalExistingSavings = typeof savedOverrides.existingSavings === "number" ? savedOverrides.existingSavings : liquidSavings

      const efResult: EmergencyFundResult = computeEmergencyFund({
        monthlyEssentials: finalMonthlyEssentials,
        dependents,
        jobType,
        monthlyIncome,
        existingSavings: finalExistingSavings,
      })

      return {
        ...efResult,
        breakdown: {
          monthlyEssentials: finalMonthlyEssentials,
          sampleCount: expenses.length,
          monthsAnalyzed: 3,
          liquidSavings: finalExistingSavings,
          cashTotal: cashBalances.reduce((s, c) => s + Number(c.amount), 0),
          bankSavingsTotal: bankAccounts.filter((b) => b.type === "savings").reduce((s, b) => s + Number(b.balance), 0),
          dependents,
          jobType,
          monthlyIncome,
          recommendedMonths: monthsForProfile(jobType, dependents),
        },
        hasOverrides: Object.keys(savedOverrides).length > 0,
      }
    })

    return NextResponse.json(result)
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext()
    const body = await req.json()

    const overrides: Record<string, unknown> = {}
    if (typeof body.jobType === "string") overrides.jobType = body.jobType
    if (typeof body.dependents === "number") overrides.dependents = body.dependents
    if (typeof body.monthlyEssentials === "number") overrides.monthlyEssentials = body.monthlyEssentials
    if (typeof body.existingSavings === "number") overrides.existingSavings = body.existingSavings

    await prisma.userSetting.upsert({
      where: { userId_key: { userId: ctx.userId, key: OVERRIDES_KEY } },
      create: { userId: ctx.userId, key: OVERRIDES_KEY, value: overrides as any },
      update: { value: overrides as any },
    })

    return NextResponse.json({ ok: true })
    const ctx2 = await getAuthContext()
    await cacheDel(CacheKeys.emergencyFund(ctx2.profileId))
  } catch (e) {
    return handleAuthError(e)
  }
}
