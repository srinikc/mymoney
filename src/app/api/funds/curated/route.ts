import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getUserConsent } from "@/lib/consent"
import { CURATED_FUNDS, UNIQUE_CURATED, type CuratedFund } from "@/lib/curated-funds"
import { scoreFund } from "@/lib/ai-fund-scorer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface MfApiMeta {
  scheme_code: number
  scheme_name: string
  fund_house?: string
}

let cachedMfList: MfApiMeta[] | null = null
let cacheTime = 0

async function getMfList(): Promise<MfApiMeta[]> {
  if (cachedMfList && Date.now() - cacheTime < 24 * 60 * 60 * 1000) return cachedMfList
  try {
    const res = await fetch("https://api.mfapi.in/mf", { cache: "no-store" })
    if (!res.ok) throw new Error("mfapi failed")
    cachedMfList = (await res.json()) as MfApiMeta[]
    cacheTime = Date.now()
    return cachedMfList
  } catch {
    return []
  }
}

function resolveFund(f: CuratedFund, mfList: MfApiMeta[]) {
  const match = mfList.find((m) => m.scheme_code === f.schemeCode)
  return {
    ...f,
    schemeName: match?.scheme_name ?? f.schemeName,
    fundHouse: match?.fund_house ?? f.fundHouse,
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const userId = Number((session.user as { id?: number }).id)
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const consent = await getUserConsent(userId)
    if (!consent.showPersonalizedRecs) {
      return NextResponse.json({ funds: [], sponsored: null, personalized: false })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const subCategory = searchParams.get("subCategory")
    const includeSponsored = searchParams.get("sponsored") !== "false"

    const mfList = await getMfList()

    // Build candidate list
    const candidates = UNIQUE_CURATED
      .filter((f) => (category ? f.category === category : true))
      .filter((f) => (subCategory ? f.subCategory === subCategory : true))
      .slice(0, 30)
      .map((f) => resolveFund(f, mfList))

    // Try to load cached scores from DB; if missing, fetch live
    const schemeCodes = candidates.map((c) => c.schemeCode)
    const dbMetas = await prisma.fundMetadata.findMany({
      where: { schemeCode: { in: schemeCodes }, isCurated: true, isActive: true },
    })
    const dbMap = new Map(dbMetas.map((m) => [m.schemeCode, m]))

    const funds: Array<{
      schemeCode: number
      schemeName: string
      fundHouse: string
      category: string
      subCategory: string
      aiScore: number
      return3Y: number | null
      return5Y: number | null
      summary: string
      affiliatePlatform: CuratedFund["affiliatePlatform"]
      isSponsored: boolean
    }> = []

    for (const c of candidates) {
      let aiScore = 0
      let return3Y: number | null = null
      let return5Y: number | null = null
      let summary = ""

      const dbMeta = dbMap.get(c.schemeCode)
      if (dbMeta?.aiScoreBreakdown) {
        try {
          const b = JSON.parse(dbMeta.aiScoreBreakdown) as { return3Y: number | null; return5Y: number | null }
          aiScore = Number(dbMeta.aiScore)
          return3Y = b.return3Y
          return5Y = b.return5Y
          summary = dbMeta.aiSummary ?? ""
        } catch {
          // fall through to live
        }
      }

      if (aiScore === 0) {
        // Live score (slow but works without seeded data)
        const score = await scoreFund(c.schemeCode)
        if (score) {
          aiScore = score.aiScore
          return3Y = score.breakdown.return3Y
          return5Y = score.breakdown.return5Y
          summary = score.summary
        }
      }

      funds.push({
        schemeCode: c.schemeCode,
        schemeName: c.schemeName,
        fundHouse: c.fundHouse,
        category: c.category,
        subCategory: c.subCategory,
        aiScore,
        return3Y,
        return5Y,
        summary,
        affiliatePlatform: c.affiliatePlatform,
        isSponsored: false,
      })
    }

    // Sort by AI score desc
    funds.sort((a, b) => b.aiScore - a.aiScore)

    // Get sponsored placement (top 1 by display order)
    let sponsored: (typeof funds)[number] | null = null
    if (includeSponsored) {
      const placement = await prisma.sponsoredPlacement.findFirst({
        where: {
          page: "/investments",
          position: "in-content",
          isActive: true,
          assetType: "fund",
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        orderBy: { displayOrder: "asc" },
      })
      if (placement?.assetId) {
        const schemeCode = Number(placement.assetId)
        const c = UNIQUE_CURATED.find((f) => f.schemeCode === schemeCode)
        if (c) {
          const resolved = resolveFund(c, mfList)
          const liveScore = await scoreFund(schemeCode)
          sponsored = {
            schemeCode: resolved.schemeCode,
            schemeName: resolved.schemeName,
            fundHouse: resolved.fundHouse,
            category: resolved.category,
            subCategory: resolved.subCategory,
            aiScore: liveScore?.aiScore ?? 0,
            return3Y: liveScore?.breakdown.return3Y ?? null,
            return5Y: liveScore?.breakdown.return5Y ?? null,
            summary: liveScore?.summary ?? "",
            affiliatePlatform: resolved.affiliatePlatform,
            isSponsored: true,
          }
        }
      }
    }

    return NextResponse.json({ funds, sponsored, personalized: true, total: CURATED_FUNDS.length })
  } catch (e) {
    console.error("funds curated error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
