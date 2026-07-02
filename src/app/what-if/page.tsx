"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { motion } from "motion/react"
import { BarChart3, TrendingUp, PiggyBank, Utensils, CreditCard, Zap, Sliders, Play, RefreshCw, Download, LineChart, Wallet, Target } from "lucide-react"
import { formatCurrencyFull } from "@/lib/utils"

interface ProjectedMonth {
  month: number; date: string; savingsRate: number; budgetAdherence: number; diversification: number
  emergencyFund: number; debtToIncome: number; investmentRatio: number; overall: number
  totalSavings: number; totalInvestments: number; totalDebt: number
}

interface SimResult {
  baseline: Record<string, number>
  projection: ProjectedMonth[]
  summary: { initialOverall: number; finalOverall: number; improvement: number; totalSavingsAccumulated: number; totalInvestmentsFinal: number; totalDebtFinal: number }
}

const SCENARIOS = [
  { id: "save-more", name: "Save More", description: "Increase savings rate by 10%", icon: "piggy-bank", params: { savingsRateChange: 10 } },
  { id: "reduce-dining", name: "Reduce Dining Out", description: "Reduce dining by 30%", icon: "utensils", params: { expenseReduction: { "food-dining": 30 } } },
  { id: "invest-more", name: "Invest More", description: "Add ₹5,000/month", icon: "trending-up", params: { investmentIncrease: 5000 } },
  { id: "pay-debt", name: "Pay Off Debt", description: "Pay off ₹50,000 of debt", icon: "credit-card", params: { debtPayoff: 50_000 } },
  { id: "aggressive-save", name: "Aggressive Savings", description: "Save 15% more + cut expenses 10%", icon: "zap", params: { savingsRateChange: 15, expenseReduction: { all: 10 } } },
]

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  "piggy-bank": <PiggyBank className="h-5 w-5" />, "utensils": <Utensils className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />, "credit-card": <CreditCard className="h-5 w-5" />, "zap": <Zap className="h-5 w-5" />,
}

function sc(score: number): string { return score < 40 ? "text-red-500" : (score < 70 ? "text-amber-500" : "text-emerald-500") }
function sb(score: number): string { return score < 40 ? "bg-red-500" : (score < 70 ? "bg-amber-500" : "bg-emerald-500") }

