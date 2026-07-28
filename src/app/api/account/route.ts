import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logAudit } from "@/shared/middleware/audit"

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sUser = session.user as unknown as { profileId?: number }
  const profileId = sUser.profileId
  const userId = Number(session.user.id)

  if (!profileId) {
    return NextResponse.json({ error: "No profile found" }, { status: 400 })
  }

  // Log before deletion (audit log is cascade-deleted with profile)
  await logAudit(profileId, "delete", "profile", profileId, "User deleted their own account")

  // Delete user (cascades to profile, all data, sessions, accounts, etc.)
  // Profile and all child records are cascade-deleted via Prisma schema
  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ ok: true, message: "Account and all associated data deleted permanently" })
}
