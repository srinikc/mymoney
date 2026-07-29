import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function POST(req: Request) {
  const { profileId: authProfileId, userId, role: authRole } = await getAuthContext()
  // userId auto-checked by getAuthContext

  let body: { profileId?: number; email?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { profileId, email, role } = body
  if (!profileId || !email) {
    return NextResponse.json({ error: "profileId and email are required" }, { status: 400 })
  }

  const invitedEmail = email.trim().toLowerCase()
  if (!invitedEmail) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true, name: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }
  if (profile.userId !== userId) {
    return NextResponse.json({ error: "You can only invite others to your own profiles" }, { status: 403 })
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: invitedEmail },
    select: { id: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 })
  }
  if (targetUser.id === userId) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 })
  }

  const existing = await prisma.sharedProfile.findUnique({
    where: { profileId_invitedEmail: { profileId, invitedEmail } },
  })
  if (existing) {
    return NextResponse.json({ error: "An invitation for this email already exists for this profile" }, { status: 409 })
  }

  const invitation = await prisma.sharedProfile.create({
    data: {
      profileId,
      invitedEmail,
      invitedUserId: targetUser.id,
      invitedBy: userId,
      role: role === "editor" ? "editor" : "viewer",
      status: "pending",
    },
    include: {
      profile: { select: { name: true } },
      inviter: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json(invitation, { status: 201 })
}
