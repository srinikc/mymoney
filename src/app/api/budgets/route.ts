import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendPushToUser } from "@/lib/expo-push"
import { validateBody } from "@/shared/validate"
import { BudgetCreateSchema } from "@/shared/validation"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const month = Number.parseInt(searchParams.get("month") || "")
  const year = Number.parseInt(searchParams.get("year") || "")

  const where: Record<string, unknown> = {}
  if (month) where.month = month
  if (year) where.year = year

  const budgets = await prisma.budget.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
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

async function checkBudgetThreshold(budgetId: number, userId: number) {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { category: true },
    })
    if (!budget) return

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
    const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

    if (pct >= 90) {
      await sendPushToUser(userId, {
        title: `Budget Alert: ${budget.category?.name || "Category"}`,
        body: `You've used ${Math.round(pct)}% of your ${budget.category?.name || "budget"} (${spent.toLocaleString()} / ${budget.amount.toLocaleString()})`,
        data: { type: "budget_alert", budgetId: budget.id, pct },
      })
    } else if (pct >= 75) {
      await sendPushToUser(userId, {
        title: `Budget Warning: ${budget.category?.name || "Category"}`,
        body: `You've used ${Math.round(pct)}% of your ${budget.category?.name || "budget"}. ${(budget.amount - spent).toLocaleString()} remaining.`,
        data: { type: "budget_warning", budgetId: budget.id, pct },
      })
    }
  } catch {
  }
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, BudgetCreateSchema)
  if (error) return error
  const session = await auth()

  const budget = await prisma.budget.create({
    data: {
      categoryId: body.categoryId,
      month: body.month,
      year: body.year,
      amount: body.amount,
    },
    include: { category: true },
  })

  if (session?.user?.id) {
    checkBudgetThreshold(budget.id, Number(session.user.id)).catch(() => {})
  }

  return NextResponse.json(budget, { status: 201 })
}

export async function PUT(req: Request) {
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const session = await auth()

  const budget = await prisma.budget.update({
    where: { id: Number.parseInt(body.id) },
    data: { amount: Number.parseFloat(body.amount) },
    include: { category: true },
  })

  if (session?.user?.id) {
    checkBudgetThreshold(budget.id, Number(session.user.id)).catch(() => {})
  }

  return NextResponse.json(budget)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.budget.delete({ where: { id: Number.parseInt(id) } })
  return NextResponse.json({ success: true })
}
