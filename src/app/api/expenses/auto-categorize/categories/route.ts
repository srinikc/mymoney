/**
 * GET /api/expenses/auto-categorize/categories
 *
 * Returns the auto-categorize system's own category names from the keyword dictionary.
 * Keywords are loaded from DB (Category.keywords).
 */

import { NextResponse } from "next/server"
import { getAutoCatCategories, loadKeywordsFromDB } from "@/shared/auto-categorize"

export async function GET() {
  const keywords = await loadKeywordsFromDB()
  const categories = getAutoCatCategories(keywords)
  return NextResponse.json(categories)
}
