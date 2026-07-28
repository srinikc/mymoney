"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { HealthGauge } from "@/components/charts/health-gauge"
import { motion } from "motion/react"
import { Download, RefreshCw, ArrowRight, TrendingUp, Shield, AlertTriangle, CheckCircle2, Target, Lightbulb, PieChart, FileText, ChevronRight } from "lucide-react"
import { formatCurrencyFull } from "@/lib/utils"
import { PageHeaderSkeleton } from "@/components/ui/page-skeleton"

interface HC { score: number; value: number; target: number; status: "good" | "warning" | "critical" }
interface GapR { category: string; status: "good" | "warning" | "critical"; title: string; currentValue: string; targetValue: string; gap: string; gapAmount: number; actionItems: string[] }
interface Rec { id: string; category: string; priority: "high" | "medium" | "low"; title: string; description: string; action: string; impact: string; estimatedSavings?: number }

function scColor(s: string): string {
  switch (s) {
    case "good": { return "text-emerald-500"
    }
    case "warning": { return "text-amber-500"
    }
    default: { return "text-red-500"
    }
  }
}
function scBg(s: string): string {
  switch (s) {
    case "good": { return "bg-emerald-500/10 border-emerald-500/30"
    }
    case "warning": { return "bg-amber-500/10 border-amber-500/30"
    }
    default: { return "bg-red-500/10 border-red-500/30"
    }
  }
}
function scIcon(s: string) {
  switch (s) {
    case "good": { return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    }
    case "warning": { return <AlertTriangle className="h-4 w-4 text-amber-500" />
    }
    default: { return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }
}
function bv(s: string): "success" | "warning" | "destructive" {
  if (s === "good") return "success"
  return s === "warning" ? "warning" : "destructive"
}
function pc(p: string): string {
  if (p === "high") return "text-red-500"
  return p === "medium" ? "text-amber-500" : "text-blue-500"
}
function pb(p: string): string {
  if (p === "high") return "bg-red-500/10"
  return p === "medium" ? "bg-amber-500/10" : "bg-blue-500/10"
}
function pd(p: string): string {
  if (p === "high") return "bg-red-500"
  return p === "medium" ? "bg-amber-500" : "bg-blue-500"
}

const LABELS: Record<string, string> = { savingsRate: "Savings Rate", budgetAdherence: "Budget Adherence", diversification: "Diversification", emergencyFund: "Emergency Fund", debtToIncome: "Debt-to-Income", investmentRatio: "Investment Ratio" }

export default function HealthDashboardPage() {
  const [hs, setHs] = useState<{ overall: number; components: Record<string, HC>; recommendations: string[] } | null>(null)
  const [ga, setGa] = useState<{ gaps: GapR[] } | null>(null)
  const [recs, setRecs] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pdfL, setPdfL] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const [hr, gr, rr] = await Promise.all([fetch("/api/health-score"), fetch("/api/gap-analysis"), fetch("/api/recommendations")])
      if (!hr.ok) throw new Error("Failed to load health score")
      const [h, g, r] = await Promise.all([hr.json(), gr.ok ? gr.json() : { gaps: [] }, rr.ok ? rr.json() : { recommendations: [] }])
      setHs(h); setGa(g); setRecs(r.recommendations || [])
    } catch (error_) { setError(error_ instanceof Error ? error_.message : "Failed to load data") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const dlPdf = async () => {
    setPdfL(true)
    try {
      const r = await fetch("/api/health-report/pdf")
      if (!r.ok) throw new Error("PDF generation failed")
      const b = await r.blob()
      const u = URL.createObjectURL(b)
      const a = document.createElement("a")
      a.href = u; a.download = `mymoney-health-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(u)
    } catch { console.error("PDF failed") }
    finally { setPdfL(false) }
  }

  if (loading) return <div className="p-8"><PageHeaderSkeleton /></div>
  if (error) return <div className="flex flex-col items-center justify-center p-8 text-center"><AlertTriangle className="mb-3 h-8 w-8 text-red-500" /><p className="text-red-500">{error}</p><Button variant="outline" className="mt-4" onClick={fetchAll}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>

  const comps = hs?.components || {}
  const metrics = Object.entries(comps).map(([k, c]) => ({ label: LABELS[k] || k, value: c.score || 0 }))
  const gapE = ga?.gaps || []
  const top5 = recs.slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-bold tracking-tight">Financial Health Dashboard</h1><p className="mt-1 text-muted-foreground">Comprehensive view of your financial well-being</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh</Button>
          <Button size="sm" onClick={dlPdf} disabled={pdfL}><Download className="mr-1.5 h-4 w-4" />{pdfL ? "Generating..." : "Download PDF"}</Button>
        </div>
      </div>
      <HealthGauge score={hs?.overall ?? 0} metrics={metrics} />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Score Components</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(comps).map(([k, c]) => {
            const pct = c.target > 0 ? Math.round((c.value / c.target) * 100) : 0
            return <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={scBg(c.status)}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{LABELS[k] || k}</span>
                    <div className="flex items-center gap-1.5">{scIcon(c.status)}<span className={`text-xs font-semibold ${scColor(c.status)}`}>{c.score}/100</span></div>
                  </div>
                  <Progress value={c.score} className="h-2" />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Current: {typeof c.value === "number" ? c.value.toFixed(1) : c.value}</span>
                    <span>Target: {c.target}</span>
                  </div>
                  {c.status !== "good" && <p className="mt-1.5 text-xs text-muted-foreground">{pct < 50 ? `At ${pct}% of target - needs attention` : `At ${pct}% of target - improving`}</p>}
                </CardContent>
              </Card>
            </motion.div>
          })}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Top Recommendations</CardTitle><CardDescription>CFP-based suggestions</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {top5.length === 0 ? <p className="text-sm text-muted-foreground">No recommendations yet.</p> : top5.map((r, i) => <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-lg border p-3 transition-colors hover:bg-accent/50">
              <div className="mb-1 flex items-center gap-2"><Badge variant="outline" className={`${pb(r.priority)} ${pc(r.priority)} border-0 text-[10px]`}>{r.priority}</Badge><span className="text-xs capitalize text-muted-foreground">{r.category}</span></div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
              {r.estimatedSavings ? <p className="mt-1 text-xs font-medium text-emerald-500">Savings: {formatCurrencyFull(r.estimatedSavings)}/mo</p> : null}
            </motion.div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Gap Analysis</CardTitle><CardDescription>Financial safety net gaps</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {gapE.length === 0 ? <p className="text-sm text-muted-foreground">No gap data available.</p> : gapE.map((g, i) => <motion.div key={g.category} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.1 }} className={`rounded-lg border p-4 ${scBg(g.status)}`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">{scIcon(g.status)}<span className="font-medium text-sm">{g.title}</span></div>
                <Badge variant={bv(g.status)} className="text-[10px]">{g.status}</Badge>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Current: </span><span className="font-medium">{g.currentValue}</span></div>
                <div><span className="text-muted-foreground">Target: </span><span className="font-medium">{g.targetValue}</span></div>
                {g.gapAmount > 0 && <div className="col-span-2"><span className="text-muted-foreground">Gap: </span><span className="font-medium text-red-500">{g.gap}</span></div>}
              </div>
              <div className="space-y-1">{g.actionItems.slice(0, 2).map((a, j) => <p key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />{a}</p>)}</div>
            </motion.div>)}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/risk-profile"><Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><Shield className="h-5 w-5" /></div><div><p className="text-sm font-medium">Risk Profile</p><p className="text-xs text-muted-foreground">Retake assessment</p></div><ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></CardContent></Card></Link>
        <Link href="/what-if"><Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500"><TrendingUp className="h-5 w-5" /></div><div><p className="text-sm font-medium">What-If Simulator</p><p className="text-xs text-muted-foreground">Test scenarios</p></div><ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></CardContent></Card></Link>
        <Link href="/insights"><Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><PieChart className="h-5 w-5" /></div><div><p className="text-sm font-medium">Spending Insights</p><p className="text-xs text-muted-foreground">Deep analysis</p></div><ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></CardContent></Card></Link>
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md" onClick={dlPdf}><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"><FileText className="h-5 w-5" /></div><div><p className="text-sm font-medium">Download Report</p><p className="text-xs text-muted-foreground">PDF summary</p></div><Download className="ml-auto h-4 w-4 text-muted-foreground" /></CardContent></Card>
      </div>
      {recs.length > 5 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> All Recommendations ({recs.length})</CardTitle></CardHeader><CardContent><div className="space-y-2">{recs.map((r) => <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${pd(r.priority)}`} /><div className="flex-1"><div className="flex items-center gap-2"><span className="font-medium">{r.title}</span><Badge variant="outline" className="text-[10px] capitalize">{r.category}</Badge></div><p className="text-xs text-muted-foreground">{r.description}</p></div></div>)}</div></CardContent></Card>}
    </div>
  )
}
