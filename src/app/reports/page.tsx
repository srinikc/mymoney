"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import type { DashboardInsights } from "@/types"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts"
import { Download, FileText } from "lucide-react"

export default function ReportsPage() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()
  const [years, setYears] = useState<number[]>([])
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

  const handleExportXLSX = async (type: string) => {
    const res = await fetch(`/api/export?type=${type}&format=xlsx`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `${type}-report.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    await import("jspdf-autotable")
    const doc = new jsPDF("landscape", "mm", "a4")

    doc.setFontSize(22)
    doc.setTextColor(99, 102, 241)
    doc.text("MyMoney - Financial Report", 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}`, 14, 28)

    if (insights) {
      doc.setFontSize(14)
      doc.setTextColor(50, 50, 50)
      doc.text("Financial Summary", 14, 40)

      const summaryData = [
        ["Metric", "Value"],
        ["Total Expenses", formatCurrency(insights.totalExpenses)],
        ["Monthly Average", formatCurrency(insights.monthlyExpense)],
        ["Budget Utilization", `${insights.budgetUtilization.toFixed(1)}%`],
        ["Total Investments", formatCurrency(insights.totalInvestments)],
        ["Investment Returns", formatCurrency(insights.investmentReturns)],
        ["Active Goals", String(insights.activeGoals)],
        ["Goal Progress", `${insights.goalProgress.toFixed(0)}%`],
      ]
      doc.autoTable({
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: 45,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      })

      doc.addPage()
      doc.setFontSize(14)
      doc.text("Category Breakdown", 14, 20)

      const catData = [
        ["Category", "Amount", "Percentage"],
        ...insights.categoryBreakdown.slice(0, 10).map((c) => [
          c.name,
          formatCurrency(c.amount),
          `${insights.totalExpenses > 0 ? ((c.amount / insights.totalExpenses) * 100).toFixed(1) : 0}%`,
        ]),
      ]
      doc.autoTable({
        head: [catData[0]],
        body: catData.slice(1),
        startY: 25,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      })

      doc.addPage()
      doc.setFontSize(14)
      doc.text("Monthly Trend", 14, 20)

      const trendData = [
        ["Month", "Amount"],
        ...insights.monthlyTrend.map((m) => [m.month, formatCurrency(m.amount)]),
      ]
      doc.autoTable({
        head: [trendData[0]],
        body: trendData.slice(1),
        startY: 25,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      })

      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text("MyMoney - Personal Finance Manager", 14, 190)
    }

    doc.save("financial-report.pdf")
  }

  const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!insights) return <div className="p-8 text-center text-muted-foreground">Failed to load data</div>

  const reportSections = [
    { id: "expenses", label: "Expenses" },
    { id: "budgets", label: "Budgets" },
    { id: "goals", label: "Goals" },
    { id: "investments", label: "Investments" },
    { id: "plans", label: "Plans" },
  ]

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate insights and export financial reports
            {selectedQuarter ? ` — Q${selectedQuarter} ${selectedYear}` : selectedMonth ? ` — ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(selectedMonth) - 1]} ${selectedYear}` : ` — ${selectedYear}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select>
            <SelectTrigger className="w-40"><SelectValue placeholder="Export as..." /></SelectTrigger>
            <SelectContent>
              {reportSections.map((s) => (
                <SelectItem key={s.id} value={s.id} onSelect={() => handleExportXLSX(s.id)}>
                  {s.label} as XLSX
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="goals">Goals & Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(insights.totalExpenses)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monthly Average</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(insights.monthlyExpense)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Investments</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(insights.totalInvestments)}</p>
                <p className={`text-xs ${insights.investmentReturns >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  Return: {insights.investmentReturns >= 0 ? "+" : ""}{formatCurrency(insights.investmentReturns)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Goals Progress</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{insights.goalProgress}%</p>
                <p className="text-xs text-muted-foreground">{insights.activeGoals} active goals</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Monthly Expense Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.monthlyTrend}>
                      <XAxis dataKey="month" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Category Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={insights.categoryBreakdown.slice(0, 6)} cx="50%" cy="50%" outerRadius={100} dataKey="amount" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {insights.categoryBreakdown.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expense Analysis</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExportXLSX("expenses")}>
                <Download className="mr-2 h-4 w-4" /> XLSX
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.monthlyTrend}>
                    <XAxis dataKey="month" stroke="#888" />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} stroke="#888" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {insights.monthlyTrend.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top Categories</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.topCategories.map((cat, i) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{formatCurrency(cat.amount)}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Investment Summary</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExportXLSX("investments")}>
                <Download className="mr-2 h-4 w-4" /> XLSX
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-xl font-bold">{formatCurrency(insights.totalInvestments)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-xl font-bold">{formatCurrency(insights.totalInvestments + insights.investmentReturns)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Returns</p>
                  <p className={`text-xl font-bold ${insights.investmentReturns >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {insights.investmentReturns >= 0 ? "+" : ""}{formatCurrency(insights.investmentReturns)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Goals & Plans Overview</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportXLSX("goals")}>
                  <Download className="mr-2 h-4 w-4" /> Goals XLSX
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportXLSX("plans")}>
                  <Download className="mr-2 h-4 w-4" /> Plans XLSX
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Active Goals</p>
                  <p className="text-2xl font-bold">{insights.activeGoals}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Average Progress</p>
                  <p className="text-2xl font-bold">{insights.goalProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
