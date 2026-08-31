/**
 * POST /api/expenses/auto-categorize/apply
 *
 * Applies user corrections and creates permanent VendorMapping rules.
 * This is the "learning" mechanism — every correction becomes a rule.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { invalidateCache } from "@/shared/auto-categorize-cache"

interface ApplyCorrection {
  vendor: string
  categoryId: number
  categoryName: string
  subCategory?: string
  person?: string
}

export async function POST(req: Request) {
  let profileId: number
  let userId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const { corrections } = await req.json() as { corrections?: ApplyCorrection[] }

    if (!corrections || corrections.length === 0) {
      return NextResponse.json({ error: "No corrections provided" }, { status: 400 })
    }

    let created = 0
    let updated = 0

    for (const c of corrections) {
      if (!c.vendor || !c.categoryId) continue

      const vendorKey = c.vendor.toLowerCase().trim()
      if (!vendorKey) continue

      try {
        const existing = await prisma.autoCatVendorRule.findUnique({
          where: { userId_vendorKey: { userId, vendorKey } },
        })

        if (existing) {
          // Update existing rule
          await prisma.autoCatVendorRule.update({
            where: { id: existing.id },
            data: {
              category: c.categoryName,
              subCategory: c.subCategory || null,
              person: c.person || null,
              source: "user_correction",
            },
          })
          updated++
        } else {
          // Create new rule
          await prisma.autoCatVendorRule.create({
            data: {
              userId,
              vendorKey,
              category: c.categoryName,
              subCategory: c.subCategory || null,
              person: c.person || null,
              source: "user_correction",
            },
          })
          created++
        }
      } catch (e) {
        console.error(`[auto-categorize] Failed to apply correction for ${vendorKey}:`, e)
      }
    }

    // Invalidate cache so next GET re-computes with updated rules
    invalidateCache(userId)

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: corrections.length,
    })
  } catch (error) {
    console.error("[auto-categorize] Apply error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
