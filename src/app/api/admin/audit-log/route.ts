import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { Prisma } from "@prisma/client"

/**
 * GET /api/admin/audit-log — List audit logs with pagination (admin-only)
 *
 * Query params:
 *   page     - page number (default: 1)
 *   limit    - items per page (default: 50, max: 200)
 *   action   - filter by action
 *   entity   - filter by entity
 *   userId   - filter by user ID (via profile)
 *   from     - date range start (ISO string)
 *   to       - date range end (ISO string)
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true },
  })
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50")))
  const actionFilter = url.searchParams.get("action")
  const entityFilter = url.searchParams.get("entity")
  const userIdFilter = url.searchParams.get("userId")
  const fromDate = url.searchParams.get("from")
  const toDate = url.searchParams.get("to")

  // Build where clause
  const where: Record<string, unknown> = {}

  if (actionFilter) {
    where.action = actionFilter
  }

  if (entityFilter) {
    where.entity = entityFilter
  }

  if (userIdFilter) {
    const profileIds = await prisma.profile.findMany({
      where: { userId: Number(userIdFilter) },
      select: { id: true },
    })
    where.profileId = { in: profileIds.map((p) => p.id) }
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) dateFilter.lte = new Date(toDate)
    where.createdAt = dateFilter
  }

  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.auditLog.count({ where: where as any }),
  ])

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
