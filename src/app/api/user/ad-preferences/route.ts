import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserConsent, setUserConsent } from "@/lib/consent"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const userId = Number((session.user as { id?: number }).id)
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const consent = await getUserConsent(userId)
    return NextResponse.json(consent)
  } catch (e) {
    console.error("ad preferences GET error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const userId = Number((session.user as { id?: number }).id)
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const patch = (await req.json()) as Record<string, unknown>
    const updated = await setUserConsent(userId, patch as Parameters<typeof setUserConsent>[1])
    return NextResponse.json(updated)
  } catch (e) {
    console.error("ad preferences PUT error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
