import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { SEED_FUNDS, CATEGORIES, AMCS, type SeedFund } from "@/shared/mf-seed"

export async function GET(req: Request) {
  try {
    await getAuthContext()
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get("q") || "").toLowerCase().trim()
    const category = searchParams.get("category") || ""
    const amc = searchParams.get("amc") || ""
    const riskLevel = searchParams.get("risk") || ""
    const minCagr = Number(searchParams.get("minCagr") || 0)

    let results: SeedFund[] = SEED_FUNDS
    if (query) {
      results = results.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.amc.toLowerCase().includes(query) ||
          f.category.toLowerCase().includes(query),
      )
    }
    if (category) {
      results = results.filter((f) => f.category === category)
    }
    if (amc) {
      results = results.filter((f) => f.amc === amc)
    }
    if (riskLevel) {
      results = results.filter((f) => f.riskLevel === riskLevel)
    }
    if (minCagr > 0) {
      results = results.filter((f) => f.cagr3y >= minCagr)
    }

    return NextResponse.json({
      total: results.length,
      filters: {
        categories: CATEGORIES,
        amcs: AMCS,
        riskLevels: ["low", "moderate", "high"],
      },
      results: results.slice(0, 50),
      source: "seed",
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
