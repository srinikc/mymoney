import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { MerchantBatchSchema } from "@/shared/validation"
import { resetVendorKeyCache, addDismissedVendorKeys } from "@/shared/vendor-mapping"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function POST(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const { data: body, error } = await validateBody(req, MerchantBatchSchema)
    if (error) return error
    const { mappings } = body

    let created = 0
    let updated = 0

    for (const m of mappings) {
      const key = m.merchantKey.toLowerCase().trim()
      if (!key) continue

      const category = m.expenseType || ""
      const subCategory = m.subCategory || ""
      const person = m.person || ""

      const existing = await prisma.vendorMapping.findUnique({ where: { userId_vendorKey: { userId, vendorKey: key } } })
      if (existing) {
        await prisma.vendorMapping.update({
          where: { id: existing.id },
          data: { category, subCategory, person, source: "user_review" },
        })
        updated++
      } else {
        await prisma.vendorMapping.create({
          data: { userId, vendorKey: key, category, subCategory, person, source: "user_review" },
        })
        created++
      }
    }

    if (created > 0) resetVendorKeyCache(userId)

    return NextResponse.json({ success: true, created, updated, total: mappings.length })
  } catch (error) {
    console.error("Batch vendor mapping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const body = await req.json()
    const { keys, scope } = body

    // `scope: "unmapped"` dismisses every currently-unmapped vendor at once.
    if (scope === "unmapped") {
      const { getUnmappedVendorKeys } = await import("@/shared/vendor-mapping")
      const allKeys = await getUnmappedVendorKeys(userId)
      if (allKeys.length > 0) {
        await addDismissedVendorKeys(userId, allKeys)
      }
      return NextResponse.json({ success: true, dismissed: allKeys.length, total: allKeys.length, scope: "unmapped" })
    }

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "keys array is required" }, { status: 400 })
    }

    // Dismiss = hide from Unmapped review. Store the keys per-user (UserSetting
    // JSON) so they stay excluded — NO VendorMapping row is created, so they
    // never appear in All Mappings.
    const keysNormalized = keys.map((k: string) => k.toLowerCase().trim()).filter(Boolean)
    if (keysNormalized.length > 0) {
      await addDismissedVendorKeys(userId, keysNormalized)
    }

    return NextResponse.json({ success: true, dismissed: keysNormalized.length, total: keys.length })
  } catch (error) {
    console.error("Batch vendor dismiss error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
