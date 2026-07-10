import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/auth"

/**
 * DELETE /api/admin/profiles/:id — Delete profile (admin-only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
