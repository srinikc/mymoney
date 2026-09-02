import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"

export const runtime = "nodejs"

// Unlink a Google account from a user. Admin-only. This deletes the Google
// OAuth account row so the user can no longer sign in with Google. Their
// Google Drive / Gmail data already imported into MyMoney is preserved.
// They retain credentials login if hashedPassword is set.

export async function POST(
  _req: Request,
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

  // Don't allow unlinking yourself
  if (userId === Number(session!.user!.id)) {
    return NextResponse.json(
      { error: "You cannot unlink your own Google account. Ask another admin to do this." },
      { status: 400 },
    )
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: { where: { provider: "google" } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (existing.accounts.length === 0) {
    return NextResponse.json({ error: "User has no Google account linked" }, { status: 400 })
  }

  // Also delete the user's sessions so they don't get auto-logged-in
  await prisma.session.deleteMany({ where: { userId } })
  await prisma.account.deleteMany({
    where: { userId, provider: "google" },
  })

  // Audit log
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
          adminUnlinkedGoogle: true,
          byUserId: Number(session!.user!.id),
        }),
      },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, unlinked: true })
}
