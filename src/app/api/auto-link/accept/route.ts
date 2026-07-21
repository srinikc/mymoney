import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const body = await req.json()
    const { expenseId, linkType, targetId } = body

    if (!expenseId || !linkType || !targetId) {
      return NextResponse.json({ error: "expenseId, linkType, targetId required" }, { status: 400 })
    }

    if (!["income", "investment", "insurance", "loan"].includes(linkType)) {
      return NextResponse.json({ error: "Invalid linkType" }, { status: 400 })
    }

    const link = await prisma.expenseLink.create({
      data: {
        profileId: profileId || undefined,
        expenseId,
        linkType,
        targetId,
        autoDetected: true,
        confirmed: true,
      },
    })

    return NextResponse.json({ link }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
