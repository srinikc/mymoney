import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

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
