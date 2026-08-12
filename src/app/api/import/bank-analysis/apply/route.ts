import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { logAudit } from "@/shared/middleware/audit"

// Apply merged (proposed) descriptions to GPay-imported expenses. Only rows
// belonging to the authenticated profile are updated; nothing else changes.
export async function POST(req: Request) {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const { updates } = await req.json() as {
      updates?: { expenseId: number; description: string }[]
    }

    if (!updates || updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }
    if (updates.length > 2000) {
      return NextResponse.json({ error: "Too many updates (max 2000)" }, { status: 400 })
    }

    const unique = [...new Map(updates.map((u) => [u.expenseId, u])).values()]
    const ids = unique.map((u) => u.expenseId)

    const owned = await prisma.expense.findMany({
      where: { id: { in: ids }, profileId, deletedAt: null },
      select: { id: true, description: true },
    })
    const ownedIds = new Set(owned.map((e) => e.id))

    let updated = 0
    for (const u of unique) {
      if (!ownedIds.has(u.expenseId)) continue
      const desc = u.description?.trim() ?? ""
      if (!desc) continue
      if (owned.find((e) => e.id === u.expenseId)?.description === desc) continue

      await prisma.expense.update({
        where: { id: u.expenseId },
        data: { description: desc },
      })
      updated++
    }

    if (updated > 0) {
      await logAudit(profileId, "update", "expense", undefined,
        `Bank analysis: enriched ${updated} expense description(s)`)
    }

    return NextResponse.json({ success: true, updated, total: unique.length, skipped: unique.length - updated })
  } catch (error) {
    console.error("Bank analysis apply error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}