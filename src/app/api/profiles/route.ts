import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * GET /api/profiles — List all profiles for the authenticated user.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = Number(session.user.id)

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

  const profile = await prisma.profile.create({
    data: {
      name,
      userId,
      isDefault: profileCount === 0,
    },
  })

  return NextResponse.json(profile, { status: 201 })
}
