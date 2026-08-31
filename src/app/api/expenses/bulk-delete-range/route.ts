import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

// Testing utility: HARD-deletes expense rows for the profile, optionally
// restricted to the last N months. Admin role only. This permanently removes
// data (no restore) — intended for wiping data to re-import.
export async function POST(req: Request) {
  let userId: number
  let profileId: number
  let role: string
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
    profileId = ctx.profileId
    role = ctx.role
  } catch (e) {
    return handleAuthError(e)
  }

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { scope } = await req.json().catch(() => ({}))
    const where: Record<string, unknown> = { profileId }
    if (scope && scope !== "all") {
      const months = Number.parseInt(String(scope))
      if (Number.isFinite(months) && months > 0) {
        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - months)
        where.date = { gte: cutoff }
      }
    }

    const result = await prisma.expense.deleteMany({ where })
    return NextResponse.json({ success: true, count: result.count, scope: scope || "all", userId })
  } catch (error) {
    console.error("Bulk delete range error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
