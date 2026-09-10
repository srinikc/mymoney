"use client"

import { useState, useEffect } from "react"
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
import {
  useInsights, useNetWorth, useBankAccounts, useCashBalance, useHealthScore, useExpenseYears,
} from "@/hooks/use-dashboard"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"
import { ChartTooltip } from "@/components/charts/chart-tooltip"
import { IndianRupee, TrendingUp, TrendingDown, Target, Wallet, Landmark, PiggyBank, Scale, Briefcase, ArrowUpRight, Shield, CreditCard } from "lucide-react"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [spendChartView, setSpendChartView] = useState<"pie" | "bar">("pie")

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState("")

  const yearsQuery = useExpenseYears()
  const years = yearsQuery.data ?? []

  const healthQuery = useHealthScore()
  const healthScore = healthQuery.data ?? null

  const insightsQuery = useInsights(selectedYear, selectedMonth, selectedQuarter)
  const insights = insightsQuery.data ?? null
  const loading = insightsQuery.isLoading
  const fetchInsights = insightsQuery.refetch

  const netWorthQuery = useNetWorth()
  const netWorth = netWorthQuery.data ?? null

  const accountsQuery = useBankAccounts()
  const accounts = accountsQuery.data ?? []

  const cashQuery = useCashBalance()
  const cashBalance = cashQuery.data ?? null

  if (loading && !insights) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="retirement">Retirement</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <DashboardSkeleton />
          </TabsContent>
        </Tabs>
      </div>
    )
  }
  if (!insights) return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="p-8 text-center text-muted-foreground space-y-2">
            <p>Failed to load dashboard data.</p>
            <button onClick={() => fetchInsights()} className="underline text-primary">Retry</button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )

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
  const trendYear = isYearSelected ? selectedYearNum : currentYear

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

  const statCards: ({
    title: string; icon: typeof IndianRupee; rows?: StatRow[]; change?: { text: string; up: boolean };
    singleValue?: number; href?: string; sub?: string; subDetail?: string; up?: boolean
  })[] = [
    {
      title: "Total Income", icon: IndianRupee, rows: incomeRows,
      change: undefined as undefined | { text: string; up: boolean },
    },
    {
      title: "Total Expenses", icon: Wallet, rows: expenseRows,
      change: { text: `${expChange >= 0 ? "+" : ""}${formatCurrency(expChange)} vs last month`, up: expChange < 0 },
    },
    {
      title: "Active Goals", icon: Target, singleValue: insights.activeGoals, href: "/goals",
      sub: `${insights.goalProgress.toFixed(0)}% avg progress`, up: insights.goalProgress > 50,
    },
  ]

  // Budget card (current month)
  const budgetInfo = {
    budget: insights.monthlyBudget || insights.currentMonthBudget || 0,
    spent: insights.currentMonthSpent || insights.currentMonthExpenses || 0,
    pct: (insights.budgetUtilization || (insights.monthlyBudget > 0 ? (insights.currentMonthExpenses / insights.monthlyBudget) * 100 : 0)),
  }
  const budgetLeft = Math.max(0, budgetInfo.budget - budgetInfo.spent)
  const budgetOver = budgetInfo.spent > budgetInfo.budget

  const wealthCards = [
    { title: "Net Worth", value: netWorth?.netWorth ?? 0, icon: Scale, href: "/net-worth", color: "text-emerald-500 bg-emerald-500/10" },
    { title: "Total Assets", value: netWorth?.totalAssets ?? 0, icon: Briefcase, href: "/assets", color: "text-blue-500 bg-blue-500/10" },
    { title: "Total Loans", value: insights.totalLoans, icon: Wallet, href: "/loans", color: "text-red-500 bg-red-500/10" },
    { title: "Insurance Premium", value: insights.totalInsurancePremium, icon: Shield, href: "/insurance", color: "text-purple-500 bg-purple-500/10" },
    { title: "Subscriptions", value: insights.totalSubscriptionMonthly * 12, icon: CreditCard, href: "/subscriptions", color: "text-pink-500 bg-pink-500/10" },
  ]

  const inv = insights.investmentBreakdown || { stocks: { currentValue: 0 }, epfPension: { currentValue: 0 }, others: { currentValue: 0 } }
  const fdTotal = netWorth?.breakdown.fixedDeposits ?? 0

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
      description: "The percentage of your income that you keep after expenses. A higher savings rate means you're building wealth faster. This is the most impactful metric — it directly determines how quickly you reach financial goals.",
      tips: [
        "Go to /income to track all income sources — the more complete, the more accurate",
        "Go to /expenses to find your top 3 spending categories and cut non-essentials",
        "Automate savings — set up a SIP or auto-transfer on payday (before you spend)",
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
      description: "How well your actual spending stays within the budgets you've set. If no budgets are configured, this metric doesn't apply — set up budgets first.",
      tips: healthScore.budgetAdherence === null
        ? [
            "Go to /budgets to set up your first budgets — start with rent, groceries, and transport",
            "Start with your top 3 spending categories (check /reports for breakdown)",
            "Review and adjust budgets monthly based on actual spending",
          ]
        : [
            "Go to /reports → Spending to see which categories you're overspending in",
            "Go to /budgets to adjust budgets that are consistently over/under",
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
      description: "Measures how consistent your monthly spending is month-to-month. Score is based on the coefficient of variation — lower variance means more predictable, controlled spending. A score of 50 means insufficient data (need 2+ months).",
      tips: [
        "Go to /reports → Spending to see your monthly trend and identify spike months",
        "Set up recurring budgets for predictable expenses (rent, EMI, subscriptions)",
        "Smooth out large purchases — spread festive/shopping spending across the year",
        "Check /reports → Intelligence for alerts on unusual spending patterns",
      ],
      link: { href: "/reports", label: "View spending reports" },
    },
    {
      label: "Emergency Fund",
      value: healthScore.emergencyFund,
      weight: 20,
      target: 100,
      targetLabel: "6 months of expenses",
      description: `Your liquid assets (bank accounts + cash) cover ${healthScore.monthsOfCoverage} months of expenses. Target: 6 months for financial security. Currently: ₹${(healthScore.totalLiquid || 0).toLocaleString("en-IN")} liquid vs ₹${(healthScore.monthlyExpense || 0).toLocaleString("en-IN")}/mo expenses.`,
      tips: [
        "Go to /emergency-fund to set up your personalized target and run-up plan",
        "Keep emergency fund in a liquid, easily accessible account (not stocks/FDs)",
        "Start with 1 month, then build to 3, then 6",
        "Go to /bank-accounts to add all your savings accounts for accurate tracking",
      ],
      link: { href: "/emergency-fund", label: "Plan your emergency fund" },
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
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const SECTION_NAV = [
    { id: "cash-flow", label: "Cash Flow" },
    { id: "wealth", label: "Wealth" },
    { id: "health", label: "Health" },
    { id: "recent", label: "Recent" },
  ]

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
        <div className="sticky top-0 z-10 bg-background pt-2">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="retirement">Retirement</TabsTrigger>
          </TabsList>
          {activeTab === "overview" && (
            <div className="mt-1 flex gap-1 flex-wrap pb-1">
              {SECTION_NAV.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6 mt-3">
          {filterBar}

          {/* ── CASH FLOW ─────────────────────────────────────────────────── */}
          <div id="cash-flow" className="scroll-mt-24">
            <SectionHeading title="Cash Flow" subtitle="Income, spending, budget & goals for the selected period" />
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
                            {"singleValue" in card && card.singleValue !== undefined ? (
                              <Link href={card.href ?? "#"} className="hover:underline">
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

              {/* Budget card */}
              <Card className="h-full">
                <CardContent className="p-3 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded bg-amber-500/10 p-1 text-amber-600"><Wallet className="h-3 w-3" /></div>
                    <span className="text-[11px] font-medium text-muted-foreground leading-tight">Monthly Budget</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-muted-foreground">Budget:</span>
                    <Link href="/budgets" className="hover:underline"><span className="font-semibold">{formatCurrency(budgetInfo.budget)}</span></Link>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] mt-0.5">
                    <span className="text-muted-foreground">Spent:</span>
                    <span className="font-semibold">{formatCurrency(budgetInfo.spent)}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] mt-0.5">
                    <span className="text-muted-foreground">{budgetOver ? "Over by:" : "Left:"}</span>
                    <span className={`font-semibold ${budgetOver ? "text-red-500" : "text-emerald-500"}`}>{formatCurrency(budgetOver ? budgetInfo.spent - budgetInfo.budget : budgetLeft)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary">
                    <div className={`h-1.5 rounded-full ${budgetOver ? "bg-red-500" : budgetInfo.pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, budgetInfo.pct)}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round(budgetInfo.pct)}% used</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── WEALTH ────────────────────────────────────────────────────── */}
          <div id="wealth" className="scroll-mt-24 space-y-4">
            <SectionHeading title="Wealth" subtitle="What you own, invest and owe" />

            {/* Wealth summary cards */}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

            {/* Investments breakdown card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded bg-primary/10 p-1 text-primary"><TrendingUp className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium leading-tight">Investments</p>
                      <p className="text-xs text-muted-foreground">Total value {formatCurrency(inv.stocks.currentValue + inv.epfPension.currentValue + inv.others.currentValue)}</p>
                    </div>
                  </div>
                  <Link href="/investments" className="text-[10px] text-primary hover:underline flex items-center gap-1">View all <ArrowUpRight className="h-2.5 w-2.5" /></Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">Stocks</p>
                    <p className="text-sm font-bold">{formatCurrency(inv.stocks.currentValue)}</p>
                  </div>
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">EPF & Pension</p>
                    <p className="text-sm font-bold">{formatCurrency(inv.epfPension.currentValue)}</p>
                  </div>
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">MF, NPS, Gold & others</p>
                    <p className="text-sm font-bold">{formatCurrency(inv.others.currentValue)}</p>
                  </div>
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">Returns</p>
                    <p className={`text-sm font-bold ${insights.investmentReturns >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {insights.investmentReturns >= 0 ? "+" : ""}{formatCurrency(insights.investmentReturns)}
                    </p>
                  </div>
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">Invested</p>
                    <p className="text-sm font-bold">{formatCurrency(insights.totalInvestments)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank accounts + liquid + FD */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded bg-primary/10 p-1 text-primary"><Landmark className="h-4 w-4" /></div>
                    <p className="text-sm font-medium leading-tight">Bank Accounts & Liquid</p>
                  </div>
                  <Link href="/bank-accounts" className="text-[10px] text-primary hover:underline flex items-center gap-1">Manage <ArrowUpRight className="h-2.5 w-2.5" /></Link>
                </div>
                {accounts.length === 0 && !cashBalance && fdTotal === 0 ? (
                  <p className="text-xs text-muted-foreground">No accounts recorded. Add one to track balances.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      {accounts.map((acc) => (
                        <div key={acc.id} className="flex flex-col">
                          <span className="text-muted-foreground text-xs flex items-center gap-1">
                            {acc.bankName}
                            {acc.isEmergencyFund && <Badge variant="secondary" className="text-[9px] px-1 py-0">Emergency</Badge>}
                          </span>
                          <span className="font-semibold">{formatCurrency(acc.balance)}</span>
                        </div>
                      ))}
                      {(cashBalance && cashBalance.amount > 0) && (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Cash</span>
                          <span className="font-semibold">{formatCurrency(cashBalance.amount)}</span>
                        </div>
                      )}
                      {fdTotal > 0 && (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">FDs (maturity)</span>
                          <span className="font-semibold">{formatCurrency(fdTotal)}</span>
                        </div>
                      )}
                      <div className="flex flex-col border-l pl-4">
                        <span className="text-muted-foreground text-xs">Total Liquid</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(liquidTotal)}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      FDs and bank accounts are managed in Bank Accounts.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── HEALTH ────────────────────────────────────────────────────── */}
          <div id="health" className="scroll-mt-24 space-y-4">
            <SectionHeading title="Health" subtitle="Financial health score with the areas that need attention" />
            {healthScore ? (
              <HealthGauge
                score={healthScore.score}
                metrics={healthMetrics}
                variant="compact"
                onDetailsClick={() => setActiveTab("health")}
              />
            ) : null}
          </div>

          {/* ── RECENT ────────────────────────────────────────────────────── */}
          <div id="recent" className="scroll-mt-24 space-y-4">
            <SectionHeading title="Recent" subtitle="Latest expenses" />
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Expenses</CardTitle>
                  <Link href="/expenses" className="text-[10px] text-primary hover:underline flex items-center gap-1">See All <ArrowUpRight className="h-2.5 w-2.5" /></Link>
                </div>
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SPENDING TAB                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="spending" className="space-y-6">
          {filterBar}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Spending Trend — {trendYear}</CardTitle>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Category Spending — {trendYear}</CardTitle>
                <div className="flex rounded-md border text-xs overflow-hidden">
                  <button
                    onClick={() => setSpendChartView("pie")}
                    className={`px-2.5 py-1 ${spendChartView === "pie" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    Pie
                  </button>
                  <button
                    onClick={() => setSpendChartView("bar")}
                    className={`px-2.5 py-1 ${spendChartView === "bar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    Bar
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {spendChartView === "pie" ? (
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
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.topCategories} layout="vertical">
                        <XAxis type="number" stroke="#888" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} width={100} />
                        <Tooltip content={<ChartTooltip formatter={(value) => formatIndianCurrency(value)} />} />
                        <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
