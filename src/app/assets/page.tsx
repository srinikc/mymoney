"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import type { Asset } from "@/types"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import DatePicker from "@/components/ui/date-picker"
import { Plus, Home, Diamond, Wrench, Car, Building2, Layers, Pencil, Trash2 } from "lucide-react"
import { AdContainer } from "@/components/ads/ad-container"

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  property: { label: "Properties", icon: <Home className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500" },
  building: { label: "Buildings", icon: <Building2 className="h-4 w-4" />, color: "bg-indigo-500/10 text-indigo-500" },
  gold: { label: "Gold", icon: <Diamond className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-500" },
  silver: { label: "Silver", icon: <Diamond className="h-4 w-4" />, color: "bg-slate-500/10 text-slate-500" },
  precious_metals: { label: "Precious Metals", icon: <Diamond className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-500" },
  equipment: { label: "Equipment", icon: <Wrench className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-500" },
  vehicle: { label: "Vehicles", icon: <Car className="h-4 w-4" />, color: "bg-green-500/10 text-green-500" },
  other: { label: "Other", icon: <Layers className="h-4 w-4" />, color: "bg-gray-500/10 text-gray-500" },
}

const defaultForm = {
  name: "", type: "other", currentValue: "", purchasePrice: "", purchaseDate: "", quantity: "", unit: "", location: "", notes: "",
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })

  const loadData = async () => {
    const res = await fetch("/api/assets")
    let data: Asset[] = await res.json()
    data = data.map((a) => ({
      ...a,
      profitLoss: a.currentValue - (a.purchasePrice ?? a.currentValue),
      profitLossPercent: a.purchasePrice && a.purchasePrice > 0 ? Math.round(((a.currentValue - a.purchasePrice) / a.purchasePrice) * 100) : 0,
    }))
    setAssets(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = "Name is required"
    if (!form.currentValue || Number(form.currentValue) <= 0) errors.currentValue = "Valid value required"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    const body = { ...form }
    try {
      if (editAsset) {
        const res = await fetch("/api/assets", { method: "PUT", body: JSON.stringify({ id: editAsset.id, ...body }) })
        if (!res.ok) throw new Error("Update failed")
        toast.success("Asset updated")
      } else {
        const res = await fetch("/api/assets", { method: "POST", body: JSON.stringify(body) })
        if (!res.ok) throw new Error("Add failed")
        toast.success("Asset added")
      }
      if (editAsset) setOpen(false)
      else setShowAddForm(false)
      setEditAsset(null)
      setForm(defaultForm)
      setFormErrors({})
      loadData()
    } catch {
      toast.error("Failed to save asset")
    }
  }

  const handleEdit = (asset: Asset) => {
    setEditAsset(asset)
    setShowAddForm(false)
    setFormErrors({})
    setForm({
      name: asset.name,
      type: asset.type,
      currentValue: String(asset.currentValue),
      purchasePrice: asset.purchasePrice ? String(asset.purchasePrice) : "",
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
      quantity: asset.quantity ? String(asset.quantity) : "",
      unit: asset.unit || "",
      location: asset.location || "",
      notes: asset.notes || "",
    })
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Asset deleted")
        loadData()
      }
    } catch {
      toast.error("Failed to delete asset")
    }
  }

  const grouped = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    const key = categoryConfig[a.type] ? a.type : "other"
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalCost = assets.reduce((s, a) => s + (a.purchasePrice ?? a.currentValue), 0)
  const totalPL = totalValue - totalCost

  const renderAssetFields = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="text-sm font-medium">Name</label>
        <Input placeholder="e.g. 2BHK Flat" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors((prev) => ({ ...prev, name: "" })) }} className={formErrors.name ? "border-destructive" : ""} />
        {formErrors.name && <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">Type</label>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="property">Property</SelectItem>
            <SelectItem value="building">Building</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="precious_metals">Precious Metals</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Current Value (₹)</label>
        <Input type="number" placeholder="0" value={form.currentValue} onChange={(e) => { setForm({ ...form, currentValue: e.target.value }); setFormErrors((prev) => ({ ...prev, currentValue: "" })) }} className={formErrors.currentValue ? "border-destructive" : ""} />
        {formErrors.currentValue && <p className="mt-1 text-xs text-destructive">{formErrors.currentValue}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">Purchase Price (₹)</label>
        <Input type="number" placeholder="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Purchase Date</label>
        <DatePicker value={form.purchaseDate} onChange={(d) => setForm({ ...form, purchaseDate: d })} label="Purchase Date" />
      </div>
      <div>
        <label className="text-sm font-medium">Quantity</label>
        <Input type="number" placeholder="e.g. 100" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Unit</label>
        <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
          <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="grams">Grams</SelectItem>
            <SelectItem value="kg">Kilograms</SelectItem>
            <SelectItem value="sqft">Sq. Feet</SelectItem>
            <SelectItem value="carats">Carats</SelectItem>
            <SelectItem value="units">Units</SelectItem>
            <SelectItem value="tola">Tola</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value="owned" onValueChange={() => {}}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="owned">Owned</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="inherited">Inherited</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium">Location</label>
        <Input placeholder="e.g. Mumbai, Dadar" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium">Notes</label>
        <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Track properties, precious metals, equipment and valuables</p>
        </div>
        <Button onClick={() => { setEditAsset(null); setForm(defaultForm); setFormErrors({}); setShowAddForm((v) => !v) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>

      <AdContainer slotIdPrefix="assets" />


      {showAddForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Add Asset</CardTitle></CardHeader>
          <CardContent>
            {renderAssetFields()}
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={handleSubmit}><Plus className="mr-2 h-4 w-4" /> Add Asset</Button>
              <Button variant="ghost" onClick={() => { setShowAddForm(false); setForm(defaultForm); setFormErrors({}) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalValue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalCost)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Profit / Loss</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalPL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {totalPL >= 0 ? "+" : ""}{formatCurrency(totalPL)}
              <span className="ml-1 text-sm">
                ({totalCost > 0 ? `${totalPL >= 0 ? "+" : ""}${Math.round((totalPL / totalCost) * 100)}%` : "0%"})
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({assets.length})</TabsTrigger>
          {Object.entries(categoryConfig).map(([key, cfg]) => {
            const count = (grouped[key] || []).length
            if (count === 0) return null
            return <TabsTrigger key={key} value={key}>{cfg.label} ({count})</TabsTrigger>
          })}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {loading ? <CardGridSkeleton /> : renderGrid(assets, handleEdit, (id) => setConfirmDelete({ open: true, id }))}
        </TabsContent>
        {Object.entries(categoryConfig).map(([key]) => {
          const items = grouped[key] || []
          if (items.length === 0) return null
          return (
            <TabsContent key={key} value={key} className="mt-6">
              {renderGrid(items, handleEdit, (id) => setConfirmDelete({ open: true, id }))}
            </TabsContent>
          )
        })}
      </Tabs>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditAsset(null); setForm(defaultForm) } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Asset</DialogTitle></DialogHeader>
          {renderAssetFields()}
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleSubmit}>Update Asset</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setEditAsset(null); setForm(defaultForm); setFormErrors({}) }}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
        title="Delete this asset?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (confirmDelete.id) handleDelete(confirmDelete.id)
          setConfirmDelete({ open: false, id: null })
        }}
      />
    </div>
  )
}

