import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId

    const where = profileId ? { profileId } : {}

    const sources = await prisma.incomeSource.findMany({ where })

    let totalMonthly = 0
    let totalYearly = 0
    const bySourceMap: Record<string, { type: string; total: number; count: number }> = {}
    let currentMonth = 0

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    for (const source of sources) {
      const amount = source.amount
      const type = source.type

      // Monthly aggregation
      if (type === "monthly") {
        totalMonthly += amount
      }

      // Yearly aggregation
      switch (type) {
        case "monthly": {
          totalYearly += amount * 12
          break
        }
        case "yearly":
        case "onetime": {
          totalYearly += amount
          break
        }
        case "variable": {
          if (source.startDate) {
            const monthsActive = Math.max(1, Math.ceil(
              ((source.endDate || currentMonthEnd).getTime() - source.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
            ))
            totalYearly += (amount / monthsActive) * 12
          } else {
            totalYearly += amount * 12
          }
          break
        }
      }

      // By source aggregation
      if (!bySourceMap[type]) {
        bySourceMap[type] = { type, total: 0, count: 0 }
      }
      bySourceMap[type].total += amount
      bySourceMap[type].count += 1

      // Current month contribution
      switch (type) {
        case "monthly": {
          currentMonth += amount
          break
        }
        case "yearly": {
          if (source.startDate) {
            const startMonth = source.startDate.getMonth()
            const startYear = source.startDate.getFullYear()
            if (startMonth === now.getMonth() && startYear === now.getFullYear()) {
              currentMonth += amount
            }
          }
          break
        }
        case "onetime": {
          if (source.startDate && source.startDate >= currentMonthStart && source.startDate < currentMonthEnd) {
            currentMonth += amount
          }
          break
        }
        case "variable": {
          currentMonth += amount
          break
        }
      }
    }

    const bySource = Object.values(bySourceMap)

    return NextResponse.json({
      totalMonthly,
      totalYearly,
      bySource,
      currentMonth,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
