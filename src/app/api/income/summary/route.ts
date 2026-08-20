import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/with-auth"

export async function GET(req: Request) {
    const { profileId, role } = await getAuthContext()
    if (role === "viewer") {
      return NextResponse.json({ error: "Viewers cannot view summary" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const reqMonth = Number.parseInt(searchParams.get("month") || "")
    const reqYear = Number.parseInt(searchParams.get("year") || "")
    const now = new Date()
    const month = reqMonth >= 1 && reqMonth <= 12 ? reqMonth - 1 : now.getMonth()
    const year = reqYear >= 1970 ? reqYear : now.getFullYear()
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 1)

    const where = profileId ? { profileId } : {}

    const sources = await prisma.incomeSource.findMany({ where })

    let totalMonthly = 0
    let totalYearly = 0
    const bySourceMap: Record<string, { type: string; total: number; count: number }> = {}
    let monthIncome = 0

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
              ((source.endDate || monthEnd).getTime() - source.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
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

      // Selected month contribution
      switch (type) {
        case "monthly": {
          monthIncome += amount
          break
        }
        case "yearly": {
          if (source.startDate) {
            const startMonth = source.startDate.getMonth()
            const startYear = source.startDate.getFullYear()
            if (startMonth === month && startYear === year) {
              monthIncome += amount
            }
          }
          break
        }
        case "onetime": {
          if (source.startDate && source.startDate >= monthStart && source.startDate < monthEnd) {
            monthIncome += amount
          }
          break
        }
        case "variable": {
          monthIncome += amount
          break
        }
      }
    }

    const bySource = Object.values(bySourceMap)

    return NextResponse.json({
      totalMonthly,
      totalYearly,
      bySource,
      currentMonth: monthIncome,
      monthIncome,
      month: month + 1,
      year,
    })
}
