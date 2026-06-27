"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency, formatDate } from "@/lib/utils"
import { MerchantsSkeleton } from "@/components/ui/page-skeleton"
import type { Category } from "@/types"
import { SaveAll, Loader2, CheckCircle2, AlertCircle, Upload, Store, Search, Edit3, Trash2 } from "lucide-react"

interface UnmappedMerchant {
  key: string
  count: number
  total: number
  categoryName: string
}

interface MerchantMapping {
  id: number
  merchantKey: string
  description: string | null
  expenseType: string | null
  subCategory: string | null
  person: string | null
  source: string
  updatedAt: string
}

type Tab = "unmapped" | "all"

export default function MerchantsPage() {
  const [tab, setTab] = useState<Tab>("unmapped")
  const [merchants, setMerchants] = useState<UnmappedMerchant[]>([])
  const [allMappings, setAllMappings] = useState<MerchantMapping[]>([])
  const [totalMappings, setTotalMappings] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)
  const [mappingUploading, setMappingUploading] = useState(false)
  const [editMapping, setEditMapping] = useState<MerchantMapping | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ expenseType: "", subCategory: "", person: "" })
  const [assignments, setAssignments] = useState<Record<string, { expenseType: string; subCategory: string; person: string }>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [dismissing, setDismissing] = useState(false)
  const [distinctSubCats, setDistinctSubCats] = useState<string[]>([])
  const [distinctPersons, setDistinctPersons] = useState<string[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadLastUpdated = async () => {
    try {
      const tsRes = await fetch("/api/merchants/latest-timestamp").then(r => r.json())
      setLastUpdated(tsRes.latestUpdatedAt ? new Date(tsRes.latestUpdatedAt) : null)
    } catch { setLastUpdated(new Date()) }
  }

  const loadUnmapped = async () => {
    const [mData, cats, expData] = await Promise.all([
      fetch("/api/merchants/unmapped").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/expenses?pageSize=1").then((r) => r.json()).catch(() => ({})),
    ])
    setMerchants(mData.merchants || [])
    setCategories(cats)
    setDistinctSubCats(expData.distinctSubCategories || [])
    setDistinctPersons(expData.distinctPersons || [])
  }

  const loadAll = async () => {
    const data = await fetch("/api/merchants/all").then((r) => r.json())
    setAllMappings(data.mappings || [])
    setTotalMappings(data.total || 0)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadUnmapped(), loadAll()]).then(() => setLoading(false))
    loadLastUpdated()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      // Merge assigned mappings with selected-but-unassigned (empty placeholder)
      const assigned = new Set(Object.keys(assignments))
      const mappings = [
        ...Object.entries(assignments).map(([key, val]) => ({
          merchantKey: key,
          ...val,
        })),
        ...Array.from(selectedKeys).filter((k) => !assigned.has(k)).map((key) => ({
          merchantKey: key,
        })),
      ]
      if (mappings.length === 0) { setSaving(false); return }
      const res = await fetch("/api/merchants/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      })
      const data = await res.json()
      setSaveResult(data.success ? `Saved ${data.created} new + ${data.updated} updated mappings!` : "Save failed")
      if (data.success) {
        setAssignments({})
        setSelectedKeys(new Set())
        await Promise.all([loadUnmapped(), loadAll()])
        await loadLastUpdated()
      }
    } catch (err) {
      setSaveResult("Error: " + String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMappingUploading(true)
    setSaveResult(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/import/mappings", { method: "POST", body: fd })
      const data = await res.json()
      setSaveResult(data.success ? `GPay mappings: ${data.message}` : data.error || "Upload failed")
      if (data.success) {
        await Promise.all([loadUnmapped(), loadAll()])
        await loadLastUpdated()
      }
    } catch (err) {
      setSaveResult("Error: " + String(err))
    } finally { setMappingUploading(false); e.target.value = "" }
  }

  const handleEditSave = async () => {
    if (!editMapping) return
    await fetch(`/api/merchants/${editMapping.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditOpen(false)
    setEditMapping(null)
    await loadAll()
    await loadLastUpdated()
  }

  const openEdit = (m: MerchantMapping) => {
    setEditMapping(m)
    setEditForm({ expenseType: m.expenseType || "", subCategory: m.subCategory || "", person: m.person || "" })
    setEditOpen(true)
  }

  const setAssignment = (key: string, field: "expenseType" | "subCategory" | "person", value: string) => {
    setAssignments((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedKeys.size === merchants.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(merchants.map((m) => m.key)))
    }
  }

  const handleDismissSelected = async () => {
    if (selectedKeys.size === 0) return
    setDismissing(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/merchants/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(selectedKeys) }),
      })
      const data = await res.json()
      setSaveResult(data.success ? `Dismissed ${data.dismissed} merchants from Unmapped` : data.error || "Dismiss failed")
      if (data.success) {
        setSelectedKeys(new Set())
        await Promise.all([loadUnmapped(), loadAll()])
        await loadLastUpdated()
      }
    } catch (err) {
      setSaveResult("Error: " + String(err))
    } finally {
      setDismissing(false)
    }
  }

  const filteredMappings = searchTerm
    ? allMappings.filter((m) =>
        m.merchantKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.expenseType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allMappings

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Merchants</h1>
          <p className="text-muted-foreground">
            {totalMappings} mapped merchants &middot; {merchants.length} unmapped
          </p>
          {lastUpdated && (
            <p className="text-[11px] text-muted-foreground/60">
              Last updated: {formatDate(lastUpdated)} {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <label className="cursor-pointer">
          <Button variant="outline" disabled={mappingUploading} asChild>
            <span>
              {mappingUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Merchant Mappings
            </span>
          </Button>
          <input type="file" accept=".xlsm,.xlsx,.xls" className="hidden" onChange={handleMappingUpload} />
        </label>
        {tab === "unmapped" && (
          <>
            <Button variant="destructive" size="sm" onClick={handleDismissSelected}
              disabled={dismissing || selectedKeys.size === 0}>
              {dismissing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Dismiss ({selectedKeys.size})
            </Button>
            <Button onClick={handleSave} disabled={saving || (Object.keys(assignments).length === 0 && selectedKeys.size === 0)}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveAll className="mr-2 h-4 w-4" />}
              Save Mappings ({Object.keys(assignments).length + selectedKeys.size})
            </Button>
          </>
        )}
      </div>

      {saveResult && (
        <Card className={saveResult.includes("Error") ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <CardContent className="flex items-center gap-2 py-2 text-sm">
            {saveResult.includes("Error") ? <AlertCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            {saveResult}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("unmapped")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "unmapped" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Unmapped ({merchants.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Mappings ({totalMappings})
        </button>
      </div>

      {tab === "unmapped" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unmapped Merchants</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4"><MerchantsSkeleton /></div>
            ) : merchants.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                All merchants are mapped! No pending review items.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-3 w-10">
                        <Checkbox
                          checked={merchants.length > 0 && selectedKeys.size === merchants.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-3 py-3">Merchant Name</th>
                      <th className="px-3 py-3 text-right">Frequency</th>
                      <th className="px-3 py-3 text-right">Total Spend</th>
                      <th className="px-3 py-3">Current Cat</th>
                      <th className="px-3 py-3">Expense Type</th>
                      <th className="px-3 py-3">Sub Category</th>
                      <th className="px-3 py-3">Person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchants.map((m) => (
                      <tr key={m.key} className={`border-b transition-colors hover:bg-muted/30 text-sm ${selectedKeys.has(m.key) ? "bg-primary/5" : ""}`}>
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={selectedKeys.has(m.key)}
                            onCheckedChange={() => toggleSelect(m.key)}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium">{m.key}</td>
                        <td className="px-3 py-2.5 text-right">{m.count}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(m.total)}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px]">{m.categoryName || "—"}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Select value={assignments[m.key]?.expenseType || ""}
                            onValueChange={(v) => setAssignment(m.key, "expenseType", v)}>
                            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input list="um-subcat" className="h-8 text-xs w-24 rounded border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={assignments[m.key]?.subCategory || ""}
                            onChange={(e) => setAssignment(m.key, "subCategory", e.target.value)}
                            placeholder="e.g. hotel" />
                        </td>
                        <td className="px-3 py-2.5">
                          <input list="um-person" className="h-8 text-xs w-20 rounded border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={assignments[m.key]?.person || ""}
                            onChange={(e) => setAssignment(m.key, "person", e.target.value)}
                            placeholder="Family" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Merchant Mappings</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search mappings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4"><MerchantsSkeleton /></div>
            ) : filteredMappings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {searchTerm ? "No mappings match your search." : "No merchant mappings yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-3">Key</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Sub</th>
                      <th className="px-3 py-3">Person</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Updated</th>
                      <th className="px-3 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className="border-b transition-colors hover:bg-muted/30 text-sm">
                        <td className="px-3 py-2.5 font-medium">{m.merchantKey}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{m.description || "—"}</td>
                        <td className="px-3 py-2.5">{m.expenseType || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.subCategory || "—"}</td>
                        <td className="px-3 py-2.5">{m.person || "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px]">{m.source}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                          {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") + " " + new Date(m.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(m)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Mapping Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Mapping: {editMapping?.merchantKey}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Expense Type</label>
              <Select value={editForm.expenseType} onValueChange={(v) => setEditForm({ ...editForm, expenseType: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Sub Category</label>
              <Input value={editForm.subCategory} onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })} placeholder="e.g. hotel" />
            </div>
            <div>
              <label className="text-sm font-medium">Person</label>
              <Input value={editForm.person} onChange={(e) => setEditForm({ ...editForm, person: e.target.value })} placeholder="e.g. Family" />
            </div>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <datalist id="um-subcat">
        {distinctSubCats.map((s) => <option key={s} value={s} />)}
      </datalist>
      <datalist id="um-person">
        {distinctPersons.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  )
}
