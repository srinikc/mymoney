import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole } from "@/lib/roles"

/**
 * DELETE /api/admin/profiles/:id — Delete profile (admin-only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const forbid = requireRole(session?.user as any, "admin")
  if (forbid) return forbid

  const { id } = await params
  const profileId = Number(id)
  if (Number.isNaN(profileId)) {
    return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 })
  }

  const existing = await prisma.profile.findUnique({ where: { id: profileId } })
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  await prisma.profile.delete({ where: { id: profileId } })

  return NextResponse.json({ success: true, deletedProfileId: profileId })
}
