/**
 * GET /api/expenses/auto-categorize
 *
 * Returns categorization stats and paginated results for the expense-auto page.
 * Uses AutoCatVendorRule (independent from VendorMapping).
 * Returns empty until user clicks "Seed from GPay HTML".
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { getAutoCatResults } from "@/shared/auto-categorize-cache"

const GPAY_HTML_PATH = "C:\\Users\\ADMIN\\Downloads\\takeout-20260822T124005Z-1-001\\Takeout\\Google Pay\\My Activity\\My Activity.html"

export async function GET(req: Request) {
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
    // Check if user has seeded any auto-cat rules — return empty if not
    const ruleCount = await prisma.autoCatVendorRule.count({ where: { userId } })
    if (ruleCount === 0) {
      return NextResponse.json({
        success: true,
        stats: null,
        learnedRulesCount: 0,
        results: [],
        totalResults: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      })
    }

    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get("filePath") || GPAY_HTML_PATH
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "50")))
    const sortField = searchParams.get("sortField") || "date"
    const sortDir = searchParams.get("sortDir") || "desc"
    const search = searchParams.get("search") || ""
    const categoryFilter = searchParams.get("categories") || ""
    const sourceFilter = searchParams.get("source") || ""

    const results = await getAutoCatResults(filePath, userId)
    if (results.length === 0) {
      return NextResponse.json(
        { error: `File not found: ${filePath}. Click "Seed from GPay HTML" first.` },
        { status: 404 },
      )
    }

    // Apply filters
    let filtered = results

    // Text search
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((r) =>
        (r.vendor || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.categoryName || "").toLowerCase().includes(q) ||
        (r.subCategory || "").toLowerCase().includes(q)
      )
    }

    // Category filter
    if (categoryFilter) {
      const cats = categoryFilter.split(",").map((c) => c.toLowerCase())
      filtered = filtered.filter((r) => r.categoryName && cats.includes(r.categoryName.toLowerCase()))
    }

    // Source filter
    if (sourceFilter) {
      filtered = filtered.filter((r) => r.source === sourceFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string
      switch (sortField) {
        case "amount":
          aVal = a.amount
          bVal = b.amount
          break
        case "vendor":
          aVal = (a.vendor || "").toLowerCase()
          bVal = (b.vendor || "").toLowerCase()
          break
        case "category":
          aVal = (a.categoryName || "").toLowerCase()
          bVal = (b.categoryName || "").toLowerCase()
          break
        default: // date
          aVal = new Date(a.date).getTime()
          bVal = new Date(b.date).getTime()
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

    // Build stats with ONLY categories found in results
    const total = filtered.length
    const matched = filtered.filter((r) => r.source !== "unmatched")
    const unmatched = filtered.filter((r) => r.source === "unmatched")

    // Group by category
    const byCategory = new Map<string, { count: number; totalAmount: number }>()
    for (const r of matched) {
      const key = r.categoryName || "Unknown"
      const existing = byCategory.get(key)
      if (existing) {
        existing.count++
        existing.totalAmount += r.amount
      } else {
        byCategory.set(key, { count: 1, totalAmount: r.amount })
      }
    }

    // Group unmatched by vendor
    const unmatchedByVendor = new Map<string, { count: number; totalAmount: number }>()
    for (const r of unmatched) {
      const key = r.vendor || "(no vendor)"
      const existing = unmatchedByVendor.get(key)
      if (existing) {
        existing.count++
        existing.totalAmount += r.amount
      } else {
        unmatchedByVendor.set(key, { count: 1, totalAmount: r.amount })
      }
    }

    // Calculate grand total
    const grandTotal = filtered.reduce((sum, r) => sum + r.amount, 0)

    const stats = {
      total,
      matched: matched.length,
      unmatched: unmatched.length,
      withVendor: filtered.filter((r) => r.vendor).length,
      withoutVendor: filtered.filter((r) => !r.vendor).length,
      matchRate: total > 0 ? matched.length / total : 0,
      grandTotal,
      byCategory: Array.from(byCategory.entries())
        .map(([name, data]) => ({ name, count: data.count, totalAmount: data.totalAmount }))
        .sort((a, b) => b.count - a.count),
      unmatchedByVendor: Array.from(unmatchedByVendor.entries())
        .map(([name, data]) => ({ name, count: data.count, totalAmount: data.totalAmount }))
        .sort((a, b) => b.count - a.count),
    }

    // Paginate results for All Transactions view
    const start = (page - 1) * pageSize
    const paginatedResults = filtered.slice(start, start + pageSize)

    return NextResponse.json({
      success: true,
      stats,
      learnedRulesCount: 0,
      results: paginatedResults,
      totalResults: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("[auto-categorize] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
