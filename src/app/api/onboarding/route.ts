import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/auth"

/**
 * GET /api/onboarding/status — Check if user completed onboarding
 */
export async function GET(req: Request) {
  const session = await getSessionFromCookie(req.headers.get("cookie"))
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      _count: { select: { profiles: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Onboarding is "complete" if the user has at least one profile
  const hasProfile = user._count.profiles > 0
  const hasName = !!user.name

  return NextResponse.json({
    completed: hasProfile && hasName,
    hasProfile,
    hasName,
    userId: user.id,
  })
}

/**
 * POST /api/onboarding/complete — Mark onboarding as complete
 * Creates the first profile for the user if it doesn't exist yet
 * Body: { name?, currency?, profileName? }
 */
export async function POST(req: Request) {
  const session = await getSessionFromCookie(req.headers.get("cookie"))
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

  let body: { name?: string; profileName?: string; currency?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  // Update user name if provided
  if (body.name?.trim()) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: body.name.trim() },
    })
  }

  // Create default profile if none exists
  const profileCount = await prisma.profile.count({ where: { userId } })
  if (profileCount === 0) {
    const profileName = body.profileName?.trim() || body.name?.trim() || "Default"
    await prisma.profile.create({
      data: {
        name: profileName,
        userId,
        isDefault: true,
      },
    })
  }

  return NextResponse.json({
    success: true,
    completed: true,
  })
}
