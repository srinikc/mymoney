import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import bcrypt from "bcryptjs"

export const runtime = "nodejs"

// Admin sets a user's password. Used when:
// - User signed up via Google only and needs a credentials login
// - User forgot password and admin needs to reset
// Sets hashedPassword so user can sign in with email + password.

export async function POST(
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

  const body = (await req.json().catch(() => ({}))) as { password?: string }
  if (!body.password || body.password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const hashed = await bcrypt.hash(body.password, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed },
  })

  // Audit
  const firstProfile = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true },
  })
  if (firstProfile) {
    await prisma.auditLog.create({
      data: {
        profileId: firstProfile.id,
        action: "update",
        entity: "user",
        entityId: userId,
        metadata: JSON.stringify({
          adminSetPassword: true,
          byUserId: Number(session!.user!.id),
        }),
      },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, passwordSet: true })
}
