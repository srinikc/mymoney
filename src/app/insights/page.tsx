"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts"
import { ChartTooltip } from "@/components/charts/chart-tooltip"
import { Lightbulb, Users, Store, Sparkles } from "lucide-react"
import { InsightsSkeleton } from "@/components/ui/page-skeleton"

const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16"]

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

  useEffect(() => {
    fetch("/api/insights/deep")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <InsightsSkeleton />
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load insights</div>

  const selectedCat = selectedCategory
    ? data.categoryBreakdown.find((c) => c.name === selectedCategory)
    : null
  const totalAllTime = data.categoryBreakdown.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">Deep analysis of your spending patterns</p>
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
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
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
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} stroke="#888" />
                  <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-[250px] items-center gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoryBreakdown.slice(0, 8)} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="amount" nameKey="name"
                      isAnimationActive={true} animationDuration={800} animationEasing="ease-out" animationBegin={200}>
                      {data.categoryBreakdown.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 text-sm">
                {data.categoryBreakdown.slice(0, 8).map((cat, i) => (
                  <div key={cat.name}
                    className={`flex items-center justify-between cursor-pointer rounded px-2 py-1 transition-colors ${selectedCategory === cat.name ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{cat.name}</span>
                    </div>
                    <span className="font-medium text-xs">{totalAllTime > 0 ? ((cat.amount / totalAllTime) * 100).toFixed(1) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
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

      {/* Spend Optimization */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600"><Lightbulb className="h-5 w-5" /> Spend Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.optimization.map((opt) => (
              <div key={opt.category} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{opt.category}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {opt.percentage}% of total spend · {formatCurrency(opt.total)} total · ~{formatCurrency(opt.monthlyAvg)}/mo
                    </p>
                  </div>
                  <Badge variant="warning" className="shrink-0">Save ₹{opt.potentialSavings.toLocaleString()}</Badge>
                </div>
                {opt.subCategories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {opt.subCategories.map((s) => (
                      <Badge key={s.name} variant="secondary" className="text-[10px]">{s.name}: {formatCurrency(s.amount)}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
                  {deal.validUntil && <p className="text-xs text-muted-foreground mt-1">Valid until {new Date(deal.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
