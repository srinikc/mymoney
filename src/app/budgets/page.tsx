"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatCurrencyFull, getCurrentMonth, getCurrentYear } from "@/lib/utils"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Download, AlertTriangle, CheckCircle2, Repeat, Trash2, Save, TrendingUp, ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Category } from "@/types"

interface CommonCategoryRow {
  categoryId: number
  category: { id: number; name: string; icon: string; color: string }
  subCategory: string | null
  lastMonthSpend: number
  currentBudget: number | null
  currentSpent: number
  budgetId: number | null
}

interface OverviewResponse {
  overview: boolean
  month: number
  year: number
  income: number
  commonCategories: CommonCategoryRow[]
  totals: {
    current: { budget: number; spent: number }
    lastMonth: { budget: number; spent: number }
  }
}

type Status = "over" | "warning" | "ok" | "none"

function statusFor(spent: number, budget: number | null): Status {
  if (!budget || budget <= 0) return "none"
  const pct = spent / budget
  if (pct > 1) return "over"
  if (pct >= 0.8) return "warning"
  return "ok"
}

function statusChip(status: Status) {
  switch (status) {
    case "over": return { text: "Over", className: "text-red-600 bg-red-100" }
    case "warning": return { text: "On track", className: "text-amber-600 bg-amber-100" }
    case "ok": return { text: "Under", className: "text-emerald-600 bg-emerald-100" }
    default: return { text: "No budget", className: "text-muted-foreground bg-muted" }
  }
}

function monthName(m: number): string {
  return new Date(2000, m - 1).toLocaleString("en-US", { month: "long" })
}

