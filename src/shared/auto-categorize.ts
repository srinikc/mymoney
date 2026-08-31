/**
 * Auto-categorization engine for GPay transactions.
 *
 * LEARNS FROM SCRATCH — does NOT use existing expense data.
 * Builds rules purely from GPay transaction patterns.
 *
 * Tiers:
 * 1. Vendor name keyword matching (from DB — Category.keywords)
 * 2. Vendor name learning from user corrections
 * 3. LLM fallback for unmatched transactions (MiMo v2.5 free)
 * 4. User corrections create permanent rules
 */

import { parseGpayTakeoutHtml } from "@/shared/gpay-parser"

// Type matching the return of parseGpayTakeoutHtml
interface GpayTransaction {
  date: Date
  amount: number
  vendor: string
  bankAccount: string
  note?: string
}

// ── Types ──────────────────────────────────────────────────────────────

export interface CategorizeResult {
  date: Date
  amount: number
  vendor: string | null
  bankAccount: string | null
  description: string
  categoryId?: number
  categoryName?: string
  subCategory?: string
  person?: string
  source: "vendor_keyword" | "vendor_rule" | "llm" | "unmatched"
  confidence: number
}

export interface VendorRule {
  vendorKey: string
  categoryId: number
  categoryName: string
  subCategory: string | null
  person: string | null
  source: string
}

/**
 * Keyword rule loaded from Category.keywords JSON field.
 * Each category in DB has its own keywords array.
 */
export interface KeywordRule {
  pattern: string
  categoryId: number
  categoryName: string
  subCategory: string
  priority: number
}

/**
 * Load all keyword rules from the Category table.
 * Each category has a `keywords` JSON field containing its keyword rules.
 */
export async function loadKeywordsFromDB(): Promise<KeywordRule[]> {
  // Dynamic import to avoid bundling Prisma in client-side code
  const { prisma } = await import("@/lib/prisma")
  const { Prisma } = await import("@prisma/client")
  const categories = await prisma.category.findMany({
    where: { keywords: { not: Prisma.JsonNull } },
    select: { id: true, name: true, keywords: true },
  })

  const allKeywords: KeywordRule[] = []
  for (const cat of categories) {
    const keywords = cat.keywords as Array<{ pattern: string; subCategory: string; priority: number }> | null
    if (!keywords) continue
    for (const kw of keywords) {
      allKeywords.push({
        pattern: kw.pattern,
        categoryId: cat.id,
        categoryName: cat.name,
        subCategory: kw.subCategory,
        priority: kw.priority,
      })
    }
  }
  return allKeywords
}

// ── Core Functions ──────────────────────────────────────────────────────

/**
 * Get unique category names from keyword rules.
 * Keywords are loaded from DB (Category.keywords) by the caller.
 */
