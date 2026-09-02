import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isAdEnabledPage } from "@/lib/ad-providers"

export const runtime = "nodejs"

interface ClickBody {
  slotId: string
  position: string
  page: string
  provider: string
  targetUrl: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ClickBody
    if (!body.slotId || !body.page || !body.targetUrl) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 })
    }

    if (!isAdEnabledPage(body.page)) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const session = await auth()
    const userId = session?.user ? Number((session.user as { id?: number }).id) || null : null

    await prisma.adClick.create({
      data: {
        userId,
        slotId: body.slotId,
        provider: body.provider,
        page: body.page,
        position: body.position,
        targetUrl: body.targetUrl,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("ad click error:", e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
