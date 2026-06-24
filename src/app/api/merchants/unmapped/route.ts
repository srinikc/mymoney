import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  // Find distinct vendors from expenses that have NO matching merchant_mapping
  const expenses = await prisma.expense.findMany({
    where: { vendor: { not: null } },
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

  // Check which vendors are already mapped
  const vendors = Array.from(vendorMap.entries()).map(([key, data]) => ({ key, ...data }))
  const batchSize = 50
  const unmapped = []
  for (let i = 0; i < vendors.length; i += batchSize) {
    const batch = vendors.slice(i, i + batchSize)
    const existing = await prisma.merchantMapping.findMany({
      where: { merchantKey: { in: batch.map((v) => v.key) } },
      select: { merchantKey: true },
    })
    const existingKeys = new Set(existing.map((m) => m.merchantKey))
    for (const v of batch) {
      if (!existingKeys.has(v.key)) {
        unmapped.push(v)
      }
    }
  }

  // Sort by frequency descending
  unmapped.sort((a, b) => b.count - a.count)

  // Get category names
  const allCatIds = new Set<number>(unmapped.flatMap((v) => Array.from(v.categoryIds)))
  const categories = await prisma.category.findMany({
    where: { id: { in: Array.from(allCatIds) } },
    select: { id: true, name: true },
  })
  const catNameMap = new Map(categories.map((c) => [c.id, c.name]))

  return NextResponse.json({
    merchants: unmapped.slice(0, 100).map((v) => ({
      key: v.key,
      count: v.count,
      total: Math.round(v.total),
      categoryName: catNameMap.get(Array.from(v.categoryIds)[0] as number) || "",
    })),
    total: unmapped.length,
  })
}
