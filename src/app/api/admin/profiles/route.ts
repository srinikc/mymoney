import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/auth"
import { validateBody } from "@/shared/validate"
import { ProfileCreateSchema } from "@/shared/validation"

/**
 * GET /api/admin/profiles — List all profiles with user info (admin-only)
 */
export async function GET(req: Request) {
  const session = await getSessionFromCookie(req.headers.get("cookie"))
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

  const profiles = await prisma.profile.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          expenses: true,
          budgets: true,
          goals: true,
        },
      },
    },
  })

  const result = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    isDefault: p.isDefault,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    userId: p.userId,
    user: p.user,
    expenseCount: p._count.expenses,
    budgetCount: p._count.budgets,
    goalCount: p._count.goals,
  }))

  return NextResponse.json(result)
}

/**
 * POST /api/admin/profiles — Create a profile for any user (admin-only)
 */
export async function POST(req: Request) {
  const session = await getSessionFromCookie(req.headers.get("cookie"))
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

  const { data: body, error } = await validateBody(req, ProfileCreateSchema)
  if (error) return error

  const targetUser = await prisma.user.findUnique({ where: { id: body.userId } })
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Check for duplicate name for this user
  const existing = await prisma.profile.findFirst({
    where: { userId: body.userId, name: body.name },
  })
  if (existing) {
    return NextResponse.json({ error: "A profile with this name already exists for this user" }, { status: 409 })
  }

  const profile = await prisma.profile.create({
    data: {
      name: body.name,
      userId: body.userId,
      isDefault: body.isDefault ?? false,
    },
    select: {
      id: true,
      name: true,
      userId: true,
      isDefault: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  })

  return NextResponse.json(profile, { status: 201 })
}
