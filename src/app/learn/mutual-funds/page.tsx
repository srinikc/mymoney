"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  TrendingUp,
  Search,
  Filter,
  Calculator,
  PiggyBank,
  Target,
  IndianRupee,
  Calendar,
  Percent,
  BarChart3,
  Sparkles,
  Loader2,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react"

interface SeedFund {
  code: string
  name: string
  category: string
  amc: string
  nav: number
  navDate: string
  aum: number
  riskLevel: "low" | "moderate" | "high"
  benchmark: string
  expenseRatio: number
  cagr3y: number
  cagr5y: number
  minimumSIP: number
  minimumLumpsum: number
  returnSinceInception: number
  inceptionDate: string
}

interface SearchResponse {
  total: number
  filters: { categories: string[]; amcs: string[]; riskLevels: string[] }
  results: SeedFund[]
  source: string
}

interface ProjectResponse {
  type: string
  nominal: any
  inflation: { pct: number; realValue: number; realReturn: number }
  message: string
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
}

export default function MutualFundsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [risk, setRisk] = useState("all")
  const [activeFund, setActiveFund] = useState<SeedFund | null>(null)

  // SIP calculator state
  const [calcTab, setCalcTab] = useState("sip")
  const [sipAmount, setSipAmount] = useState("10000")
  const [lumpsumAmount, setLumpsumAmount] = useState("100000")
  const [targetCorpus, setTargetCorpus] = useState("10000000")
  const [expectedReturn, setExpectedReturn] = useState("12")
  const [years, setYears] = useState("20")
  const [stepUp, setStepUp] = useState("10")
  const [inflation, setInflation] = useState("6")
  const [projection, setProjection] = useState<ProjectResponse | null>(null)
  const [projecting, setProjecting] = useState(false)

  useEffect(() => {
    void load()
  }, [category, risk])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (category !== "all") params.set("category", category)
      if (risk !== "all") params.set("risk", risk)
      const res = await fetch(`/api/mf/search?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      const json: SearchResponse = await res.json()
      setData(json)
    } catch (e) {
      toast.error("Failed to load mutual funds")
    } finally {
      setLoading(false)
    }
  }

  async function calculate() {
    setProjecting(true)
    setProjection(null)
    try {
      const body: any = {
        type: calcTab,
        expectedReturnPct: Number(expectedReturn),
        years: Number(years),
        inflationPct: Number(inflation),
      }
      if (calcTab === "sip") {
        body.monthlyAmount = Number(sipAmount)
        body.annualStepUpPct = Number(stepUp)
      } else if (calcTab === "lumpsum") {
        body.lumpsumAmount = Number(lumpsumAmount)
      } else {
        body.targetCorpus = Number(targetCorpus)
      }
      const res = await fetch("/api/mf/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed to calculate")
      const json: ProjectResponse = await res.json()
      setProjection(json)
    } catch (e) {
      toast.error("Failed to calculate")
    } finally {
      setProjecting(false)
    }
  }

  const filteredResults = useMemo(() => {
    if (!data) return []
    if (!query) return data.results
    const q = query.toLowerCase()
    return data.results.filter(
      (f) => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
    )
  }, [data, query])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" /> Mutual Funds
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Research Indian mutual funds, compare NAV and returns, and project SIP/lumpsum growth.
        </p>
      </div>

      <Tabs defaultValue="research" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        {/* Research tab */}
        <TabsContent value="research" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, AMC, or category..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && load()}
                    className="pl-9"
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {data?.filters.categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={risk} onValueChange={setRisk}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All risk</SelectItem>
                    {data?.filters.riskLevels.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={load} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {data && (
            <p className="text-xs text-muted-foreground">
              {filteredResults.length} of {data.total} funds {data.source === "seed" && "(curated dataset — live MFAPI.in available when online)"}
            </p>
          )}

          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredResults.map((f) => (
                <Card key={f.code} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveFund(f)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" title={f.name}>{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.amc}</p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] ${RISK_COLORS[f.riskLevel]}`}>{f.riskLevel}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">NAV</p>
                        <p className="font-semibold">₹{f.nav.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">3Y CAGR</p>
                        <p className={`font-semibold ${f.cagr3y >= 12 ? "text-emerald-600" : f.cagr3y >= 8 ? "text-amber-600" : "text-muted-foreground"}`}>{f.cagr3y}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AUM</p>
                        <p className="font-semibold">₹{f.aum.toLocaleString("en-IN")}Cr</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                      <span>·</span>
                      <span>Exp {f.expenseRatio}%</span>
                      <span>·</span>
                      <span>Min SIP ₹{f.minimumSIP}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredResults.length === 0 && !loading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">No funds match your filters.</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calculator tab */}
        <TabsContent value="calculator" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={calcTab} onValueChange={setCalcTab}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="sip">SIP</TabsTrigger>
                    <TabsTrigger value="lumpsum">Lumpsum</TabsTrigger>
                    <TabsTrigger value="reverse-sip">Goal</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sip" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="sip-amount">Monthly amount (₹)</Label>
                      <Input id="sip-amount" type="number" min={100} value={sipAmount} onChange={(e) => setSipAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="step-up">Annual step-up %</Label>
                      <Input id="step-up" type="number" min={0} max={50} value={stepUp} onChange={(e) => setStepUp(e.target.value)} />
                      <p className="text-xs text-muted-foreground">SIP increases by this % every year (e.g. 10% matches a typical raise).</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="lumpsum" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="lumpsum-amount">One-time amount (₹)</Label>
                      <Input id="lumpsum-amount" type="number" min={500} value={lumpsumAmount} onChange={(e) => setLumpsumAmount(e.target.value)} />
                    </div>
                  </TabsContent>
                  <TabsContent value="reverse-sip" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="target">Target corpus (₹, today's money)</Label>
                      <Input id="target" type="number" min={100000} value={targetCorpus} onChange={(e) => setTargetCorpus(e.target.value)} />
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="return">Expected return % p.a.</Label>
                    <Input id="return" type="number" min={0} max={30} step={0.5} value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years">Years</Label>
                    <Input id="years" type="number" min={1} max={50} value={years} onChange={(e) => setYears(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inflation">Inflation % p.a.</Label>
                  <Input id="inflation" type="number" min={0} max={15} step={0.5} value={inflation} onChange={(e) => setInflation(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Used to show real (today's money) value.</p>
                </div>
                <Button onClick={calculate} disabled={projecting} className="w-full">
                  {projecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                  Calculate projection
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Result</CardTitle>
              </CardHeader>
              <CardContent>
                {!projection ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Fill in inputs and click "Calculate" to see the projection.
                  </div>
                ) : (
                  <ResultDisplay data={projection} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Fund detail modal */}
      {activeFund && <FundDetail fund={activeFund} onClose={() => setActiveFund(null)} />}
    </div>
  )
}

function ResultDisplay({ data }: { data: ProjectResponse }) {
  if (data.type === "sip" || data.type === "lumpsum") {
    const n = data.nominal
    const invested = n.totalInvested ?? n.invested
    const corpus = n.totalCorpus ?? n.corpus
    const gains = n.totalGains ?? n.gains
    return (
      <div className="space-y-4">
        <div className="text-center py-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Final Corpus</p>
          <p className="text-3xl font-bold mt-1">₹{corpus.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-1">Nominal value</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="text-lg font-bold">₹{invested.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Gains</p>
            <p className="text-lg font-bold text-emerald-600">₹{gains.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 dark:bg-amber-950/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">In today's money (real value)</p>
              <p className="text-lg font-bold">₹{data.inflation.realValue.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-1">At {data.inflation.pct}% inflation. Your real return: {data.inflation.realReturn}%.</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{data.message}</p>
      </div>
    )
  }
  // reverse-sip
  const r = (data as any).required
  return (
    <div className="space-y-4">
      <div className="text-center py-4 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900/30">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Required Monthly SIP</p>
        <p className="text-3xl font-bold mt-1">₹{r.monthly.toLocaleString("en-IN")}</p>
        <p className="text-xs text-muted-foreground mt-1">at the expected return you specified</p>
      </div>
      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/30">
        <p className="text-xs font-semibold">Inflation-aware</p>
        <p className="text-sm">To buy the same things in the future, your target in today's money is <strong>₹{(data as any).target.realToday.toLocaleString("en-IN")}</strong>. Required SIP: <strong>₹{r.realPower.toLocaleString("en-IN")}/month</strong>.</p>
      </div>
      <p className="text-xs text-muted-foreground">{data.message}</p>
    </div>
  )
}

function FundDetail({ fund, onClose }: { fund: SeedFund; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{fund.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="AMC" value={fund.amc} />
            <Stat label="Category" value={fund.category} />
            <Stat label="Risk" value={fund.riskLevel} />
            <Stat label="NAV" value={`₹${fund.nav.toFixed(2)}`} />
            <Stat label="NAV Date" value={fund.navDate} />
            <Stat label="AUM" value={`₹${fund.aum.toLocaleString("en-IN")} Cr`} />
            <Stat label="Benchmark" value={fund.benchmark} />
            <Stat label="Expense Ratio" value={`${fund.expenseRatio}%`} />
            <Stat label="3Y CAGR" value={`${fund.cagr3y}%`} highlight />
            <Stat label="5Y CAGR" value={`${fund.cagr5y}%`} />
            <Stat label="Since Inception" value={`${fund.returnSinceInception}%`} />
            <Stat label="Inception Date" value={fund.inceptionDate} />
            <Stat label="Min SIP" value={`₹${fund.minimumSIP}`} />
            <Stat label="Min Lumpsum" value={`₹${fund.minimumLumpsum.toLocaleString("en-IN")}`} />
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <p><strong>How to read this:</strong> CAGR = Compound Annual Growth Rate. Expense ratio is what you pay the AMC each year — below 1% is good for equity funds. AUM above ₹10,000 Cr indicates institutional confidence. Compare 3Y vs 5Y CAGR to spot consistency.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-emerald-600" : ""}`}>{value}</p>
    </div>
  )
}
