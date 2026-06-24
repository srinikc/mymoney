import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { BudgetCreateSchema } from "@/shared/validation"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || "")
  const year = parseInt(searchParams.get("year") || "")

  const where: Record<string, unknown> = {}
  if (month) where.month = month
  if (year) where.year = year

  const budgets = await prisma.budget.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  })

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const startDate = new Date(budget.year, budget.month - 1, 1)
      const endDate = new Date(budget.year, budget.month, 1)

      const agg = await prisma.expense.aggregate({
        where: {
          categoryId: budget.categoryId,
          date: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      })

      const spent = agg._sum.amount || 0
      return { ...budget, spent, remaining: budget.amount - spent }
    })
  )

  return NextResponse.json(budgetsWithSpent)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, BudgetCreateSchema)
  if (error) return error

  const budget = await prisma.budget.create({
    data: {
      categoryId: body.categoryId,
      month: body.month,
      year: body.year,
      amount: body.amount,
    },
    include: { category: true },
  })
  return NextResponse.json(budget, { status: 201 })
}

export async function PUT(req: Request) {
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const budget = await prisma.budget.update({
    where: { id: parseInt(body.id) },
    data: { amount: parseFloat(body.amount) },
    include: { category: true },
  })
  return NextResponse.json(budget)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.budget.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
