import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function POST(req: Request) {
  try {
    const { profileId } = await getAuthContext()
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const year = Number(body.year)
    if (!year || year < 1970 || year > 2100) {
      return NextResponse.json({ error: "year is required" }, { status: 400 })
    }

    const entries = Array.isArray(body.entries) ? body.entries : []
    if (entries.length === 0) {
      return NextResponse.json({ error: "entries is required" }, { status: 400 })
    }

    // Restrict to months in the selected year.
    const now = new Date()
    const selectedYear = year
    const currentMonth = now.getFullYear() === selectedYear ? now.getMonth() + 1 : 1

    let created = 0
    let skipped = 0
    const perMonth: Record<number, { created: number; skipped: number }> = {}

    for (const entry of entries) {
      const categoryId = Number(entry.categoryId)
      const amount = Number(entry.amount)
      if (!categoryId || !amount || amount <= 0) continue
      const subCategory = typeof entry.subCategory === "string" && entry.subCategory.trim() ? entry.subCategory.trim() : null
      const months = (Array.isArray(entry.months) ? entry.months : [])
        .map(Number)
        .filter((m: number) => m >= 1 && m <= 12 && m >= currentMonth)

      for (const month of months) {
        const existing = await prisma.budget.findUnique({
          where: {
            categoryId_month_year: { categoryId, month, year: selectedYear },
          },
        })
        if (existing) {
          skipped++
          perMonth[month] = { created: perMonth[month]?.created || 0, skipped: (perMonth[month]?.skipped || 0) + 1 }
          continue
        }
        await prisma.budget.create({
          data: {
            categoryId,
            subCategory,
            month,
            year: selectedYear,
            amount,
            profileId,
          },
        })
        created++
        perMonth[month] = { created: (perMonth[month]?.created || 0) + 1, skipped: perMonth[month]?.skipped || 0 }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      perMonth,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}