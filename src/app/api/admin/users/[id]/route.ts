import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { validateBody } from "@/shared/validate"
import { UserUpdateSchema } from "@/shared/validation"

/**
 * GET /api/admin/users/:id — Get user detail with profiles
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const { id } = await params
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
      hashedPassword: true,
      accounts: {
        select: { id: true, provider: true, providerAccountId: true },
        orderBy: { provider: "asc" },
      },
      profiles: {
        select: {
          id: true,
          name: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Compute auth method: "google" if linked to Google OAuth, otherwise "credentials"
  const googleAccount = user.accounts.find((a) => a.provider === "google")
  const authMethod = googleAccount ? "google" : "credentials"
  const hasPassword = Boolean(user.hashedPassword)

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    tier: user.tier,
    authMethod,
    hasPassword,
    accounts: user.accounts,
    profiles: user.profiles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
}

/**
 * PATCH /api/admin/users/:id — Update user role/tier (admin-only)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const forbid = requireRole(session.user as AuthUser, "admin")
  if (forbid) return forbid

  const { id } = await params
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  const { data: body, error } = await validateBody(req, UserUpdateSchema)
  if (error) return error

  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.tier !== undefined && { tier: body.tier }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Log to audit (use first profile if available)
  const firstProfile = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true },
  })
  if (firstProfile) {
    try {
      await prisma.auditLog.create({
        data: {
          profileId: firstProfile.id,
          action: "update",
          entity: "user",
          entityId: userId,
          metadata: JSON.stringify({
            changes: body,
            byUserId: Number(session.user.id),
          }),
        },
      })
    } catch {
      // best-effort
    }
  }

  return NextResponse.json(updated)
}

/**
 * DELETE /api/admin/users/:id — Delete user (admin-only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const forbid = requireRole(session.user as AuthUser, "admin")
  if (forbid) return forbid

  const { id } = await params
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  // Prevent self-deletion
  if (userId === Number(session.user.id)) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ success: true, deletedUserId: userId })
}
