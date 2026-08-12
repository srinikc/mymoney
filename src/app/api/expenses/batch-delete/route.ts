import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function POST(req: Request) {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 })
    }
    const result = await prisma.expense.updateMany({
      where: { id: { in: ids.map(Number) }, profileId },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error("Batch delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