export default function WhatIfSimulatorPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("scenarios")
  const [cp, setCp] = useState({ savingsRateChange: 5, expenseReduction: 10, investmentIncrease: 2000, debtPayoff: 10_000, months: 12 })

  const run = useCallback(async (params: Record<string, unknown>) => {
    setLoading(true); setError("")
    try {
      const r = await fetch("/api/what-if", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...params, months: params.months || 12 }) })
      if (!r.ok) throw new Error("Simulation request failed")
      setResult(await r.json()); setTab("results")
    } catch { setError("Simulation failed.") }
    finally { setLoading(false) }
  }, [])

  const customRun = () => run({ savingsRateChange: cp.savingsRateChange, expenseReduction: cp.expenseReduction > 0 ? { all: cp.expenseReduction } : {}, investmentIncrease: cp.investmentIncrease, debtPayoff: cp.debtPayoff, months: cp.months })
  const reset = () => { setResult(null); setError(""); setTab("scenarios") }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">What-If Simulator</h1>
        <p className="mt-1 text-muted-foreground">See how changes in your financial habits affect your health score over time</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scenarios" disabled={loading}><BarChart3 className="mr-2 h-4 w-4" /> Pre-built</TabsTrigger>
          <TabsTrigger value="custom" disabled={loading}><Sliders className="mr-2 h-4 w-4" /> Custom</TabsTrigger>
          {result && <TabsTrigger value="results"><LineChart className="mr-2 h-4 w-4" /> Results</TabsTrigger>}
        </TabsList>
        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md" onClick={() => run({ ...s.params, months: 12 })}>
                  <CardContent className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{SCENARIO_ICONS[s.icon] || <BarChart3 className="h-5 w-5" />}</div>
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <Button size="sm" className="mt-4 w-full" disabled={loading}>{loading ? "Running..." : "Simulate"}<Play className="ml-2 h-3.5 w-3.5" /></Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="custom">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="h-5 w-5 text-primary" /> Custom Scenario Builder</CardTitle><CardDescription>Adjust the sliders below to create your own scenario</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {[{ label: "Savings Rate Change", icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, key: "savingsRateChange", min: 0, max: 30, step: 1, unit: "%", badge: "secondary" },
                { label: "Expense Reduction", icon: <Wallet className="h-4 w-4 text-amber-500" />, key: "expenseReduction", min: 0, max: 40, step: 1, unit: "%", badge: "warning" },
                { label: "Monthly Investment", icon: <Target className="h-4 w-4 text-blue-500" />, key: "investmentIncrease", min: 0, max: 50_000, step: 1000, unit: "₹", badge: "secondary" },
                { label: "Debt Payoff", icon: <CreditCard className="h-4 w-4 text-red-500" />, key: "debtPayoff", min: 0, max: 200_000, step: 5000, unit: "₹", badge: "destructive" },
                { label: "Projection Period", icon: <BarChart3 className="h-4 w-4 text-purple-500" />, key: "months", min: 3, max: 36, step: 3, unit: " months", badge: "secondary" },
              ].map((s) => (
                <div key={s.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">{s.icon} {s.label}</label>
                    <Badge variant={s.badge as "secondary" | "warning" | "destructive"}>{s.unit}{cp[s.key as keyof typeof cp]}</Badge>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={cp[s.key as keyof typeof cp]}
                    onChange={(e) => setCp({ ...cp, [s.key]: Number.parseInt(e.target.value) })} className="w-full accent-primary" />
                </div>
              ))}
              <Button className="w-full" onClick={customRun} disabled={loading}>{loading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Simulating...</> : <><Play className="mr-2 h-4 w-4" /> Run</>}</Button>
            </CardContent>
          </Card>
        </TabsContent>
        {result && <TabsContent value="results">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Starting</span><span className="text-sm text-muted-foreground">{result.summary.initialOverall}/100</span></div><div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${result.summary.initialOverall}%` }} /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Final</span><span className={`text-sm font-semibold ${sc(result.summary.finalOverall)}`}>{result.summary.finalOverall}/100</span></div><div className="mt-1 h-2 rounded-full bg-secondary"><div className={`h-2 rounded-full ${sb(result.summary.finalOverall)}`} style={{ width: `${result.summary.finalOverall}%` }} /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Improvement</span><span className={`text-sm font-semibold ${result.summary.improvement >= 0 ? "text-emerald-500" : "text-red-500"}`}>{result.summary.improvement >= 0 ? "+" : ""}{result.summary.improvement}</span></div><p className="mt-1 text-xs text-muted-foreground">points gained</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Total Savings</span><span className="text-sm font-semibold">{formatCurrencyFull(result.summary.totalSavingsAccumulated)}</span></div><p className="mt-1 text-xs text-muted-foreground">accumulated</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5 text-primary" /> Score Projection</CardTitle><CardDescription>Over {result.projection.length} months</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[250px]"><div className="flex h-full items-end gap-1">{result.projection.map((p, i) => <div key={i} className="group relative flex flex-1 flex-col items-center"><div className={`w-full rounded-t ${sb(p.overall)}`} style={{ height: `${p.overall}%`, minHeight: "4px" }} /><div className="mt-1 hidden text-[8px] text-muted-foreground group-hover:block">{p.date}</div></div>)}</div></div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 pr-4 font-medium">Month</th><th className="pb-2 pr-4 font-medium text-right">Score</th><th className="pb-2 pr-4 font-medium text-right">Savings</th><th className="pb-2 pr-4 font-medium text-right">Emergency</th><th className="pb-2 pr-4 font-medium text-right">DTI</th><th className="pb-2 pr-4 font-medium text-right">Invest</th><th className="pb-2 font-medium text-right">Saved (₹)</th></tr></thead>
                  <tbody>{result.projection.filter((_, i) => i % Math.max(1, Math.floor(result.projection.length / 6)) === 0 || i === result.projection.length - 1).map((p) => <tr key={p.month} className="border-b last:border-0"><td className="py-2 pr-4 font-medium">{p.date}</td><td className={`py-2 pr-4 text-right font-semibold ${sc(p.overall)}`}>{p.overall}</td><td className="py-2 pr-4 text-right">{p.savingsRate}%</td><td className="py-2 pr-4 text-right">{p.emergencyFund}mo</td><td className="py-2 pr-4 text-right">{p.debtToIncome}%</td><td className="py-2 pr-4 text-right">{p.investmentRatio}%</td><td className="py-2 text-right">{formatCurrencyFull(p.totalSavings)}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3"><Button variant="outline" onClick={reset}><RefreshCw className="mr-2 h-4 w-4" /> Try Another</Button><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></div>
        </TabsContent>}
      </Tabs>
      {error && <Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-4 text-sm text-red-600">{error}</CardContent></Card>}
      {loading && !result && <Card><CardContent className="flex items-center justify-center p-8"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-sm text-muted-foreground">Running simulation...</p></CardContent></Card>}
    </div>
  )
}
