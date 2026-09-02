"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Brain, RefreshCw, Award, Star, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface FundMetadata {
  id: number
  schemeCode: number
  schemeName: string
  fundHouse: string
  category: string
  subCategory: string | null
  aiScore: number
  aiSummary: string | null
  prosPoints: string | null
  consPoints: string | null
  lastAnalyzedAt: string | null
  isCurated: boolean
}

export default function AdminFundsPage() {
  const [funds, setFunds] = useState<FundMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // Use a generic endpoint to fetch all fund metadata
      const res = await fetch("/api/admin/funds")
      if (res.ok) {
        const json = (await res.json()) as { funds: FundMetadata[] }
        setFunds(json.funds)
      }
    } catch (e) {
      toast.error("Failed to load funds")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/admin/funds/analyze", { method: "POST" })
      if (res.ok) {
        const json = (await res.json()) as { success: number; failed: number; total: number }
        toast.success(`Analyzed ${json.success}/${json.total} funds${json.failed > 0 ? ` (${json.failed} failed)` : ""}`)
        await load()
      } else {
        toast.error("Analysis failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setAnalyzing(false)
    }
  }

  const fundsWithScore = funds.filter((f) => f.aiScore > 0)
  const fundsWithoutScore = funds.filter((f) => f.aiScore === 0)
  const avgScore = fundsWithScore.length > 0
    ? fundsWithScore.reduce((s, f) => s + f.aiScore, 0) / fundsWithScore.length
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7" /> AI Fund Scoring
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Heuristic scoring based on 3-5Y performance, consistency, drawdown, and risk-adjusted returns. Re-run daily.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAnalyze} disabled={analyzing} data-testid="run-analysis">
            <Brain className="h-3.5 w-3.5 mr-1" /> {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Total Funds</span>
            <p className="text-2xl font-bold mt-2">{funds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">With AI Score</span>
            <p className="text-2xl font-bold mt-2 text-emerald-600">{fundsWithScore.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Pending Analysis</span>
            <p className="text-2xl font-bold mt-2 text-amber-600">{fundsWithoutScore.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Avg Score</span>
            <p className="text-2xl font-bold mt-2">{avgScore.toFixed(1)}/10</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        <div className="space-y-2" data-testid="admin-funds-list">
          {funds
            .sort((a, b) => b.aiScore - a.aiScore)
            .map((fund) => {
              const pros: string[] = fund.prosPoints ? JSON.parse(fund.prosPoints) : []
              const cons: string[] = fund.consPoints ? JSON.parse(fund.consPoints) : []
              return (
                <Card key={fund.id} data-testid="admin-fund-row" data-scheme={fund.schemeCode}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{fund.category}</Badge>
                          {fund.subCategory && <Badge variant="secondary" className="text-[10px] h-4 px-1">{fund.subCategory}</Badge>}
                          {fund.aiScore > 0 ? (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                              <Award className="h-2.5 w-2.5" /> {fund.aiScore.toFixed(1)}/10
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 text-amber-600">Not scored</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mt-1.5">{fund.schemeName}</h3>
                        <p className="text-xs text-muted-foreground">{fund.fundHouse}</p>
                        {fund.aiSummary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{fund.aiSummary}</p>}
                        {(pros.length > 0 || cons.length > 0) && (
                          <div className="grid sm:grid-cols-2 gap-2 mt-2 text-xs">
                            {pros.length > 0 && (
                              <div>
                                <p className="font-medium text-emerald-600 flex items-center gap-1 text-[10px]">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Pros
                                </p>
                                <ul className="text-muted-foreground space-y-0.5">
                                  {pros.slice(0, 2).map((p, i) => <li key={i}>• {p}</li>)}
                                </ul>
                              </div>
                            )}
                            {cons.length > 0 && (
                              <div>
                                <p className="font-medium text-red-600 flex items-center gap-1 text-[10px]">
                                  <AlertCircle className="h-2.5 w-2.5" /> Cons
                                </p>
                                <ul className="text-muted-foreground space-y-0.5">
                                  {cons.slice(0, 2).map((c, i) => <li key={i}>• {c}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          {fund.lastAnalyzedAt
                            ? `Updated ${new Date(fund.lastAnalyzedAt).toLocaleDateString("en-IN")}`
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
