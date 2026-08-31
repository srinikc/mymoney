/**
 * Shared cache for auto-categorize results.
 * The GET route reads from cache, the apply/seed routes invalidate it.
 *
 * Uses AutoCatVendorRule (independent from VendorMapping).
 */

import { prisma } from "@/lib/prisma"
import { readFile } from "node:fs/promises"
import {
  categorizeAll,
  loadKeywordsFromDB,
  type VendorRule,
  type CategorizeResult,
} from "@/shared/auto-categorize"

const GPAY_HTML_PATH = "C:\\Users\\ADMIN\\Downloads\\takeout-20260822T124005Z-1-001\\Takeout\\Google Pay\\My Activity\\My Activity.html"

// In-memory cache (per userId)
const cacheByUser = new Map<number, { results: CategorizeResult[]; filePath: string }>()

export function invalidateCache(userId?: number) {
  if (userId) {
    cacheByUser.delete(userId)
  } else {
    cacheByUser.clear()
  }
}

export async function getAutoCatResults(filePath: string, userId: number): Promise<CategorizeResult[]> {
  let html: string
  try {
    html = await readFile(filePath, "utf-8")
  } catch {
    return []
  }

  // Always re-categorize (no stale cache — fresh from GPay each time)
  // Load learned vendor rules from AutoCatVendorRule (independent table)
  const mappings = await prisma.autoCatVendorRule.findMany({
    where: { userId },
    select: {
      vendorKey: true,
      category: true,
      subCategory: true,
      person: true,
      source: true,
    },
  })

  const learnedRules = new Map<string, VendorRule>()
  for (const m of mappings) {
    if (!m.category) continue
    learnedRules.set(m.vendorKey.toLowerCase().trim(), {
      vendorKey: m.vendorKey,
      categoryId: 0,
      categoryName: m.category,
      subCategory: m.subCategory,
      person: m.person,
      source: m.source,
    })
  }

  // Load keyword rules from DB
  const keywords = await loadKeywordsFromDB()

  // Categorize all transactions
  const results = categorizeAll(html, learnedRules, keywords)

  // Resolve category IDs by name
  const categoryNames = [...new Set(results.map((r) => r.categoryName).filter(Boolean))]
  const categories = await prisma.category.findMany({
    where: { name: { in: categoryNames as string[] } },
    select: { id: true, name: true },
  })
  const catNameToId = new Map(categories.map((c) => [c.name, c.id]))

  for (const r of results) {
    if (r.categoryName) {
      r.categoryId = catNameToId.get(r.categoryName) || undefined
    }
  }

  return results
}
