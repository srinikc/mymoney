import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import type { Prisma } from "@prisma/client"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext
    const { id } = await params
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 50))
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")
    const search = url.searchParams.get("search")

    const account = await prisma.bankAccount.findUnique({ where: { id: Number(id) } })
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const nameFilter = account.name
    const where: Prisma.ExpenseWhereInput = { bankAccount: nameFilter }

    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lt = new Date(to)
    }
    if (search) {
      where.OR = [
        { vendor: { contains: search } },
        { description: { contains: search } },
        { category: { name: { contains: search } } },
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
      transactions: expenses.map((e) => ({
        id: e.id, date: e.date, amount: e.amount, vendor: e.vendor, description: e.description,
        category: e.category?.name || "Other", type: "expense",
      })),
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("Bank account transactions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
