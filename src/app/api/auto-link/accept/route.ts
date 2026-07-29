import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function POST(req: Request) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext
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
    console.error("Auto-link accept error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
