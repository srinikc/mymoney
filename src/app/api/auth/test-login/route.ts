import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SignJWT } from "jose"

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "my-money-secret-change-in-production-abc123xyz")

export async function GET() {
  if (process.env.E2E !== "true") {
    return NextResponse.json({ error: "Test login is only available in E2E mode" }, { status: 403 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: "test@example.com" },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Test user not found. Run seed-test first." }, { status: 404 })
    }

    const profile = await prisma.profile.findFirst({
      where: { userId: user.id, isDefault: true },
      select: { id: true },
    })

    const token = await new SignJWT({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      profileId: profile?.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(SECRET)

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profileId: profile?.id },
      token,
    })

    response.cookies.set("authjs.session-token", token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Test login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
