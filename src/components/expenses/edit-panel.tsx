"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Expense, Category } from "@/types"

interface EditPanelProps {
  expense: Expense | null
  open: boolean
  onClose: () => void
  onSave: (expense: Expense) => void
  categories: Category[]
}

export function EditPanel({ expense, open, onClose, onSave, categories }: EditPanelProps) {
  const [form, setForm] = useState({
    date: "",
    amount: "",
    categoryId: "",
    subCategory: "",
    person: "",
    vendor: "",
    description: "",
    paymentMode: "",
    recurrenceType: "onetime",
    otherType: "",
    tags: "",
    notes: "",
    bankAccount: "",
    saveMapping: false,
  })
  const [saving, setSaving] = useState(false)
  const [vendorMappings, setVendorMappings] = useState<Array<{ vendorKey: string; category: string; subCategory: string; person: string }>>([])

  useEffect(() => {
    if (expense) {
      setForm({
        date: new Date(expense.date).toISOString().split("T")[0],
        amount: String(expense.amount),
        categoryId: String(expense.categoryId),
        subCategory: expense.subCategory || "",
        person: expense.person || "",
        vendor: expense.vendor || "",
        description: expense.description || "",
        paymentMode: expense.paymentMode || "UPI",
        recurrenceType: expense.recurrenceType || "onetime",
        otherType: expense.otherType || "",
        tags: expense.tags || "",
        notes: expense.notes || "",
        bankAccount: expense.bankAccount || "",
        saveMapping: false,
      })
    }
  }, [expense])

  // Fetch subcategories/persons suggestions from vendor mappings
  useEffect(() => {
    if (form.vendor) {
      const key = form.vendor.toLowerCase().trim()
      fetch(`/api/vendors/search?q=${encodeURIComponent(key)}`)
        .then((r) => r.json())
        .then((data) => setVendorMappings(data.results || []))
        .catch(() => {})
    }
  }, [form.vendor])

  const handleSave = async () => {
    if (!expense) return
    setSaving(true)
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number.parseFloat(form.amount),
          categoryId: Number.parseInt(form.categoryId),
          saveMapping: form.saveMapping,
        }),
      })
      const updated = await res.json()
      onSave(updated)
      onClose()
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setSaving(false)
    }
  }

  if (!expense) return null

  const selectedCat = categories.find((c) => String(c.id) === form.categoryId)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update expense details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount (₹)</label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Vendor</label>
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            {vendorMappings.length > 0 && form.vendor && (
              <div className="mt-1 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                Known mappings: {vendorMappings.map((m) => `${m.vendorKey} → ${m.category}${m.subCategory ? "/" + m.subCategory : ""}`).join(", ")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sub Category</label>
              <Input value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} placeholder="e.g. hotel, fruits" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Person</label>
              <Input value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} placeholder="Family, Seenu, ..." />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
              <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recurrence</label>
              <Select value={form.recurrenceType} onValueChange={(v) => setForm({ ...form, recurrenceType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onetime">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="comma-separated: emergency, tax-deductible" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/20">
            <input
              type="checkbox"
              id="saveMapping"
              checked={form.saveMapping}
              onChange={(e) => setForm({ ...form, saveMapping: e.target.checked })}
              className="mt-1"
            />
            <label htmlFor="saveMapping" className="text-sm leading-tight cursor-pointer">
              <strong>Save as merchant mapping</strong>
              <p className="text-xs text-muted-foreground mt-0.5">
                This will associate &quot;<span className="font-medium">{form.vendor || "(empty)"}</span>&quot; with
                &quot;{selectedCat?.name || "?"}
                {form.subCategory ? ` / ${form.subCategory}` : ""}
                {form.person ? ` / ${form.person}` : ""}
                &quot; for future auto-categorization.
              </p>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
