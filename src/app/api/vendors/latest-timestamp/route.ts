import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function GET() {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  const result = await prisma.vendorMapping.aggregate({
    where: { userId },
    _max: { updatedAt: true },
  })
  return NextResponse.json({ latestUpdatedAt: result._max.updatedAt })
}
