"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Goal } from "@/types"
import { Plus, Target, Download } from "lucide-react"

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "", targetAmount: "", currentAmount: "0", deadline: "", category: "savings", notes: "",
  })

  const loadData = async () => {
    const res = await fetch("/api/goals")
    const data = await res.json()
    setGoals(data.map((g: Goal) => ({ ...g, progress: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0 })))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    await fetch("/api/goals", { method: "POST", body: JSON.stringify(form) })
    setOpen(false)
    setForm({ name: "", targetAmount: "", currentAmount: "0", deadline: "", category: "savings", notes: "" })
    loadData()
  }

  const handleExport = async () => {
    const res = await fetch(`/api/export?type=goals&format=xlsx`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "goals-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground">Track your savings goals and aspirations</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Goal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Savings Goal</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Goal Name</label>
                  <Input placeholder="e.g. Emergency Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Amount (₹)</label>
                  <Input type="number" placeholder="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Current Savings (₹)</label>
                  <Input type="number" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Date</label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="emergency">Emergency Fund</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="purchase">Big Purchase</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit}>Create Goal</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Goals</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{goals.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Target</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Saved</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalSaved)}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : goals.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No goals yet. Create your first financial goal!</div>
        ) : goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{goal.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{goal.category}</Badge>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Target className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2.5" />
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Saved</p>
                  <p className="font-semibold">{formatCurrency(goal.currentAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-semibold">{formatCurrency(goal.targetAmount)}</p>
                </div>
              </div>
              {goal.deadline && (
                <p className="text-xs text-muted-foreground">Deadline: {formatDate(goal.deadline)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
