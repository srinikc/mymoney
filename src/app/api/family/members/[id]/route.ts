import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError , withAuth } from "@/lib/with-auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId, userId, role } = auth
  // userId auto-checked by getAuthContext

  const { id } = await params
  const inviteId = Number(id)

  if (isNaN(inviteId)) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 })
  }

  const invite = await prisma.sharedProfile.findUnique({
    where: { id: inviteId },
    select: { invitedBy: true },
  })
  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
  }
  if (invite.invitedBy !== userId) {
    return NextResponse.json({ error: "Only the inviter can revoke this invitation" }, { status: 403 })
  }

  await prisma.sharedProfile.update({
    where: { id: inviteId },
    data: { status: "revoked" },
  })

  return NextResponse.json({ success: true })
}
