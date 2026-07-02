"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { motion } from "motion/react"
import { ArrowLeft, ArrowRight, RefreshCw, CheckCircle2, PieChart, Shield, TrendingUp, BarChart3 } from "lucide-react"
import { PageHeaderSkeleton } from "@/components/ui/page-skeleton"

interface RiskQuestion { id: number; question: string; options: { label: string; score: number }[] }
interface AS { equity: number; debt: number; gold: number; cash: number; description: string }
interface RR { totalScore: number; maxScore: number; minScore: number; profile: "conservative" | "moderate" | "aggressive"; allocation: AS; summary: string }

const CFG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType; bv: "secondary" | "warning" | "success" }> = {
  conservative: { label: "Conservative", color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", icon: Shield, bv: "secondary" },
  moderate: { label: "Moderate", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", icon: BarChart3, bv: "warning" },
  aggressive: { label: "Aggressive", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", icon: TrendingUp, bv: "success" },
}
const AC: Record<string, string> = { equity: "#6366f1", debt: "#f59e0b", gold: "#f97316", cash: "#22c55e" }

export default function RiskProfilePage() {
  const router = useRouter()
  const [qs, setQs] = useState<RiskQuestion[]>([])
  const [step, setStep] = useState(0)
  const [as, setAs] = useState<number[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<RR | null>(null)
  const [sub, setSub] = useState(false)
  const [err, setErr] = useState("")

  const fetchQ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/risk-profile")
      if (!r.ok) throw new Error("Failed to fetch questions")
      const d = await r.json()
      setQs(d.questions)
      setAs(Array.from({ length: d.questions.length }, () => 0))
    } catch { setErr("Failed to load questions") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchQ() }, [fetchQ])

  const handleNext = () => {
    if (sel === null) return
    const na = [...as]; na[step] = sel; setAs(na)
    if (step < qs.length - 1) { setStep((s) => s + 1); setSel(null) }
    else submit(na)
  }
  const handleBack = () => { if (step > 0) { setStep((s) => s - 1); setSel(as[step - 1] || null) } }

  const submit = async (fa: number[]) => {
    setSub(true); setErr("")
    try {
      const r = await fetch("/api/risk-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: fa }) })
      if (!r.ok) throw new Error("Submission failed")
      setResult(await r.json())
    } catch { setErr("Failed to calculate risk profile.") }
    finally { setSub(false) }
  }

  const reset = () => { setResult(null); setStep(0); setAs(Array.from({ length: qs.length }, () => 0)); setSel(null); setErr("") }

  if (loading) return <div className="p-8"><PageHeaderSkeleton /></div>
  if (err && qs.length === 0) return <div className="flex flex-col items-center justify-center p-8 text-center"><p className="text-red-500">{err}</p><Button variant="outline" className="mt-4" onClick={fetchQ}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>

  const progress = ((step + (result ? qs.length : 0)) / qs.length) * 100

  if (result) {
    const c = CFG[result.profile]; const Icon = c.icon
    return <motion.div className="mx-auto max-w-2xl space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div><h1 className="text-3xl font-bold tracking-tight">Your Risk Profile</h1><p className="mt-1 text-muted-foreground">Based on the SEBI questionnaire</p></div>
      <Card className={`${c.bgColor} ${c.borderColor} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={"flex h-16 w-16 items-center justify-center rounded-full " + c.bgColor}><Icon className={"h-8 w-8 " + c.color} /></div>
            <div><Badge variant={c.bv} className="mb-1">{c.label}</Badge><p className="text-sm text-muted-foreground">Score: {result.totalScore} / {result.maxScore}</p></div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5 text-primary" /> Allocation</CardTitle><CardDescription>{result.allocation.description}</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">{Object.entries(result.allocation).filter(([k]) => k !== "description").map(([k, v]) => <motion.div key={k} className="h-full" style={{ backgroundColor: AC[k], width: v + "%" }} initial={{ width: 0 }} animate={{ width: v + "%" }} transition={{ duration: 0.8, delay: 0.2 }} />)}</div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">{Object.entries(result.allocation).filter(([k]) => k !== "description").map(([k, v]) => <div key={k}><div className="mx-auto mb-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AC[k] }} /><span className="capitalize text-muted-foreground">{k}</span><p className="font-semibold">{v}%</p></div>)}</div>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3"><Button variant="outline" onClick={reset}><RefreshCw className="mr-2 h-4 w-4" /> Retake</Button><Button onClick={() => router.push("/health")}><CheckCircle2 className="mr-2 h-4 w-4" /> Dashboard</Button></div>
    </motion.div>
  }

  const q = qs[step]
  return <div className="mx-auto max-w-2xl space-y-6">
    <div><h1 className="text-3xl font-bold tracking-tight">Risk Profile Assessment</h1><p className="mt-1 text-muted-foreground">Answer {qs.length} questions</p></div>
    <Card><CardContent className="p-6">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Q{step + 1} of {qs.length}</span><span className="font-medium">{Math.round(progress)}%</span></div>
        <Progress value={progress} className="h-2" />
      </div>
      <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <h2 className="mb-4 text-lg font-semibold">{q.question}</h2>
        <div className="space-y-2">{q.options.map((o, i) => <button key={i} onClick={() => setSel(o.score)} className={"w-full rounded-lg border p-3 text-left text-sm transition-all " + (sel === o.score ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/50 hover:bg-accent")}><div className="flex items-center gap-3"><div className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " + (sel === o.score ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{sel === o.score && <CheckCircle2 className="h-3.5 w-3.5" />}</div><span>{o.label}</span></div></button>)}</div>
      </motion.div>
      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
    </CardContent></Card>
    <div className="flex justify-between gap-3">
      <Button variant="outline" onClick={handleBack} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <Button onClick={handleNext} disabled={sel === null || sub}>{sub ? "Calculating..." : (step < qs.length - 1 ? <>Next <ArrowRight className="ml-2 h-4 w-4" /></> : <>See Results <CheckCircle2 className="ml-2 h-4 w-4" /></>)}</Button>
    </div>
  </div>
}
