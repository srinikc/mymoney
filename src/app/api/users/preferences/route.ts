import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

const SETTINGS_KEY = "mobile_preferences"

export async function GET() {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: userId, key: SETTINGS_KEY } },
    })

    return NextResponse.json(setting?.value || {
      notifications: true,
      weeklyReport: true,
      compactMode: false,
    })
  } catch (error) {
    console.error("Preferences GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const body = await req.json()

    const existing = await prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: SETTINGS_KEY } },
    })

    if (existing) {
      await prisma.userSetting.update({
        where: { id: existing.id },
        data: { value: { ...(existing.value as Record<string, unknown>), ...body } },
      })
    } else {
      await prisma.userSetting.create({
        data: { userId, key: SETTINGS_KEY, value: { notifications: true, weeklyReport: true, compactMode: false, ...body } },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Preferences PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
