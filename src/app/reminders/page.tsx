"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Category } from "@/types"
import { Plus, Bell, CheckCircle2, Trash2, ShoppingCart, Heart, Clock, Sparkles } from "lucide-react"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"

interface Reminder {
  id: number
  title: string
  description: string | null
  type: string
  priority: string
  dueDate: string | null
  amount: number | null
  categoryId: number | null
  category: Category | null
  merchantKey: string | null
  recurring: string
  isCompleted: boolean
  completedAt: string | null
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("upcoming")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", type: "custom", priority: "normal",
    dueDate: "", amount: "", categoryId: "", recurring: "none",
  })

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([
      fetch(`/api/reminders?type=${filter}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
    setReminders(r)
    setCategories(c)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setOpen(false)
    setForm({ title: "", description: "", type: "custom", priority: "normal", dueDate: "", amount: "", categoryId: "", recurring: "none" })
    load()
  }

  const handleToggle = async (r: Reminder) => {
    await fetch("/api/reminders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, isCompleted: !r.isCompleted }),
    })
    load()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" })
    load()
  }

  const handleAutoDetect = async () => {
    await fetch("/api/reminders/auto-detect", { method: "POST" })
    load()
  }

  const typeIcon: Record<string, React.ReactNode> = {
    bill: <Bell className="h-4 w-4" />,
    wishlist: <Heart className="h-4 w-4" />,
    tobuy: <ShoppingCart className="h-4 w-4" />,
    custom: <Clock className="h-4 w-4" />,
  }

  const priorityColor: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    normal: "bg-primary/10 text-primary border-primary/20",
    low: "bg-muted text-muted-foreground",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">Bills, wishlist, to-buy items and recurring expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoDetect}>
            <Sparkles className="mr-2 h-4 w-4" /> Auto-Detect
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Reminder</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Rent, Buy groceries..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="bill">Bill</SelectItem>
                        <SelectItem value="wishlist">Wishlist</SelectItem>
                        <SelectItem value="tobuy">To-Buy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount (₹)</label>
                    <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Recurring</label>
                    <Select value={form.recurring} onValueChange={(v) => setForm({ ...form, recurring: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate}>Create Reminder</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        {["upcoming", "completed", "all"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "upcoming" ? "Upcoming" : f === "completed" ? "Completed" : "All"}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full"><CardGridSkeleton /></div>
        ) : reminders.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            {filter === "upcoming" ? "No upcoming reminders. Add one or auto-detect from expenses!" : "No reminders found."}
          </div>
        ) : reminders.map((r) => (
          <Card key={r.id} className={r.isCompleted ? "opacity-50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {typeIcon[r.type] || <Bell className="h-4 w-4" />}
                  <div>
                    <CardTitle className="text-sm">{r.title}</CardTitle>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  </div>
                </div>
                <Badge className={`text-[10px] ${priorityColor[r.priority] || priorityColor.normal}`}>
                  {r.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="space-y-1">
                  {r.dueDate && <p>Due: {formatDate(r.dueDate)}</p>}
                  {r.amount && <p className="font-medium text-foreground">{formatCurrency(r.amount)}</p>}
                  {r.recurring !== "none" && <Badge variant="outline" className="text-[10px]">{r.recurring}</Badge>}
                  {r.category && <Badge variant="secondary" className="text-[10px]">{r.category.name}</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(r)}>
                    <CheckCircle2 className={`h-4 w-4 ${r.isCompleted ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
