import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { sendPushToUser } from "@/lib/expo-push"

export async function POST(req: Request) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const { title, body, data } = await req.json()
    if (!title || !body) return NextResponse.json({ error: "title and body required" }, { status: 400 })

    await sendPushToUser(userId, { title, body, data })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Notification send error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
