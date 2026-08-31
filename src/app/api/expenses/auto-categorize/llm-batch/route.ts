/**
 * POST /api/expenses/auto-categorize/llm-batch
 *
 * Analyzes unmatched vendor names using LLM (MiMo v2.5 free).
 * Sends vendors in batches of 50, saves results as permanent vendor rules.
 *
 * Body: { vendors?: string[] } — optional, if not provided fetches all unmatched
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { getConfig } from "@/lib/get-config"
import { readFile } from "node:fs/promises"
import {
  parseGpayDebits,
  matchVendorKeywords,
  loadKeywordsFromDB,
} from "@/shared/auto-categorize"
import {
  categorizeBatchWithLLM,
} from "@/shared/auto-categorize-llm"
import { invalidateCache } from "@/shared/auto-categorize-cache"

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

    // Get vendors to analyze — either from request or from unmatched
    let vendorNames: string[] = body.vendors || []

    if (vendorNames.length === 0) {
      // Parse GPay HTML and find unmatched vendors
      let html: string
      try {
        html = await readFile(filePath, "utf-8")
      } catch {
        return NextResponse.json(
          { error: `File not found: ${filePath}` },
          { status: 404 },
        )
      }

      const txns = parseGpayDebits(html)

      // Load existing learned rules from AutoCatVendorRule (independent table)
      const mappings = await prisma.autoCatVendorRule.findMany({
        where: { userId },
        select: { vendorKey: true, category: true },
      })
      const learnedRules = new Map<string, { category: string }>()
      for (const m of mappings) {
        if (m.category) {
          learnedRules.set(m.vendorKey.toLowerCase().trim(), { category: m.category })
        }
      }

      // Load keyword rules from DB
      const keywords = await loadKeywordsFromDB()

      // Find unmatched vendors (unique)
      const unmatchedSet = new Set<string>()
      for (const tx of txns) {
        if (!tx.vendor) continue
        const key = tx.vendor.toLowerCase().trim()

        // Skip if already has learned rule
        if (learnedRules.has(key)) continue

        // Skip if keyword matches
        const match = matchVendorKeywords(tx.vendor, keywords)
        if (match) continue

        unmatchedSet.add(tx.vendor.trim())
      }

      vendorNames = Array.from(unmatchedSet)
    }

    if (vendorNames.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unmatched vendors to analyze",
        analyzed: 0,
        saved: 0,
      })
    }

    console.log(`[llm-batch] Starting LLM analysis for ${vendorNames.length} vendors (userId=${userId})`)

    // Check LLM config for diagnostics
    const [llmProvider, llmModel] = await Promise.all([
      getConfig("LLM_PROVIDER", userId),
      getConfig("LLM_MODEL", userId),
    ])
    console.log(`[llm-batch] LLM config: provider=${llmProvider || "openai (default)"}, model=${llmModel || "gpt-4o-mini (default)"}`)
    if (!llmProvider || llmProvider === "openai") {
      const apiKey = await getConfig("OPENAI_API_KEY", userId)
      console.log(`[llm-batch] OpenAI API key: ${apiKey ? "SET" : "EMPTY"}`)
    }

    // Run LLM batch analysis
    const llmOutput = await categorizeBatchWithLLM(
      vendorNames,
      userId,
      (progress) => {
        console.log(`[llm-batch] Progress: ${progress.processed}/${progress.total} (${progress.successful} ok, ${progress.failed} failed)`)
      },
    )

    const { results: llmResults, errors: llmErrors } = llmOutput

    // Save results as vendor rules
    let saved = 0
    const savedResults: Array<{ vendor: string; category: string; subCategory: string; reason: string }> = []

    for (const result of llmResults) {
      if (!result.vendor || !result.category || result.category === "unmatched") continue

      const vendorKey = result.vendor.toLowerCase().trim()

      try {
        await prisma.autoCatVendorRule.upsert({
          where: { userId_vendorKey: { userId, vendorKey } },
          update: {
            category: result.category,
            subCategory: result.subCategory,
            source: "llm-auto",
          },
          create: {
            userId,
            vendorKey,
            category: result.category,
            subCategory: result.subCategory,
            person: "",
            source: "llm-auto",
          },
        })
        saved++
        savedResults.push(result)
      } catch (e) {
        console.error(`[llm-batch] Failed to save rule for ${vendorKey}:`, e)
      }
    }

    console.log(`[llm-batch] Complete: ${llmResults.length} analyzed, ${saved} saved as rules, ${llmErrors.length} errors`)

    // Invalidate cache so next GET re-computes with new rules
    invalidateCache(userId)

    return NextResponse.json({
      success: true,
      analyzed: llmResults.length,
      saved,
      failed: vendorNames.length - llmResults.length,
      totalUnmatched: vendorNames.length,
      results: savedResults.slice(0, 100),
      errors: llmErrors.slice(0, 10),
      llmProvider: llmProvider || "openai",
      llmModel: llmModel || "gpt-4o-mini",
      message: llmErrors.length > 0
        ? `AI analyzed ${llmResults.length}/${vendorNames.length} vendors (${llmErrors.length} batches failed), saved ${saved} rules`
        : saved > 0
          ? `Analyzed ${llmResults.length} vendors with AI, saved ${saved} as permanent rules`
          : `No new rules saved — all ${vendorNames.length} unmatched vendors could not be classified`,
    })
  } catch (error) {
    console.error("[llm-batch] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
