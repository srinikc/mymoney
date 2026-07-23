"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Goal, Investment } from "@/types"
import { Plus, Target, Download, Pencil, Trash2, TrendingUp } from "lucide-react"

const termOptions = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
] as const

const priorityOptions = [
  { value: "P0", label: "P0" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
] as const

const goalTypeOptions = [
  "Savings", "Investment", "Education", "Vehicle", "Property",
  "Travel", "Emergency", "Retirement", "Wedding", "Other",
]

const categoryOptions = [
  { value: "savings", label: "Savings" },
  { value: "emergency", label: "Emergency Fund" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "purchase", label: "Big Purchase" },
  { value: "retirement", label: "Retirement" },
  { value: "other", label: "Other" },
]

const goalFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  currentAmount: z.coerce.number().min(0).optional().default(0),
  deadline: z.string().optional().default(""),
  category: z.string().optional().default("savings"),
  term: z.string().optional().default("medium"),
  priority: z.string().optional().default("P1"),
  type: z.string().optional().default("Other"),
  description: z.string().optional().default(""),
  monthlyContribution: z.coerce.number().min(0).optional().nullable(),
})

type GoalFormValues = z.infer<typeof goalFormSchema>

const defaultFormValues: GoalFormValues = {
  name: "",
  targetAmount: 0,
  currentAmount: 0,
  deadline: "",
  category: "savings",
  term: "medium",
  priority: "P1",
  type: "Other",
  description: "",
  monthlyContribution: null,
}

function termBadgeClass(term: string) {
  const map: Record<string, string> = {
    short: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    long: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  }
  return map[term] || map.short
}

function priorityBadgeClass(priority: string) {
  const map: Record<string, string> = {
    P0: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    P1: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    P2: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  }
  return map[priority] || map.P1
}

function GoalFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Goal | null
  onSave: (data: GoalFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema) as any,
    defaultValues: defaultFormValues,
  })

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        targetAmount: editing.targetAmount,
        currentAmount: editing.currentAmount,
        deadline: editing.deadline ? editing.deadline.split("T")[0] : "",
        category: editing.category,
        term: editing.term || "medium",
        priority: editing.priority || "P1",
        type: editing.type || "Other",
        description: editing.description || "",
        monthlyContribution: editing.monthlyContribution,
      })
    } else {
      reset(defaultFormValues)
    }
  }, [editing, reset, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Goal" : "New Savings Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input id="name" placeholder="e.g. Emergency Fund" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount (₹)</Label>
              <Input id="targetAmount" type="number" placeholder="0" {...register("targetAmount")} />
              {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentAmount">Current Savings (₹)</Label>
              <Input id="currentAmount" type="number" placeholder="0" {...register("currentAmount")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Target Date</Label>
              <Input id="deadline" type="date" {...register("deadline")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={watch("term")} onValueChange={(v) => setValue("term", v)}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  {termOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                list="goalTypeOptions"
                placeholder="Select or type a type"
                {...register("type")}
              />
              <datalist id="goalTypeOptions">
                {goalTypeOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register("description")}
                className="flex h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe your goal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">Monthly Contribution (₹)</Label>
              <Input id="monthlyContribution" type="number" placeholder="0" {...register("monthlyContribution")} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editing ? "Update" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [goalsRes, invRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/investments"),
      ])
      if (!goalsRes.ok) throw new Error("Failed to fetch goals")
      const goalsData = await goalsRes.json()
      const invData = invRes.ok ? await invRes.json() : []
      setGoals(
        goalsData.map((g: Goal) => ({
          ...g,
          progress: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
        }))
      )
      setInvestments(Array.isArray(invData) ? invData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (formData: GoalFormValues) => {
    try {
      const payload = {
        ...formData,
        deadline: formData.deadline || undefined,
        monthlyContribution: formData.monthlyContribution || undefined,
      }
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals"
      const method = editingGoal ? "PUT" : "POST"
      if (editingGoal) (payload as Record<string, unknown>).id = editingGoal.id

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save goal")
      setDialogOpen(false)
      setEditingGoal(null)
      setLoading(true)
      loadData()
    } catch (err) {
      setDialogOpen(false)
      toast.error(err instanceof Error ? err.message : "Failed to save")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete goal")
      setGoals((prev) => prev.filter((g) => g.id !== id))
      toast.success("Goal deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export?type=goals&format=xlsx")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = "goals-export.xlsx"; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Export failed")
    }
  }

  const getLinkedInvestments = (goalId: number) =>
    investments.filter((inv) => inv.linkedGoalId === goalId)

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
          <Button onClick={() => { setEditingGoal(null); setDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-red-600">
            <span>Failed to load goals: {error}</span>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); loadData() }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-8 w-32 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <CardGridSkeleton />
        </>
      ) : (
        <>
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

          {goals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No goals yet. Create your first goal!
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => {
                const linked = getLinkedInvestments(goal.id)
                const linkedTotal = linked.reduce((s, inv) => s + inv.currentValue, 0)
                return (
                  <Card key={goal.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <CardTitle className="text-base">{goal.name}</CardTitle>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">{goal.category}</Badge>
                            <Badge className={`text-[10px] border ${termBadgeClass(goal.term)}`}>
                              {goal.term}
                            </Badge>
                            <Badge className={`text-[10px] border ${priorityBadgeClass(goal.priority)}`}>
                              {goal.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Target className="h-4 w-4" />
                          </div>
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
                      {goal.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
                      )}
                      {goal.monthlyContribution && goal.monthlyContribution > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Monthly Contribution: {formatCurrency(goal.monthlyContribution)}
                        </p>
                      )}
                      {linked.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Linked Investments: {formatCurrency(linkedTotal)} ({linked.length} investments)
                          </span>
                        </div>
                      )}
                      <div className="flex justify-end gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditingGoal(goal); setDialogOpen(true) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{goal.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(goal.id)} className="bg-red-500 hover:bg-red-600">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingGoal(null)
        }}
        editing={editingGoal}
        onSave={handleSave}
      />
    </div>
  )
}
