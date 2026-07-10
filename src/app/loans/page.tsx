"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { toast } from "sonner"
import { TableSkeleton } from "@/components/ui/page-skeleton"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Plus,
  Pencil,
  Trash2,
  Landmark,
  Banknote,
  Activity,
} from "lucide-react"

interface Loan {
  id: number
  name: string
  type: string
  principal: number
  interestRate: number
  tenureMonths: number
  emiAmount: number
  lender: string | null
  startDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

const loanFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["Home", "Car", "Vehicle", "Electronics", "Equipment", "Other"]),
  principal: z.coerce.number().positive("Principal must be positive"),
  interestRate: z.coerce.number().min(0, "Interest rate must be 0 or more"),
  tenureMonths: z.coerce.number().int().positive("Tenure must be at least 1 month"),
  emiAmount: z.coerce.number().min(0).optional(),
  lender: z.string().optional().default(""),
  startDate: z.string().min(1, "Start date is required"),
  notes: z.string().optional().default(""),
})

type LoanFormValues = z.infer<typeof loanFormSchema>

const defaultFormValues: LoanFormValues = {
  name: "",
  type: "Other",
  principal: 0,
  interestRate: 0,
  tenureMonths: 1,
  emiAmount: 0,
  lender: "",
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
}

const typeLabels: Record<string, string> = {
  Home: "Home",
  Car: "Car",
  Vehicle: "Vehicle",
  Electronics: "Electronics",
  Equipment: "Equipment",
  Other: "Other",
}

function calculateEMI(principal: number, interestRate: number, tenureMonths: number): number {
  if (principal <= 0 || interestRate <= 0 || tenureMonths <= 0) return 0
  const r = interestRate / 100 / 12
  const n = tenureMonths
  const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
  return Math.round(emi * 100) / 100
}

function LoanFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Loan | null
  onSave: (data: LoanFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: defaultFormValues,
  })

  const principal = watch("principal")
  const interestRate = watch("interestRate")
  const tenureMonths = watch("tenureMonths")

  const autoEMI = calculateEMI(principal || 0, interestRate || 0, tenureMonths || 0)

  useEffect(() => {
    if (autoEMI > 0) {
      setValue("emiAmount", autoEMI)
    }
  }, [autoEMI, setValue])

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type as LoanFormValues["type"],
        principal: editing.principal,
        interestRate: editing.interestRate,
        tenureMonths: editing.tenureMonths,
        emiAmount: editing.emiAmount,
        lender: editing.lender || "",
        startDate: editing.startDate?.split("T")[0] ?? "",
        notes: editing.notes || "",
      })
    } else {
      reset(defaultFormValues)
    }
  }, [editing, reset, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Loan" : "Add Loan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Home Loan, Car Loan" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as LoanFormValues["type"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal">Principal (₹)</Label>
              <Input id="principal" type="number" step="0.01" {...register("principal")} placeholder="0" />
              {errors.principal && <p className="text-xs text-red-500">{errors.principal.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input id="interestRate" type="number" step="0.01" {...register("interestRate")} placeholder="0" />
              {errors.interestRate && <p className="text-xs text-red-500">{errors.interestRate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenureMonths">Tenure (Months)</Label>
              <Input id="tenureMonths" type="number" {...register("tenureMonths")} placeholder="12" />
              {errors.tenureMonths && <p className="text-xs text-red-500">{errors.tenureMonths.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emiAmount">Monthly EMI (₹)</Label>
              <Input
                id="emiAmount"
                type="number"
                step="0.01"
                {...register("emiAmount")}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated: {formatCurrency(autoEMI)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lender">Lender</Label>
              <Input id="lender" {...register("lender")} placeholder="Optional" />
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

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/loans")
      if (!res.ok) throw new Error("Failed to fetch loans")
      const data = await res.json()

      const loansList: Loan[] = Array.isArray(data) ? data : data.loans || data.data || []
      setLoans(loansList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (formData: LoanFormValues) => {
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        principal: formData.principal,
        interestRate: formData.interestRate,
        tenureMonths: formData.tenureMonths,
        startDate: formData.startDate,
        lender: formData.lender || null,
        notes: formData.notes || null,
      }

      const res = editingLoan
        ? await fetch(`/api/loans/${editingLoan.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/loans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save loan")
      }

      setDialogOpen(false)
      setEditingLoan(null)
      toast.success(editingLoan ? "Loan updated" : "Loan saved")
      setLoading(true)
      fetchData()
    } catch (err) {
      setDialogOpen(false)
      toast.error(err instanceof Error ? err.message : "Failed to save")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/loans/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to delete loan")
      }
      toast.success("Loan deleted")
      setLoans((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const openEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setDialogOpen(true)
  }

  const openAdd = () => {
    setEditingLoan(null)
    setDialogOpen(true)
  }

  const typeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Home: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      Car: "bg-green-500/10 text-green-600 dark:text-green-400",
      Vehicle: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      Electronics: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      Equipment: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
      Other: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    }
    return colors[type] || colors.Other
  }

  const totalPrincipal = loans.reduce((sum, l) => sum + l.principal, 0)
  const totalEMI = loans.reduce((sum, l) => sum + l.emiAmount, 0)
  const activeCount = loans.length

  if (error) {
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
            <p className="text-muted-foreground">Track and manage your loans</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Loan
          </Button>
        </div>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-red-600">
            <span>Failed to load loans: {error}</span>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchData() }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>

        <LoanFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingLoan(null)
          }}
          editing={editingLoan}
          onSave={handleSave}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">Track and manage your loans</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Loan
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
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</div>
                <p className="text-xs text-muted-foreground">Sum of all principals</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Monthly EMI</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalEMI)}</div>
                <p className="text-xs text-muted-foreground">Sum of all EMI amounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">Total loan count</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Loan List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loans.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Landmark className="mx-auto h-8 w-8 mb-3 opacity-50" />
                  <p>No loans yet. Add your first loan!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Principal</th>
                        <th className="px-4 py-3 text-right">Interest Rate</th>
                        <th className="px-4 py-3 text-right">EMI</th>
                        <th className="px-4 py-3 text-right">Tenure</th>
                        <th className="px-4 py-3">Lender</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr key={loan.id} className="border-b text-sm hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{loan.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeColor(loan.type)}`}>
                              {typeLabels[loan.type] || loan.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(loan.principal)}</td>
                          <td className="px-4 py-3 text-right">{loan.interestRate}%</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(loan.emiAmount)}</td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">{loan.tenureMonths} mo</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{loan.lender || "—"}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loan)}>
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
                                  <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {`Are you sure you want to delete "${loan.name}"? This action cannot be undone.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(loan.id)} className="bg-red-500 hover:bg-red-600">
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

      <LoanFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingLoan(null)
        }}
        editing={editingLoan}
        onSave={handleSave}
      />
    </div>
  )
}
