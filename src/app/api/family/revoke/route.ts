import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function DELETE(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { userId } = auth
  // userId auto-checked by getAuthContext

  let body: { inviteId?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { inviteId } = body
  if (!inviteId) {
    return NextResponse.json({ error: "inviteId is required" }, { status: 400 })
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
