import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { COMMODITIES, COMMODITY_CATEGORIES } from "@/shared/commodities"

export async function GET(req: Request) {
  try {
    await getAuthContext()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category") || ""
    const symbol = searchParams.get("symbol") || ""

    if (symbol) {
      const c = COMMODITIES.find((x) => x.symbol === symbol || x.ticker === symbol)
      if (!c) {
        return NextResponse.json({ error: "Commodity not found" }, { status: 404 })
      }
      return NextResponse.json(c)
    }

    let results = COMMODITIES
    if (category) {
      results = results.filter((c) => c.category === category)
    }

    const summary = {
      total: results.length,
      categories: COMMODITY_CATEGORIES,
      gainers: results.filter((c) => c.changePct > 0).length,
      losers: results.filter((c) => c.changePct < 0).length,
      unchanged: results.filter((c) => c.changePct === 0).length,
    }

    return NextResponse.json({
      summary,
      results,
      source: "seed",
      note: "Live Yahoo Finance data is used when available; this is the curated fallback dataset.",
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
