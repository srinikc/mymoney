import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { cached, CACHE_TTL, CacheKeys } from "@/lib/cache"

export async function GET() {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  const years = await cached(CacheKeys.expenseYears(profileId), CACHE_TTL.SHORT, async () => {
    const dates = await prisma.expense.findMany({
      where: { profileId },
      select: { date: true },
      orderBy: { date: "asc" },
    })
    const currentYear = new Date().getFullYear()
    const y = [...new Set(dates.map((d) => d.date.getFullYear()))]
    if (!y.includes(currentYear)) y.push(currentYear)
    y.sort((a, b) => a - b)
    return y
  })

  return NextResponse.json({ years })
}
