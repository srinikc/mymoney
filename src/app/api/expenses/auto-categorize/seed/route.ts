/**
 * POST /api/expenses/auto-categorize/seed
 *
 * Seeds auto-categorization from a GPay My Activity.html file.
 * Reads the file, parses transactions, and builds initial vendor rules.
 * Only processes debit transactions (not credits/received).
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { readFile } from "node:fs/promises"
import {
  parseGpayDebits,
  matchVendorKeywords,
  loadKeywordsFromDB,
  getCategorizeStats,
  type CategorizeResult,
} from "@/shared/auto-categorize"
import { invalidateCache } from "@/shared/auto-categorize-cache"

// Default path to the GPay takeout file
const GPAY_HTML_PATH = "C:\\Users\\ADMIN\\Downloads\\takeout-20260822T124005Z-1-001\\Takeout\\Google Pay\\My Activity\\My Activity.html"

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
    const body = await req.json().catch(() => ({}))
    const filePath = body.filePath || GPAY_HTML_PATH

    // Read the HTML file
    let html: string
    try {
      html = await readFile(filePath, "utf-8")
    } catch {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 },
      )
    }

    // Parse only debit transactions
    const txns = parseGpayDebits(html)
    console.log(`[auto-categorize] Parsed ${txns.length} debit transactions from GPay HTML`)

    // Load keyword rules from DB
    const keywords = await loadKeywordsFromDB()

    // Categorize using keyword rules from DB
    const results: CategorizeResult[] = txns.map((tx) => {
      if (tx.vendor) {
        const match = matchVendorKeywords(tx.vendor, keywords)
        if (match) {
          return {
            date: tx.date,
            amount: tx.amount,
            vendor: tx.vendor,
            bankAccount: tx.bankAccount,
            description: tx.vendor,
            categoryId: match.categoryId,
            categoryName: match.categoryName,
            subCategory: match.subCategory,
            source: "vendor_keyword" as const,
            confidence: match.confidence,
          }
        }
      }
      return {
        date: tx.date,
        amount: tx.amount,
        vendor: tx.vendor,
        bankAccount: tx.bankAccount,
        description: tx.vendor || `₹${tx.amount} payment`,
        source: "unmatched" as const,
        confidence: 0,
      }
    })

    // Get stats
    const stats = getCategorizeStats(results)

    // Build initial VendorMapping rules from keyword matches
    const vendorMatches = results.filter((r) => r.source === "vendor_keyword" && r.vendor)
    const vendorRules = new Map<string, { categoryId: number; categoryName: string; subCategory: string; count: number }>()

    for (const r of vendorMatches) {
      const key = r.vendor!.toLowerCase().trim()
      const existing = vendorRules.get(key)
      if (existing) {
        existing.count++
      } else {
        vendorRules.set(key, {
          categoryId: r.categoryId!,
          categoryName: r.categoryName!,
          subCategory: r.subCategory || "",
          count: 1,
        })
      }
    }

    // Save rules to AutoCatVendorRule table (independent from VendorMapping)
    // Clear existing auto-cat rules for this user first (fresh seed)
    await prisma.autoCatVendorRule.deleteMany({ where: { userId } })

    let rulesCreated = 0
    for (const [vendorKey, rule] of vendorRules) {
      try {
        await prisma.autoCatVendorRule.upsert({
          where: { userId_vendorKey: { userId, vendorKey } },
          update: {
            category: rule.categoryName,
            subCategory: rule.subCategory,
            source: "keyword",
          },
          create: {
            userId,
            vendorKey,
            category: rule.categoryName,
            subCategory: rule.subCategory,
            person: "",
            source: "keyword",
          },
        })
        rulesCreated++
      } catch (e) {
        console.error(`[auto-categorize] Failed to save rule for ${vendorKey}:`, e)
      }
    }

    // Invalidate cache so next GET re-computes with new rules
    invalidateCache(userId)

    return NextResponse.json({
      totalTransactions: txns.length,
      matched: stats.matched,
      unmatched: stats.unmatched,
      matchRate: Math.round(stats.matchRate * 100) + "%",
      rulesCreated,
      byCategory: stats.byCategory,
      unmatchedVendors: stats.unmatchedByVendor.slice(0, 50), // Top 50 unmatched
      sampleMatched: results.filter((r) => r.source === "vendor_keyword").slice(0, 20),
      sampleUnmatched: results.filter((r) => r.source === "unmatched").slice(0, 20),
    })
  } catch (error) {
    console.error("[auto-categorize] Seed error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
