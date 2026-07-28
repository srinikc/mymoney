import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    })
    if (existingAdmin) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 400 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name: "admin",
        role: "admin",
        tier: "premium",
        hashedPassword,
      },
    })

    await prisma.profile.create({
      data: {
        name: "Default Profile",
        userId: user.id,
        isDefault: true,
      },
    })

    return NextResponse.json({ ok: true, email: user.email })
  } catch (error) {
    console.error("Setup admin error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
