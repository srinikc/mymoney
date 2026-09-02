import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dismissWelcome } from "@/lib/consent"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const userId = Number((session.user as { id?: number }).id)
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const body = (await req.json().catch(() => ({}))) as { accepted?: boolean }
    await dismissWelcome(userId)
    return NextResponse.json({ ok: true, accepted: body.accepted ?? true })
  } catch (e) {
    console.error("dismiss welcome error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
