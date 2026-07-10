import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole } from "@/lib/roles"
import bcrypt from "bcryptjs"

/**
 * GET /api/admin/users — List all users with profiles (admin-only)
 */
export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as any, "admin")
  if (forbid) return forbid

  try {
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
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * POST /api/admin/users — Create a new user (admin-only)
 */
export async function POST(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as any, "admin")
  if (forbid) return forbid

  try {
    const body = await req.json()
    const { name, email, isGoogleLinked, password, role, profileName } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password for non-Google-linked users
    if (!isGoogleLinked) {
      if (!password) {
        return NextResponse.json({ error: "Password is required for local users" }, { status: 400 })
      }
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
      }
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    // Validate role
    const validRoles = ["user", "admin", "manager", "viewer"]
    const userRole = role || "user"
    if (!validRoles.includes(userRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Create user
    let hashedPassword: string | null = null
    if (!isGoogleLinked && password) {
      hashedPassword = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: userRole,
        hashedPassword,
        profiles: {
          create: {
            name: profileName || "Default",
            isDefault: true,
          },
        },
        // If Google-linked, create an Account record
        ...(isGoogleLinked
          ? {
              accounts: {
                create: {
                  type: "oauth",
                  provider: "google",
                  providerAccountId: `admin_created_${email}_${Date.now()}`,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        tier: true,
        createdAt: true,
        updatedAt: true,
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
