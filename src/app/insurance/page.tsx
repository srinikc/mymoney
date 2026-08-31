"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Shield,
  IndianRupee,
  Calendar,
  CheckCircle2,
} from "lucide-react"

interface InsurancePolicy {
  id: number
  name: string
  type: "health" | "term_life" | "motor" | "other"
  provider: string | null
  policyNumber: string | null
  sumAssured: number | null
  premium: number
  premiumFrequency: "monthly" | "quarterly" | "half_yearly" | "yearly"
  startDate: string
  renewalDate: string | null
  nominee: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface InsuranceSummary {
  totalPremium: number
  activeCount: number
  nextRenewal: string | null
}

const insuranceFormSchema = z.object({
  name: z.string().min(1, "Policy name is required"),
  type: z.enum(["health", "term_life", "motor", "other"]),
  provider: z.string().optional().default(""),
  policyNumber: z.string().optional().default(""),
  sumAssured: z.coerce.number().optional().default(0),
  premium: z.coerce.number().positive("Premium must be positive"),
  premiumFrequency: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]),
  startDate: z.string().min(1, "Start date is required"),
  renewalDate: z.string().optional().default(""),
  nominee: z.string().optional().default(""),
  notes: z.string().optional().default(""),
})

type InsuranceFormValues = z.infer<typeof insuranceFormSchema>

const defaultFormValues: InsuranceFormValues = {
  name: "",
  type: "health",
  provider: "",
  policyNumber: "",
  sumAssured: 0,
  premium: 0,
  premiumFrequency: "yearly",
  startDate: new Date().toISOString().split("T")[0],
  renewalDate: "",
  nominee: "",
  notes: "",
}

const typeLabels: Record<string, string> = {
  health: "Health",
  term_life: "Term Life",
  motor: "Motor",
  other: "Other",
}

const premiumFrequencyLabels: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
}

function getYearlyPremium(premium: number, frequency: string): number {
  switch (frequency) {
    case "monthly": return premium * 12
    case "quarterly": return premium * 4
    case "half_yearly": return premium * 2
    case "yearly": return premium
    default: return premium
  }
}

function InsuranceFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: InsurancePolicy | null
  onSave: (data: InsuranceFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InsuranceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(insuranceFormSchema) as any,
    defaultValues: defaultFormValues,
  })

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        provider: editing.provider || "",
        policyNumber: editing.policyNumber || "",
        sumAssured: editing.sumAssured || 0,
        premium: editing.premium,
        premiumFrequency: editing.premiumFrequency,
        startDate: editing.startDate?.split("T")[0] ?? "",
        renewalDate: editing.renewalDate?.split("T")[0] ?? "",
        nominee: editing.nominee || "",
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
          <DialogTitle>{editing ? "Edit Insurance Policy" : "Add Insurance Policy"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Policy Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. HDFC Life Click 2 Protect" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as InsuranceFormValues["type"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="term_life">Term Life</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input id="provider" {...register("provider")} placeholder="e.g. HDFC Life (optional)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyNumber">Policy Number</Label>
              <Input id="policyNumber" {...register("policyNumber")} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sumAssured">Sum Assured (₹)</Label>
              <Input id="sumAssured" type="number" step="0.01" {...register("sumAssured")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium">Premium (₹)</Label>
              <Input id="premium" type="number" step="0.01" {...register("premium")} placeholder="0" />
              {errors.premium && <p className="text-xs text-red-500">{errors.premium.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="premiumFrequency">Premium Frequency</Label>
              <Select value={watch("premiumFrequency")} onValueChange={(v) => setValue("premiumFrequency", v as InsuranceFormValues["premiumFrequency"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {errors.premiumFrequency && <p className="text-xs text-red-500">{errors.premiumFrequency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewalDate">Renewal Date</Label>
              <Input id="renewalDate" type="date" {...register("renewalDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nominee">Nominee</Label>
              <Input id="nominee" {...register("nominee")} placeholder="Optional" />
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

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [summary, setSummary] = useState<InsuranceSummary>({ totalPremium: 0, activeCount: 0, nextRenewal: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState("")
  const [addType, setAddType] = useState("health")
  const [addProvider, setAddProvider] = useState("")
  const [addPremium, setAddPremium] = useState("")
  const [addSumAssured, setAddSumAssured] = useState("")
  const [addRenewalDate, setAddRenewalDate] = useState("")
  const [addError, setAddError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/insurance")
      if (!res.ok) throw new Error("Failed to fetch insurance policies")
      const data = await res.json()

      const policiesList: InsurancePolicy[] = Array.isArray(data) ? data : []
      setPolicies(policiesList)

      const totalPremium = policiesList.reduce((sum, p) => {
        return sum + getYearlyPremium(p.premium, p.premiumFrequency)
      }, 0)

      const now = new Date()
      const active = policiesList.filter((p) => {
        if (!p.renewalDate) return true
        return new Date(p.renewalDate) >= now
      })

      const activeCount = active.length

      const sortedByRenewal = active
        .filter((p) => p.renewalDate)
        .sort((a, b) => new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime())

      const nextRenewal = sortedByRenewal.length > 0 ? sortedByRenewal[0].renewalDate : null

      setSummary({ totalPremium, activeCount, nextRenewal })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (formData: InsuranceFormValues) => {
    try {
      const payload = {
        ...formData,
        sumAssured: formData.sumAssured || null,
        provider: formData.provider || null,
        policyNumber: formData.policyNumber || null,
        renewalDate: formData.renewalDate || null,
        nominee: formData.nominee || null,
        notes: formData.notes || null,
      }

      let res: Response
      if (editingPolicy) {
        res = await fetch(`/api/insurance/${editingPolicy.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/insurance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save insurance policy")
      }

      setDialogOpen(false)
      setEditingPolicy(null)
      setLoading(true)
      fetchData()
      toast.success(editingPolicy ? "Policy updated" : "Policy saved")
    } catch (err) {
      setDialogOpen(false)
      toast.error(err instanceof Error ? err.message : "Failed to save")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/insurance/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete insurance policy")
      setPolicies((prev) => prev.filter((p) => p.id !== id))
      toast.success("Policy deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const openEdit = (policy: InsurancePolicy) => {
    setEditingPolicy(policy)
    setDialogOpen(true)
  }

  const openAdd = () => {
    setAdding(true)
    setAddName("")
    setAddType("health")
    setAddProvider("")
    setAddPremium("")
    setAddSumAssured("")
    setAddRenewalDate("")
    setAddError(null)
  }

  const cancelAdd = () => {
    setAdding(false)
    setAddName("")
    setAddType("health")
    setAddProvider("")
    setAddPremium("")
    setAddSumAssured("")
    setAddRenewalDate("")
    setAddError(null)
  }

  const addPremiumNum = parseFloat(addPremium)
  const addSumAssuredNum = parseFloat(addSumAssured)

  const handleAddInline = async () => {
    if (!addName.trim() || isNaN(addPremiumNum) || addPremiumNum <= 0) {
      setAddError("Policy name and premium are required")
      return
    }
    const payload = {
      name: addName.trim(),
      type: addType,
      provider: addProvider.trim() || null,
      policyNumber: null,
      sumAssured: isNaN(addSumAssuredNum) ? null : addSumAssuredNum,
      premium: addPremiumNum,
      premiumFrequency: "yearly",
      startDate: new Date().toISOString().split("T")[0],
      renewalDate: addRenewalDate || null,
      nominee: null,
      notes: null,
    }
    try {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save insurance policy")
      }
      setAdding(false)
      cancelAdd()
      setLoading(true)
      fetchData()
      toast.success("Policy saved")
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      health: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      term_life: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      motor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    }
    return colors[type] || colors.other
  }

  const filteredPolicies = typeFilter === "all"
    ? policies
    : policies.filter((p) => p.type === typeFilter)

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "health", label: "Health" },
    { key: "term_life", label: "Term Life" },
    { key: "motor", label: "Motor" },
    { key: "other", label: "Other" },
  ]

  if (error) {
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Insurance</h1>
            <p className="text-muted-foreground">Manage your insurance policies</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Insurance
          </Button>
        </div>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-red-600">
            <span>Failed to load insurance policies: {error}</span>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchData() }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>

        <InsuranceFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingPolicy(null)
          }}
          editing={editingPolicy}
          onSave={handleSave}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance</h1>
          <p className="text-muted-foreground">Manage your insurance policies</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Insurance
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
                <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalPremium)}</div>
                <p className="text-xs text-muted-foreground">Yearly equivalent premium</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.activeCount}</div>
                <p className="text-xs text-muted-foreground">Active insurance policies</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Next Renewal</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.nextRenewal ? formatDate(summary.nextRenewal) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">Earliest renewal date</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <Button
                key={tab.key}
                variant={typeFilter === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Insurance Policies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPolicies.length === 0 && !adding ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Shield className="mx-auto h-8 w-8 mb-3 opacity-50" />
                  <p>No insurance policies yet. Add your first!</p>
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground bg-background">
                        <th className="px-4 py-3">Policy Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3 text-right">Premium</th>
                        <th className="px-4 py-3 text-right">Sum Assured</th>
                        <th className="px-4 py-3">Renewal Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adding && (
                        <tr className="border-b bg-muted/30 text-sm">
                          <td className="px-4 py-3">
                            <Input name="name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Policy name" className="h-8 min-w-[140px]" />
                          </td>
                          <td className="px-4 py-3">
                            <Select value={addType} onValueChange={setAddType}>
                              <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="health">Health</SelectItem>
                                <SelectItem value="term_life">Term Life</SelectItem>
                                <SelectItem value="motor">Motor</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input value={addProvider} onChange={(e) => setAddProvider(e.target.value)} placeholder="Optional" className="h-8 min-w-[110px]" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Input name="premium" type="number" value={addPremium} onChange={(e) => setAddPremium(e.target.value)} placeholder="0" className="h-8 w-[100px] ml-auto text-right" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Input type="number" value={addSumAssured} onChange={(e) => setAddSumAssured(e.target.value)} placeholder="0" className="h-8 w-[100px] ml-auto text-right" />
                          </td>
                          <td className="px-4 py-3">
                            <Input type="date" value={addRenewalDate} onChange={(e) => setAddRenewalDate(e.target.value)} className="h-8 w-[150px]" />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {addError && <p className="text-xs text-red-500 mb-1">{addError}</p>}
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={cancelAdd}>Cancel</Button>
                              <Button size="sm" onClick={handleAddInline}>Add</Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {filteredPolicies.map((policy) => (
                        <tr key={policy.id} className="border-b text-sm hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{policy.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadge(policy.type)}`}>
                              {typeLabels[policy.type] || policy.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{policy.provider || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(policy.premium)}
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">
                              /{premiumFrequencyLabels[policy.premiumFrequency]?.toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs">
                            {policy.sumAssured ? formatCurrency(policy.sumAssured) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {policy.renewalDate ? formatDate(policy.renewalDate) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(policy)}>
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
                                  <AlertDialogTitle>Delete Insurance Policy</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {`Are you sure you want to delete "${policy.name}"? This action cannot be undone.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(policy.id)} className="bg-red-500 hover:bg-red-600">
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

      <InsuranceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingPolicy(null)
        }}
        editing={editingPolicy}
        onSave={handleSave}
      />
    </div>
  )
}
