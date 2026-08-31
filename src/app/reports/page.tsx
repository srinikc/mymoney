"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, FileText, Loader2, CheckCircle2, Sparkles, Calculator, Lightbulb, AlertTriangle, FileBarChart, Wallet, Target, TrendingUp, BarChart3 } from "lucide-react"
import { toast } from "sonner"

interface Section {
  id: string
  title: string
  desc: string
  icon: any
}

const SECTIONS: Section[] = [
  { id: "summary", title: "Executive Summary", desc: "One-page snapshot of your financial health", icon: BarChart3 },
  { id: "income", title: "Income & Expenses", desc: "3-month averages, top categories", icon: Wallet },
  { id: "budget", title: "Budget vs Actual", desc: "Monthly budget performance", icon: Calculator },
  { id: "investments", title: "Investments", desc: "Portfolio holdings & total", icon: TrendingUp },
  { id: "loans", title: "Loans", desc: "Outstanding debt and EMIs", icon: FileBarChart },
  { id: "goals", title: "Goals", desc: "Progress and deadlines", icon: Target },
  { id: "networth", title: "Net Worth", desc: "Assets minus liabilities", icon: Wallet },
  { id: "insights", title: "Spending Intelligence", desc: "Anomalies, velocity, tax gaps", icon: Sparkles },
  { id: "emergency", title: "Emergency Fund", desc: "Current runway and run-up plan", icon: CheckCircle2 },
]

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  async function download() {
    setGenerating(true)
    try {
      const res = await fetch("/api/reports/financial")
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to generate" }))
        throw new Error(err.error || "Failed to generate report")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const date = new Date()
      const fname = `mymoney-report-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}.pdf`
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setLastGenerated(new Date())
      toast.success("Report downloaded")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate report"
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Financial Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a comprehensive PDF with table of contents. Share with your CA, financial advisor, or keep for your records.
          </p>
        </div>
        <Button onClick={download} disabled={generating} size="lg">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {generating ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What's inside</CardTitle>
          <CardDescription>All 9 sections included in the generated PDF. Click to download and review.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">p.{i + 3}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {lastGenerated && (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Last generated</p>
              <p className="text-xs text-muted-foreground">{lastGenerated.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to use this report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
            <p>Click "Download PDF" above. The file opens with a branded cover, table of contents, and 9 sections.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
            <p>Each section starts on a new page with a header showing "Page X of Y" so you always know where you are.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">3</span>
            <p>Share with your CA at tax time, or use the Net Worth and Emergency Fund sections when applying for loans.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">4</span>
            <p>Regenerate anytime — the report always reflects your latest data.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
