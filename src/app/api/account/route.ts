import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { logAudit } from "@/shared/middleware/audit"
import { captureError } from "@/lib/error-tracking"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function DELETE(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId, userId } = auth

  try {
    // Require explicit confirmation (GDPR right to be forgotten safeguard)
    const body = (await req.json().catch(() => ({}))) as { confirm?: string }
    if (body.confirm !== "DELETE MY ACCOUNT") {
      return NextResponse.json({
        error: "Confirmation required. Send { confirm: 'DELETE MY ACCOUNT' } in the request body.",
      }, { status: 400 })
    }

    if (!profileId) {
      // Even without a default profile, still allow deletion. We just can't audit-log it.
      logger.warn({ userId }, "user deleting account without default profile")
    } else {
      // Log before deletion (audit log is cascade-deleted with profile)
      await logAudit(profileId, "delete", "profile", profileId, "User deleted their own account")
    }

    // Delete user (cascades to profile, all data, sessions, accounts, etc.)
    // Profile and all child records are cascade-deleted via Prisma schema
    await prisma.user.delete({ where: { id: userId } })

    logger.info({ deletedUserId: userId, deletedAt: new Date().toISOString() }, "user account deleted")
    return NextResponse.json({ ok: true, message: "Account and all associated data deleted permanently" })
  } catch (e) {
    captureError(e, { route: "/api/account", userId })
    logger.error({ err: String(e), userId }, "account deletion failed")
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
