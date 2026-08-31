import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function GET() {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  const dates = await prisma.expense.findMany({
    where: { profileId },
    select: { date: true },
    orderBy: { date: "asc" },
  })
  const currentYear = new Date().getFullYear()
  const years = [...new Set(dates.map((d) => d.date.getFullYear()))]
  if (!years.includes(currentYear)) years.push(currentYear)
  years.sort((a, b) => a - b)
  return NextResponse.json({ years })
}
