import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.max(1, Math.min(200, Number.parseInt(searchParams.get("pageSize") || "100")))
  const search = searchParams.get("search") || ""

  const where: Prisma.ExpenseWhereInput = { flagged: true }
  if (search) {
    where.OR = [
      { vendor: { contains: search } },
      { description: { contains: search } },
      { person: { contains: search } },
    ]
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ])

  return NextResponse.json({
    data: expenses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 })
    }

    if (action === "confirm") {
      // Unflag — keep the expense but clear the flagged status
      await prisma.expense.updateMany({
        where: { id: { in: ids } },
        data: { flagged: false },
      })
      return NextResponse.json({ success: true, action: "confirmed", count: ids.length })
    }

    if (action === "delete") {
      await prisma.expense.deleteMany({
        where: { id: { in: ids } },
      })
      return NextResponse.json({ success: true, action: "deleted", count: ids.length })
    }

    return NextResponse.json({ error: 'action must be "confirm" or "delete"' }, { status: 400 })
  } catch (error) {
    console.error("Flagged batch action error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
