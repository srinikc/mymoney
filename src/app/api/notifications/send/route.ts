import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendPushToUser } from "@/lib/expo-push"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { title, body, data } = await req.json()
    if (!title || !body) return NextResponse.json({ error: "title and body required" }, { status: 400 })

    await sendPushToUser(Number(session.user.id), { title, body, data })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
