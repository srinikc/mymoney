import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

  const sharedProfiles = await prisma.sharedProfile.findMany({
    where: {
      OR: [{ invitedBy: userId }, { invitedUserId: userId }],
    },
    include: {
      profile: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
      invitedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const sent = sharedProfiles
    .filter((sp) => sp.invitedBy === userId)
    .map((sp) => ({
      id: sp.id,
      profileId: sp.profileId,
      profileName: sp.profile.name,
      email: sp.invitedEmail,
      invitedUser: sp.invitedUser
        ? { id: sp.invitedUser.id, name: sp.invitedUser.name, email: sp.invitedUser.email }
        : null,
      role: sp.role,
      status: sp.status,
      createdAt: sp.createdAt,
    }))

  const received = sharedProfiles
    .filter((sp) => sp.invitedUserId === userId)
    .map((sp) => ({
      id: sp.id,
      profileId: sp.profileId,
      profileName: sp.profile.name,
      inviter: { id: sp.inviter.id, name: sp.inviter.name, email: sp.inviter.email },
      role: sp.role,
      status: sp.status,
      createdAt: sp.createdAt,
    }))

  return NextResponse.json({ sent, received })
}
