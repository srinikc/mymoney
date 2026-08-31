"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  LifeBuoy,
  Loader2,
  TrendingUp,
  Wallet,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  Briefcase,
  PiggyBank,
  Calendar,
  ChevronRight,
} from "lucide-react"
import {
  JOB_STABILITY,
  type EmergencyFundResult,
} from "@/shared/emergency-fund"
import { formatCurrency, formatCurrencyFull } from "@/lib/utils"

interface Breakdown {
  monthlyEssentials: number
  sampleCount: number
  monthsAnalyzed: number
  liquidSavings: number
  cashTotal: number
  bankSavingsTotal: number
  dependents: number
  jobType: string
  monthlyIncome: number
  recommendedMonths: number
}

interface EFundResponse extends EmergencyFundResult {
  breakdown: Breakdown
}

const JOB_LABELS: Record<string, string> = {
  government: "Government / PSU",
  private: "Private Sector",
  self_employed: "Self-Employed",
  freelance: "Freelancer",
  business: "Business Owner",
  retired: "Retired",
  student: "Student",
  homemaker: "Homemaker",
  other: "Other",
}

export default function EmergencyFundPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EFundResponse | null>(null)
  const [overrides, setOverrides] = useState<{
    jobType?: string
    dependents?: number
    monthlyEssentials?: number
    existingSavings?: number
  }>({})

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/emergency-fund")
      if (!res.ok) throw new Error("Failed to load")
      const json: EFundResponse = await res.json()
      setData(json)
    } catch {
      toast.error("Failed to load emergency fund data")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const display = {
    jobType: overrides.jobType ?? data.breakdown.jobType,
    dependents: overrides.dependents ?? data.breakdown.dependents,
    monthlyEssentials: overrides.monthlyEssentials ?? data.breakdown.monthlyEssentials,
    existingSavings: overrides.existingSavings ?? data.breakdown.liquidSavings,
  }

  const recomputed = {
    months: JOB_STABILITY[display.jobType]?.months ?? 6 + (display.dependents > 0 ? 1 : 0) + (display.dependents >= 3 ? 2 : 0),
    target: Math.round(display.monthlyEssentials * (
      (JOB_STABILITY[display.jobType]?.months ?? 6) +
      (display.dependents >= 3 ? 3 : display.dependents >= 1 ? 1 : 0)
    )),
    gap: Math.max(0, Math.round(display.monthlyEssentials * (
      (JOB_STABILITY[display.jobType]?.months ?? 6) +
      (display.dependents >= 3 ? 3 : display.dependents >= 1 ? 1 : 0)
    )) - display.existingSavings),
  }

  const runUpMonths = recomputed.gap > 0 && data.breakdown.monthlyIncome > 0
    ? Math.max(1, Math.ceil(recomputed.gap / (data.breakdown.monthlyIncome * 0.2)))
    : 12
  const monthlyRunUp = Math.ceil(recomputed.gap / Math.max(1, runUpMonths))

  const pct = recomputed.target > 0 ? Math.min(100, (display.existingSavings / recomputed.target) * 100) : 0
  const isFunded = recomputed.gap === 0 && recomputed.target > 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <LifeBuoy className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Emergency Fund Planner</h1>
            <p className="text-sm text-muted-foreground">
              Your first financial safety net. Built from your real data.
            </p>
          </div>
        </div>
      </div>

      {/* Hero card */}
      <Card className={isFunded ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-blue-200 bg-blue-50/30 dark:bg-blue-950/20"}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                {isFunded ? "Status: Funded" : "Status: Building"}
              </p>
              <p className="text-3xl font-bold mb-1">
                {formatCurrencyFull(display.existingSavings)} <span className="text-base font-normal text-muted-foreground">of {formatCurrencyFull(recomputed.target)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {recomputed.months} months of essentials (your profile suggests this)
              </p>
            </div>
            <div className="text-right">
              {isFunded ? (
                <Badge variant="default" className="bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Fully Funded
                </Badge>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Gap</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrencyFull(recomputed.gap)}</p>
                </>
              )}
            </div>
          </div>
          <Progress value={pct} className="mt-4 h-3" />
          <p className="text-xs text-muted-foreground mt-2">{pct.toFixed(0)}% of target</p>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Monthly essentials" value={formatCurrencyFull(display.monthlyEssentials)} hint={`Avg of last ${data.breakdown.monthsAnalyzed} months`} color="blue" />
        <StatCard icon={PiggyBank} label="Liquid savings" value={formatCurrencyFull(display.existingSavings)} hint={`Cash ₹${formatCurrency(data.breakdown.cashTotal)} + Savings ₹${formatCurrency(data.breakdown.bankSavingsTotal)}`} color="emerald" />
        <StatCard icon={Calendar} label="Months to target" value={`${recomputed.months} mo`} hint={JOB_STABILITY[display.jobType]?.rationale} color="purple" />
        <StatCard icon={TrendingUp} label="Monthly run-up" value={recomputed.gap > 0 ? formatCurrencyFull(monthlyRunUp) : "Done"} hint={recomputed.gap > 0 ? `Funds it in ${runUpMonths} months` : "Top up annually"} color="amber" />
      </div>

      {/* Customize */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Customize your plan
          </CardTitle>
          <CardDescription>Defaults are computed from your data. Adjust to fit your situation.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Job type</Label>
            <Select value={display.jobType} onValueChange={(v) => setOverrides((p) => ({ ...p, jobType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(JOB_STABILITY).map((k) => (
                  <SelectItem key={k} value={k}>{JOB_LABELS[k]} ({JOB_STABILITY[k].months} mo)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Dependents (family members financially relying on you)</Label>
            <Input
              type="number"
              min={0}
              value={display.dependents}
              onChange={(e) => setOverrides((p) => ({ ...p, dependents: Math.max(0, Number(e.target.value)) }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Monthly essentials (₹) — override if you know better</Label>
            <Input
              type="number"
              min={0}
              value={display.monthlyEssentials}
              onChange={(e) => setOverrides((p) => ({ ...p, monthlyEssentials: Math.max(0, Number(e.target.value)) }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Existing liquid savings (₹)</Label>
            <Input
              type="number"
              min={0}
              value={display.existingSavings}
              onChange={(e) => setOverrides((p) => ({ ...p, existingSavings: Math.max(0, Number(e.target.value)) }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action plan */}
      {!isFunded && recomputed.gap > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" /> Your run-up plan
            </CardTitle>
            <CardDescription>
              Save {formatCurrencyFull(monthlyRunUp)}/month for the next {runUpMonths} months to hit the target.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PlanStep n={1} title="Open a separate high-yield savings account">
              <p className="text-sm text-muted-foreground">
                Examples: Fi Money, Niyo, Jupiter savings, IDFC First Bank. Goal: 7%+ interest, instant withdrawal, separate from your main account.
              </p>
            </PlanStep>
            <PlanStep n={2} title="Set up auto-debit on salary day">
              <p className="text-sm text-muted-foreground">
                Schedule {formatCurrencyFull(monthlyRunUp)} to transfer 1 hour after salary credits. Out of sight, out of mind.
              </p>
            </PlanStep>
            <PlanStep n={3} title="Don't touch for non-emergencies">
              <p className="text-sm text-muted-foreground">
                A wedding, vacation, or new phone is not an emergency. Real emergencies: job loss, medical, urgent home repair.
              </p>
            </PlanStep>
            <PlanStep n={4} title="Review and top up annually (every January)">
              <p className="text-sm text-muted-foreground">
                Inflation is ~6%/year. Bump the target by that much each January.
              </p>
            </PlanStep>
          </CardContent>
        </Card>
      )}

      {isFunded && (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">You're fully funded</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep this money in a high-yield savings or liquid fund. Re-evaluate every January to keep up with inflation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Why this many months */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Why {recomputed.months} months?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span><strong>Job type:</strong> {JOB_LABELS[display.jobType]} = {JOB_STABILITY[display.jobType]?.months} months baseline</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span><strong>Dependents:</strong> {display.dependents} → {display.dependents >= 3 ? "+3" : display.dependents >= 1 ? "+1" : "+0"} months</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            {JOB_STABILITY[display.jobType]?.rationale}
          </p>
        </CardContent>
      </Card>

      {/* Data sources */}
      {data.breakdown.sampleCount === 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">No expense data found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a few months of essential expenses (rent, groceries, utilities, EMI) for a more accurate target.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, hint, color }: { icon: any; label: string; value: string; hint: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-100",
    emerald: "text-emerald-600 bg-emerald-100",
    purple: "text-purple-600 bg-purple-100",
    amber: "text-amber-600 bg-amber-100",
  }
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={`h-7 w-7 rounded-md flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{hint}</p>
      </CardContent>
    </Card>
  )
}

function PlanStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold flex-shrink-0">
        {n}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children}
      </div>
    </div>
  )
}
