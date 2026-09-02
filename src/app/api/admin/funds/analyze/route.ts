import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { prisma } from "@/lib/prisma"
import { UNIQUE_CURATED } from "@/lib/curated-funds"
import { scoreFund } from "@/lib/ai-fund-scorer"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  let success = 0
  let failed = 0
  const results: { schemeCode: number; name: string; score: number; status: "ok" | "skip" | "err"; error?: string }[] = []

  for (const fund of UNIQUE_CURATED) {
    try {
      const score = await scoreFund(fund.schemeCode)
      if (!score) {
        results.push({ schemeCode: fund.schemeCode, name: fund.schemeName, score: 0, status: "skip" })
        failed++
        continue
      }

      await prisma.fundMetadata.upsert({
        where: { schemeCode: fund.schemeCode },
        update: {
          aiScore: score.aiScore,
          aiScoreBreakdown: JSON.stringify(score.breakdown),
          aiSummary: score.summary,
          prosPoints: JSON.stringify(score.pros),
          consPoints: JSON.stringify(score.cons),
          lastAnalyzedAt: new Date(),
        },
        create: {
          schemeCode: fund.schemeCode,
          schemeName: fund.schemeName,
          fundHouse: fund.fundHouse,
          category: fund.category,
          subCategory: fund.subCategory,
          aiScore: score.aiScore,
          aiScoreBreakdown: JSON.stringify(score.breakdown),
          aiSummary: score.summary,
          prosPoints: JSON.stringify(score.pros),
          consPoints: JSON.stringify(score.cons),
          isCurated: true,
          lastAnalyzedAt: new Date(),
        },
      })
      results.push({ schemeCode: fund.schemeCode, name: fund.schemeName, score: score.aiScore, status: "ok" })
      success++
    } catch (e) {
      results.push({
        schemeCode: fund.schemeCode,
        name: fund.schemeName,
        score: 0,
        status: "err",
        error: (e as Error).message,
      })
      failed++
    }
  }

  return NextResponse.json({ success, failed, total: UNIQUE_CURATED.length, results })
}