export default function BudgetsPage() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<string[]>([])

  // Row amount inputs keyed by "categoryId::subCategory"
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Inline add-category row
  const [adding, setAdding] = useState(false)
  const [newCatId, setNewCatId] = useState("")
  const [newSubCat, setNewSubCat] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [showCustomCat, setShowCustomCat] = useState(false)
  const [customCatName, setCustomCatName] = useState("")

  // Repeat months selection (inline checkboxes)
  const [repeatMonths, setRepeatMonths] = useState<Set<number>>(new Set())
  const [repeating, setRepeating] = useState(false)

  const loadOverview = useCallback(async (m: number, y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/budgets/overview?month=${m}&year=${y}`)
      if (!res.ok) throw new Error("Failed to load overview")
      const data = (await res.json()) as OverviewResponse
      setOverview(data)
      const init: Record<string, string> = {}
      for (const row of data.commonCategories) {
        init[`${row.categoryId}::${row.subCategory || ""}`] = row.currentBudget != null ? String(row.currentBudget) : ""
      }
      setAmounts(init)
    } catch {
      toast.error("Failed to load budget overview")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories?include=subCategories")
      const data = await res.json()
      if (data.subCategories) {
        setCategories(data.categories || data)
        setSubCategories(data.subCategories)
      } else {
        setCategories(data)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadOverview(month, year) }, [loadOverview, month, year])
  useEffect(() => { loadCategories() }, [loadCategories])

  const rowKey = useCallback((c: { categoryId: number; subCategory: string | null }) => `${c.categoryId}::${c.subCategory || ""}`, [])

  const remainingMonths = useMemo(() => {
    const start = month + 1
    const arr: number[] = []
    for (let m = start; m <= 12; m++) arr.push(m)
    return arr
  }, [month])

  useEffect(() => {
    setRepeatMonths(new Set(remainingMonths))
  }, [remainingMonths])

  const toggleRepeatMonth = (m: number) => {
    setRepeatMonths((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  const saveAll = async () => {
    const entries = (overview?.commonCategories || []).map((row) => {
      const amt = Number.parseFloat(amounts[rowKey(row)] || "")
      return { row, amt, key: rowKey(row) }
    })
    const valid = entries.filter((e) => !isNaN(e.amt) && e.amt > 0)
    if (valid.length === 0) {
      toast.error("Enter a valid amount for at least one category")
      return
    }
    setSaving(true)
    try {
      for (const { row, amt } of valid) {
        if (row.budgetId != null) {
          const res = await fetch("/api/budgets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.budgetId, amount: amt }),
          })
          if (!res.ok) throw new Error("Failed to update budget")
        } else {
          const res = await fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: row.categoryId, subCategory: row.subCategory, month, year, amount: amt }),
          })
          if (!res.ok) throw new Error("Failed to create budget")
        }
      }
      toast.success(`Saved ${valid.length} budget${valid.length === 1 ? "" : "s"}`)
      await loadOverview(month, year)
    } catch (e) {
      toast.error((e as Error).message || "Failed to save budgets")
    } finally {
      setSaving(false)
    }
  }

  const deleteRow = async (row: CommonCategoryRow) => {
    if (!row.budgetId) return
    if (!confirm(`Delete budget for ${row.category.name}?`)) return
    try {
      const res = await fetch(`/api/budgets?id=${row.budgetId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete budget")
      toast.success(`Deleted budget for ${row.category.name}`)
      await loadOverview(month, year)
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete budget")
    }
  }

  const handleAddCustomCategory = async () => {
    if (!customCatName.trim()) return
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customCatName.trim(), type: "expense" }),
      })
      if (!res.ok) throw new Error("Failed to create category")
      const cat = await res.json()
      setNewCatId(String(cat.id))
      setCustomCatName("")
      setShowCustomCat(false)
      await loadCategories()
    } catch (e) {
      toast.error((e as Error).message || "Failed to create category")
    }
  }

  const addCategory = async () => {
    if (!newCatId) {
      toast.error("Select a category")
      return
    }
    try {
      const amount = Number.parseFloat(newAmount || "")
      if (amount > 0) {
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: Number(newCatId), subCategory: newSubCat.trim() || null, month, year, amount }),
        })
        if (!res.ok) throw new Error("Failed to set budget")
      }
      toast.success("Category added to budget")
      setAdding(false)
      setNewCatId("")
      setNewSubCat("")
      setNewAmount("")
      await loadOverview(month, year)
      await loadCategories()
    } catch (e) {
      toast.error((e as Error).message || "Failed to add category")
    }
  }

  const handleRepeat = async () => {
    const months = [...repeatMonths].sort((a, b) => a - b)
    if (months.length === 0) {
      toast.error("Select at least one month")
      return
    }
    const entries = (overview?.commonCategories || [])
      .map((row) => {
        const amt = Number.parseFloat(amounts[rowKey(row)] || "")
        if (isNaN(amt) || amt <= 0) return null
        return { categoryId: row.categoryId, subCategory: row.subCategory, amount: amt, months }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
    if (entries.length === 0) {
      toast.error("Set budget amounts for at least one category first")
      return
    }
    setRepeating(true)
    try {
      const res = await fetch("/api/budgets/repeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, entries }),
      })
      if (!res.ok) throw new Error("Failed to repeat budgets")
      const data = await res.json()
      toast.success(`Created ${data.created} budgets, skipped ${data.skipped} existing`)
      await loadOverview(month, year)
    } catch (e) {
      toast.error((e as Error).message || "Failed to repeat budgets")
    } finally {
      setRepeating(false)
    }
  }

  const totalCurrentBudget = overview?.totals.current.budget ?? 0
  const totalCurrentSpent = overview?.totals.current.spent ?? 0
  const totalLastBudget = overview?.totals.lastMonth.budget ?? 0
  const totalLastSpent = overview?.totals.lastMonth.spent ?? 0
  const income = overview?.income ?? 0

  const prevDate = new Date(year, month - 2, 1)
  const prevMonth = prevDate.getMonth() + 1
  const prevYear = prevDate.getFullYear()

  const currentPct = totalCurrentBudget > 0 ? Math.round((totalCurrentSpent / totalCurrentBudget) * 100) : 0
  const lastPct = totalLastBudget > 0 ? Math.round((totalLastSpent / totalLastBudget) * 100) : 0

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?type=budgets&format=xlsx`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = "budgets-export.xlsx"; a.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded")
    } catch {
      toast.error("Failed to export budgets")
    }
  }

  const availableCategories = categories.filter((c) => c.type === "expense")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">Plan monthly spending by category</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* Month/year navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => { const d = new Date(year, month - 2, 1); setMonth(d.getMonth() + 1); setYear(d.getFullYear()) }} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number.parseInt(v))}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number.parseInt(v))}>
          <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => (<SelectItem key={i} value={String(getCurrentYear() - 2 + i)}>{getCurrentYear() - 2 + i}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => { const d = new Date(year, month, 1); setMonth(d.getMonth() + 1); setYear(d.getFullYear()) }} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Income strip */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><TrendingUp className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Income · {monthName(month)} {year}</p>
              {loading ? (<Skeleton className="h-5 w-24 mt-0.5" />) : (<p className="text-lg font-bold">{formatCurrency(income)}</p>)}
            </div>
            {income > 0 && totalCurrentBudget > 0 && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground font-semibold">Budgeted</p>
                <p className={`text-sm font-semibold ${totalCurrentBudget > income ? "text-amber-600" : "text-emerald-600"}`}>{((totalCurrentBudget / income) * 100).toFixed(0)}% of income</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact totals strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="py-3 space-y-1">
            <p className="text-xs font-bold text-muted-foreground">{monthName(month)} {year}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">Budget</span>
              <span className="font-semibold">{formatCurrencyFull(totalCurrentBudget)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">Spent</span>
              <span className="font-semibold">{formatCurrencyFull(totalCurrentSpent)}</span>
            </div>
            <Progress value={Math.min(currentPct, 100)} className={`h-1.5 ${currentPct > 100 ? "bg-red-500/20 [&>div]:bg-red-500" : "bg-primary/20"}`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 space-y-1">
            <p className="text-xs font-bold text-muted-foreground">{monthName(prevMonth)} {prevYear}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">Budget</span>
              <span className="font-semibold">{formatCurrencyFull(totalLastBudget)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">Spent</span>
              <span className="font-semibold">{formatCurrencyFull(totalLastSpent)}</span>
            </div>
            <Progress value={Math.min(lastPct, 100)} className={`h-1.5 ${lastPct > 100 ? "bg-red-500/20 [&>div]:bg-red-500" : "bg-primary/20"}`} />
          </CardContent>
        </Card>
      </div>

      {/* Budget planner */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Budget Planner</h2>
              <p className="text-xs text-muted-foreground">Categories with activity in the last 3 months or an existing budget this month</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveAll} disabled={saving || loading}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save All"}</Button>
              <Button variant="outline" size="sm" onClick={() => { setAdding(true); setShowCustomCat(false) }} disabled={loading}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
            </div>
          </div>

          {/* Month selection row */}
          <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/40 p-2">
            <span className="text-xs font-bold text-muted-foreground">Repeat budget to:</span>
            {remainingMonths.map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox checked={repeatMonths.has(m)} onCheckedChange={() => toggleRepeatMonth(m)} />
                <span className="text-xs">{monthName(m)}</span>
              </label>
            ))}
            <Button size="sm" variant="outline" className="ml-auto" onClick={handleRepeat} disabled={repeating || loading}><Repeat className="mr-2 h-4 w-4" /> {repeating ? "Repeating..." : `Repeat to ${repeatMonths.size} month${repeatMonths.size === 1 ? "" : "s"}`}</Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-4"><CardGridSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 font-bold">Category</TableHead>
                  <TableHead className="text-right font-bold">{monthName(month)} spent</TableHead>
                  <TableHead className="text-right font-bold">{monthName(prevMonth)} {prevYear}</TableHead>
                  <TableHead className="text-right font-bold">Budget</TableHead>
                  <TableHead className="text-center font-bold">Status</TableHead>
                  <TableHead className="text-right pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adding && (
                  <TableRow className="bg-primary/5">
                    <TableCell className="pl-4 py-2">
                      <div className="flex items-center gap-1 min-w-[200px]">
                        {showCustomCat ? (
                          <>
                            <Input placeholder="New category name" className="h-8" value={customCatName} onChange={(e) => setCustomCatName(e.target.value)} />
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowCustomCat(false); setCustomCatName("") }}><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <Select value={newCatId} onValueChange={(v) => {
                            if (v === "__custom__") { setShowCustomCat(true); setNewCatId(""); return }
                            setNewCatId(v)
                          }}>
                            <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {availableCategories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                              <SelectItem value="__custom__">➕ Add custom category...</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {showCustomCat && <Button size="sm" className="h-8" onClick={handleAddCustomCategory}>Add</Button>}
                      </div>
                      <div className="mt-1.5">
                        <Select value={newSubCat} onValueChange={(v) => setNewSubCat(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 w-full"><SelectValue placeholder="Sub-category" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {subCategories.map((sc) => (<SelectItem key={sc} value={sc}>{sc}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 text-sm text-muted-foreground">—</TableCell>
                    <TableCell className="text-right py-2 text-sm text-muted-foreground">—</TableCell>
                    <TableCell className="text-right py-2">
                      <Input type="number" placeholder="Budget" className="h-8 w-24 text-right ml-auto" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <Button size="sm" className="h-8" onClick={addCategory}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                    </TableCell>
                    <TableCell className="text-right pr-4 py-2">
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAdding(false); setNewCatId(""); setNewSubCat(""); setNewAmount(""); setShowCustomCat(false) }}>Cancel</Button>
                    </TableCell>
                  </TableRow>
                )}
                {(overview?.commonCategories || []).map((row) => {
                  const key = rowKey(row)
                  const status = statusFor(row.currentSpent, row.currentBudget)
                  const chip = statusChip(status)
                  const utilization = row.currentBudget && row.currentBudget > 0 ? Math.round((row.currentSpent / row.currentBudget) * 100) : 0
                  return (
                    <TableRow key={key}>
                      <TableCell className="pl-4 py-1.5">
                        <span className="font-medium text-sm">{row.category.name}</span>
                        {row.subCategory && <span className="text-xs text-muted-foreground"> / {row.subCategory}</span>}
                      </TableCell>
                      <TableCell className="text-right py-1.5 text-sm">{formatCurrency(row.currentSpent)}</TableCell>
                      <TableCell className="text-right py-1.5 text-sm">{formatCurrency(row.lastMonthSpend)}</TableCell>
                      <TableCell className="text-right py-1.5">
                        <Input type="number" className="h-7 w-24 text-right ml-auto" placeholder="0" value={amounts[key] ?? ""} onChange={(e) => setAmounts((p) => ({ ...p, [key]: e.target.value }))} />
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${chip.className}`}>
                          {status === "over" && <AlertTriangle className="h-3 w-3" />}
                          {status === "ok" && <CheckCircle2 className="h-3 w-3" />}
                          {chip.text}{status !== "none" ? ` ${utilization}%` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4 py-1.5">
                        {row.budgetId != null && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteRow(row)} title="Delete budget" aria-label="Delete budget">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {overview && overview.commonCategories.length === 0 && !adding && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No categories yet. Click Add Category to start planning.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}