import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { token, platform } = await req.json()
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 })

    const data = { userId: Number(session.user.id), key: `push_token_${platform || "unknown"}`, value: token }
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
