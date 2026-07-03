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
import type { Budget, Category } from "@/types"
import { Plus, Download, AlertTriangle } from "lucide-react"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ categoryId: "", amount: "" })

  const loadData = useCallback(async () => {
    const [budgetRes, catRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`),
      fetch("/api/categories"),
    ])
    setBudgets(await budgetRes.json())
    setCategories(await catRes.json())
    setLoading(false)
  }, [month, year])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async () => {
    await fetch("/api/budgets", {
      method: "POST",
      body: JSON.stringify({ ...form, month, year }),
    })
    setOpen(false)
    setForm({ categoryId: "", amount: "" })
    loadData()
  }

  const handleExport = async () => {
    const res = await fetch(`/api/export?type=budgets&format=xlsx`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "budgets-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set and track spending limits by category</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Budget</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => !budgets.find((b) => b.categoryId === c.id)).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Monthly Limit (₹)</label>
                  <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {new Date(2000, i).toLocaleString("en-US", { month: "long" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number.parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => (
              <SelectItem key={i} value={String(getCurrentYear() - 2 + i)}>
                {getCurrentYear() - 2 + i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{formatMonthYear(month, year)} Overview</CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalBudget)}</p>
              <p className={`text-sm font-medium ${totalSpent > totalBudget ? "text-red-500" : "text-emerald-500"}`}>
                Spent: {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-4"><CardGridSkeleton /></div>
          ) : (budgets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No budgets set for this month. Add one to start tracking!
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const utilization = budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0
                const isOver = utilization > 100
                const isWarning = utilization > 80 && !isOver

                return (
                  <div key={budget.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {isOver && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        <span className="font-medium">{budget.category.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{formatCurrency(budget.spent || 0)}</span>
                        <span className="text-xs text-muted-foreground">of</span>
                        <span className="font-medium">{formatCurrency(budget.amount)}</span>
                        <span className={`text-xs font-semibold min-w-[3rem] text-right ${
                          isOver ? "text-red-500" : (isWarning ? "text-amber-500" : "text-emerald-500")
                        }`}>
                          {utilization.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={Math.min(utilization, 100)} className={`h-2 ${
                      isOver ? "bg-red-500/20 [&>div]:bg-red-500" :
                      (isWarning ? "bg-amber-500/20 [&>div]:bg-amber-500" :
                      "bg-primary/20")
                    }`} />
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
