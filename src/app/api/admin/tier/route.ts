import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { z } from "zod"

const TierChangeSchema = z.object({
  userId: z.union([z.string(), z.number()]).transform(Number),
  tier: z.enum(["free", "pro", "premium", "enterprise"]),
})

/**
 * PUT /api/admin/tier — Change user tier (admin-only)
 * Body: { userId, tier }
 * Logs to AuditLog
 */
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const forbid = requireRole(session.user as AuthUser, "admin")
  if (forbid) return forbid

  let body: z.infer<typeof TierChangeSchema>
  try {
    const raw = await req.json()
    const result = await TierChangeSchema.safeParseAsync(raw)
    if (!result.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      }, { status: 400 })
    }
    body = result.data
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({ where: { id: body.userId } })
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const oldTier = targetUser.tier

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: { tier: body.tier },
    select: { id: true, email: true, name: true, tier: true, role: true },
  })

  // Log tier change to audit
  const firstProfile = await prisma.profile.findFirst({
    where: { userId: body.userId },
    select: { id: true },
  })
  if (firstProfile) {
    try {
      await prisma.auditLog.create({
        data: {
          profileId: firstProfile.id,
          action: "update",
          entity: "user.tier",
          entityId: body.userId,
          metadata: JSON.stringify({
            oldTier,
            newTier: body.tier,
            changedByUserId: Number(session.user.id),
          }),
        },
      })
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ...updated, oldTier })
}
