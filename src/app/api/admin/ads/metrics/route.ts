import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"

export const runtime = "nodejs"

// Estimated CPM/CPC for revenue estimation (₹)
const ESTIMATED_CPM: Record<string, number> = { mock: 0, adsense: 50, inmobi: 35, adgebra: 40 }
const ESTIMATED_CPC = 2.5 // per click

export async function GET(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  try {
    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get("days") ?? "7")
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [impressions, clicks, allLoans, allFunds, sponsoredPlacements] = await Promise.all([
      prisma.adImpression.findMany({ where: { createdAt: { gte: startDate } } }),
      prisma.adClick.findMany({ where: { createdAt: { gte: startDate } } }),
      prisma.loanProduct.count(),
      prisma.fundMetadata.count({ where: { isCurated: true } }),
      prisma.sponsoredPlacement.count({ where: { isActive: true } }),
    ])

    const impressionsByProvider = new Map<string, number>()
    const impressionsByPage = new Map<string, number>()
    for (const imp of impressions) {
      impressionsByProvider.set(imp.provider, (impressionsByProvider.get(imp.provider) ?? 0) + 1)
      impressionsByPage.set(imp.page, (impressionsByPage.get(imp.page) ?? 0) + 1)
    }

    const clicksByProvider = new Map<string, number>()
    const topTargets = new Map<string, number>()
    for (const click of clicks) {
      clicksByProvider.set(click.provider, (clicksByProvider.get(click.provider) ?? 0) + 1)
      try {
        const host = new URL(click.targetUrl).host
        topTargets.set(host, (topTargets.get(host) ?? 0) + 1)
      } catch {
        // ignore
      }
    }

    // CTR by provider
    const ctrByProvider: Record<string, number> = {}
    for (const [provider, impCount] of impressionsByProvider) {
      const clickCount = clicksByProvider.get(provider) ?? 0
      ctrByProvider[provider] = impCount > 0 ? (clickCount / impCount) * 100 : 0
    }

    // Estimated revenue: display ads use CPM, sponsored/affiliate clicks use CPC
    let estimatedRevenue = 0
    for (const imp of impressions) {
      const cpm = ESTIMATED_CPM[imp.provider] ?? 0
      estimatedRevenue += cpm / 1000
    }
    for (const click of clicks) {
      estimatedRevenue += ESTIMATED_CPC
    }

    // Group by day for trend
    const impressionsByDay = new Map<string, number>()
    for (const imp of impressions) {
      const day = imp.createdAt.toISOString().slice(0, 10)
      impressionsByDay.set(day, (impressionsByDay.get(day) ?? 0) + 1)
    }
    const clicksByDay = new Map<string, number>()
    for (const click of clicks) {
      const day = click.createdAt.toISOString().slice(0, 10)
      clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1)
    }

    const trend: { date: string; impressions: number; clicks: number; ctr: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const imp = impressionsByDay.get(d) ?? 0
      const click = clicksByDay.get(d) ?? 0
      trend.push({ date: d, impressions: imp, clicks: click, ctr: imp > 0 ? (click / imp) * 100 : 0 })
    }

    return NextResponse.json({
      range: { days, startDate: startDate.toISOString() },
      totals: {
        impressions: impressions.length,
        clicks: clicks.length,
        ctr: impressions.length > 0 ? (clicks.length / impressions.length) * 100 : 0,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
      },
      byProvider: Object.fromEntries(impressionsByProvider),
      clicksByProvider: Object.fromEntries(clicksByProvider),
      ctrByProvider,
      byPage: Object.fromEntries(impressionsByPage),
      topTargets: Object.fromEntries(
        Array.from(topTargets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      ),
      trend,
      catalog: {
        activeLoans: allLoans,
        curatedFunds: allFunds,
        activePlacements: sponsoredPlacements,
      },
    })
  } catch (e) {
    console.error("admin ads metrics error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
