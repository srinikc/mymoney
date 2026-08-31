"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import {
  Loader2, RefreshCw, Download, ChevronDown, ChevronRight,
  AlertCircle, ChevronLeft, Search, Sparkles,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────

interface CategorizeResult {
  date: string
  amount: number
  vendor: string | null
  bankAccount: string | null
  description: string
  categoryId?: number
  categoryName?: string
  subCategory?: string
  person?: string
  source: "vendor_keyword" | "vendor_rule" | "llm" | "unmatched"
  confidence: number
}

interface CategoryGroup {
  name: string
  count: number
  totalAmount: number
  transactions: CategorizeResult[]
  expanded: boolean
}

interface CategorizeStats {
  total: number
  matched: number
  unmatched: number
  withVendor: number
  withoutVendor: number
  matchRate: number
  grandTotal: number
  byCategory: Array<{ name: string; count: number; totalAmount: number }>
  unmatchedByVendor: Array<{ name: string; count: number; totalAmount: number }>
}

interface Category {
  name: string
  subCategories: string[]
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ExpenseAutoPage() {
  const [view, setView] = useState<"dashboard" | "all">("dashboard")
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [stats, setStats] = useState<CategorizeStats | null>(null)
  const [results, setResults] = useState<CategorizeResult[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Use ref to avoid dependency loops
  const statsRef = useRef<CategorizeStats | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Sort
  const [sortField, setSortField] = useState<"date" | "amount" | "vendor" | "category">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Search & Filters
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")

  // Correction state
  const [editingVendor, setEditingVendor] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState("")
  const [editSubCategory, setEditSubCategory] = useState("")

  // Inline edit state for transactions
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [rowEditCategory, setRowEditCategory] = useState("")
  const [rowEditSubCategory, setRowEditSubCategory] = useState("")

  // Dashboard expand state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupTransactions, setGroupTransactions] = useState<Map<string, CategorizeResult[]>>(new Map())
  const [loadingGroup, setLoadingGroup] = useState<string | null>(null)

  // LLM analysis state
  const [analyzing, setAnalyzing] = useState(false)
  const [llmProgress, setLlmProgress] = useState<{ processed: number; total: number; saved: number } | null>(null)

  // Sticky nav refs
  const dashboardRef = useRef<HTMLDivElement>(null)
  const transactionsRef = useRef<HTMLDivElement>(null)

  // Fetch auto-categorize's own categories (independent from shared Category table)
  useEffect(() => {
    fetch("/api/expenses/auto-categorize/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(console.error)
  }, [])

  // Load stats (only for dashboard)
  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/expenses/auto-categorize?pageSize=1")
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/expenses/expense-auto"
        return
      }
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to load data")
        return
      }
      const data = await res.json()
      setStats(data.stats)
      statsRef.current = data.stats
    } catch {
      toast.error("Failed to load categorization data")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load paginated results (for All Transactions view)
  const loadResults = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortField,
        sortDir,
      })
      if (search) params.set("search", search)
      if (categoryFilter) params.set("categories", categoryFilter)
      if (sourceFilter) params.set("source", sourceFilter)

      const res = await fetch(`/api/expenses/auto-categorize?${params}`)
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/expenses/expense-auto"
        return
      }
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to load data")
        return
      }
      const data = await res.json()
      setResults(data.results)
      setTotalResults(data.totalResults)
      setTotalPages(data.totalPages)
      if (!statsRef.current) {
        setStats(data.stats)
        statsRef.current = data.stats
      }
    } catch {
      toast.error("Failed to load transactions")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortField, sortDir, search, categoryFilter, sourceFilter])

  // Load data on view change
  useEffect(() => {
    if (view === "dashboard") {
      loadStats()
    } else {
      loadResults()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Reload results when filters change (only for "all" view)
  useEffect(() => {
    if (view === "all") {
      setPage(1)
      loadResults()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, sourceFilter, sortField, sortDir])

  // Seed from GPay HTML
  const handleSeed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch("/api/expenses/auto-categorize/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/expenses/expense-auto"
        return
      }
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to seed")
        return
      }
      const data = await res.json()
      toast.success(`Seeded ${data.rulesCreated} vendor rules from ${data.totalTransactions} transactions`)
      statsRef.current = null
      setStats(null)
      await loadStats()
    } catch {
      toast.error("Failed to seed from GPay")
    } finally {
      setSeeding(false)
    }
  }, [loadStats])

  // Analyze unmatched vendors with LLM
  const handleLLMAnalysis = useCallback(async () => {
    setAnalyzing(true)
    setLlmProgress({ processed: 0, total: 0, saved: 0 })
    try {
      const res = await fetch("/api/expenses/auto-categorize/llm-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/expenses/expense-auto"
        return
      }
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to analyze with AI")
        return
      }
      const data = await res.json()

      // Show detailed result
      const details: string[] = []
      if (data.totalUnmatched !== undefined) {
        details.push(`${data.totalUnmatched} unmatched vendors found`)
      }
      if (data.llmProvider) {
        details.push(`LLM: ${data.llmProvider}/${data.llmModel}`)
      }
      if (data.errors && data.errors.length > 0) {
        details.push(`${data.errors.length} batch errors`)
      }
      const detailStr = details.length > 0 ? ` (${details.join("; ")})` : ""

      if (data.saved > 0) {
        toast.success(`AI analyzed ${data.analyzed} vendors, saved ${data.saved} rules${detailStr}`)
      } else if (data.errors && data.errors.length > 0) {
        // Show first error for debugging
        const firstErr = data.errors[0].length > 120 ? data.errors[0].slice(0, 120) + "..." : data.errors[0]
        toast.error(`AI failed: ${firstErr}${detailStr}`)
      } else {
        toast.info(data.message || `No new rules saved${detailStr}`)
      }

      setLlmProgress(null)
      statsRef.current = null
      setStats(null)
      await loadStats()
    } catch (e) {
      toast.error(`Failed to analyze with AI: ${e instanceof Error ? e.message : String(e)}`)
      setLlmProgress(null)
    } finally {
      setAnalyzing(false)
    }
  }, [loadStats])

  // Inline edit: save correction + update ALL instances
  const handleInlineEdit = useCallback(async (vendor: string, newCategory: string, newSubCategory: string) => {
    if (!newCategory) {
      toast.error("Select a category")
      return
    }

    try {
      const res = await fetch("/api/expenses/auto-categorize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corrections: [{
            vendor,
            categoryId: 0,
            categoryName: newCategory,
            subCategory: newSubCategory,
          }],
        }),
      })
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/expenses/expense-auto"
        return
      }
      if (!res.ok) {
        toast.error("Failed to save correction")
        return
      }
      toast.success(`Rule saved: "${vendor}" → ${newCategory}. All instances updated.`)
      setEditingRow(null)
      setEditingVendor(null)

      // Update local results immediately (optimistic update)
      setResults((prev) =>
        prev.map((r) =>
          r.vendor?.toLowerCase().trim() === vendor.toLowerCase().trim()
            ? { ...r, categoryName: newCategory, subCategory: newSubCategory, source: "vendor_rule" as const }
            : r
        )
      )

      // Refresh stats
      statsRef.current = null
      setStats(null)
      await loadStats()
    } catch {
      toast.error("Failed to save correction")
    }
  }, [loadStats])

  // Legacy correction handler for unmatched vendors
  const handleApplyCorrection = useCallback(async (vendor: string, categoryName: string, subCategory: string) => {
    try {
      const res = await fetch("/api/expenses/auto-categorize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corrections: [{ vendor, categoryId: 0, categoryName, subCategory }],
        }),
      })
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/expenses/expense-auto"
        return
      }
      if (!res.ok) {
        toast.error("Failed to save correction")
        return
      }
      toast.success(`Rule created for "${vendor}" → ${categoryName}`)
      setEditingVendor(null)
      statsRef.current = null
      setStats(null)
      await loadStats()
    } catch {
      toast.error("Failed to save correction")
    }
  }, [loadStats])

  // Toggle group expansion and load transactions
  const toggleGroup = async (categoryName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
        return next
      }
      next.add(categoryName)
      return next
    })

    // Fetch transactions for this category if not cached
    if (!groupTransactions.has(categoryName)) {
      setLoadingGroup(categoryName)
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "200",
          categories: categoryName,
          sortField: "date",
          sortDir: "desc",
        })
        const res = await fetch(`/api/expenses/auto-categorize?${params}`)
        if (res.ok) {
          const data = await res.json()
          setGroupTransactions((prev) => new Map(prev).set(categoryName, data.results))
        }
      } catch {
        // ignore
      } finally {
        setLoadingGroup(null)
      }
    }
  }

  // Scroll to section
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Handle search
  const handleSearch = () => {
    setPage(1)
    loadResults()
  }

  // Sort groups by count
  const sortedGroups = (stats?.byCategory || []).sort((a, b) => b.count - a.count)

  // Pagination component (reusable)
  const PaginationBar = ({ showTop = false }: { showTop?: boolean }) => {
    if (totalPages <= 1) return null
    return (
      <div className={`flex items-center justify-between ${showTop ? "mb-4" : "mt-4"}`}>
        <div className="text-sm text-muted-foreground">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalResults)} of {totalResults.toLocaleString()} transactions
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>
    )
  }

  // Inline edit cell — auto-saves on blur/selection, Escape to cancel
  const InlineEditCell = ({ vendor, currentCategory, currentSubCategory, onSave, onCancel, showCategory = true }: {
    vendor: string
    currentCategory: string
    currentSubCategory: string
    onSave: (category: string, subCategory: string) => void
    onCancel: () => void
    showCategory?: boolean
  }) => {
    const [cat, setCat] = useState(currentCategory)
    const [sub, setSub] = useState(currentSubCategory)
    const subRef = useRef<HTMLInputElement>(null)
    const savedRef = useRef(false)

    const doSave = () => {
      if (savedRef.current) return
      savedRef.current = true
      onSave(cat, sub)
    }

    useEffect(() => {
      if (showCategory) {
        setTimeout(() => subRef.current?.focus(), 100)
      } else {
        subRef.current?.focus()
      }
    }, [showCategory])

    return (
      <div className="flex items-center gap-1" onKeyDown={(e) => {
        if (e.key === "Escape") { savedRef.current = true; onCancel() }
        if (e.key === "Enter") { doSave() }
      }}>
        {showCategory && (
          <Select value={cat} onValueChange={(v) => { setCat(v); savedRef.current = true; onSave(v, sub) }}>
            <SelectTrigger className="w-36 h-7 text-xs" onBlur={doSave}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input
          ref={subRef}
          className="border rounded px-2 py-1 text-xs w-24 h-7"
          placeholder="Sub"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          onBlur={doSave}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Sticky Header with Tabs */}
      <div className="sticky top-0 z-50 bg-background border-b pb-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Auto-Categorize</h1>
            <p className="text-sm text-muted-foreground">
              Learn categorization from GPay transactions — no manual vendor mapping needed
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === "dashboard" ? "default" : "outline"}
              onClick={() => { setView("dashboard"); scrollTo(dashboardRef) }}
            >
              Dashboard
            </Button>
            <Button
              variant={view === "all" ? "default" : "outline"}
              onClick={() => { setView("all"); scrollTo(transactionsRef) }}
            >
              All Transactions ({totalResults.toLocaleString()})
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              Total: <strong>{stats.total.toLocaleString()}</strong> transactions
            </span>
            <span className="text-green-600">
              Matched: <strong>{stats.matched.toLocaleString()}</strong> ({Math.round(stats.matchRate * 100)}%)
            </span>
            <span className="text-orange-500">
              Unmatched: <strong>{stats.unmatched.toLocaleString()}</strong>
            </span>
            <span className="text-muted-foreground">
              Amount: <strong>{formatCurrency(stats.grandTotal)}</strong>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-3">
          <Button onClick={handleSeed} disabled={seeding} size="sm">
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Seed from GPay HTML
          </Button>
          <Button
            onClick={handleLLMAnalysis}
            disabled={analyzing || seeding}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
          >
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze with AI
          </Button>
          <Button
            variant="outline"
            onClick={() => { statsRef.current = null; setStats(null); loadStats(); if (view === "all") loadResults() }}
            disabled={loading}
            size="sm"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {/* LLM Progress */}
        {llmProgress && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">AI Analysis in Progress...</span>
              <span>{llmProgress.processed}/{llmProgress.total} vendors analyzed</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${llmProgress.total > 0 ? (llmProgress.processed / llmProgress.total) * 100 : 0}%` }}
              />
            </div>
            {llmProgress.saved > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{llmProgress.saved} rules saved so far</p>
            )}
          </div>
        )}
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !stats ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click &quot;Seed from GPay HTML&quot; to analyze your Google Pay transactions
              and build categorization rules from scratch.
            </p>
          </CardContent>
        </Card>
      ) : view === "dashboard" ? (
        /* ── Dashboard View ─────────────────────────────────────────── */
        <div className="space-y-6" ref={dashboardRef}>
          {/* Grand Total Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                  <div className="text-3xl font-bold">{formatCurrency(stats.grandTotal)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Categories with transactions</div>
                  <div className="text-3xl font-bold">{stats.byCategory.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Category Breakdown</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {sortedGroups.length} categories — click row to expand & edit
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {sortedGroups.map((group) => (
                  <div key={group.name} className="border rounded-lg">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleGroup(group.name)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedGroups.has(group.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium min-w-[200px]">{group.name}</span>
                        <Badge variant="secondary">{group.count}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{group.count} txns</span>
                        <span className="font-medium min-w-[120px] text-right">{formatCurrency(group.totalAmount)}</span>
                      </div>
                    </div>
                    {expandedGroups.has(group.name) && (
                      <div className="px-4 pb-3 bg-muted/30">
                        {loadingGroup === group.name ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Date</th>
                                  <th className="text-left p-2">Vendor</th>
                                  <th className="text-right p-2">Amount</th>
                                  <th className="text-left p-2">SubCategory</th>
                                  <th className="text-left p-2">Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(groupTransactions.get(group.name) || []).map((tx, i) => (
                                  <tr key={i} className="border-b last:border-0 hover:bg-background/50">
                                    <td className="p-2">{formatDate(new Date(tx.date))}</td>
                                    <td className="p-2 font-medium max-w-[200px] truncate">{tx.vendor || "—"}</td>
                                    <td className="p-2 text-right">{formatCurrency(tx.amount)}</td>
                                    <td className="p-2">
                                      {editingRow === i && editingVendor === `dash-${group.name}-${i}` ? (
                                        <InlineEditCell
                                          vendor={tx.vendor || ""}
                                          currentCategory={group.name}
                                          currentSubCategory={tx.subCategory || ""}
                                          showCategory={false}
                                          onSave={(cat, sub) => {
                                            handleInlineEdit(tx.vendor || "", cat, sub)
                                            setEditingRow(null)
                                          }}
                                          onCancel={() => { setEditingRow(null); setEditingVendor(null) }}
                                        />
                                      ) : (
                                        <span
                                          className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 inline-block"
                                          onClick={() => {
                                            setEditingRow(i)
                                            setEditingVendor(`dash-${group.name}-${i}`)
                                          }}
                                        >
                                          {tx.subCategory || "—"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      <Badge variant={tx.source === "unmatched" ? "destructive" : "outline"} className="text-[10px]">
                                        {tx.source === "vendor_keyword" ? "keyword" : tx.source === "vendor_rule" ? "rule" : tx.source === "llm" ? "AI" : tx.source}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                                {(groupTransactions.get(group.name) || []).length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="text-center p-4 text-muted-foreground">
                                      No transactions loaded
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Unmatched Vendors */}
          {stats.unmatchedByVendor.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Unmatched Vendors ({stats.unmatchedByVendor.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  These vendors need manual categorization. Click &quot;Fix&quot; to assign a category — this creates a permanent rule.
                </p>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {stats.unmatchedByVendor.map((vendor) => (
                    <div key={vendor.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <span className="font-medium">{vendor.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {vendor.count} txns • {formatCurrency(vendor.totalAmount)}
                        </span>
                      </div>
                      {editingVendor === vendor.name ? (
                        <InlineEditCell
                          vendor={vendor.name}
                          currentCategory={editCategory}
                          currentSubCategory={editSubCategory}
                          onSave={(cat, sub) => {
                            handleApplyCorrection(vendor.name, cat, sub)
                          }}
                          onCancel={() => setEditingVendor(null)}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingVendor(vendor.name)
                            setEditCategory("")
                            setEditSubCategory("")
                          }}
                        >
                          Fix
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* ── All Transactions View ──────────────────────────────────── */
        <div ref={transactionsRef}>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendor, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-64"
              />
              <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {stats.byCategory.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sources</SelectItem>
                <SelectItem value="vendor_keyword">Keyword Match</SelectItem>
                <SelectItem value="vendor_rule">Learned Rule</SelectItem>
                <SelectItem value="llm">AI (LLM)</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Top Pagination */}
          <PaginationBar showTop />

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th
                        className="text-left p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortField("date"); setSortDir(sortDir === "asc" ? "desc" : "asc") }}
                      >
                        Date {sortField === "date" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="text-left p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortField("vendor"); setSortDir(sortDir === "asc" ? "desc" : "asc") }}
                      >
                        Vendor {sortField === "vendor" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="text-right p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortField("amount"); setSortDir(sortDir === "asc" ? "desc" : "asc") }}
                      >
                        Amount {sortField === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="text-left p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortField("category"); setSortDir(sortDir === "asc" ? "desc" : "asc") }}
                      >
                        Category {sortField === "category" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-left p-3">SubCategory</th>
                      <th className="text-left p-3">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      results.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="p-3">{formatDate(new Date(r.date))}</td>
                          <td className="p-3 font-medium max-w-[200px] truncate">{r.vendor || "—"}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(r.amount)}</td>
                          <td className="p-3">
                            {editingRow === i && editingVendor === `row-${i}` ? (
                              <InlineEditCell
                                vendor={r.vendor || ""}
                                currentCategory={r.categoryName || ""}
                                currentSubCategory={r.subCategory || ""}
                                onSave={(cat, sub) => {
                                  handleInlineEdit(r.vendor || "", cat, sub)
                                  setEditingRow(null)
                                }}
                                onCancel={() => { setEditingRow(null); setEditingVendor(null) }}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                {r.categoryName ? (
                                  <Badge
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-muted/80"
                                    onClick={() => {
                                      setEditingRow(i)
                                      setEditingVendor(`row-${i}`)
                                    }}
                                  >
                                    {r.categoryName}
                                  </Badge>
                                ) : (
                                  <span
                                    className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 text-muted-foreground"
                                    onClick={() => {
                                      setEditingRow(i)
                                      setEditingVendor(`row-${i}`)
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {editingRow === i && editingVendor === `row-${i}` ? null : (
                              <span
                                className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 text-muted-foreground"
                                onClick={() => {
                                  setEditingRow(i)
                                  setEditingVendor(`row-${i}`)
                                }}
                              >
                                {r.subCategory || "—"}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {editingRow === i && editingVendor === `row-${i}` ? null : (
                              <Badge variant={r.source === "unmatched" ? "destructive" : "outline"}>
                                {r.source === "vendor_keyword" ? "keyword" : r.source === "vendor_rule" ? "rule" : r.source === "llm" ? "AI" : r.source}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Pagination */}
          <PaginationBar />
        </div>
      )}
    </div>
  )
}
