import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { tipsForAge, LEARN_TIPS, type AgeBucket } from "@/shared/learn/tips"

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(20, Math.max(1, Number(limitParam) || 10)) : undefined

    const profile = await prisma.profile.findUnique({
      where: { id: ctx.profileId },
      select: { dateOfBirth: true, annualIncome: true },
    })

    const age = profile?.dateOfBirth
      ? Math.floor(
          (Date.now() - profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        )
      : null

    const ageBucket: AgeBucket | null =
      age == null ? null :
      age <= 25 ? "early-career" :
      age <= 35 ? "growth" :
      age <= 50 ? "mid-career" :
      age <= 60 ? "pre-retirement" :
      "retirement"

    let tips = tipsForAge(age, limit)
    if (category) {
      tips = tipsForAge(age).filter((t) => t.category === category)
      if (limit) tips = tips.slice(0, limit)
    }

    return NextResponse.json({
      age,
      ageBucket,
      hasDob: !!profile?.dateOfBirth,
      hasIncome: profile?.annualIncome != null && profile.annualIncome > 0,
      totalAvailable: LEARN_TIPS.length,
      tips,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
