"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { formatIndianCurrency } from "@/lib/format"
import type { DashboardInsights, Expense } from "@/types"
import type { RecurrenceReportItem } from "@/app/api/reports/recurrence/route"
import type { ColumnDef } from "@tanstack/react-table"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts"
import { ChartTooltip } from "@/components/charts/chart-tooltip"
import { Download, FileText, Search } from "lucide-react"
import { ReportsSkeleton } from "@/components/ui/page-skeleton"

async function handleExportXLSX(type: string) {
  const res = await fetch(`/api/export?type=${type}&format=xlsx`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = `${type}-report.xlsx`; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()
  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState("")

  // P5.1: Data table state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const [tableCategory, setTableCategory] = useState("")
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  // P5.2: Recurrence state
  const [recurrenceData, setRecurrenceData] = useState<RecurrenceReportItem[]>([])
  const [recurrenceLoading, setRecurrenceLoading] = useState(false)

  useEffect(() => {
    fetch("/api/expenses/years")
      .then((r) => r.json())
      .then((data) => {
        setYears(data.years)
        if (data.years.length > 0 && !data.years.includes(currentYear)) {
          setSelectedYear(data.years.at(-1))
        }
      })
      .catch(() => setYears([]))
  }, [currentYear])

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => setCategories([]))
  }, [])

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

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("year", String(selectedYear))
      params.set("pageSize", "500")
      if (selectedMonth) params.set("month", selectedMonth)
      if (selectedQuarter) params.set("quarter", selectedQuarter)
      if (tableSearch) params.set("search", tableSearch)
      if (tableCategory) params.set("categoryIds", tableCategory)
      const res = await fetch(`/api/expenses?${params.toString()}`)
      const data = await res.json()
      setExpenses(data.data || [])
    } finally {
      setExpensesLoading(false)
    }
  }, [selectedYear, selectedMonth, selectedQuarter, tableSearch, tableCategory])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const fetchRecurrence = useCallback(async () => {
    setRecurrenceLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("year", String(selectedYear))
      if (selectedMonth) params.set("month", selectedMonth)
      if (selectedQuarter) params.set("quarter", selectedQuarter)
      const res = await fetch(`/api/reports/recurrence?${params.toString()}`)
      const data = await res.json()
      setRecurrenceData(data.data || [])
    } finally {
      setRecurrenceLoading(false)
    }
  }, [selectedYear, selectedMonth, selectedQuarter])

  useEffect(() => {
    fetchRecurrence()
  }, [fetchRecurrence])

  const handleExportEnhancedXLSX = async () => {
    const params = new URLSearchParams()
    params.set("type", "expenses-enhanced")
    params.set("format", "xlsx")
    params.set("year", String(selectedYear))
    if (selectedMonth) params.set("month", selectedMonth)
    if (selectedQuarter) params.set("quarter", selectedQuarter)
    const res = await fetch(`/api/export?${params.toString()}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "enhanced-report.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    await import("jspdf-autotable")
    const doc = new jsPDF("landscape", "mm", "a4")

    // Cover Page
    doc.setFontSize(28)
    doc.setTextColor(99, 102, 241)
    doc.text("MyMoney", 14, 30)
    doc.setFontSize(22)
    doc.setTextColor(50, 50, 50)
    doc.text("Financial Report", 14, 42)
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    const dateLabel = selectedQuarter
      ? `Q${selectedQuarter} ${selectedYear}`
      : (selectedMonth
        ? `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number.parseInt(selectedMonth) - 1]} ${selectedYear}`
        : String(selectedYear))
    doc.text(`Period: ${dateLabel}`, 14, 52)
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`, 14, 60)

    if (insights) {
      // Summary page
      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(99, 102, 241)
      doc.text("Financial Summary", 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)

      const summaryData = [
        ["Metric", "Value"],
        ["Total Expenses", formatIndianCurrency(insights.totalExpenses)],
        ["Monthly Average", formatIndianCurrency(insights.monthlyExpense)],
        ["Budget Utilization", `${insights.budgetUtilization.toFixed(1)}%`],
        ["Total Investments", formatIndianCurrency(insights.totalInvestments)],
        ["Investment Returns", formatIndianCurrency(insights.investmentReturns)],
        ["Active Goals", String(insights.activeGoals)],
        ["Goal Progress", `${insights.goalProgress.toFixed(0)}%`],
      ]
      doc.autoTable({
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: 55,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      })

      // Category Breakdown page
      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(99, 102, 241)
      doc.text("Category Breakdown", 14, 20)

      const catData = [
        ["Category", "Amount", "Percentage", "Count"],
        ...insights.categoryBreakdown.slice(0, 10).map((c) => {
          const count = expenses.filter((e) => e.category?.name === c.name).length
          return [
            c.name,
            formatIndianCurrency(c.amount),
            `${insights.totalExpenses > 0 ? ((c.amount / insights.totalExpenses) * 100).toFixed(1) : "0"}%`,
            String(count),
          ]
        }),
      ]
      doc.autoTable({
        head: [catData[0]],
        body: catData.slice(1),
        startY: 25,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      })

      // Monthly Trend page
      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(99, 102, 241)
      doc.text("Monthly Trend", 14, 20)

      const trendData = [
        ["Month", "Amount"],
        ...insights.monthlyTrend.map((m) => [m.month, formatIndianCurrency(m.amount)]),
      ]
      doc.autoTable({
        head: [trendData[0]],
        body: trendData.slice(1),
        startY: 25,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      })

      // Category-wise tables with subtotals
      const groupedByCategory = new Map<string, Expense[]>()
      for (const exp of expenses) {
        const cat = exp.category?.name || "Uncategorized"
        if (!groupedByCategory.has(cat)) groupedByCategory.set(cat, [])
        groupedByCategory.get(cat)!.push(exp)
      }

      for (const [catName, catExpenses] of groupedByCategory.entries()) {
        const subtotal = catExpenses.reduce((s, e) => s + e.amount, 0)
        doc.addPage()
        doc.setFontSize(14)
        doc.setTextColor(99, 102, 241)
        doc.text(`${catName} \u2014 ${formatIndianCurrency(subtotal)}`, 14, 20)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)

        const catTable = [
          ["Date", "Description", "Vendor", "Amount", "Mode"],
          ...catExpenses.slice(0, 50).map((e) => [
            e.date ? new Date(e.date).toISOString().split("T")[0] : "",
            e.description || "",
            e.vendor || "",
            formatIndianCurrency(e.amount),
            e.paymentMode || "",
          ]),
        ]
        doc.autoTable({
          head: [catTable[0]],
          body: catTable.slice(1),
          startY: 25,
          theme: "grid",
          headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          showHead: "everyPage",
        })
      }
    }

    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.text(`MyMoney - Personal Finance Manager | Page ${i} of ${totalPages}`, 14, doc.internal.pageSize.height - 10)
    }

    doc.save("financial-report.pdf")
  }

  const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]

  // P5.1: Data table columns
  const expenseColumns: ColumnDef<Expense>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatDate(row.original.date)}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block" title={row.original.description || ""}>
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category?.name || "Uncategorized"}</Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-right whitespace-nowrap font-mono block">
          {formatIndianCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "paymentMode",
      header: "Mode",
      cell: ({ row }) => row.original.paymentMode || "-",
    },
    {
      accessorKey: "person",
      header: "Person",
      cell: ({ row }) => row.original.person || "-",
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => (
        <span className="max-w-[150px] truncate block" title={row.original.vendor || ""}>
          {row.original.vendor || "-"}
        </span>
      ),
    },
  ]

  if (loading) return <ReportsSkeleton />

  if (!insights) return <div className="p-8 text-center text-muted-foreground">Failed to load data</div>

  const reportSections = [
    { id: "expenses", label: "Expenses" },
    { id: "budgets", label: "Budgets" },
    { id: "goals", label: "Goals" },
    { id: "investments", label: "Investments" },
    { id: "plans", label: "Plans" },
  ]

  // Compute category counts for pie chart legend
  const categoryCounts = new Map<string, number>()
  for (const exp of expenses) {
    const cat = exp.category?.name || "Uncategorized"
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1)
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate insights and export financial reports
            {selectedQuarter ? ` \u2014 Q${selectedQuarter} ${selectedYear}` : (selectedMonth ? ` \u2014 ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number.parseInt(selectedMonth) - 1]} ${selectedYear}` : ` \u2014 ${selectedYear}`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportEnhancedXLSX}>
            <Download className="mr-2 h-4 w-4" /> Enhanced XLSX
          </Button>
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
          <Select value={String(selectedYear ?? new Date().getFullYear())} onValueChange={(v) => setSelectedYear(Number.parseInt(v))}>
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
          <TabsTrigger value="recurrence">Recurrence</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatIndianCurrency(insights.totalExpenses)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monthly Average</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatIndianCurrency(insights.monthlyExpense)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Investments</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatIndianCurrency(insights.totalInvestments)}</p>
                <p className={`text-xs ${insights.investmentReturns >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  Return: {insights.investmentReturns >= 0 ? "+" : ""}{formatIndianCurrency(insights.investmentReturns)}
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
                      <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `\u20B9${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                      <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1" }} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
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
                      <Pie
                        data={insights.categoryBreakdown.slice(0, 6)}
                        cx="50%" cy="50%" outerRadius={100}
                        dataKey="amount" nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        isAnimationActive={true} animationDuration={800} animationEasing="ease-out" animationBegin={200}
                      >
                        {insights.categoryBreakdown.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const entry = payload[0]
                          const catName = String(entry.name || "")
                          const catAmount = Number(entry.value || 0)
                          const count = categoryCounts.get(catName) || 0
                          const total = insights.totalExpenses
                          const pct = total > 0 ? ((catAmount / total) * 100).toFixed(1) : "0.0"
                          return (
                            <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md backdrop-blur-sm">
                              <p className="font-medium mb-1">{catName}</p>
                              <p>Amount: {formatIndianCurrency(catAmount)}</p>
                              <p>Count: {count} transactions</p>
                              <p>Share: {pct}%</p>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* P5.3: Enhanced legend with count */}
                <div className="mt-4 space-y-2">
                  {insights.categoryBreakdown.slice(0, 6).map((cat, i) => {
                    const count = categoryCounts.get(cat.name) || 0
                    const pct = insights.totalExpenses > 0 ? ((cat.amount / insights.totalExpenses) * 100).toFixed(1) : "0.0"
                    return (
                      <div key={cat.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{formatIndianCurrency(cat.amount)}</span>
                          <span className="w-12 text-right">{pct}%</span>
                          <span className="w-16 text-right">{count} txns</span>
                        </div>
                      </div>
                    )
                  })}
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
                    <YAxis tickFormatter={(v) => `\u20B9${(v / 1000).toFixed(0)}k`} stroke="#888" />
                    <Tooltip content={<ChartTooltip formatter={(v) => formatIndianCurrency(v)} />} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
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
                        <span className="font-medium">{formatIndianCurrency(cat.amount)}</span>
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
                  <p className="text-xl font-bold">{formatIndianCurrency(insights.totalInvestments)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-xl font-bold">{formatIndianCurrency(insights.totalInvestments + insights.investmentReturns)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Returns</p>
                  <p className={`text-xl font-bold ${insights.investmentReturns >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {insights.investmentReturns >= 0 ? "+" : ""}{formatIndianCurrency(insights.investmentReturns)}
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

        {/* P5.2: Recurrence Tab */}
        <TabsContent value="recurrence" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recurrence Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {recurrenceLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (recurrenceData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recurrence data available.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {recurrenceData.map((item) => (
                    <Card key={item.type} className="border-l-4" style={{
                      borderLeftColor: ({ Monthly: "#6366f1", Quarterly: "#f97316", Yearly: "#22c55e" } as Record<string, string>)[item.type] ?? "#6b7280",
                    }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{item.type}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{formatIndianCurrency(item.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.count} transaction{item.count === 1 ? "" : "s"}</p>
                        {item.examples.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {item.examples.map((vendor, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {vendor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* P5.1: Data Tab */}
        <TabsContent value="data" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expense Data</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {expenses.length} transaction{expenses.length === 1 ? "" : "s"} found
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportEnhancedXLSX}>
                <Download className="mr-2 h-4 w-4" /> Export Table
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={tableCategory} onValueChange={setTableCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {expensesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={expenseColumns}
                  data={expenses}
                  pageSize={20}
                  showPagination={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
