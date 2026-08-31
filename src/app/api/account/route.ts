import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { logAudit } from "@/shared/middleware/audit"

export async function DELETE() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId, userId } = auth
  // userId auto-checked by getAuthContext

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
