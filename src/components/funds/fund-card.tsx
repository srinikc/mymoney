"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, TrendingUp, Award } from "lucide-react"
import { buildAffiliateUrl, type AffiliatePlatform } from "@/lib/affiliate-links"

export interface FundCardData {
  schemeCode: number
  schemeName: string
  fundHouse: string
  category: string
  subCategory: string
  aiScore: number
  return3Y: number | null
  return5Y: number | null
  summary: string
  affiliatePlatform: AffiliatePlatform
}

interface FundCardProps {
  fund: FundCardData
  isSponsored?: boolean
  slotId?: string
  page?: string
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "equity":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    case "debt":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
    case "hybrid":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
    case "tax-saver":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
    case "index":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
  }
}

function getAffiliateTargetPath(platform: AffiliatePlatform, schemeCode: number): string {
  // Each platform has its own URL pattern
  if (platform === "kuvera") return `/mutual-funds/${schemeCode}`
  if (platform === "groww") return `/mutual-funds/${schemeCode}`
  if (platform === "zerodha") return `/coin/mutual-funds/${schemeCode}`
  return "/"
}

export function FundCard({ fund, isSponsored, slotId = "fund-card", page = "/investments" }: FundCardProps) {
  const affiliateUrl = buildAffiliateUrl(
    fund.affiliatePlatform,
    getAffiliateTargetPath(fund.affiliatePlatform, fund.schemeCode),
    { utmSource: `${fund.affiliatePlatform}_${fund.category}` },
  )

  const handleInvest = () => {
    void fetch("/api/ads/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, position: "in-content", page, provider: isSponsored ? "sponsored" : "affiliate", targetUrl: affiliateUrl }),
      keepalive: true,
    }).catch(() => {})
    window.open(affiliateUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Card
      data-testid="fund-card"
      data-scheme={fund.schemeCode}
      data-sponsored={isSponsored ? "true" : "false"}
      className={[
        isSponsored ? "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10" : "",
        "hover:shadow-md transition-shadow",
      ].join(" ")}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
              {fund.fundHouse}
            </p>
            <h3 className="font-semibold text-sm mt-0.5 line-clamp-2">{fund.schemeName}</h3>
          </div>
          {isSponsored && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-400 text-amber-700 dark:text-amber-300 flex-shrink-0">
              Sponsored
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-[10px] h-4 px-1 ${getCategoryColor(fund.category)}`}>
            {fund.category}
          </Badge>
          {fund.subCategory && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {fund.subCategory}
            </Badge>
          )}
          {fund.aiScore > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
              <Award className="h-2.5 w-2.5" /> {fund.aiScore.toFixed(1)}/10
            </Badge>
          )}
        </div>

        {fund.return3Y != null && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> 3Y CAGR
            </div>
            <span className={`font-semibold ${fund.return3Y > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {fund.return3Y > 0 ? "+" : ""}{fund.return3Y.toFixed(1)}%
            </span>
          </div>
        )}

        {fund.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{fund.summary}</p>
        )}

        <Button size="sm" className="w-full" onClick={handleInvest} variant={isSponsored ? "default" : "outline"}>
          Invest on {fund.affiliatePlatform} <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
