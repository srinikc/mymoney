import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { getDismissedVendorKeys } from "@/shared/vendor-mapping"

export async function GET(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  // `?all=1` returns the complete unmapped list (used for "Dismiss All").
  const all = new URL(req.url).searchParams.get("all") === "1"

  // `?search=` filters unmapped vendors by name (case-insensitive substring).
  const search = (new URL(req.url).searchParams.get("search") || "").toLowerCase().trim()

  // Pagination: `?page=1&pageSize=50` (pageSize capped at 200). When `all=1`
  // the full list is returned regardless.
  const page = Math.max(1, Number.parseInt(new URL(req.url).searchParams.get("page") || "1", 10) || 1)
  const requestedPageSize = Number.parseInt(new URL(req.url).searchParams.get("pageSize") || "50", 10) || 50
  const pageSize = Math.min(Math.max(1, requestedPageSize), 200)

  // Dismissed vendors are excluded from review but do NOT count as mapped.
  const dismissedKeys = await getDismissedVendorKeys(userId)

  // Only consider expenses belonging to this user's profiles
  const profiles = await prisma.profile.findMany({ where: { userId }, select: { id: true } })
  const profileIds = profiles.map((p) => p.id)

  const expenses = await prisma.expense.findMany({
    where: { profileId: { in: profileIds }, vendor: { not: null }, deletedAt: null },
    select: { vendor: true, amount: true, categoryId: true },
  })

  // Group by vendor
  const vendorMap = new Map<string, { count: number; total: number; categoryIds: Set<number> }>()
  for (const e of expenses) {
    const key = e.vendor!.toLowerCase().trim()
    if (!key || key === "" || key === "nan") continue
    if (!vendorMap.has(key)) {
      vendorMap.set(key, { count: 0, total: 0, categoryIds: new Set() })
    }
    const entry = vendorMap.get(key)!
    entry.count++
    entry.total += e.amount
    entry.categoryIds.add(e.categoryId)
  }

  // Check which vendors are already mapped for this user
  const vendors = [...vendorMap.entries()].map(([key, data]) => ({ key, ...data }))
  const batchSize = 50
  const unmapped = []
  for (let i = 0; i < vendors.length; i += batchSize) {
    const batch = vendors.slice(i, i + batchSize)
    const existing = await prisma.vendorMapping.findMany({
      where: { userId, vendorKey: { in: batch.map((v) => v.key) } },
      select: { vendorKey: true },
    })
    const existingKeys = new Set(existing.map((m) => m.vendorKey))
    for (const v of batch) {
      if (existingKeys.has(v.key)) continue
      if (dismissedKeys.has(v.key)) continue
      unmapped.push(v)
    }
  }

  // Sort by frequency descending, then apply search filter (if any).
  unmapped.sort((a, b) => b.count - a.count)
  const filtered = search ? unmapped.filter((v) => v.key.includes(search)) : unmapped

  // Get category names
  const allCatIds = new Set<number>(filtered.flatMap((v) => [...v.categoryIds]))
  const categories = await prisma.category.findMany({
    where: { id: { in: [...allCatIds] } },
    select: { id: true, name: true },
  })
  const catNameMap = new Map(categories.map((c) => [c.id, c.name]))

  const total = filtered.length
  const slice = all ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  return NextResponse.json({
    merchants: slice.map((v) => ({
      key: v.key,
      count: v.count,
      total: Math.round(v.total),
      categoryName: catNameMap.get([...v.categoryIds][0] as number) || "",
    })),
    total,
    page,
    pageSize,
  })
}
