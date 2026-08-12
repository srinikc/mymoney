import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { userId } = await getAuthContext()
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true, refresh_token: true },
    })
    if (!account?.access_token) {
      return NextResponse.json({ connected: false })
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    return NextResponse.json({ connected: true, email: user?.email || null })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
