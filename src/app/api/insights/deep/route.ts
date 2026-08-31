import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // 1. Monthly trend (last 12 months)
  const monthlyTrend = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const m = currentMonth - 11 + i
      const y = currentYear + Math.floor((m - 1) / 12)
      const monthIdx = ((m - 1) % 12 + 12) % 12
      const start = new Date(y, monthIdx, 1)
      const end = new Date(y, monthIdx + 1, 1)
      const agg = await prisma.expense.aggregate({
        where: { profileId, date: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      })
      const monthName = new Date(y, monthIdx).toLocaleString("en-US", { month: "short" })
      return { month: `${monthName} ${y}`, amount: agg._sum.amount || 0, count: agg._count }
    })
  )

  // 2. Category breakdown with sub-categories
  const categories = await prisma.category.findMany({ where: { type: "expense" } })
  const categoryBreakdown = await Promise.all(
    categories.map(async (cat) => {
      const agg = await prisma.expense.aggregate({
        where: { profileId, categoryId: cat.id },
        _sum: { amount: true },
        _count: true,
      })
      const subCats = await prisma.expense.groupBy({
        by: ["subCategory"],
        where: { profileId, categoryId: cat.id, subCategory: { not: null } },
        _sum: { amount: true },
        _count: true,
      })
      return {
        name: cat.name,
        color: cat.color,
        amount: agg._sum.amount || 0,
        count: agg._count,
        subCategories: subCats
          .filter((s) => s.subCategory)
          .map((s) => ({
            name: s.subCategory!,
            amount: s._sum.amount || 0,
            count: s._count,
          }))
          .sort((a, b) => b.amount - a.amount),
      }
    })
  )

  const filteredCats = categoryBreakdown.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)

  // 3. Person-wise spending
  const personGroups = await prisma.expense.groupBy({
    by: ["person"],
    where: { profileId, person: { not: null } },
    _sum: { amount: true },
    _count: true,
  })
  const personWise = personGroups
    .filter((p) => p.person)
    .map((p) => ({
      name: p.person!,
      amount: p._sum.amount || 0,
      count: p._count,
    }))
    .sort((a, b) => b.amount - a.amount)

  // 4. Top merchants
  const vendorGroups = await prisma.expense.groupBy({
    by: ["vendor"],
    where: { profileId, vendor: { not: null } },
    _sum: { amount: true },
    _count: true,
  })
  const topMerchants = vendorGroups
    .filter((v) => v.vendor && v.vendor !== "nan" && v.vendor !== "")
    .map((v) => ({
      name: v.vendor!,
      amount: v._sum.amount || 0,
      count: v._count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20)

  // 5. YoY comparison
  const yearStart = currentYear - 1
  const years = await Promise.all(
    [yearStart - 1, yearStart, currentYear].map(async (year) => {
      const start = new Date(year, 0, 1)
      const end = new Date(year + 1, 0, 1)
      const agg = await prisma.expense.aggregate({
        where: { profileId, date: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      })
      return { year, amount: agg._sum.amount || 0, count: agg._count }
    })
  )

  // 6. Spend optimization suggestions
  const totalAllTime = filteredCats.reduce((s, c) => s + c.amount, 0)
  const optimization = filteredCats.slice(0, 5).map((cat) => {
    const pct = totalAllTime > 0 ? (cat.amount / totalAllTime) * 100 : 0
    const subCats = cat.subCategories.slice(0, 3)
    // Suggest 10% reduction
    const potential = Math.round(cat.amount * 0.1)
    return {
      category: cat.name,
      percentage: Math.round(pct * 10) / 10,
      total: cat.amount,
      monthlyAvg: cat.count > 0 ? Math.round(cat.amount / Math.max(1, Math.round(cat.count / 30))) : 0,
      subCategories: subCats,
      potentialSavings: potential,
    }
  })

  // 7. Deal matches (from deals table matching top merchants)
  const topMerchantNames = topMerchants.slice(0, 5).map((m) => m.name.toLowerCase())
  const deals = await prisma.deal.findMany({
    where: {
      profileId,
      isActive: true,
      merchant: { in: topMerchantNames },
    },
    take: 5,
    orderBy: { validUntil: "asc" },
  })

  return NextResponse.json({
    monthlyTrend,
    categoryBreakdown: filteredCats,
    personWise,
    topMerchants,
    yearlyComparison: years,
    optimization,
    deals,
  })
}
