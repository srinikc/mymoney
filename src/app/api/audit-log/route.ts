import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError , withAuth } from "@/lib/with-auth"

export async function GET(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId, userId, role } = auth
  // userId auto-checked by getAuthContext

  const isAdmin = role === "admin" || role === "manager"

  if (!profileId && !isAdmin) {
    return NextResponse.json({ error: "No profile found" }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") || "50")))
  const action = url.searchParams.get("action") || ""
  const entity = url.searchParams.get("entity") || ""
  const search = url.searchParams.get("search") || ""
  const dateFrom = url.searchParams.get("dateFrom") || ""
  const dateTo = url.searchParams.get("dateTo") || ""

  const where: Record<string, unknown> = {}

  // Non-admin users can only see their own profile's audit entries
  if (!isAdmin && profileId) {
    where.profileId = profileId
  }

  if (action) where.action = action
  if (entity) where.entity = entity

  if (search) {
    where.OR = [
      { metadata: { contains: search } },
      { entity: { contains: search } },
    ]
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lt = new Date(new Date(dateTo).getTime() + 86_400_000)
    where.createdAt = dateFilter
  }

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        profileId: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        profile: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, pageSize })
}
