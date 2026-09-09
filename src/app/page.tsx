"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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

interface HealthData {
  score: number
  savingsRate: number
  budgetAdherence: number | null
  spendingControl: number
  emergencyFund: number
  monthsOfCoverage: number
  totalLiquid: number
  monthlyExpense: number
}

export default function DashboardPage() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [netWorth, setNetWorth] = useState<NetWorth | null>(null)
  const [accounts, setAccounts] = useState<BankAccountSummary[]>([])
  const [cashBalance, setCashBalance] = useState<{ amount: number; notes?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState<number[]>([])
  const [healthScore, setHealthScore] = useState<HealthData | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

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

  useEffect(() => { fetchInsights() }, [fetchInsights])

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

  // ── Helpers ──────────────────────────────────────────────────────────────
  const expenseYearLink = (y: number) => `/expenses?dateFrom=${y}-01-01&dateTo=${y}-12-31`
  const expenseMonthLink = (y: number, m: number) => {
    const lastDay = new Date(y, m, 0).getDate()
    return `/expenses?dateFrom=${y}-${String(m).padStart(2, "0")}-01&dateTo=${y}-${String(m).padStart(2, "0")}-${lastDay}`
  }
  const expenseQuarterLink = (y: number, q: number) => {
    const startMonth = (q - 1) * 3 + 1
    const endMonth = q * 3
    const lastDay = new Date(y, endMonth, 0).getDate()
    return `/expenses?dateFrom=${y}-${String(startMonth).padStart(2, "0")}-01&dateTo=${y}-${String(endMonth).padStart(2, "0")}-${lastDay}`
  }

  const isMonthSelected = selectedMonth !== ""
  const isQuarterSelected = selectedQuarter !== ""
  const isYearSelected = selectedYear !== "all"
  const selectedMonthNum = selectedMonth ? Number.parseInt(selectedMonth) : undefined
  const selectedQuarterNum = selectedQuarter ? Number.parseInt(selectedQuarter) : undefined
  const selectedYearNum = isYearSelected ? Number.parseInt(selectedYear) : currentYear

  type RowItem = { label: string; value: number; href: string }
  type StatRow = [RowItem, RowItem]

  const incomeRows: StatRow[] = []
  const expenseRows: StatRow[] = []

  if (isMonthSelected && selectedMonthNum) {
    incomeRows.push([
      { label: insights.periodLabel, value: insights.periodIncome, href: `/income` },
      { label: String(selectedYearNum), value: insights.yearIncome, href: `/income` },
    ])
    incomeRows.push([
      { label: "", value: 0, href: "" },
      { label: "All Years", value: insights.allTimeIncome, href: `/income` },
    ])
    expenseRows.push([
      { label: insights.periodLabel, value: insights.periodExpense, href: expenseMonthLink(selectedYearNum, selectedMonthNum) },
      { label: String(selectedYearNum), value: insights.yearlyExpense, href: expenseYearLink(selectedYearNum) },
    ])
    expenseRows.push([
      { label: "", value: 0, href: "" },
      { label: "All Years", value: insights.allTimeExpenses, href: "/expenses" },
    ])
  } else if (isQuarterSelected && selectedQuarterNum) {
    incomeRows.push([
      { label: insights.periodLabel, value: insights.periodIncome, href: `/income` },
      { label: String(selectedYearNum), value: insights.yearIncome, href: `/income` },
    ])
    incomeRows.push([
      { label: "", value: 0, href: "" },
      { label: "All Years", value: insights.allTimeIncome, href: `/income` },
    ])
    expenseRows.push([
      { label: insights.periodLabel, value: insights.periodExpense, href: expenseQuarterLink(selectedYearNum, selectedQuarterNum) },
      { label: String(selectedYearNum), value: insights.yearlyExpense, href: expenseYearLink(selectedYearNum) },
    ])
    expenseRows.push([
      { label: "", value: 0, href: "" },
      { label: "All Years", value: insights.allTimeExpenses, href: "/expenses" },
    ])
  } else if (isYearSelected) {
    incomeRows.push([
      { label: String(selectedYearNum), value: insights.yearIncome, href: `/income` },
      { label: "All Years", value: insights.allTimeIncome, href: `/income` },
    ])
    expenseRows.push([
      { label: String(selectedYearNum), value: insights.yearlyExpense, href: expenseYearLink(selectedYearNum) },
      { label: "All Years", value: insights.allTimeExpenses, href: "/expenses" },
    ])
  } else {
    incomeRows.push([
      { label: String(currentYear), value: insights.yearIncome, href: `/income` },
      { label: "All Years", value: insights.allTimeIncome, href: `/income` },
    ])
    expenseRows.push([
      { label: String(currentYear), value: insights.yearlyExpense, href: expenseYearLink(currentYear) },
      { label: "All Years", value: insights.allTimeExpenses, href: "/expenses" },
    ])
  }

  const lastMonth = insights.monthlyTrend.at(-1)?.amount ?? 0
  const prevMonth = insights.monthlyTrend.at(-2)?.amount ?? 0
  const expChange = lastMonth - prevMonth

  const statCards = [
    {
      title: "Total Income", icon: IndianRupee, rows: incomeRows,
      change: undefined as undefined | { text: string; up: boolean },
    },
    {
      title: "Total Expenses", icon: Wallet, rows: expenseRows,
      change: { text: `${expChange >= 0 ? "+" : ""}${formatCurrency(expChange)} vs last month`, up: expChange < 0 },
    },
    {
      title: "Investments", icon: TrendingUp, singleValue: insights.totalInvestments, href: "/investments",
      sub: `Current: ${formatCurrency(insights.totalCurrentValue)}`,
      subDetail: `Returns: ${formatCurrency(insights.investmentReturns)}`,
      up: insights.investmentReturns >= 0,
    },
    {
      title: "Active Goals", icon: Target, singleValue: insights.activeGoals, href: "/goals",
      sub: `${insights.goalProgress.toFixed(0)}% avg progress`, up: insights.goalProgress > 50,
    },
  ]

  const wealthCards = [
    { title: "Net Worth", value: netWorth?.netWorth ?? 0, icon: Scale, href: "/net-worth", color: "text-emerald-500 bg-emerald-500/10" },
    { title: "Total Assets", value: netWorth?.totalAssets ?? 0, icon: Briefcase, href: "/assets", color: "text-blue-500 bg-blue-500/10" },
    { title: "Total Loans", value: insights.totalLoans, icon: Wallet, href: "/loans", color: "text-red-500 bg-red-500/10" },
    { title: "EPF & Pension", value: insights.totalPF, icon: PiggyBank, href: "/investments", color: "text-amber-500 bg-amber-500/10" },
    { title: "Insurance Premium", value: insights.totalInsurancePremium, icon: Shield, href: "/insurance", color: "text-purple-500 bg-purple-500/10" },
    { title: "Subscriptions", value: insights.totalSubscriptionMonthly * 12, icon: CreditCard, href: "/subscriptions", color: "text-pink-500 bg-pink-500/10" },
  ]

  const bankTotal = accounts.reduce((s, a) => s + a.balance, 0) + (cashBalance?.amount || 0)
  const liquidTotal = (netWorth?.breakdown.bankBalance ?? 0) + (netWorth?.breakdown.cash ?? 0) + (netWorth?.breakdown.fixedDeposits ?? 0)
  const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"]

  // ── Health metrics config (for full Health tab) ──────────────────────────
  const healthMetrics = healthScore ? [
    {
      label: "Savings Rate",
      value: healthScore.savingsRate,
      weight: 30,
      target: 30,
      targetLabel: "30%+ of income",
      description: "The percentage of your income that you keep after expenses. A higher savings rate means you're building wealth faster.",
      tips: [
        "Track every expense for a month to find areas to cut",
        "Automate savings — set up a transfer on payday",
        "Aim for at least 30% — the FIRE community targets 50%+",
      ],
      link: { href: "/income", label: "View income & expenses" },
    },
    {
      label: "Budget Adherence",
      value: healthScore.budgetAdherence,
      weight: 25,
      target: 80,
      targetLabel: "80%+ (staying within budget)",
      description: "How well your actual spending stays within the budgets you've set. If no budgets are configured, this metric doesn't apply.",
      tips: healthScore.budgetAdherence === null
        ? [
            "You haven't set any budgets yet — this is the first step",
            "Start with your top 3 spending categories",
            "Review and adjust budgets monthly based on actual spending",
          ]
        : [
            "Review your top overspending categories",
            "Set realistic budgets based on past 3 months of data",
            "Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings",
          ],
      link: { href: "/budgets", label: healthScore.budgetAdherence === null ? "Set up budgets" : "Manage budgets" },
    },
    {
      label: "Spending Control",
      value: healthScore.spendingControl,
      weight: 25,
      target: 70,
      targetLabel: "70%+ (consistent spending)",
      description: "How consistent your monthly spending is. Large spikes or drops suggest irregular spending patterns. Steady, predictable spending is healthier.",
      tips: [
        "Identify which months have unusually high spending",
        "Smooth out large purchases across the year",
        "Set up recurring budgets for predictable expenses",
      ],
      link: { href: "/reports", label: "View spending reports" },
    },
    {
      label: "Emergency Fund",
      value: healthScore.emergencyFund,
      weight: 20,
      target: 100,
      targetLabel: "6 months of expenses",
      description: `Your liquid assets (bank accounts + cash) cover ${healthScore.monthsOfCoverage} months of expenses. Target: 6 months for financial security.`,
      tips: [
        "Keep emergency fund in a liquid, easily accessible account",
        "Don't invest emergency money in stocks or long-term FDs",
        "Start with 1 month, then build to 3, then 6",
      ],
      link: { href: "/bank-accounts", label: "Manage bank accounts" },
    },
  ] : []

  // ── Filter bar (shared) ─────────────────────────────────────────────────
  const filterBar = (
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
  )

  // ── Return ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <TutorialOverlay />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>
      </div>

      <AdContainer slotIdPrefix="dashboard" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wealth">Wealth</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {filterBar}

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon
              const hasRows = "rows" in card
              return (
                <Card key={card.title} className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="rounded bg-primary/10 p-1 text-primary">
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground leading-tight">{card.title}</span>
                    </div>
                    {hasRows ? (
                      <div className="space-y-1">
                        {card.rows?.map((row, ri) => (
                          <div key={ri} className="flex items-baseline justify-between text-[11px] leading-tight">
                            <div className="flex items-baseline gap-1.5">
                              {row[0].label ? (
                                <Link href={row[0].href} className="hover:underline">
                                  <span className="text-muted-foreground">{row[0].label}:</span>
                                  <span className="font-semibold ml-1">{formatCurrency(row[0].value)}</span>
                                </Link>
                              ) : <span />}
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              {row[1].label ? (
                                <Link href={row[1].href} className="hover:underline">
                                  <span className="text-muted-foreground">{row[1].label}:</span>
                                  <span className="font-semibold ml-1">{formatCurrency(row[1].value)}</span>
                                </Link>
                              ) : <span />}
                            </div>
                          </div>
                        ))}
                        {"change" in card && card.change ? (
                          <p className={`flex items-center gap-1 text-[10px] mt-1 leading-tight ${card.change.up ? "text-emerald-500" : "text-red-500"}`}>
                            {card.change.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            <span>{card.change.text}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="text-base font-bold leading-tight">
                          {"singleValue" in card ? (
                            <Link href={"href" in card ? card.href : "#"} className="hover:underline">
                              {card.title === "Active Goals" ? (
                                <AnimatedCounter value={card.singleValue} />
                              ) : (
                                <AnimatedCounter value={card.singleValue} format={formatCurrency} />
                              )}
                            </Link>
                          ) : null}
                        </div>
                        {"sub" in card && card.sub ? (
                          <p className="text-[10px] mt-0.5 leading-tight text-muted-foreground">{card.sub}</p>
                        ) : null}
                        {"subDetail" in card && card.subDetail ? (
                          <p className="text-[10px] mt-0.5 leading-tight text-muted-foreground">{card.subDetail}</p>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Liquid assets strip */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Liquid Assets</span>
                </div>
                <Link href="#" onClick={() => setActiveTab("wealth")} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  Full breakdown <ArrowUpRight className="h-2.5 w-2.5" />
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-bold">{formatCurrency(liquidTotal)}</span>
                </div>
                {netWorth?.breakdown.bankBalance ? (
                  <span className="text-muted-foreground">{formatCurrency(netWorth.breakdown.bankBalance)} in banks</span>
                ) : null}
                {netWorth?.breakdown.cash ? (
                  <span className="text-muted-foreground">{formatCurrency(netWorth.breakdown.cash)} cash</span>
                ) : null}
                {netWorth?.breakdown.fixedDeposits ? (
                  <span className="text-muted-foreground">{formatCurrency(netWorth.breakdown.fixedDeposits)} in FDs</span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Health Score mini */}
          {healthScore && (
            <HealthGauge
              score={healthScore.score}
              metrics={[]}
              variant="compact"
            />
          )}

          {/* Recent Expenses */}
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* WEALTH TAB                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="wealth" className="space-y-6">
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

          {/* Investment breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Portfolio Value</p>
                  <p className="text-lg font-bold">{formatCurrency(insights.totalCurrentValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Returns</p>
                  <p className={`text-lg font-bold ${insights.investmentReturns >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {formatCurrency(insights.investmentReturns)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">EPF & Pension</p>
                  <p className="text-lg font-bold">{formatCurrency(insights.totalPF)}</p>
                </div>
              </div>
              <Link href="/investments" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-4">
                View all investments <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Fixed Deposits */}
          {netWorth?.breakdown.fixedDeposits ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fixed Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(netWorth.breakdown.fixedDeposits)}</p>
                <p className="text-xs text-muted-foreground mt-1">Maturity value across all FDs</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Bank Accounts detail */}
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SPENDING TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="spending" className="space-y-6">
          {filterBar}

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
                          cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                          dataKey="amount" nameKey="name"
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* INCOME TAB                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="income" className="space-y-6">
          {filterBar}

          {/* Income summary cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Period Income</p>
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(insights.periodIncome)}</p>
                <p className="text-[10px] text-muted-foreground">{insights.periodLabel}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Year Income</p>
                <p className="text-lg font-bold">{formatCurrency(insights.yearIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">All-Time Income</p>
                <p className="text-lg font-bold">{formatCurrency(insights.allTimeIncome)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Income trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Income Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={insights.incomeTrend}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip formatter={(value) => formatIndianCurrency(value)} />} />
                      <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="url(#colorIncome)" strokeWidth={2} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Income vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.incomeTrend.map((inc, i) => ({
                      month: inc.month,
                      income: inc.amount,
                      expense: insights.monthlyTrend[i]?.amount || 0,
                    }))}>
                      <XAxis dataKey="month" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip formatter={(value) => formatIndianCurrency(value)} />} />
                      <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" isAnimationActive={true} animationDuration={800} />
                      <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" isAnimationActive={true} animationDuration={800} animationBegin={200} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Savings rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Savings Rate</p>
                  <p className="text-xs text-muted-foreground">Target: 30%+ of income</p>
                </div>
                <div className="text-right">
                  {insights.yearIncome > 0 ? (
                    <p className={`text-2xl font-bold ${((insights.yearIncome - insights.yearlyExpense) / insights.yearIncome) >= 0.3 ? "text-emerald-500" : "text-amber-500"}`}>
                      {(((insights.yearIncome - insights.yearlyExpense) / insights.yearIncome) * 100).toFixed(1)}%
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                  )}
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, insights.yearIncome > 0 ? ((insights.yearIncome - insights.yearlyExpense) / insights.yearIncome) * 100 : 0))}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HEALTH TAB                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="health" className="space-y-6">
          {healthScore ? (
            <>
              <HealthGauge
                score={healthScore.score}
                metrics={healthMetrics}
                variant="full"
              />
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading health score...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RETIREMENT TAB                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="retirement" className="space-y-6">
          <RetirementTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Retirement tab (lazy-loaded) ────────────────────────────────────────────
function RetirementTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/retirement/aggregate")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading retirement data...</div>
  if (!data) return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">No retirement data yet.</p>
        <Link href="/retirement" className="text-primary hover:underline text-sm mt-2 inline-block">
          Set up retirement planning →
        </Link>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retirement Corpus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Current Corpus</p>
              <p className="text-lg font-bold">{formatCurrency(data.currentCorpus || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Projected Corpus</p>
              <p className="text-lg font-bold">{formatCurrency(data.projectedCorpus || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gap to Goal</p>
              <p className={`text-lg font-bold ${(data.gap || 0) > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {formatCurrency(Math.abs(data.gap || 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.obligations?.length > 0 ? (
              <div className="space-y-2">
                {data.obligations.map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{o.name || o.type}</span>
                    <span className="font-medium">{formatCurrency(o.amount || o.annualAmount || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No obligations recorded.</p>
            )}
            <Link href="/retirement" className="text-primary hover:underline text-xs mt-3 inline-block">
              Manage obligations →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Family</CardTitle>
          </CardHeader>
          <CardContent>
            {data.family?.length > 0 ? (
              <div className="space-y-2">
                {data.family.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{f.name || f.relation}</span>
                    <span className="font-medium">{formatCurrency(f.estimatedNeed || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No family obligations recorded.</p>
            )}
            <Link href="/retirement" className="text-primary hover:underline text-xs mt-3 inline-block">
              Manage family →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
