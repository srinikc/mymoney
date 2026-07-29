import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function POST(req: Request) {
  const { profileId, userId, role } = await getAuthContext()
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

  const invite = await prisma.sharedProfile.findFirst({
    where: { id: inviteId, invitedUserId: userId, status: "pending" },
  })
  if (!invite) {
    return NextResponse.json({ error: "Invitation not found or already responded" }, { status: 404 })
  }

  await prisma.sharedProfile.update({
    where: { id: inviteId },
    data: { status: "accepted" },
  })

  return NextResponse.json({ success: true })
}
