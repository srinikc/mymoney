"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calculator,
  Sparkles,
  Info,
  Globe,
  LineChart as LineIcon,
  ArrowRight,
  Loader2,
  Diamond,
  Banknote,
  Layers,
  Shield,
  Bitcoin,
  Gem,
} from "lucide-react"
import { COMMODITY_CATEGORIES, type Commodity } from "@/shared/commodities"

interface CommoditiesResponse {
  summary: {
    total: number
    categories: typeof COMMODITY_CATEGORIES
    gainers: number
    losers: number
    unchanged: number
  }
  results: Commodity[]
  source: string
  note: string
}

const CATEGORY_ICONS: Record<string, any> = {
  "gold": Gem,
  "silver": Diamond,
  "broad-etf": Layers,
  "sector-etf": BarChart3,
  "international-etf": Globe,
  "debt-etf": Banknote,
}

import { BarChart3 } from "lucide-react"

export default function CommoditiesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CommoditiesResponse | null>(null)
  const [category, setCategory] = useState("all")
  const [quantity, setQuantity] = useState("10")
  const [unit, setUnit] = useState<"grams" | "kg" | "units">("grams")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void load()
  }, [category])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== "all") params.set("category", category)
      const res = await fetch(`/api/commodities?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      const json: CommoditiesResponse = await res.json()
      setData(json)
    } catch (e) {
      toast.error("Failed to load commodities")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    return data.results
  }, [data])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Coins className="h-7 w-7 text-amber-500" /> Commodities & ETFs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live prices for gold, silver, and Indian ETFs. Track your portfolio and calculate investment value.
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Tracked" value={String(data.summary.total)} icon={Layers} color="primary" />
          <SummaryCard label="Gainers" value={String(data.summary.gainers)} icon={TrendingUp} color="emerald" />
          <SummaryCard label="Losers" value={String(data.summary.losers)} icon={TrendingDown} color="rose" />
          <SummaryCard label="Unchanged" value={String(data.summary.unchanged)} icon={Minus} color="muted" />
        </div>
      )}

      <Tabs defaultValue="prices" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="prices">Live Prices</TabsTrigger>
          <TabsTrigger value="calculator">Value Calculator</TabsTrigger>
        </TabsList>

        {/* Prices tab */}
        <TabsContent value="prices" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {COMMODITY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={load} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((c) => (
                <CommodityCard key={c.symbol} commodity={c} />
              ))}
            </div>
          )}

          {data && (
            <p className="text-xs text-muted-foreground text-center">{data.note}</p>
          )}
        </TabsContent>

        {/* Calculator tab */}
        <TabsContent value="calculator" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Value Calculator
              </CardTitle>
              <CardDescription>See what your gold/silver/ETF holding is worth right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v as "grams" | "kg" | "units")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grams">Grams (gold/silver)</SelectItem>
                      <SelectItem value="kg">Kilograms (silver)</SelectItem>
                      <SelectItem value="units">Units (ETFs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CalculatorResults commodities={filtered} quantity={Number(quantity)} unit={unit} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CommodityCard({ commodity: c }: { commodity: Commodity }) {
  const Icon = CATEGORY_ICONS[c.category] || Coins
  const positive = c.changePct > 0
  const negative = c.changePct < 0
  const ChangeIcon = positive ? TrendingUp : negative ? TrendingDown : Minus
  const changeColor = positive ? "text-emerald-600" : negative ? "text-rose-600" : "text-muted-foreground"

  // Sparkline from last 30 days
  const min = Math.min(...c.history30d)
  const max = Math.max(...c.history30d)
  const range = max - min || 1
  const points = c.history30d
    .map((v, i) => {
      const x = (i / (c.history30d.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COMMODITY_CATEGORIES.find((c2) => c2.value === c.category)?.color + "20" }}>
              <Icon className="h-4 w-4" style={{ color: COMMODITY_CATEGORIES.find((c2) => c2.value === c.category)?.color }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" title={c.name}>{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.ticker} · {c.unit}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] ${changeColor} border-current`}>
            <ChangeIcon className="h-3 w-3 mr-1" />
            {c.changePct >= 0 ? "+" : ""}{c.changePct.toFixed(2)}%
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 mt-3">
          <div>
            <p className="text-2xl font-bold">₹{c.pricePerUnit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">
              {c.changeAbsolute >= 0 ? "+" : ""}₹{c.changeAbsolute.toFixed(2)} today
            </p>
          </div>
          <div className="h-10 w-24">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                fill="none"
                stroke={positive ? "#10B981" : negative ? "#EF4444" : "#94A3B8"}
                strokeWidth="2"
                points={points}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
      </CardContent>
    </Card>
  )
}

function CalculatorResults({ commodities, quantity, unit }: { commodities: Commodity[]; quantity: number; unit: "grams" | "kg" | "units" }) {
  const matching = commodities.filter((c) => {
    if (unit === "units") return c.category.includes("etf")
    if (unit === "grams") return c.pricePerGram != null
    if (unit === "kg") return c.pricePerGram != null
    return false
  })

  if (matching.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No matching commodities for this unit type.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {matching.map((c) => {
        let qty = quantity
        let totalValue = 0
        if (unit === "grams" && c.pricePerGram) {
          totalValue = qty * c.pricePerGram
        } else if (unit === "kg" && c.pricePerGram) {
          totalValue = qty * 1000 * c.pricePerGram
        } else if (unit === "units") {
          totalValue = qty * c.pricePerUnit
        }
        return (
          <div key={c.symbol} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{c.ticker}</p>
              <p className="text-xs text-muted-foreground">
                {quantity} {unit} × ₹{(c.pricePerGram || c.pricePerUnit).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
            <p className="text-lg font-bold">₹{Math.round(totalValue).toLocaleString("en-IN")}</p>
          </div>
        )
      })}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-100",
    rose: "text-rose-600 bg-rose-100",
    muted: "text-muted-foreground bg-muted",
  }
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
