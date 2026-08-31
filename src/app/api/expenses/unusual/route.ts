import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { UNUSUAL_THRESHOLD } from "@/shared/validation"
import { z } from "zod"

const BulkActionSchema = z.object({
  action: z.enum(["dismiss", "categorize"]),
  ids: z.array(z.number().int().positive()).min(1).max(500),
  purpose: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const pageSize = Math.max(1, Math.min(200, Number.parseInt(searchParams.get("pageSize") || "50")))
    const search = searchParams.get("search") || ""
    const purpose = searchParams.get("purpose") || ""

    const where = {
      isUnusual: true,
      profileId: ctx.profileId,
      deletedAt: null,
      ...(purpose ? { purpose } : {}),
      ...(search
        ? {
            OR: [
              { vendor: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const [expenses, total, totalAmount, purposeBreakdown] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: "desc" }, { amount: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.groupBy({
        by: ["purpose"],
        where: { isUnusual: true, profileId: ctx.profileId, deletedAt: null },
        _count: true,
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      data: expenses,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalAmount: totalAmount._sum.amount || 0,
      threshold: UNUSUAL_THRESHOLD,
      purposeBreakdown: purposeBreakdown
        .filter((p) => p.purpose)
        .map((p) => ({
          purpose: p.purpose,
          count: p._count,
          total: p._sum.amount || 0,
        }))
        .sort((a, b) => b.total - a.total),
    })
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext()
    const body = await req.json().catch(() => null)
    const parsed = BulkActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 })
    }

    const { action, ids, purpose } = parsed.data

    const owned = await prisma.expense.findMany({
      where: { id: { in: ids }, profileId: ctx.profileId },
      select: { id: true },
    })
    const ownedIds = owned.map((e) => e.id)
    if (ownedIds.length === 0) {
      return NextResponse.json({ error: "No matching expenses found" }, { status: 404 })
    }

    if (action === "dismiss") {
      await prisma.expense.updateMany({
        where: { id: { in: ownedIds } },
        data: { isUnusual: false },
      })
      return NextResponse.json({ success: true, action, updated: ownedIds.length })
    }

    if (action === "categorize") {
      if (!purpose) {
        return NextResponse.json({ error: "purpose required for categorize action" }, { status: 400 })
      }
      await prisma.expense.updateMany({
        where: { id: { in: ownedIds } },
        data: { purpose, isUnusual: false },
      })
      return NextResponse.json({ success: true, action, purpose, updated: ownedIds.length })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    return handleAuthError(e)
  }
}
