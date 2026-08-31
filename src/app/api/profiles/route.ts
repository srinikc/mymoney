import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { PLANS, type PlanId } from "@/lib/pricing"

/**
 * GET /api/profiles — List all profiles for the authenticated user.
 */
export async function GET(_req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { userId } = auth
  // userId auto-checked by getAuthContext

  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isDefault: true,
      createdAt: true,
    },
  })

  return NextResponse.json(profiles)
}

/**
 * POST /api/profiles — Create a new profile for the authenticated user.
 */
export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { userId } = auth
  // userId auto-checked by getAuthContext

  let body: { name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const name = body?.name?.trim()
  if (!name || name.length === 0) {
    return NextResponse.json({ error: "Profile name is required" }, { status: 400 })
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Profile name must be at most 100 characters" }, { status: 400 })
  }

  const existing = await prisma.profile.findFirst({
    where: { userId, name },
  })
  if (existing) {
    return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 })
  }

  const profileCount = await prisma.profile.count({ where: { userId } })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  })
  const tier = (user?.tier || "free") as PlanId
  const maxProfiles = PLANS[tier]?.profiles ?? 1

  if (profileCount >= maxProfiles) {
    return NextResponse.json({
      error: `Your ${PLANS[tier].name} plan allows up to ${maxProfiles} profile${maxProfiles > 1 ? "s" : ""}. Upgrade to add more.`,
    }, { status: 403 })
  }

  const profile = await prisma.profile.create({
    data: {
      name,
      userId,
      isDefault: profileCount === 0,
    },
  })

  return NextResponse.json(profile, { status: 201 })
}
