"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
import { formatCurrency, formatDate } from "@/lib/utils"
import { TableSkeleton } from "@/components/ui/page-skeleton"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  Calendar,
  IndianRupee,
} from "lucide-react"

interface IncomeSource {
  id: number
  name: string
  type: "monthly" | "yearly" | "onetime" | "variable"
  amount: number
  sourceCategory: string
  paymentMode: string
  bankAccount: string | null
  startDate: string
  notes: string | null
  revenue: number | null
  businessExpenses: number | null
  otherExpensesDescription: string | null
  otherExpensesAmount: number | null
  investment: number | null
  profit: number | null
  isProfitPostTax: boolean | null
  createdAt: string
  updatedAt: string
}

interface IncomeSummary {
  totalMonthly: number
  totalYearly: number
  thisMonth: number
}

const incomeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["monthly", "yearly", "onetime", "variable"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  sourceCategory: z.enum(["Salary", "Rental", "FD Interest", "Business", "Other"]),
  paymentMode: z.enum(["Bank Transfer", "UPI", "Cash", "Cheque", "Other"]),
  bankAccount: z.string().optional().default(""),
  startDate: z.string().min(1, "Start date is required"),
  notes: z.string().optional().default(""),
  revenue: z.coerce.number().optional().default(0),
  businessExpenses: z.coerce.number().optional().default(0),
  otherExpensesDescription: z.string().optional().default(""),
  otherExpensesAmount: z.coerce.number().optional().default(0),
  investment: z.coerce.number().optional().default(0),
  profit: z.coerce.number().optional().default(0),
  isProfitPostTax: z.boolean().optional().default(false),
})

type IncomeFormValues = z.infer<typeof incomeFormSchema>

const defaultFormValues: IncomeFormValues = {
  name: "",
  type: "monthly",
  amount: 0,
  sourceCategory: "Salary",
  paymentMode: "Bank Transfer",
  bankAccount: "",
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
  revenue: 0,
  businessExpenses: 0,
  otherExpensesDescription: "",
  otherExpensesAmount: 0,
  investment: 0,
  profit: 0,
  isProfitPostTax: false,
}

const typeLabels: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  onetime: "One-Time",
  variable: "Variable",
}

function IncomeFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: IncomeSource | null
  onSave: (data: IncomeFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: defaultFormValues,
  })

  const sourceCategory = watch("sourceCategory")
  const revenue = watch("revenue")
  const businessExpenses = watch("businessExpenses")
  const otherExpensesAmount = watch("otherExpensesAmount")
  const profit = watch("profit")

  const autoCalculatedProfit = (revenue || 0) - (businessExpenses || 0) - (otherExpensesAmount || 0)

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        amount: editing.amount,
        sourceCategory: editing.sourceCategory as IncomeFormValues["sourceCategory"],
        paymentMode: editing.paymentMode as IncomeFormValues["paymentMode"],
        bankAccount: editing.bankAccount || "",
        startDate: editing.startDate.split("T")[0],
        notes: editing.notes || "",
        revenue: editing.revenue || 0,
        businessExpenses: editing.businessExpenses || 0,
        otherExpensesDescription: editing.otherExpensesDescription || "",
        otherExpensesAmount: editing.otherExpensesAmount || 0,
        investment: editing.investment || 0,
        profit: editing.profit || 0,
        isProfitPostTax: editing.isProfitPostTax || false,
      })
    } else {
      reset(defaultFormValues)
    }
  }, [editing, reset, open])

  const isBusiness = sourceCategory === "Business"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Income Source" : "Add Income Source"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Salary, Rent Income" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as IncomeFormValues["type"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="onetime">One-Time</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="0" />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceCategory">Source Category</Label>
              <Select value={watch("sourceCategory")} onValueChange={(v) => setValue("sourceCategory", v as IncomeFormValues["sourceCategory"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Rental">Rental</SelectItem>
                  <SelectItem value="FD Interest">FD Interest</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.sourceCategory && <p className="text-xs text-red-500">{errors.sourceCategory.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select value={watch("paymentMode")} onValueChange={(v) => setValue("paymentMode", v as IncomeFormValues["paymentMode"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMode && <p className="text-xs text-red-500">{errors.paymentMode.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input id="bankAccount" {...register("bankAccount")} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...register("notes")}
              className="flex h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional notes"
            />
          </div>

          {isBusiness && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
              <h4 className="text-sm font-semibold">Business Details</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="revenue">Revenue (₹)</Label>
                  <Input id="revenue" type="number" step="0.01" {...register("revenue")} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessExpenses">Business Expenses (₹)</Label>
                  <Input id="businessExpenses" type="number" step="0.01" {...register("businessExpenses")} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherExpensesDescription">Other Expenses Description</Label>
                  <Input id="otherExpensesDescription" {...register("otherExpensesDescription")} placeholder="Describe other expenses" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherExpensesAmount">Other Expenses Amount (₹)</Label>
                  <Input id="otherExpensesAmount" type="number" step="0.01" {...register("otherExpensesAmount")} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investment">Investment (₹)</Label>
                  <Input id="investment" type="number" step="0.01" {...register("investment")} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profit">Profit (₹)</Label>
                  <Input
                    id="profit"
                    type="number"
                    step="0.01"
                    {...register("profit")}
                    placeholder="0"
                    onFocus={(e) => {
                      if (!e.target.value || Number(e.target.value) === 0) {
                        setValue("profit", autoCalculatedProfit)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: Revenue − Business Expenses − Other Expenses = {formatCurrency(autoCalculatedProfit)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={watch("isProfitPostTax")}
                  onCheckedChange={(checked) => setValue("isProfitPostTax", checked === true)}
                />
                <Label className="text-sm cursor-pointer">Profit is post-tax</Label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function IncomePage() {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [summary, setSummary] = useState<IncomeSummary>({ totalMonthly: 0, totalYearly: 0, thisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/income/sources")
      if (!res.ok) throw new Error("Failed to fetch income sources")
      const data = await res.json()

      const sourcesList: IncomeSource[] = data.sources || data.data || data || []
      const src = Array.isArray(sourcesList) ? sourcesList : Array.isArray(data) ? data : []

      setSources(src)

      const totalMonthly = src
        .filter((s) => s.type === "monthly")
        .reduce((sum, s) => sum + s.amount, 0)

      const totalYearly =
        src
          .filter((s) => s.type === "yearly")
          .reduce((sum, s) => sum + s.amount, 0) +
        totalMonthly * 12 +
        src
          .filter((s) => s.type === "variable")
          .reduce((sum, s) => sum + s.amount, 0) * 12

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const thisMonth = src
        .filter((s) => {
          const start = new Date(s.startDate)
          if (start > now) return false
          if (s.type === "monthly") return true
          if (s.type === "yearly") {
            return start.getMonth() === currentMonth && start.getFullYear() === currentYear
          }
          if (s.type === "onetime") {
            return start.getMonth() === currentMonth && start.getFullYear() === currentYear
          }
          if (s.type === "variable") return true
          return false
        })
        .reduce((sum, s) => {
          if (s.type === "monthly" || s.type === "variable") return sum + s.amount
          return sum + s.amount
        }, 0)

      setSummary({ totalMonthly, totalYearly, thisMonth })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (formData: IncomeFormValues) => {
    try {
      const { sourceCategory, ...rest } = formData
      const categoryMap: Record<string, string> = {
        Salary: "Salary",
        Rental: "Rental",
        "FD Interest": "FD Interest",
        Business: "Business",
        Other: "Other",
      }
      const payload = {
        ...rest,
        categoryName: categoryMap[sourceCategory] || "Other",
        profit: sourceCategory === "Business" ? formData.profit : null,
      }

      const res = editingSource
        ? await fetch(`/api/income/sources/${editingSource.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, id: editingSource.id }),
          })
        : await fetch("/api/income/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save income source")
      }

      setDialogOpen(false)
      setEditingSource(null)
      setLoading(true)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/income/sources/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete income source")
      setSources((prev) => prev.filter((s) => s.id !== id))
      setLoading(true)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const openEdit = (source: IncomeSource) => {
    setEditingSource(source)
    setDialogOpen(true)
  }

  const openAdd = () => {
    setEditingSource(null)
    setDialogOpen(true)
  }

  const sourceCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      Salary: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      Rental: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      "FD Interest": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      Business: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      Other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    }
    return colors[cat] || colors.Other
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Income Sources</h1>
            <p className="text-muted-foreground">Track and manage your income</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Income
          </Button>
        </div>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-red-600">
            <span>Failed to load income sources: {error}</span>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchData() }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income Sources</h1>
          <p className="text-muted-foreground">Track and manage your income</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Income
        </Button>
      </div>

      {loading ? (
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
          <Card>
            <CardContent className="p-6">
              <TableSkeleton />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Monthly Income</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalMonthly)}</div>
                <p className="text-xs text-muted-foreground">Recurring monthly income</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Yearly Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalYearly)}</div>
                <p className="text-xs text-muted-foreground">Projected annual income</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.thisMonth)}</div>
                <p className="text-xs text-muted-foreground">Income for {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Income Sources</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sources.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Wallet className="mx-auto h-8 w-8 mb-3 opacity-50" />
                  <p>No income sources yet. Add your first source to start tracking!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Source Type</th>
                        <th className="px-4 py-3">Payment Mode</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((source) => (
                        <tr key={source.id} className="border-b text-sm hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{source.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px]">
                              {typeLabels[source.type] || source.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(source.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceCategoryBadge(source.sourceCategory)}`}>
                              {source.sourceCategory}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{source.paymentMode}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(source.startDate)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(source)}>
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
                                  <AlertDialogTitle>Delete Income Source</AlertDialogTitle>
                                  <AlertDialogDescription>
                                     {`Are you sure you want to delete "${source.name}"? This action cannot be undone.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(source.id)} className="bg-red-500 hover:bg-red-600">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <IncomeFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingSource(null)
        }}
        editing={editingSource}
        onSave={handleSave}
      />
    </div>
  )
}
