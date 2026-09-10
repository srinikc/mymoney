/**
 * GET /api/expenses/auto-categorize/categories
 *
 * Returns the auto-categorize system's own category names from the keyword dictionary.
 * Keywords are loaded from DB (Category.keywords).
 */

import { NextResponse } from "next/server"
import { getAutoCatCategories, loadKeywordsFromDB } from "@/shared/auto-categorize"
import { cached, CACHE_TTL, CacheKeys } from "@/lib/cache"

export async function GET() {
  const categories = await cached(CacheKeys.autoCatCategories(), CACHE_TTL.LONG, async () => {
    const keywords = await loadKeywordsFromDB()
    return getAutoCatCategories(keywords)
  })
  return NextResponse.json(categories)
}