export function getAutoCatCategories(keywords: KeywordRule[]): Array<{ name: string; subCategories: string[] }> {
  const catMap = new Map<string, Set<string>>()
  for (const entry of keywords) {
    if (!catMap.has(entry.categoryName)) {
      catMap.set(entry.categoryName, new Set())
    }
    catMap.get(entry.categoryName)!.add(entry.subCategory)
  }
  return Array.from(catMap.entries())
    .map(([name, subs]) => ({ name, subCategories: Array.from(subs).sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Parse GPay HTML and extract only debit transactions.
 */
export function parseGpayDebits(html: string): GpayTransaction[] {
  return parseGpayTakeoutHtml(html).filter((t) => t.amount > 0)
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Check if a vendor name matches a keyword pattern using word-boundary matching.
 *
 * For single-word patterns: uses \b regex boundary.
 *   "medical" matches "Nandhana Medicals" but NOT "medieval"
 *
 * For multi-word phrases: uses substring match (phrases are specific enough).
 *   "health care" matches "Nandhana Health Care"
 *   "provision" matches "Sri Ram Provision Store"
 */
function matchesPattern(vendorName: string, pattern: string): boolean {
  const name = vendorName.toLowerCase().trim()
  const pat = pattern.toLowerCase().trim()

  // Multi-word phrase: substring match is fine (phrases are specific)
  if (pat.includes(" ")) {
    return name.includes(pat)
  }

  // Single word: use word-boundary regex to avoid false positives
  // "vi" should NOT match "provision", "auto" should NOT match "automobile"
  const regex = new RegExp(`\\b${escapeRegex(pat)}\\b`, "i")
  return regex.test(name)
}

/**
 * Match a vendor name against keyword rules.
 * Returns the best match (highest priority) or null.
 */
export function matchVendorKeywords(
  vendorName: string,
  keywords: KeywordRule[],
): {
  categoryId: number
  categoryName: string
  subCategory: string
  confidence: number
} | null {
  if (!vendorName) return null

  let bestMatch: { categoryId: number; categoryName: string; subCategory: string; confidence: number } | null = null
  let bestPriority = -1

  for (const entry of keywords) {
    if (matchesPattern(vendorName, entry.pattern)) {
      // Longer pattern match = higher confidence
      const matchRatio = entry.pattern.length / vendorName.length
      const confidence = Math.min(0.95, 0.6 + matchRatio * 0.35)

      if (entry.priority > bestPriority) {
        bestPriority = entry.priority
        bestMatch = {
          categoryId: entry.categoryId,
          categoryName: entry.categoryName,
          subCategory: entry.subCategory,
          confidence,
        }
      }
    }
  }

  return bestMatch
}

/**
 * Build VendorMapping rules from user corrections.
 * Each correction creates a permanent rule.
 */
export function buildVendorRuleFromCorrection(
  vendorName: string,
  categoryId: number,
  categoryName: string,
  subCategory: string | null,
  person: string | null,
): VendorRule {
  return {
    vendorKey: vendorName.toLowerCase().trim(),
    categoryId,
    categoryName,
    subCategory,
    person,
    source: "user_correction",
  }
}

/**
 * Categorize a single GPay transaction.
 * Uses keyword rules (from DB) + learned vendor rules.
 */
export function categorizeTransaction(
  tx: GpayTransaction,
  learnedRules: Map<string, VendorRule>,
  keywords: KeywordRule[],
): CategorizeResult {
  const base = {
    date: tx.date,
    amount: tx.amount,
    vendor: tx.vendor,
    bankAccount: tx.bankAccount,
    description: tx.vendor || `₹${tx.amount} payment`,
  }

  // Tier 1: Learned vendor rules (from user corrections)
  if (tx.vendor) {
    const vendorKey = tx.vendor.toLowerCase().trim()
    const rule = learnedRules.get(vendorKey)
    if (rule) {
      return {
        ...base,
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        subCategory: rule.subCategory ?? undefined,
        person: rule.person ?? undefined,
        source: "vendor_rule",
        confidence: 0.95,
      }
    }

    // Partial match against learned rules
    for (const [key, rule] of learnedRules) {
      if (vendorKey.includes(key) || key.includes(vendorKey)) {
        return {
          ...base,
          categoryId: rule.categoryId,
          categoryName: rule.categoryName,
          subCategory: rule.subCategory ?? undefined,
          person: rule.person ?? undefined,
          source: "vendor_rule",
          confidence: 0.8,
        }
      }
    }
  }

  // Tier 2: Keyword matching (from DB)
  if (tx.vendor) {
    const keywordMatch = matchVendorKeywords(tx.vendor, keywords)
    if (keywordMatch) {
      return {
        ...base,
        categoryId: keywordMatch.categoryId,
        categoryName: keywordMatch.categoryName,
        subCategory: keywordMatch.subCategory,
        source: "vendor_keyword",
        confidence: keywordMatch.confidence,
      }
    }
  }

  // Tier 3: Unmatched — needs LLM or user review
  return {
    ...base,
    source: "unmatched",
    confidence: 0,
  }
}

/**
 * Categorize all GPay transactions from HTML.
 */
export function categorizeAll(
  html: string,
  learnedRules: Map<string, VendorRule>,
  keywords: KeywordRule[],
): CategorizeResult[] {
  const txns = parseGpayDebits(html)
  return txns.map((tx) => categorizeTransaction(tx, learnedRules, keywords))
}

/**
 * Get stats from categorization results.
 */
export function getCategorizeStats(results: CategorizeResult[]) {
  const total = results.length
  const matched = results.filter((r) => r.source !== "unmatched")
  const unmatched = results.filter((r) => r.source === "unmatched")
  const withVendor = results.filter((r) => r.vendor)
  const withoutVendor = results.filter((r) => !r.vendor)

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

  return {
    total,
    matched: matched.length,
    unmatched: unmatched.length,
    withVendor: withVendor.length,
    withoutVendor: withoutVendor.length,
    matchRate: total > 0 ? matched.length / total : 0,
    byCategory: Array.from(byCategory.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      totalAmount: data.totalAmount,
    })).sort((a, b) => b.count - a.count),
    unmatchedByVendor: Array.from(unmatchedByVendor.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      totalAmount: data.totalAmount,
    })).sort((a, b) => b.count - a.count),
  }
}
