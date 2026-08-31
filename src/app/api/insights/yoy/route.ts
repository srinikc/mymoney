import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET(request: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { searchParams } = new URL(request.url)
  const categoryName = searchParams.get("category")
  const yearsParam = searchParams.get("years")

  if (!categoryName) {
    return NextResponse.json({ error: "category parameter is required" }, { status: 400 })
  }

  const category = await prisma.category.findFirst({
    where: { name: categoryName, type: "expense" },
  })

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  const years = yearsParam
    ? yearsParam.split(",").map(Number).filter((y) => !Number.isNaN(y))
    : [new Date().getFullYear() - 1, new Date().getFullYear()]

  const results = await Promise.all(
    years.map(async (year) => {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year + 1, 0, 1)

      const agg = await prisma.expense.aggregate({
        where: { profileId, categoryId: category.id, date: { gte: yearStart, lt: yearEnd } },
        _sum: { amount: true },
        _count: true,
      })

      // Month-by-month breakdown
      const monthBreakdown = await Promise.all(
        Array.from({ length: 12 }, async (_, i) => {
          const start = new Date(year, i, 1)
          const end = new Date(year, i + 1, 1)
          const mAgg = await prisma.expense.aggregate({
            where: { profileId, categoryId: category.id, date: { gte: start, lt: end } },
            _sum: { amount: true },
            _count: true,
          })
          return {
            month: start.toLocaleString("en-US", { month: "short" }),
            amount: mAgg._sum.amount || 0,
            count: mAgg._count,
          }
        })
      )

      return {
        year,
        amount: agg._sum.amount || 0,
        count: agg._count,
        monthBreakdown,
      }
    })
  )

  return NextResponse.json({ category: categoryName, data: results })
}
