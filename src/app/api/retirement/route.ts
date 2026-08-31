import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { z } from "zod"
import { calculateRetirement } from "@/shared/nps"

const Schema = z.object({
  currentAge: z.number().int().min(18).max(70),
  retirementAge: z.number().int().min(40).max(75),
  lifeExpectancy: z.number().int().min(60).max(100),
  currentMonthlyExpense: z.number().positive(),
  currentCorpus: z.number().nonnegative(),
  monthlyInvestment: z.number().nonnegative(),
  preRetirementReturn: z.number().min(0).max(30),
  postRetirementReturn: z.number().min(0).max(20),
  inflation: z.number().min(0).max(15).default(6),
  stepUpPct: z.number().min(0).max(30).default(10),
})

export async function POST(req: Request) {
  try {
    await getAuthContext()
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }
    const input = parsed.data
    if (input.retirementAge <= input.currentAge) {
      return NextResponse.json({ error: "Retirement age must be greater than current age" }, { status: 400 })
    }
    if (input.lifeExpectancy <= input.retirementAge) {
      return NextResponse.json({ error: "Life expectancy must be greater than retirement age" }, { status: 400 })
    }
    const result = calculateRetirement(input)

    // Try to enrich with profile data if available
    let profileData: { currentCorpusFromDB?: number; monthlyIncome?: number } = {}
    try {
      const ctx = await getAuthContext()
      const [profile, investmentAgg, cashBalances, bankAccounts] = await Promise.all([
        prisma.profile.findUnique({ where: { id: ctx.profileId }, select: { annualIncome: true } }),
        prisma.investment.aggregate({ where: { profileId: ctx.profileId }, _sum: { amount: true } }),
        prisma.cashBalance.findMany({ where: { profileId: ctx.profileId }, select: { amount: true } }),
        prisma.bankAccount.findMany({ where: { profileId: ctx.profileId }, select: { balance: true, type: true } }),
      ])
      const liquidSavings = cashBalances.reduce((s, c) => s + Number(c.amount), 0) + bankAccounts.filter((b) => b.type === "savings").reduce((s, b) => s + Number(b.balance), 0)
      const totalInvested = Number(investmentAgg._sum.amount || 0)
      profileData = {
        currentCorpusFromDB: Math.round(liquidSavings + totalInvested),
        monthlyIncome: profile?.annualIncome ? Math.round(profile.annualIncome / 12) : undefined,
      }
    } catch {
      // best effort
    }

    return NextResponse.json({
      ...result,
      profileData,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
