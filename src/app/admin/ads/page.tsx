"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, MousePointerClick, TrendingUp, IndianRupee, Activity, AlertCircle, BarChart3, Power, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Metrics {
  range: { days: number; startDate: string }
  totals: { impressions: number; clicks: number; ctr: number; estimatedRevenue: number }
  byProvider: Record<string, number>
  clicksByProvider: Record<string, number>
  ctrByProvider: Record<string, number>
  byPage: Record<string, number>
  topTargets: Record<string, number>
  trend: { date: string; impressions: number; clicks: number; ctr: number }[]
  catalog: { activeLoans: number; curatedFunds: number; activePlacements: number }
}

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Mock",
  adsense: "AdSense",
  inmobi: "InMobi",
  adgebra: "Adgebra",
  sponsored: "Sponsored",
  affiliate: "Affiliate",
}

export default function AdminAdsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [killSwitch, setKillSwitch] = useState(false)
  const [killReason, setKillReason] = useState("")
  const [killLoading, setKillLoading] = useState(false)

  const load = async (range: number) => {
    setLoading(true)
    try {
      const [metricsRes, killRes] = await Promise.all([
        fetch(`/api/admin/ads/metrics?days=${range}`),
        fetch("/api/admin/ads/killswitch"),
      ])
      if (metricsRes.ok) {
        const m = (await metricsRes.json()) as Metrics
        setMetrics(m)
      }
      if (killRes.ok) {
        const k = (await killRes.json()) as { killSwitch: { value?: boolean; reason?: string } }
        setKillSwitch(Boolean(k.killSwitch?.value))
        setKillReason(k.killSwitch?.reason ?? "")
      }
    } catch (e) {
      toast.error("Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(days)
  }, [days])

  const handleKillToggle = async (next: boolean) => {
    setKillLoading(true)
    try {
      const res = await fetch("/api/admin/ads/killswitch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next, reason: next ? "Admin disabled all display ads" : "Re-enabled by admin" }),
      })
      if (res.ok) {
        setKillSwitch(next)
        toast.success(next ? "All display ads disabled globally" : "Display ads re-enabled")
      } else {
        toast.error("Failed to update kill switch")
      }
    } finally {
      setKillLoading(false)
    }
  }

  const handleExportCsv = () => {
    if (!metrics) return
    const rows = [
      ["date", "impressions", "clicks", "ctr", "estimated_revenue"],
      ...metrics.trend.map((d) => [
        d.date,
        d.impressions,
        d.clicks,
        d.ctr.toFixed(2),
        ((d.impressions * 50) / 1000).toFixed(2),
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mymoney-ads-${days}d-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxTrendImp = Math.max(1, ...(metrics?.trend.map((t) => t.impressions) ?? [0]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7" /> Ad Revenue Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor impressions, clicks, CTR, and estimated revenue across all ad networks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => load(days)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={!metrics}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <Card data-testid="kill-switch-card" className={killSwitch ? "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-950/10" : "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Power className={`h-5 w-5 ${killSwitch ? "text-red-600" : "text-emerald-600"}`} />
              <div>
                <h3 className="font-semibold text-sm">Global Kill Switch</h3>
                <p className="text-xs text-muted-foreground">
                  {killSwitch ? "Display ads are DISABLED for all users." : "Display ads are LIVE for all users."}
                </p>
              </div>
            </div>
            <Switch checked={killSwitch} onCheckedChange={handleKillToggle} disabled={killLoading} data-testid="kill-switch" />
          </div>
        </CardContent>
      </Card>

      {loading && !metrics ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-12 bg-muted rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 md:grid-cols-4" data-testid="metrics-summary">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Impressions</span>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="metric-impressions">{metrics.totals.impressions.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-muted-foreground mt-1">last {days} days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Clicks</span>
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="metric-clicks">{metrics.totals.clicks.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-muted-foreground mt-1">last {days} days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">CTR</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="metric-ctr">{metrics.totals.ctr.toFixed(2)}%</p>
                <p className="text-[10px] text-muted-foreground mt-1">click-through rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Est. Revenue</span>
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold mt-2 text-emerald-600" data-testid="metric-revenue">
                  ₹{metrics.totals.estimatedRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">based on CPM + CPC est.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Impressions Trend</CardTitle>
                <CardDescription>Daily impressions over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="trend-chart">
                  {metrics.trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {metrics.trend.slice(-14).map((d) => {
                        const widthPct = (d.impressions / maxTrendImp) * 100
                        return (
                          <div key={d.date} className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-muted-foreground font-mono text-[10px]">{d.date.slice(5)}</span>
                            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${widthPct}%` }} />
                            </div>
                            <span className="w-12 text-right tabular-nums">{d.impressions}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Provider</CardTitle>
                <CardDescription>Impression share by network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.byProvider).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
                  ) : (
                    Object.entries(metrics.byProvider)
                      .sort((a, b) => b[1] - a[1])
                      .map(([provider, count]) => {
                        const total = Object.values(metrics.byProvider).reduce((s, v) => s + v, 0)
                        const pct = (count / total) * 100
                        const ctr = metrics.ctrByProvider[provider] ?? 0
                        return (
                          <div key={provider} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{PROVIDER_LABELS[provider] ?? provider}</span>
                              <span className="tabular-nums">{count.toLocaleString("en-IN")} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground">CTR: {ctr.toFixed(2)}% · {metrics.clicksByProvider[provider] ?? 0} clicks</div>
                          </div>
                        )
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Page</CardTitle>
                <CardDescription>Where ads are showing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(metrics.byPage).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
                  ) : (
                    Object.entries(metrics.byPage)
                      .sort((a, b) => b[1] - a[1])
                      .map(([page, count]) => (
                        <div key={page} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{page}</span>
                          <span className="tabular-nums">{count.toLocaleString("en-IN")}</span>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Click Targets</CardTitle>
                <CardDescription>Domains users clicked to</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(metrics.topTargets).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No clicks yet.</p>
                  ) : (
                    Object.entries(metrics.topTargets).map(([host, count]) => (
                      <div key={host} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{host}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catalog Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.catalog.activeLoans}</p>
                  <p className="text-xs text-muted-foreground">Active Loan Products</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.catalog.curatedFunds}</p>
                  <p className="text-xs text-muted-foreground">Curated Funds</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.catalog.activePlacements}</p>
                  <p className="text-xs text-muted-foreground">Active Placements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
