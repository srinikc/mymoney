"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { DashboardSkeleton } from "@/components/ui/page-skeleton"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import type { DashboardInsights } from "@/types"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"
import { IndianRupee, TrendingUp, TrendingDown, Target, Wallet } from "lucide-react"

export default function DashboardPage() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState<number[]>([])

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState("")

  useEffect(() => {
    fetch("/api/expenses/years")
      .then((r) => r.json())
      .then((data) => {
        setYears(data.years)
        if (data.years.length > 0 && !data.years.includes(currentYear)) {
          setSelectedYear(data.years[data.years.length - 1])
        }
      })
      .catch(() => setYears([]))
  }, [currentYear])

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("year", String(selectedYear ?? new Date().getFullYear()))
    if (selectedMonth) params.set("month", selectedMonth)
    if (selectedQuarter) params.set("quarter", selectedQuarter)
    const res = await fetch(`/api/insights?${params.toString()}`)
    const data = await res.json()
    setInsights(data)
    setLoading(false)
  }, [selectedYear, selectedMonth, selectedQuarter])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  if (loading) return <DashboardSkeleton />

  if (!insights) return <div className="p-8 text-center text-muted-foreground">Failed to load insights</div>

  const stats = [
    {
      title: "Total Expenses",
      value: insights.totalExpenses,
      icon: IndianRupee,
      change: `${insights.monthlyTrend[insights.monthlyTrend.length - 1]?.amount > insights.monthlyTrend[insights.monthlyTrend.length - 2]?.amount ? "+" : ""}${formatCurrency(insights.monthlyTrend[insights.monthlyTrend.length - 1]?.amount - insights.monthlyTrend[insights.monthlyTrend.length - 2]?.amount)}`,
      up: insights.monthlyTrend[insights.monthlyTrend.length - 1]?.amount > insights.monthlyTrend[insights.monthlyTrend.length - 2]?.amount,
    },
    {
      title: "This Month",
      value: insights.monthlyExpense,
      icon: Wallet,
      sub: `${insights.budgetUtilization.toFixed(1)}% of budget`,
      up: insights.budgetUtilization < 100,
    },
    {
      title: "Total Investments",
      value: insights.totalInvestments,
      icon: TrendingUp,
      change: `${insights.investmentReturns >= 0 ? "+" : ""}${formatCurrency(insights.investmentReturns)}`,
      up: insights.investmentReturns >= 0,
    },
    {
      title: "Active Goals",
      value: insights.activeGoals,
      icon: Target,
      sub: `${insights.goalProgress.toFixed(0)}% avg progress`,
      up: insights.goalProgress > 50,
    },
  ]

  const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Select value={String(selectedYear ?? new Date().getFullYear())} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!selectedQuarter && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Month</span>
            <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); if (v) setSelectedQuarter("") }}>
              <SelectTrigger className="w-28"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {!selectedMonth && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quarter</span>
            <Select value={selectedQuarter} onValueChange={(v) => { setSelectedQuarter(v); if (v) setSelectedMonth("") }}>
              <SelectTrigger className="w-24"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {[1, 2, 3, 4].map((q) => (
                  <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.title === "Active Goals" ? (
                    <AnimatedCounter value={stat.value} />
                  ) : (
                    <AnimatedCounter value={stat.value} format={formatCurrency} />
                  )}
                </div>
                {"change" in stat && stat.change ? (
                  <p className={`flex items-center gap-1 text-xs ${stat.up ? "text-emerald-500" : "text-red-500"}`}>
                    {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.change} vs last month
                  </p>
                ) : "sub" in stat && stat.sub ? (
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Amount"]}
                    contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: "8px", color: "#fff" }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#colorAmount)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.categoryBreakdown.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="amount"
                      nameKey="name"
                    >
                      {insights.categoryBreakdown.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {insights.categoryBreakdown.slice(0, 6).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{cat.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.topCategories} layout="vertical">
                  <XAxis type="number" stroke="#888" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: expense.category?.color || "#6366f1" }}
                    >
                      {expense.category?.name?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{expense.vendor || expense.category?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                    <Badge variant="secondary" className="text-[10px]">{expense.category?.name}</Badge>
                  </div>
                </div>
              ))}
              {insights.recentExpenses.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No expenses yet. Import your GPay data!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
