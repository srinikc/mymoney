"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, formatCurrencyWithFull } from "@/lib/utils"
import { formatIndianCurrency } from "@/lib/format"
import { DashboardSkeleton } from "@/components/ui/page-skeleton"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { AdContainer } from "@/components/ads/ad-container"
import { HealthGauge } from "@/components/charts/health-gauge"
import { TutorialOverlay } from "@/components/tutorial-overlay"
import type { DashboardInsights } from "@/types"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"
import { ChartTooltip } from "@/components/charts/chart-tooltip"
import { IndianRupee, TrendingUp, TrendingDown, Target, Wallet, Landmark, PiggyBank, Scale, Briefcase, ArrowUpRight, Shield, CreditCard } from "lucide-react"

interface NetWorth {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  totalLoans: number
  totalCash: number
  breakdown: { userAssets: number; investments: number; bankBalance: number; fixedDeposits: number; cash: number }
}

interface BankAccountSummary {
  id: number; name: string; bankName: string; balance: number; type: string
}

export default function DashboardPage() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [netWorth, setNetWorth] = useState<NetWorth | null>(null)
  const [accounts, setAccounts] = useState<BankAccountSummary[]>([])
  const [cashBalance, setCashBalance] = useState<{ amount: number; notes?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState<number[]>([])
  const [healthScore, setHealthScore] = useState<{
    score: number
    savingsRate: number
    budgetAdherence: number
    diversification: number
    emergencyFund: number
  } | null>(null)

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState("")

  useEffect(() => {
    fetch("/api/expenses/years")
      .then((r) => {
        if (!r.ok) throw new Error("years fetch failed")
        return r.json()
      })
      .then((data) => {
        setYears(Array.isArray(data?.years) ? data.years : [])
      })
      .catch(() => setYears([]))
  }, [currentYear])

  useEffect(() => {
    fetch("/api/health-score")
      .then((r) => r.json())
      .then(setHealthScore)
      .catch(() => setHealthScore(null))
  }, [])

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedYear !== "all") params.set("year", selectedYear)
    if (selectedMonth) params.set("month", selectedMonth)
    if (selectedQuarter) params.set("quarter", selectedQuarter)
    try {
      const res = await fetch(`/api/insights?${params.toString()}`)
      if (!res.ok) throw new Error(`insights ${res.status}`)
      const data = await res.json()
      if (!data || !Array.isArray(data.monthlyTrend)) throw new Error("bad insights payload")
      setInsights(data)
    } catch {
      setInsights(null)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth, selectedQuarter])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // Wealth & bank summaries (not date-dependent)
  useEffect(() => {
    fetch("/api/net-worth").then((r) => r.json()).then(setNetWorth).catch(() => {})
    fetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
    fetch("/api/cash-balance")
      .then((r) => r.json())
      .then((data) => setCashBalance(data.cash || null))
      .catch(() => {})
  }, [])

  if (loading) return <DashboardSkeleton />

  if (!insights) return <div className="p-8 text-center text-muted-foreground">Failed to load insights</div>

  const expenseLink = `/expenses?${selectedYear !== "all" ? `year=${selectedYear}&` : ""}${selectedMonth ? `month=${selectedMonth}` : ""}`

  const stats = [
    {
      title: "Total Income",
      value: selectedYear !== "all" ? insights.currentYearIncome : insights.allTimeIncome,
      icon: IndianRupee,
      sub: selectedYear !== "all" ? `${selectedYear}: ${formatCurrency(insights.currentYearIncome)}` : `Current Year: ${formatCurrency(insights.currentYearIncome)}`,
      subDetail: `All Years: ${formatCurrency(insights.allTimeIncome)}`,
      up: insights.totalIncome > insights.totalExpenses,
      href: "/income",
    },
    {
      title: "Total Expenses",
      value: insights.currentMonthExpenses,
      icon: Wallet,
      sub: `${new Date().toLocaleString("en-US", { month: "short" })}'${currentYear.toString().slice(-2)}: ${formatCurrency(insights.currentMonthExpenses)}`,
      subDetail: `All Years: ${formatCurrency(insights.allTimeExpenses)}`,
      change: `${(insights.monthlyTrend.at(-1)?.amount ?? 0) > (insights.monthlyTrend.at(-2)?.amount ?? 0) ? "+" : ""}${formatCurrency((insights.monthlyTrend.at(-1)?.amount ?? 0) - (insights.monthlyTrend.at(-2)?.amount ?? 0))}`,
      up: (insights.monthlyTrend.at(-1)?.amount ?? 0) < (insights.monthlyTrend.at(-2)?.amount ?? 0),
      href: expenseLink,
    },
    {
      title: "Investments",
      value: insights.totalInvestments,
      icon: TrendingUp,
      sub: `Current: ${formatCurrency(insights.totalCurrentValue)}`,
      subDetail: `Returns: ${formatCurrency(insights.investmentReturns)}`,
      up: insights.investmentReturns >= 0,
      href: "/investments",
    },
    {
      title: "Active Goals",
      value: insights.activeGoals,
      icon: Target,
      sub: `${insights.goalProgress.toFixed(0)}% avg progress`,
      up: insights.goalProgress > 50,
      href: "/goals",
    },
  ]

  const wealthCards = [
    {
      title: "Net Worth",
      value: netWorth?.netWorth ?? 0,
      icon: Scale,
      href: "/net-worth",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: "Total Assets",
      value: netWorth?.totalAssets ?? 0,
      icon: Briefcase,
      href: "/assets",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Total Loans",
      value: insights.totalLoans,
      icon: Wallet,
      href: "/loans",
      color: "text-red-500 bg-red-500/10",
    },
    {
      title: "EPF & Pension",
      value: insights.totalPF,
      icon: PiggyBank,
      href: "/investments",
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      title: "Insurance Premium",
      value: insights.totalInsurancePremium,
      icon: Shield,
      href: "/insurance",
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      title: "Subscriptions",
      value: insights.totalSubscriptionMonthly * 12,
      icon: CreditCard,
      href: "/subscriptions",
      color: "text-pink-500 bg-pink-500/10",
    },
  ]

  const bankTotal = accounts.reduce((s, a) => s + a.balance, 0) + (cashBalance?.amount || 0)

  const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"]

  return (
    <div className="space-y-8">
      <TutorialOverlay />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>
      </div>

      <AdContainer slotIdPrefix="dashboard" />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedYear !== "all" && (
          <>
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
          </>
        )}
      </div>

      {/* Wealth summary strip */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {wealthCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href} className="block">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`rounded p-1 ${card.color}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground leading-tight">{card.title}</span>
                  </div>
                  <div className="text-base font-bold leading-tight" title={formatCurrencyWithFull(card.value)}>
                    <AnimatedCounter value={card.value} format={formatCurrency} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const content = (
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded bg-primary/10 p-1 text-primary">
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground leading-tight">{stat.title}</span>
              </div>
              <div className="text-base font-bold leading-tight" title={"sub" in stat ? String(stat.sub) : undefined}>
                {stat.title === "Active Goals" ? (
                  <AnimatedCounter value={stat.value} />
                ) : (
                  <AnimatedCounter value={stat.value} format={formatCurrency} />
                )}
              </div>
              {"sub" in stat && stat.sub ? (
                <p className={`text-[10px] mt-0.5 leading-tight ${("subClassName" in stat && stat.subClassName) || "text-muted-foreground"}`}>{stat.sub}</p>
              ) : null}
              {"subDetail" in stat && stat.subDetail ? (
                <p className={`text-[10px] mt-0.5 leading-tight ${("subClassName" in stat && stat.subClassName) || "text-muted-foreground"}`}>{stat.subDetail}</p>
              ) : null}
              {"change" in stat && stat.change ? (
                <p className={`flex items-center gap-1 text-[10px] mt-0.5 leading-tight ${stat.up ? "text-emerald-500" : "text-red-500"}`}>
                  {stat.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  <span>{stat.change} vs last month</span>
                </p>
              ) : null}
            </CardContent>
          )
          return stat.href ? (
            <Link key={stat.title} href={stat.href} className="block">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">{content}</Card>
            </Link>
          ) : (
            <Card key={stat.title} className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">{content}</Card>
          )
        })}
      </div>

      {/* Bank Accounts - compact inline strip */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Bank Accounts</span>
            </div>
            <Link href="/bank-accounts" className="text-[10px] text-primary hover:underline flex items-center gap-1">Manage <ArrowUpRight className="h-2.5 w-2.5" /></Link>
          </div>
          {accounts.length === 0 && !cashBalance ? (
            <p className="text-xs text-muted-foreground">No accounts recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{acc.bankName}</span>
                  <span className="font-semibold">{formatCurrency(acc.balance)}</span>
                </div>
              ))}
              {(cashBalance && cashBalance.amount > 0) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Cash</span>
                  <span className="font-semibold">{formatCurrency(cashBalance.amount)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm border-l pl-3">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatCurrency(bankTotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Score Gauge */}
      {healthScore && (
        <HealthGauge
          score={healthScore.score}
          metrics={[
            { label: "Savings Rate", value: healthScore.savingsRate },
            { label: "Budget Adherence", value: healthScore.budgetAdherence },
            { label: "Diversification", value: healthScore.diversification },
            { label: "Emergency Fund", value: healthScore.emergencyFund },
          ]}
        />
      )}

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
                  <Tooltip content={<ChartTooltip formatter={(value) => formatIndianCurrency(value)} />} />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#colorAmount)" strokeWidth={2} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
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
                      isAnimationActive={true} animationDuration={800} animationEasing="ease-out" animationBegin={200}
                    >
                      {insights.categoryBreakdown.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(value) => formatIndianCurrency(value)} />} />
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
                  <Tooltip content={<ChartTooltip formatter={(value) => formatIndianCurrency(value)} />} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
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