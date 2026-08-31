import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { tierForIncome, INCOME_TIERS, type IncomeTierDef } from "@/shared/income-tiers"

export async function GET() {
  try {
    const ctx = await getAuthContext()
    const profile = await prisma.profile.findUnique({
      where: { id: ctx.profileId },
      select: { annualIncome: true, dateOfBirth: true },
    })
    const income = profile?.annualIncome ?? null
    const tier: IncomeTierDef = tierForIncome(income)

    const nextTier = INCOME_TIERS.find((t) => t.minIncome > (income ?? 0))

    return NextResponse.json({
      income,
      tier,
      nextTier: nextTier ?? null,
      incomeToNextTier: nextTier ? nextTier.minIncome - (income ?? 0) : null,
      allTiers: INCOME_TIERS,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
