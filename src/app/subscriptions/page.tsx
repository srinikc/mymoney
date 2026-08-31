"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import type { Subscription } from "@/types"
import { toast } from "sonner"
import { Plus, CreditCard, Bell, MoreHorizontal } from "lucide-react"

function calcDaysUntilDue(dateStr: string | null): number | undefined {
  if (!dateStr) return undefined
  const due = new Date(dateStr)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function calcNextBillingDate(dueDate: string | null, cycle: string): string | null {
  if (!dueDate) return null
  const date = new Date(dueDate)
  const now = new Date()
  while (date.getTime() <= now.getTime()) {
    switch (cycle) {
      case "weekly": date.setDate(date.getDate() + 7); break
      case "monthly": date.setMonth(date.getMonth() + 1); break
      case "quarterly": date.setMonth(date.getMonth() + 3); break
      case "yearly": date.setFullYear(date.getFullYear() + 1); break
      default: return null
    }
  }
  return date.toISOString()
}

const defaultForm = {
  name: "", provider: "", amount: "", billingCycle: "monthly", nextDueDate: "", category: "entertainment", notes: "",
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const loadData = async () => {
    const res = await fetch("/api/subscriptions")
    let data: Subscription[] = await res.json()
    data = data.map((s) => ({
      ...s,
      daysUntilDue: calcDaysUntilDue(s.nextDueDate),
      nextBillingDate: calcNextBillingDate(s.nextDueDate, s.billingCycle),
    }))
    setSubscriptions(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/subscriptions", { method: "POST", body: JSON.stringify(form) })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add subscription")
      toast.success("Subscription added")
      setShowAddForm(false)
      setForm(defaultForm)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add subscription")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subscription?")) return
    try {
      const res = await fetch(`/api/subscriptions?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete subscription")
      toast.success("Subscription deleted")
      loadData()
    } catch {
      toast.error("Failed to delete subscription")
    }
  }

  const handleToggleStatus = async (sub: Subscription) => {
    const newStatus = sub.status === "active" ? "paused" : "active"
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sub.id, status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update subscription")
      toast.success(`Subscription ${newStatus === "active" ? "activated" : "paused"}`)
      loadData()
    } catch {
      toast.error("Failed to update subscription")
    }
  }

  const totalMonthly = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => {
      const monthly = s.billingCycle === "yearly" ? s.amount / 12
        : s.billingCycle === "quarterly" ? s.amount / 3
        : s.billingCycle === "weekly" ? s.amount * 4.33
        : s.amount
      return sum + monthly
    }, 0)

  const dueSoon = subscriptions.filter(
    (s) => s.status === "active" && s.daysUntilDue !== undefined && s.daysUntilDue >= 0 && s.daysUntilDue <= 7
  )

  const categoryColors: Record<string, string> = {
    entertainment: "bg-purple-500/10 text-purple-500",
    productivity: "bg-blue-500/10 text-blue-500",
    utilities: "bg-orange-500/10 text-orange-500",
    health: "bg-green-500/10 text-green-500",
    other: "bg-gray-500/10 text-gray-500",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">Manage OTT, apps and other recurring subscriptions</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setShowAddForm((v) => !v) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Subscription
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Add Subscription</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Subscription Name</label>
                <Input placeholder="e.g. Netflix" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Provider</label>
                <Input placeholder="e.g. Netflix Inc." value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Amount (₹)</label>
                <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Billing Cycle</label>
                <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Next Due Date</label>
                <Input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entertainment">Entertainment (OTT, Music)</SelectItem>
                    <SelectItem value="productivity">Productivity (Apps, SaaS)</SelectItem>
                    <SelectItem value="utilities">Utilities (Internet, Phone)</SelectItem>
                    <SelectItem value="health">Health (Gym, Wellness)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={handleSubmit}><Plus className="mr-2 h-4 w-4" /> Add Subscription</Button>
              <Button variant="ghost" onClick={() => { setShowAddForm(false); setForm(defaultForm) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dueSoon.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Bell className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {dueSoon.length} subscription{dueSoon.length > 1 ? "s" : ""} due within 7 days
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                {dueSoon.map((s) => `${s.name} (${s.daysUntilDue === 0 ? "today" : `${s.daysUntilDue} day${s.daysUntilDue === 1 ? "" : "s"}`})`).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Subscriptions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{subscriptions.filter((s) => s.status === "active").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monthly Spend</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalMonthly)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Yearly Spend</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalMonthly * 12)}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full"><CardGridSkeleton /></div>
        ) : (subscriptions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No subscriptions yet. Add your first OTT or app subscription!
          </div>
        ) : subscriptions.map((sub) => {
          const daysLeft = sub.daysUntilDue
          const isDueSoon = daysLeft !== undefined && daysLeft >= 0 && daysLeft <= 7
          const isOverdue = daysLeft !== undefined && daysLeft < 0
          const catColor = categoryColors[sub.category] || categoryColors.other

          return (
            <Card key={sub.id} className={`${sub.status === "paused" ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${catColor}`}>
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{sub.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{sub.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={`cursor-pointer ${sub.status === "active" ? "border-green-500 text-green-500" : "border-amber-500 text-amber-500"}`}
                      onClick={() => handleToggleStatus(sub)}
                    >
                      {sub.status}
                    </Badge>
                    <button
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => handleDelete(sub.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{formatCurrency(sub.amount)}</span>
                  <span className="text-xs text-muted-foreground capitalize">/ {sub.billingCycle}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="text-[10px] capitalize">{sub.category}</Badge>
                  {sub.nextDueDate && (
                    <span className={`${isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-muted-foreground"}`}>
                      {isOverdue
                        ? `${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) === 1 ? "" : "s"} overdue`
                        : isDueSoon
                          ? daysLeft === 0 ? "Due today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                          : `Next: ${formatDate(sub.nextDueDate)}`}
                    </span>
                  )}
                </div>
                {sub.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{sub.notes}</p>
                )}
              </CardContent>
            </Card>
          )
        }))}
      </div>
    </div>
  )
}
