"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Umbrella,
  Calculator,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Shield,
  Target,
  IndianRupee,
  Calendar,
  Percent,
  Wallet,
  FileText,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { NPS_FUND_MANAGERS, NPS_TAX_BENEFITS, type NPSFundManager, type RetirementResult } from "@/shared/nps"

interface NpsResponse {
  fundManagers: NPSFundManager[]
  taxBenefits: typeof NPS_TAX_BENEFITS
  source: string
}

export default function RetirementPage() {
  const [npsData, setNpsData] = useState<NpsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Calculator state
  const [currentAge, setCurrentAge] = useState("30")
  const [retirementAge, setRetirementAge] = useState("60")
  const [lifeExpectancy, setLifeExpectancy] = useState("85")
  const [currentExpense, setCurrentExpense] = useState("50000")
  const [currentCorpus, setCurrentCorpus] = useState("500000")
  const [monthlyInvestment, setMonthlyInvestment] = useState("25000")
  const [preReturn, setPreReturn] = useState("11")
  const [postReturn, setPostReturn] = useState("7")
  const [inflation, setInflation] = useState("6")
  const [stepUp, setStepUp] = useState("10")
  const [result, setResult] = useState<(RetirementResult & { profileData?: { currentCorpusFromDB?: number; monthlyIncome?: number } }) | null>(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/nps")
      if (!res.ok) throw new Error("Failed to load")
      setNpsData(await res.json())
    } catch (e) {
      toast.error("Failed to load NPS data")
    } finally {
      setLoading(false)
    }
  }

  async function calculate() {
    setCalculating(true)
    try {
      const res = await fetch("/api/retirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAge: Number(currentAge),
          retirementAge: Number(retirementAge),
          lifeExpectancy: Number(lifeExpectancy),
          currentMonthlyExpense: Number(currentExpense),
          currentCorpus: Number(currentCorpus),
          monthlyInvestment: Number(monthlyInvestment),
          preRetirementReturn: Number(preReturn),
          postRetirementReturn: Number(postReturn),
          inflation: Number(inflation),
          stepUpPct: Number(stepUp),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to calculate")
      }
      setResult(await res.json())
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed"
      toast.error(msg)
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Umbrella className="h-7 w-7 text-primary" /> Retirement & NPS
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan your retirement with the 4% rule, choose an NPS fund manager, and understand tax benefits.
        </p>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="nps">NPS Funds</TabsTrigger>
        </TabsList>

        {/* Calculator tab */}
        <TabsContent value="calculator" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Inputs</CardTitle>
                <CardDescription>Be honest. Inflated numbers lead to shortfalls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Current age</Label>
                    <Input type="number" min={18} max={70} value={currentAge} onChange={(e) => setCurrentAge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Retirement age</Label>
                    <Input type="number" min={40} max={75} value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plan until age</Label>
                  <Input type="number" min={60} max={100} value={lifeExpectancy} onChange={(e) => setLifeExpectancy(e.target.value)} />
                  <p className="text-xs text-muted-foreground">85 is a safe default for Indian life expectancy today.</p>
                </div>
                <div className="space-y-2">
                  <Label>Current monthly expense (₹)</Label>
                  <Input type="number" min={5000} step={1000} value={currentExpense} onChange={(e) => setCurrentExpense(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Current retirement corpus (₹)</Label>
                  <Input type="number" min={0} step={10000} value={currentCorpus} onChange={(e) => setCurrentCorpus(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Include EPF, PPF, NPS, investments, FDs. Exclude your primary home.</p>
                </div>
                <div className="space-y-2">
                  <Label>Monthly SIP/Investment (₹)</Label>
                  <Input type="number" min={0} step={500} value={monthlyInvestment} onChange={(e) => setMonthlyInvestment(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Pre-retirement return %</Label>
                    <Input type="number" min={0} max={25} step={0.5} value={preReturn} onChange={(e) => setPreReturn(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Post-retirement return %</Label>
                    <Input type="number" min={0} max={15} step={0.5} value={postReturn} onChange={(e) => setPostReturn(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Inflation %</Label>
                    <Input type="number" min={0} max={15} step={0.5} value={inflation} onChange={(e) => setInflation(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Annual SIP step-up %</Label>
                    <Input type="number" min={0} max={30} step={0.5} value={stepUp} onChange={(e) => setStepUp(e.target.value)} />
                  </div>
                </div>
                <Button onClick={calculate} disabled={calculating} className="w-full">
                  {calculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                  Calculate retirement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Projection</CardTitle>
              </CardHeader>
              <CardContent>
                {!result ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Fill in inputs and click "Calculate" to see your retirement projection.
                  </div>
                ) : (
                  <RetirementResult data={result} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NPS tab */}
        <TabsContent value="nps" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> NPS Tax Benefits</CardTitle>
              <CardDescription>NPS is the only instrument with an extra ₹50K deduction under 80CCD(1B), on top of Section 80C.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Benefit label="Section 80CCD(1B)" value={`Extra ₹${NPS_TAX_BENEFITS.section80CCD1B.toLocaleString("en-IN")} deduction`} description="Above and beyond the ₹1.5L limit of Section 80C" />
              <Benefit label="Section 80CCD(2)" value="10% of basic salary" description="Employer NPS contribution, no upper cap" highlight />
              <Benefit label="Partial Withdrawal" value="Up to 25%" description="For education, medical, or housing needs" />
              <Benefit label="Tax-free Corpus" value="60%" description="60% of corpus at retirement is fully tax-free" />
              <Benefit label="Annuity" value="Min 40% annuitized" description="Annuity income is taxable; corpus lump-sum is not" />
            </CardContent>
          </Card>

          {loading || !npsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {npsData.fundManagers.map((fm) => (
                <FundManagerCard key={fm.code} fund={fm} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RetirementResult({ data }: { data: RetirementResult & { profileData?: { currentCorpusFromDB?: number; monthlyIncome?: number } } }) {
  return (
    <div className="space-y-4">
      <div className={`text-center py-4 rounded-lg ${data.isOnTrack ? "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900/30" : "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900/30"}`}>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Nominal Corpus at Retirement</p>
        <p className="text-3xl font-bold mt-1">₹{data.nominalCorpus.toLocaleString("en-IN")}</p>
        <p className="text-xs text-muted-foreground mt-1">After {data.yearsToRetirement} years of investing</p>
        <Badge variant={data.isOnTrack ? "default" : "destructive"} className="mt-2">
          {data.isOnTrack ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
          {data.isOnTrack ? "On track" : "Shortfall"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Mini label="Total invested" value={`₹${data.totalInvested.toLocaleString("en-IN")}`} />
        <Mini label="Real value (today)" value={`₹${data.realCorpusAtRetirement.toLocaleString("en-IN")}`} hint="Inflation-adjusted purchasing power" />
        <Mini label="Target (today's ₹)" value={`₹${data.targetCorpusToday.toLocaleString("en-IN")}`} hint="25× annual expenses" />
        <Mini label="Surplus/Shortfall" value={`₹${Math.abs(data.surplus).toLocaleString("en-IN")}`} hint={data.surplus >= 0 ? "surplus" : "shortfall"} highlight={data.surplus < 0} />
      </div>

      <div className="p-3 rounded-lg border bg-card">
        <p className="text-xs font-semibold flex items-center gap-1 mb-2">
          <Wallet className="h-3.5 w-3.5" /> Monthly income at retirement (4% rule)
        </p>
        <p className="text-2xl font-bold">₹{data.monthlyIncomeAtRetirement.toLocaleString("en-IN")}/mo</p>
        {data.monthlyIncomeShortfall > 0 && (
          <p className="text-xs text-rose-600 mt-1">Shortfall of ₹{data.monthlyIncomeShortfall.toLocaleString("en-IN")}/mo vs projected expenses</p>
        )}
      </div>

      {data.profileData?.currentCorpusFromDB && (
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/30 text-xs text-muted-foreground">
          <p>Your actual retirement corpus on MyMoney: ₹{data.profileData.currentCorpusFromDB.toLocaleString("en-IN")}. <strong>Update the input above if it's different.</strong></p>
        </div>
      )}

      {data.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> Recommendations</p>
          {data.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p>{r}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className="p-2 rounded-lg border bg-card">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-rose-600" : ""}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

function Benefit({ label, value, description, highlight }: { label: string; value: string; description: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "border-primary/40 bg-primary/5" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground font-semibold">{label}</p>
      <p className="text-base font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

function FundManagerCard({ fund }: { fund: NPSFundManager }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-semibold text-sm">{fund.name}</p>
            <Badge variant="outline" className="text-[10px] mt-1 capitalize">{fund.category}</Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">5Y CAGR</p>
            <p className="text-lg font-bold text-emerald-600">{fund.historical5yCagr}%</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div>
            <p className="text-muted-foreground">3Y</p>
            <p className="font-semibold">{fund.historical3yCagr}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Inception</p>
            <p className="font-semibold">{fund.sinceInceptionCagr}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">AUM</p>
            <p className="font-semibold">₹{fund.aumCr.toLocaleString("en-IN")}Cr</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{fund.description}</p>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <p className="text-emerald-600 font-semibold mb-1">Pros</p>
            {fund.pros.slice(0, 2).map((p, i) => <p key={i} className="text-muted-foreground">• {p}</p>)}
          </div>
          <div>
            <p className="text-amber-600 font-semibold mb-1">Cons</p>
            {fund.cons.slice(0, 2).map((c, i) => <p key={i} className="text-muted-foreground">• {c}</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
