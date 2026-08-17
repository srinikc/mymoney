import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { userId, role } = await getAuthContext()
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true, refresh_token: true },
    })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    return NextResponse.json({
      connected: Boolean(account?.access_token),
      email: user?.email || null,
      userId,
      role,
      isAdmin: role === "admin",
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
