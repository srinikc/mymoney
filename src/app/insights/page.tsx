"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { formatIndianCurrency } from "@/lib/format"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts"
import { ChartTooltip } from "@/components/charts/chart-tooltip"
import { Lightbulb, Users, Store, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Target } from "lucide-react"
import { InsightsSkeleton } from "@/components/ui/page-skeleton"
import { motion } from "motion/react"

const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16"]

type PeriodType = "all" | "year" | "quarter" | "month" | "custom"

interface DeepInsights {
  monthlyTrend: { month: string; amount: number; count: number }[]
  categoryBreakdown: { name: string; amount: number; count: number; color: string; subCategories: { name: string; amount: number; count: number }[] }[]
  personWise: { name: string; amount: number; count: number }[]
  topMerchants: { name: string; amount: number; count: number }[]
  yearlyComparison: { year: number; amount: number; count: number }[]
  optimization: { category: string; percentage: number; total: number; monthlyAvg: number; potentialSavings: number; subCategories: { name: string; amount: number; count: number }[] }[]
  deals: { merchant: string; title: string; discount: string; validUntil: string; description: string }[]
}

export default function InsightsPage() {
  const [data, setData] = useState<DeepInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // P4.4: Time period filter
  const [period, setPeriod] = useState<PeriodType>("all")
  const currentYear = new Date().getFullYear()
  const [periodYear, setPeriodYear] = useState(currentYear)

  // P4.5: YoY data
  const [yoyData, setYoyData] = useState<{ year: number; amount: number; count: number; monthBreakdown: { month: string; amount: number; count: number }[] }[] | null>(null)
  const [yoyCategory, setYoyCategory] = useState<string>("")
  const [yoyLoading, setYoyLoading] = useState(false)

  const topCategoriesForDropdown = data?.categoryBreakdown.slice(0, 10).map((c) => c.name) ?? []

  const fetchDeepInsights = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    switch (period) {
    case "year": {
    params.set("year", String(periodYear))
    break;
    }
    case "quarter": {
      const q = Math.floor((new Date().getMonth()) / 3) + 1
      params.set("year", String(periodYear))
      params.set("quarter", String(q))
    
    break;
    }
    case "month": {
      params.set("year", String(periodYear))
      params.set("month", String(new Date().getMonth() + 1))
    
    break;
    }
    // No default
    }
    const res = await fetch(`/api/insights/deep${params.toString() ? `?${params.toString()}` : ""}`)
    const result = await res.json()
    setData(result)
    setLoading(false)
  }, [period, periodYear])

  useEffect(() => {
    fetchDeepInsights()
  }, [fetchDeepInsights])

  // Fetch YoY data when category changes (P4.5)
  useEffect(() => {
    if (!yoyCategory) {
      setYoyData(null)
      return
    }
    setYoyLoading(true)
    const years = [currentYear - 2, currentYear - 1, currentYear].filter((y) => y >= 2020)
    fetch(`/api/insights/yoy?category=${encodeURIComponent(yoyCategory)}&years=${years.join(",")}`)
      .then((r) => r.json())
      .then((result) => setYoyData(result.data))
      .catch(() => setYoyData(null))
      .finally(() => setYoyLoading(false))
  }, [yoyCategory, currentYear])

  if (loading) return <InsightsSkeleton />
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load insights</div>

  const selectedCat = selectedCategory
    ? data.categoryBreakdown.find((c) => c.name === selectedCategory)
    : null
  const totalAllTime = data.categoryBreakdown.reduce((s, c) => s + c.amount, 0)

  // P4.7: Compute changes for each category (current period vs previous period)
  const categoryChanges = data.categoryBreakdown.map((cat, _i) => {
    // Simple heuristic: compare first half vs second half of the data
    const allMonths = data.monthlyTrend
    const mid = Math.floor(allMonths.length / 2)
    const recentMonths = allMonths.slice(mid)
    const olderMonths = allMonths.slice(0, mid)
    // approximate category share using the breakdown percentage
    const catPct = totalAllTime > 0 ? cat.amount / totalAllTime : 0
    const recentTotal = recentMonths.reduce((s, m) => s + m.amount, 0)
    const olderTotal = olderMonths.reduce((s, m) => s + m.amount, 0)
    const recentCatAmount = recentTotal * catPct
    const olderCatAmount = olderTotal * catPct
    const change = recentCatAmount - olderCatAmount
    const changePct = olderCatAmount > 0 ? (change / olderCatAmount) * 100 : 0
    return { ...cat, thisPeriod: recentCatAmount, prevPeriod: olderCatAmount, change, changePct }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">Deep analysis of your spending patterns</p>
      </div>

      {/* P4.4: Time Period Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period</span>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(period === "year" || period === "quarter" || period === "month") && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year</span>
            <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(Number.parseInt(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {period === "custom" && (
          <p className="text-sm text-muted-foreground">Custom date range picker coming soon</p>
        )}
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Monthly Spending Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Year Comparison + Category Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Year Over Year</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.yearlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" stroke="#888" />
                  <YAxis tickFormatter={(v) => `₹${(v / 100_000).toFixed(1)}L`} stroke="#888" />
                  <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* P4.6: Category pie with % and count */}
        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-[250px] items-center gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoryBreakdown.slice(0, 8)} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="amount" nameKey="name"
                      label={({ name: _name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      isAnimationActive={true} animationDuration={800} animationEasing="ease-out" animationBegin={200}>
                      {data.categoryBreakdown.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 text-sm">
                {data.categoryBreakdown.slice(0, 8).map((cat, i) => {
                  const pct = totalAllTime > 0 ? ((cat.amount / totalAllTime) * 100).toFixed(1) : "0"
                  return (
                    <div key={cat.name}
                      className={`flex items-center justify-between cursor-pointer rounded px-2 py-1 transition-colors ${selectedCategory === cat.name ? "bg-primary/10" : "hover:bg-muted/50"}`}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium w-16 text-right">{formatIndianCurrency(cat.amount)}</span>
                        <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                        <span className="text-muted-foreground w-8 text-right">{cat.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P4.7: Category Change Indicator */}
      <Card>
        <CardHeader><CardTitle>Category Change Indicator</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">This Period</th>
                  <th className="pb-2 font-medium text-right">Previous Period</th>
                  <th className="pb-2 font-medium text-right">Change (₹)</th>
                  <th className="pb-2 font-medium text-right">Change (%)</th>
                </tr>
              </thead>
              <tbody>
                {categoryChanges.slice(0, 8).map((cat) => {
                  const isDown = cat.change <= 0 // decreasing spending is good
                  return (
                    <tr key={cat.name} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color || COLORS[0] }} />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium">{formatCurrency(cat.thisPeriod)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{formatCurrency(cat.prevPeriod)}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant={isDown ? "secondary" : "destructive"} className="text-[10px]">
                          {isDown ? <TrendingDown className="mr-0.5 inline h-3 w-3" /> : <TrendingUp className="mr-0.5 inline h-3 w-3" />}
                          {cat.change >= 0 ? "+" : ""}{formatCurrency(Math.abs(cat.change))}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`text-xs font-semibold ${isDown ? "text-emerald-500" : "text-red-500"}`}>
                          {isDown ? "↓" : "↑"} {Math.abs(cat.changePct).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <TrendingDown className="mr-1 inline h-3 w-3 text-emerald-500" /> Decreasing = Good · <TrendingUp className="mr-1 inline h-3 w-3 text-red-500" /> Increasing = Needs Attention
          </p>
        </CardContent>
      </Card>

      {/* P4.5: Category YoY Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category YoY Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category</span>
              <Select value={yoyCategory} onValueChange={setYoyCategory}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {topCategoriesForDropdown.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {yoyLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!yoyLoading && yoyData && yoyData.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Category</th>
                      {yoyData.map((d) => (
                        <th key={d.year} className="pb-2 font-medium text-right">{d.year}</th>
                      ))}
                      <th className="pb-2 font-medium text-right">Change</th>
                      <th className="pb-2 font-medium text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2.5 font-medium">{yoyCategory}</td>
                      {yoyData.map((d) => (
                        <td key={d.year} className="py-2.5 text-right">{formatCurrency(d.amount)}</td>
                      ))}
                      <td className="py-2.5 text-right">
                        {yoyData.length >= 2 ? (() => {
                          const latest = yoyData.at(-1)?.amount ?? 0
                          const prev = yoyData.at(-2)?.amount ?? 0
                          const chg = prev > 0 ? ((latest - prev) / prev) * 100 : 0
                          const isGood = chg <= 0
                          return (
                            <span className={`text-xs font-semibold ${isGood ? "text-emerald-500" : "text-red-500"}`}>
                              {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                            </span>
                          )
                        })() : "—"}
                      </td>
                      <td className="py-2.5 text-right">
                        {yoyData.length >= 2 ? (() => {
                          const latest = yoyData.at(-1)?.amount ?? 0
                          const prev = yoyData.at(-2)?.amount ?? 0
                          const isDown = latest <= prev
                          return isDown ? (
                            <ArrowDownRight className="inline h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="inline h-4 w-4 text-red-500" />
                          )
                        })() : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Month breakdown chart */}
              {yoyData.length > 0 && (
                <div className="mt-4 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yoyData.flatMap((d) =>
                      d.monthBreakdown.map((m) => ({
                        ...m,
                        year: d.year,
                        label: `${m.month} ${d.year}`,
                      }))
                    )}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="#888" fontSize={10} />
                      <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} stroke="#888" />
                      <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                      <Bar dataKey="amount" fill="#6366f1" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {!yoyLoading && !yoyData && (
            <p className="py-4 text-center text-sm text-muted-foreground">Select a category to see YoY comparison</p>
          )}
        </CardContent>
      </Card>

      {/* Sub-category drill-down */}
      {selectedCat && selectedCat.subCategories.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">{selectedCat.name} — Sub Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedCat.subCategories.slice(0, 10)} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} stroke="#888" />
                  <YAxis type="category" dataKey="name" stroke="#888" width={100} fontSize={11} />
                  <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Person-wise + Top Merchants */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Person-wise</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.personWise.slice(0, 8).map((p, _i) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{p.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{p.count} txns</span>
                    <span className="font-medium w-24 text-right">{formatCurrency(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-4 w-4" /> Top Merchants</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topMerchants.slice(0, 10).map((m, i) => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-muted-foreground">{m.name.length > 25 ? m.name.slice(0, 25) + "..." : m.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{m.count} txns</span>
                    <span className="font-medium w-24 text-right">{formatCurrency(m.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P4.8: Spend Optimization Suggestion Cards */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600"><Lightbulb className="h-5 w-5" /> Optimization Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.optimization.slice(0, 4).map((opt) => {
              const targetAmount = Math.round(opt.monthlyAvg * 0.85) // 15% reduction suggestion
              const savings = opt.monthlyAvg - targetAmount
              const progressPct = targetAmount > 0 ? (opt.monthlyAvg / targetAmount) * 100 : 0
              return (
                <motion.div
                  key={opt.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-lg border bg-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{opt.category}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current avg: {formatCurrency(opt.monthlyAvg)}/mo
                      </p>
                    </div>
                    <Badge variant="warning" className="shrink-0">{formatCurrency(savings)}/mo saved</Badge>
                  </div>

                  {/* Progress bar: current vs target */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Target: {formatCurrency(targetAmount)}/mo</span>
                      <span className={progressPct > 100 ? "text-red-500" : "text-emerald-500"}>
                        {Math.min(progressPct, 200).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <motion.div
                        className="h-2 rounded-full bg-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progressPct, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="mt-3 w-full">
                    <Target className="mr-1.5 h-3.5 w-3.5" /> Set Budget
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Deals Matching Your Merchants</CardTitle>
        </CardHeader>
        <CardContent>
          {data.deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active deals found for your top merchants. Deals will appear here when available.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.deals.map((deal, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{deal.merchant}</Badge>
                    {deal.discount && <span className="text-xs font-semibold text-emerald-500">{deal.discount}</span>}
                  </div>
                  <p className="mt-1 font-medium">{deal.title}</p>
                  {deal.description && <p className="text-xs text-muted-foreground mt-0.5">{deal.description}</p>}
                  {deal.validUntil && <p className="text-xs text-muted-foreground mt-1">Valid until {new Date(deal.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll('/', "-")}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