function renderGrid(assets: Asset[], onEdit: (a: Asset) => void, onDelete: (id: number) => void) {
  if (assets.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No assets in this category.</div>
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => {
        const cfg = categoryConfig[asset.type] || categoryConfig.other
        const pl = (asset.profitLoss ?? 0)
        const plPct = (asset.profitLossPercent ?? 0)
        return (
          <Card key={asset.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${cfg.color}`}>{cfg.icon}</div>
                  <div>
                    <CardTitle className="text-base">{asset.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-[10px]">{asset.type.replace("_", " ")}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => onEdit(asset)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="rounded-md p-1 text-red-400 hover:bg-muted" onClick={() => onDelete(asset.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Value</span>
                <span className="font-bold">{formatCurrency(asset.currentValue)}</span>
              </div>
              {asset.purchasePrice != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price</span>
                  <span>{formatCurrency(asset.purchasePrice)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">P&L</span>
                <span className={`font-semibold ${pl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({plPct >= 0 ? "+" : ""}{plPct}%)
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {asset.quantity && <span>Qty: {asset.quantity}{asset.unit ? ` ${asset.unit}` : ""}</span>}
                {asset.location && <span>📍 {asset.location}</span>}
                {asset.purchaseDate && <span>Since {formatDate(asset.purchaseDate)}</span>}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
