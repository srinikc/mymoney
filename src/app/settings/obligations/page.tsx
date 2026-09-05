"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Save, Loader2, Plus, Trash2, HandCoins, HelpCircle } from "lucide-react"

const OBLIGATION_TYPES = ["parents_support", "sibling_support", "charity", "emi_commitment", "other"] as const

interface Obligation {
  id: number
  type: string
  description: string
  monthlyAmount: number
  annualAmount: number | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  notes: string | null
}

export default function ObligationsSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    type: "parents_support",
    description: "",
    monthlyAmount: "",
    notes: "",
  })
  const [showHelp, setShowHelp] = useState(false)

  const sessionProfileId = (session?.user as unknown as { profileId?: number } | undefined)?.profileId

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) { router.push("/login"); return }
    if (!sessionProfileId) return
    void load()
  }, [status, session, sessionProfileId, router])

  async function load() {
    if (!sessionProfileId) return
    setLoading(true)
    try {
      const res = await fetch("/api/retirement/obligations")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setObligations(data)
    } catch {
      toast.error("Failed to load obligations")
    } finally {
      setLoading(false)
    }
  }

  function startAdd() {
    setEditingId(null)
    setForm({ type: "parents_support", description: "", monthlyAmount: "", notes: "" })
  }

  function startEdit(o: Obligation) {
    setEditingId(o.id)
    setForm({
      type: o.type,
      description: o.description,
      monthlyAmount: String(o.monthlyAmount),
      notes: o.notes || "",
    })
  }

  async function handleSave() {
    if (!form.description.trim()) { toast.error("Description is required"); return }
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0) { toast.error("Monthly amount is required"); return }
    setSaving(true)
    try {
      const payload = {
        type: form.type,
        description: form.description.trim(),
        monthlyAmount: Number(form.monthlyAmount),
        notes: form.notes || null,
      }
      const url = editingId ? `/api/retirement/obligations/${editingId}` : "/api/retirement/obligations"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Save failed")
      toast.success(editingId ? "Updated" : "Added")
      setEditingId(null)
      setForm({ type: "parents_support", description: "", monthlyAmount: "", notes: "" })
      await load()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this obligation?")) return
    try {
      const res = await fetch(`/api/retirement/obligations/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Removed")
      await load()
    } catch {
      toast.error("Failed to remove")
    }
  }

  function getTypeLabel(t: string) {
    const labels: Record<string, string> = {
      parents_support: "Parents Support",
      sibling_support: "Sibling Support",
      charity: "Charity/Donations",
      emi_commitment: "EMI Commitment",
      other: "Other",
    }
    return labels[t] || t
  }

  const totalMonthly = obligations.filter((o) => o.isActive).reduce((s, o) => s + o.monthlyAmount, 0)
  const totalAnnual = obligations.filter((o) => o.isActive).reduce((s, o) => s + (o.annualAmount || o.monthlyAmount * 12), 0)
  const isEditing = editingId !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Obligations</h1>
          <p className="text-muted-foreground">Recurring commitments beyond regular expenses</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowHelp(!showHelp)}>
          <HelpCircle className="h-4 w-4 mr-1" /> Help
        </Button>
      </div>

      {showHelp && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">What are obligations?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Parents support:</strong> Monthly ₹ sent to parents (continues into retirement)</li>
              <li><strong>Sibling support:</strong> Financial help to siblings</li>
              <li><strong>Charity/Donations:</strong> Regular donations to causes</li>
              <li><strong>EMI commitments:</strong> Committed payments beyond standard loans</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">These are factored into your retirement expense calculations. Unlike expenses (tracked automatically), obligations are commitments you specify manually.</p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {obligations.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex gap-6 text-sm">
              <div><span className="text-muted-foreground">Monthly Total:</span> <span className="font-semibold">₹{totalMonthly.toLocaleString("en-IN")}</span></div>
              <div><span className="text-muted-foreground">Annual Total:</span> <span className="font-semibold">₹{totalAnnual.toLocaleString("en-IN")}</span></div>
              <div><span className="text-muted-foreground">Active:</span> <span className="font-semibold">{obligations.filter((o) => o.isActive).length}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Obligations */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : obligations.length === 0 && !isEditing ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <HandCoins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No obligations added yet</p>
            <Button onClick={startAdd}><Plus className="h-4 w-4 mr-2" /> Add Obligation</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {obligations.map((o) => (
              <Card key={o.id} className={editingId === o.id ? "border-primary" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">{o.description}</div>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{getTypeLabel(o.type)}</span>
                      {!o.isActive && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold">₹{o.monthlyAmount.toLocaleString("en-IN")}/mo</div>
                        <div className="text-xs text-muted-foreground">₹{(o.annualAmount || o.monthlyAmount * 12).toLocaleString("en-IN")}/yr</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(o)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(o.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!isEditing && <Button onClick={startAdd}><Plus className="h-4 w-4 mr-2" /> Add Another</Button>}
        </>
      )}

      {/* Add/Edit Form */}
      {isEditing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Edit" : "Add"} Obligation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_TYPES.map((t) => <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description *</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g., Monthly support to parents" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Monthly Amount (₹) *</Label>
                <Input type="number" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} placeholder="e.g., 15000" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? "Update" : "Add"} Obligation
              </Button>
              <Button variant="outline" onClick={() => { setEditingId(null); startAdd() }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
