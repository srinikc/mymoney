import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const { token, platform } = await req.json()
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 })

    const data = { userId: userId, key: `push_token_${platform || "unknown"}`, value: token }
    await prisma.userSetting.upsert({
      where: { userId_key: { userId: data.userId, key: data.key } },
      create: data,
      update: { value: token },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Push token error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
