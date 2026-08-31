"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, AlertTriangle, Lightbulb, FileText, ChevronUp } from "lucide-react"
import { INCOME_TIERS, type IncomeTierDef } from "@/shared/income-tiers"
import { formatCurrencyFull } from "@/lib/utils"

interface TierResponse {
  income: number | null
  tier: IncomeTierDef
  nextTier: IncomeTierDef | null
  incomeToNextTier: number | null
  allTiers: IncomeTierDef[]
}

export function IncomeTierCard() {
  const [data, setData] = useState<TierResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/income-tiers")
      if (!res.ok) throw new Error("Failed to load")
      setData(await res.json())
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) return null

  const { tier, income, nextTier, incomeToNextTier } = data

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Income Tier
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {income ? `Based on your ${formatCurrencyFull(income)} annual income` : "Set income in Settings to see your tier"}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">{tier.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Split visualization */}
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground font-semibold mb-2">Recommended split</p>
          <div className="flex items-center gap-1 h-8 rounded overflow-hidden text-xs text-white font-semibold">
            <div className="bg-blue-500 flex items-center justify-center h-full" style={{ width: `${tier.split.needs}%` }}>{tier.split.needs}%</div>
            <div className="bg-amber-500 flex items-center justify-center h-full" style={{ width: `${tier.split.wants}%` }}>{tier.split.wants}%</div>
            <div className="bg-emerald-500 flex items-center justify-center h-full" style={{ width: `${tier.split.savings}%` }}>{tier.split.savings}%</div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Needs</span>
            <span>Wants</span>
            <span>Savings</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{tier.rationale}</p>

        {nextTier && incomeToNextTier && incomeToNextTier > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ChevronUp className="h-3 w-3" />
            <span>
              Earn {formatCurrencyFull(incomeToNextTier)} more to unlock <strong>{nextTier.label}</strong> with{" "}
              {nextTier.split.savings}% savings rate.
            </span>
          </div>
        )}

        <Tabs defaultValue="tax" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="tax" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Tax</TabsTrigger>
            <TabsTrigger value="invest" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" /> Invest</TabsTrigger>
            <TabsTrigger value="avoid" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Avoid</TabsTrigger>
          </TabsList>
          <TabsContent value="tax" className="space-y-2 mt-3">
            {tier.taxTips.map((t, i) => (
              <Tip key={i} text={t} />
            ))}
          </TabsContent>
          <TabsContent value="invest" className="space-y-2 mt-3">
            {tier.investmentTips.map((t, i) => (
              <Tip key={i} text={t} />
            ))}
          </TabsContent>
          <TabsContent value="avoid" className="space-y-2 mt-3">
            {tier.pitfallsToAvoid.map((t, i) => (
              <Tip key={i} text={t} warning />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function Tip({ text, warning }: { text: string; warning?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Lightbulb className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${warning ? "text-amber-500" : "text-primary"}`} />
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  )
}
