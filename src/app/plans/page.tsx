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
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import type { Plan } from "@/types"
import { Plus, ClipboardList, Download } from "lucide-react"

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "", description: "", category: "general", amountNeeded: "", amountSaved: "0",
    monthlyContribution: "", deadline: "", notes: "",
  })

  const loadData = async () => {
    const res = await fetch("/api/plans")
    const data = await res.json()
    setPlans(data.map((p: Plan) => ({
      ...p, progress: p.amountNeeded > 0 ? Math.round((p.amountSaved / p.amountNeeded) * 100) : 0,
    })))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    await fetch("/api/plans", { method: "POST", body: JSON.stringify(form) })
    setOpen(false)
    setForm({ name: "", description: "", category: "general", amountNeeded: "", amountSaved: "0", monthlyContribution: "", deadline: "", notes: "" })
    loadData()
  }

  const handleExport = async () => {
    const res = await fetch(`/api/export?type=plans&format=xlsx`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "plans-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Plans</h1>
          <p className="text-muted-foreground">Plan your major financial goals with actionable steps</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Plan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Financial Plan</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Plan Name</label>
                  <Input placeholder="e.g. Buy a Car" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Describe your plan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="debt">Debt Repayment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Amount Needed (₹)</label>
                    <Input type="number" placeholder="0" value={form.amountNeeded} onChange={(e) => setForm({ ...form, amountNeeded: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Already Saved (₹)</label>
                    <Input type="number" placeholder="0" value={form.amountSaved} onChange={(e) => setForm({ ...form, amountSaved: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Monthly Contribution (₹)</label>
                  <Input type="number" placeholder="0" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Date</label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <Button onClick={handleSubmit}>Create Plan</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full"><CardGridSkeleton /></div>
        ) : (plans.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No plans yet. Create a financial plan!</div>
        ) : plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{plan.category}</Badge>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
              {plan.description && (
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{plan.progress}%</span>
              </div>
              <Progress value={plan.progress} className="h-2.5" />
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Saved</p>
                  <p className="font-semibold">{formatCurrency(plan.amountSaved)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Needed</p>
                  <p className="font-semibold">{formatCurrency(plan.amountNeeded)}</p>
                </div>
              </div>
              {plan.monthlyContribution && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="font-medium">{formatCurrency(plan.monthlyContribution)}</span>
                </div>
              )}
              {plan.deadline && (
                <p className="text-xs text-muted-foreground">Target: {formatDate(plan.deadline)}</p>
              )}
            </CardContent>
          </Card>
        )))}
      </div>
    </div>
  )
}
