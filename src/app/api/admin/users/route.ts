import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * GET /api/admin/users — List all users with profiles (admin-only)
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check admin role
  const currentUser = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true },
  })
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { profiles: true } },
      profiles: {
        select: {
          id: true,
          name: true,
          isDefault: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    tier: u.tier,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    profileCount: u._count.profiles,
    profiles: u.profiles,
  }))

  return NextResponse.json(result)
}
