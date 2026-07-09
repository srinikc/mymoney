import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "node:crypto"

// Only available on localhost for E2E testing
export async function GET() {
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

    const sessionToken = crypto.randomUUID()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    })

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profileId: profile?.id },
    })

    response.cookies.set("authjs.session-token", sessionToken, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
