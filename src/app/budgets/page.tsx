"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatCurrency, formatMonthYear, getCurrentMonth, getCurrentYear } from "@/lib/utils"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import type { Budget, Category } from "@/types"
import { toast } from "sonner"
import { Plus, Download, AlertTriangle, TrendingUp } from "lucide-react"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ categoryId: "", subCategory: "", amount: "" })
  const [errors, setErrors] = useState<{ categoryId?: string; amount?: string }>({})
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState("")
  const [showCustomSubCategory, setShowCustomSubCategory] = useState(false)
  const [customSubCategoryName, setCustomSubCategoryName] = useState("")

  const validateForm = () => {
    const errs: typeof errors = {}
    if (!form.categoryId) errs.categoryId = "Category is required"
    if (!form.amount || Number(form.amount) <= 0) errs.amount = "Amount must be greater than 0"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }
  const [income, setIncome] = useState(0)
  const [incomeLoading, setIncomeLoading] = useState(true)
  const [incomeError, setIncomeError] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [budgetRes, catRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`),
      fetch("/api/categories?include=subCategories"),
    ])
    setBudgets(await budgetRes.json())
    const catData = await catRes.json()
    if (catData.subCategories) {
      setCategories(catData.categories || catData)
      setSubCategories(catData.subCategories)
    } else {
      setCategories(catData)
    }
    setLoading(false)
  }, [month, year])

  const loadIncome = useCallback(async () => {
    setIncomeLoading(true)
    try {
      const res = await fetch("/api/income/summary")
      const data = await res.json()
      if (res.ok && data.currentMonth != null) {
        setIncome(data.currentMonth)
        setIncomeError(false)
      } else {
        setIncome(0)
        setIncomeError(true)
      }
    } catch {
      setIncome(0)
      setIncomeError(true)
    } finally {
      setIncomeLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadIncome() }, [loadIncome])

  const handleAddCustomCategory = async () => {
    if (!customCategoryName.trim()) return
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customCategoryName.trim(), type: "expense" }),
      })
      if (!res.ok) throw new Error("Failed to create category")
      const newCat = await res.json()
      setForm((p) => ({ ...p, categoryId: String(newCat.id) }))
      setCustomCategoryName("")
      setShowCustomCategory(false)
      toast.success(`Category "${newCat.name}" created`)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create category")
    }
  }

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      setForm({ categoryId: "", subCategory: "", amount: "" })
      setErrors({})
      setShowCustomCategory(false)
      setShowCustomSubCategory(false)
      setCustomCategoryName("")
      setCustomSubCategoryName("")
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    try {
      const body: Record<string, unknown> = { ...form, month, year }
      body.subCategory = form.subCategory || null
      const res = await fetch("/api/budgets", { method: "POST", body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create budget")
      toast.success("Budget created successfully")
      setOpen(false)
      setForm({ categoryId: "", subCategory: "", amount: "" })
      setErrors({})
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create budget")
    }
  }

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

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0)
  const availableCategories = categories.filter((c) => c.type === "expense" && !budgets.find((b) => b.categoryId === c.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set and track spending limits by category</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Budget</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  {showCustomCategory ? (
                    <div className="flex gap-2">
                      <Input placeholder="Enter category name" value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} />
                      <Button size="sm" onClick={handleAddCustomCategory}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCustomCategory(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Select value={form.categoryId} onValueChange={(v) => {
                      if (v === "__custom__") { setShowCustomCategory(true); return }
                      setForm({ ...form, categoryId: v, subCategory: "" })
                      setErrors((p) => ({ ...p, categoryId: undefined }))
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                        <SelectItem value="__custom__">➕ Add custom category...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {errors.categoryId && <p className="text-sm text-red-500 mt-1">{errors.categoryId}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Sub-category (optional)</label>
                  {showCustomSubCategory ? (
                    <div className="flex gap-2">
                      <Input placeholder="Enter sub-category" value={customSubCategoryName} onChange={(e) => setCustomSubCategoryName(e.target.value)} />
                      <Button size="sm" onClick={() => { if (customSubCategoryName.trim()) { setForm((p) => ({ ...p, subCategory: customSubCategoryName.trim() })); setCustomSubCategoryName(""); setShowCustomSubCategory(false) } }}>Set</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCustomSubCategory(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Select value={form.subCategory} onValueChange={(v) => {
                      if (v === "__custom__") { setShowCustomSubCategory(true); return }
                      setForm({ ...form, subCategory: v === "__none__" ? "" : v })
                    }}>
                      <SelectTrigger><SelectValue placeholder="None (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {subCategories.map((sc) => (<SelectItem key={sc} value={sc}>{sc}</SelectItem>))}
                        <SelectItem value="__custom__">➕ Add custom sub-category...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Monthly Limit (₹)</label>
                  <Input type="number" placeholder="0" value={form.amount} onChange={(e) => { setForm({ ...form, amount: e.target.value }); setErrors((p) => ({ ...p, amount: undefined })) }} />
                  {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
                </div>
                <Button onClick={handleSubmit}>Save Budget</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number.parseInt(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{new Date(2000, i).toLocaleString("en-US", { month: "long" })}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number.parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => (<SelectItem key={i} value={String(getCurrentYear() - 2 + i)}>{getCurrentYear() - 2 + i}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Monthly Income</p>
              {incomeLoading ? (<Skeleton className="h-7 w-28 mt-0.5" />) : incomeError ? (<p className="text-xl font-bold text-muted-foreground">N/A</p>) : (<p className="text-xl font-bold">{formatCurrency(income)}</p>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{formatMonthYear(month, year)} Overview</CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalBudget)}</p>
              <p className={`text-sm font-medium ${totalSpent > totalBudget ? "text-red-500" : "text-emerald-500"}`}>Spent: {formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (<div className="p-4"><CardGridSkeleton /></div>
          ) : (budgets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No budgets set for this month. Add one to start tracking!</div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const utilization = budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0
                const incomePercent = income > 0 ? (budget.amount / income) * 100 : 0
                const isOver = utilization > 100; const isWarning = utilization > 80 && !isOver
                return (
                  <div key={budget.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {isOver && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        <span className="font-medium">{budget.category.name}</span>
                        {budget.subCategory && <span className="text-xs text-muted-foreground">/ {budget.subCategory}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{formatCurrency(budget.spent || 0)}</span>
                        <span className="text-xs text-muted-foreground">of</span>
                        <span className="font-medium">{formatCurrency(budget.amount)}</span>
                        <span className={`text-xs font-semibold min-w-[3rem] text-right ${isOver ? "text-red-500" : (isWarning ? "text-amber-500" : "text-emerald-500")}`}>{utilization.toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground min-w-[5rem] text-right">({incomePercent.toFixed(0)}% of income)</span>
                      </div>
                    </div>
                    <Progress value={Math.min(utilization, 100)} className={`h-2 ${isOver ? "bg-red-500/20 [&>div]:bg-red-500" : (isWarning ? "bg-amber-500/20 [&>div]:bg-amber-500" : "bg-primary/20")}`} />
                  </div>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
