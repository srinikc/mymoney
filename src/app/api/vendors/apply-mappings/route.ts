import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

// Applies the user's current vendor mappings to existing expense rows.
//
// Design goals (scale-safe):
// - Only touches rows that are INCOMPLETE (blank subCategory or person), so a
//   user with lakhs of fully-mapped rows is never rescanned/rewritten.
// - Set-based: loads mappings + categories once, then issues a small number of
//   `updateMany` calls (one per distinct target combo) instead of per-vendor or
//   per-row queries.
// - Scoped to the user's profiles only (multi-tenant safe).
export async function POST() {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const profiles = await prisma.profile.findMany({ where: { userId }, select: { id: true } })
    const profileIds = profiles.map((p) => p.id)
    if (profileIds.length === 0) {
      return NextResponse.json({ success: true, updated: 0, vendorCount: 0, message: "No profiles found" })
    }

    // 1) Load all vendor mappings once.
    const mappings = await prisma.vendorMapping.findMany({
      where: { userId },
      select: { vendorKey: true, category: true, subCategory: true, person: true },
    })
    if (mappings.length === 0) {
      return NextResponse.json({ success: true, updated: 0, vendorCount: 0, message: "No vendor mappings to apply" })
    }

    // 2) Resolve category names -> ids once.
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const catIdByName = new Map<string, number>()
    for (const c of categories) catIdByName.set(c.name.toLowerCase(), c.id)
    const getCatId = (name: string): number | null => catIdByName.get(name.toLowerCase()) ?? null

    // 3) Build per-vendor resolved targets (categoryId may be null when the
    //    mapping's category name has no matching Category row).
    const targetsByVendor = new Map<string, { categoryId: number | null; subCategory: string | null; person: string | null }>()
    for (const m of mappings) {
      const key = m.vendorKey.toLowerCase().trim()
      if (!key) continue
      targetsByVendor.set(key, {
        categoryId: m.category ? getCatId(m.category) : null,
        subCategory: m.subCategory || null,
        person: m.person || null,
      })
    }

    // 4) Fetch ONLY incomplete rows (blank subCategory or person) across the
    //    user's profiles — fully-mapped rows are never loaded.
    const incomplete = await prisma.expense.findMany({
      where: { profileId: { in: profileIds }, deletedAt: null, OR: [{ subCategory: null }, { person: null }] },
      select: { id: true, vendor: true, subCategory: true, person: true },
    })
    if (incomplete.length === 0) {
      return NextResponse.json({ success: true, updated: 0, vendorCount: 0, message: "All expenses already mapped" })
    }

    // 5) Match in memory (O(1) per row) and group rows by resolved target so we
    //    issue one updateMany per distinct combo.
    const updatedIds = new Set<number>()
    const rowsByTarget = new Map<string, number[]>()
    for (const row of incomplete) {
      const vendorKey = (row.vendor || "").toLowerCase().trim()
      if (!vendorKey) continue
      const target = targetsByVendor.get(vendorKey)
      if (!target) continue // unmapped vendor -> leave untouched
      // categoryId is non-null in the schema, so a mapping that only sets
      // category + leaves sub/person blank still gets all three applied when
      // the row is incomplete (per product decision).
      const combo = JSON.stringify([target.categoryId, target.subCategory, target.person])
      if (!rowsByTarget.has(combo)) rowsByTarget.set(combo, [])
      rowsByTarget.get(combo)!.push(row.id)
      updatedIds.add(row.id)
    }

    // 6) Execute one updateMany per distinct target combo.
    let updated = 0
    for (const [combo, ids] of rowsByTarget.entries()) {
      const [categoryId, subCategory, person] = JSON.parse(combo) as [number | null, string | null, string | null]
      if (ids.length === 0) continue
      // Chunk to avoid excessively large IN() lists.
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500)
        const res = await prisma.expense.updateMany({
          where: { id: { in: chunk } },
          data: {
            ...(categoryId != null ? { categoryId } : {}),
            subCategory: subCategory ?? null,
            person: person ?? null,
          },
        })
        updated += res.count
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      vendorCount: targetsByVendor.size,
      message: `Applied mappings to ${updated} expense row(s)`,
    })
  } catch (error) {
    console.error("Apply mappings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
