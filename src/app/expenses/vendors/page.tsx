"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency, formatDate } from "@/lib/utils"
import { redirectToLogin } from "@/lib/api"
import { VendorsSkeleton } from "@/components/ui/page-skeleton"
import type { Category } from "@/types"
import { SaveAll, Loader2, CheckCircle2, AlertCircle, Upload, Search, Edit3, Trash2, RefreshCw } from "lucide-react"

interface UnmappedVendor {
  key: string
  count: number
  total: number
  categoryName: string
}

interface VendorMapping {
  id: number
  vendorKey: string
  description: string | null
  category: string | null
  subCategory: string | null
  person: string | null
  source: string
  updatedAt: string
}

type Tab = "unmapped" | "all"

export default function VendorsPage() {
  const [tab, setTab] = useState<Tab>("unmapped")
  const [vendors, setVendors] = useState<UnmappedVendor[]>([])
  const [totalUnmapped, setTotalUnmapped] = useState(0)
  const [allMappings, setAllMappings] = useState<VendorMapping[]>([])
  const [totalMappings, setTotalMappings] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)
  const [mappingUploading, setMappingUploading] = useState(false)
  const [editMapping, setEditMapping] = useState<VendorMapping | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ category: "", subCategory: "", person: "" })
  const [assignments, setAssignments] = useState<Record<string, { expenseType: string; subCategory: string; person: string }>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedMappingIds, setSelectedMappingIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [distinctSubCats, setDistinctSubCats] = useState<string[]>([])
  const [distinctPersons, setDistinctPersons] = useState<string[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [applying, setApplying] = useState(false)
  const [unmappedPage, setUnmappedPage] = useState(1)
  const [mappingsPage, setMappingsPage] = useState(1)
  const [searchNonce, setSearchNonce] = useState(0)
  const searchRef = useRef(searchTerm)
  searchRef.current = searchTerm
  const [unmappedSearch, setUnmappedSearch] = useState("")
  const unmappedSearchRef = useRef(unmappedSearch)
  unmappedSearchRef.current = unmappedSearch
  const [unmappedSearchNonce, setUnmappedSearchNonce] = useState(0)
  const PAGE_SIZE = 50

  const loadLastUpdated = async () => {
    try {
      const tsRes = await fetch("/api/vendors/latest-timestamp").then(r => r.json())
      setLastUpdated(tsRes.latestUpdatedAt ? new Date(tsRes.latestUpdatedAt) : null)
    } catch { setLastUpdated(new Date()) }
  }

  const loadUnmapped = async (page = 1, search = "") => {
    const [vData, cats, expData] = await Promise.all([
      fetch(`/api/vendors/unmapped?page=${page}&pageSize=${PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ""}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/expenses?pageSize=1").then((r) => r.json()).catch(() => ({})),
    ])
    setVendors(vData.merchants || [])
    setTotalUnmapped(vData.total || 0)
    setCategories(cats)
    setDistinctSubCats(expData.distinctSubCategories || [])
    setDistinctPersons(expData.distinctPersons || [])
  }

  const loadAll = async (page = 1, search = "") => {
    const data = await fetch(`/api/vendors/all?page=${page}&pageSize=${PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ""}`).then((r) => r.json())
    setAllMappings(data.vendors || [])
    setTotalMappings(data.total || 0)
  }

  const reload = async () => {
    await Promise.all([loadUnmapped(unmappedPage), loadAll(mappingsPage, searchTerm)])
    await loadLastUpdated()
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadUnmapped(), loadAll()]).then(() => setLoading(false))
    loadLastUpdated()
  }, [])

  // Debounced search for the All Mappings tab (reset to page 1 on change).
  useEffect(() => {
    const t = setTimeout(() => {
      setMappingsPage(1)
      setSearchNonce((n) => n + 1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Debounced search for the Unmapped tab (reset to page 1 on change).
  useEffect(() => {
    const t = setTimeout(() => {
      setUnmappedPage(1)
      setUnmappedSearchNonce((n) => n + 1)
    }, 300)
    return () => clearTimeout(t)
  }, [unmappedSearch])

  // Reload the active tab when its page changes.
  useEffect(() => {
    loadUnmapped(unmappedPage, unmappedSearchRef.current)
  }, [unmappedPage, unmappedSearchNonce])

  useEffect(() => {
    loadAll(mappingsPage, searchRef.current)
  }, [mappingsPage, searchNonce])

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      const assigned = new Set(Object.keys(assignments))
      const mappings = [
        ...Object.entries(assignments).map(([key, val]) => ({
          merchantKey: key,
          ...val,
        })),
        ...[...selectedKeys].filter((k) => !assigned.has(k)).map((key) => ({
          merchantKey: key,
        })),
      ]
      if (mappings.length === 0) { setSaving(false); return }
      const res = await fetch("/api/vendors/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      setSaveResult(data.success ? `Saved ${data.created} new + ${data.updated} updated mappings!` : "Save failed")
      if (data.success) {
        setAssignments({})
        setSelectedKeys(new Set())
        await reload()
      }
    } catch (error) {
      setSaveResult("Error: " + String(error))
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
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      setSaveResult(data.success ? `Vendor mappings: ${data.message}` : data.error || "Upload failed")
      if (data.success) {
        await reload()
      }
    } catch (error) {
      setSaveResult("Error: " + String(error))
    } finally { setMappingUploading(false); e.target.value = "" }
  }

  const handleEditSave = async () => {
    if (!editMapping) return
    const editRes = await fetch(`/api/vendors/${editMapping.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseType: editForm.category, subCategory: editForm.subCategory, person: editForm.person }),
    })
    if (editRes.status === 401) { redirectToLogin(); return }
    setEditOpen(false)
    setEditMapping(null)
    await reload()
  }

  // Applies all current vendor mappings to existing expenses (fills missing
  // category/subCategory/person on rows that are incomplete). Runs the same
  // endpoint regardless of tab.
  const handleApplyMappings = async () => {
    setApplying(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/vendors/apply-mappings", { method: "POST" })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      if (!res.ok) { setSaveResult("Apply failed: " + (data.error || "Unknown error")); return }
      setSaveResult(data.message || `Applied mappings to ${data.updated} expense row(s)`)
    } catch (error) {
      setSaveResult("Error: " + String(error))
    } finally {
      setApplying(false)
    }
  }

  const openEdit = (m: VendorMapping) => {
    setEditMapping(m)
    setEditForm({ category: m.category || "", subCategory: m.subCategory || "", person: m.person || "" })
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
    if (selectedKeys.size === vendors.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(vendors.map((m) => m.key)))
    }
  }

  const handleDismissSelected = async () => {
    if (selectedKeys.size === 0) return
    setDismissing(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/vendors/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [...selectedKeys] }),
      })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      setSaveResult(data.success ? `Dismissed ${data.dismissed} vendors from Unmapped` : data.error || "Dismiss failed")
      if (data.success) {
        setSelectedKeys(new Set())
        await reload()
      }
    } catch (error) {
      setSaveResult("Error: " + String(error))
    } finally {
      setDismissing(false)
    }
  }

  const handleDismissAll = async () => {
    if (totalUnmapped === 0) return
    if (!window.confirm(`Dismiss all ${totalUnmapped} unmapped vendors from the review list?`)) return
    setDismissing(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/vendors/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "unmapped" }),
      })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      setSaveResult(data.success ? `Dismissed all ${data.dismissed} unmapped vendors` : data.error || "Dismiss failed")
      if (data.success) {
        setSelectedKeys(new Set())
        await reload()
      }
    } catch (error) {
      setSaveResult("Error: " + String(error))
    } finally {
      setDismissing(false)
    }
  }

  // All Mappings selection + hard delete
  const toggleMappingSelect = (id: number) => {
    setSelectedMappingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleMappingSelectAll = () => {
    if (selectedMappingIds.size === filteredMappings.length && filteredMappings.length > 0) {
      setSelectedMappingIds(new Set())
    } else {
      setSelectedMappingIds(new Set(filteredMappings.map((m) => m.id)))
    }
  }

  const handleDeleteSelectedMappings = async () => {
    if (selectedMappingIds.size === 0) return
    if (!window.confirm(`Permanently delete ${selectedMappingIds.size} vendor mapping(s)?`)) return
    setDeleting(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/vendors/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedMappingIds] }),
      })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      setSaveResult(data.success ? `Deleted ${data.count} vendor mapping(s)` : data.error || "Delete failed")
      if (data.success) {
        setSelectedMappingIds(new Set())
        await reload()
      }
    } catch (error) {
      setSaveResult("Error: " + String(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAllMappings = async () => {
    if (!window.confirm("Permanently delete ALL vendor mappings for your account? This cannot be undone.")) return
    setDeleting(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/vendors/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      setSaveResult(data.success ? `Deleted ${data.count} vendor mapping(s)` : data.error || "Delete failed")
      if (data.success) {
        setSelectedMappingIds(new Set())
        await reload()
      }
    } catch (error) {
      setSaveResult("Error: " + String(error))
    } finally {
      setDeleting(false)
    }
  }

  const filteredMappings = allMappings

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            {totalMappings} mapped vendors &middot; {totalUnmapped} unmapped
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
              Vendor Mappings
            </span>
          </Button>
          <input type="file" accept=".xlsm,.xlsx,.xls" className="hidden" onChange={handleMappingUpload} />
        </label>
        {tab === "unmapped" && (
          <>
            <Button variant="destructive" size="sm" onClick={handleDismissAll}
              disabled={dismissing || totalUnmapped === 0}>
              {dismissing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Dismiss All ({totalUnmapped})
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDismissSelected}
              disabled={dismissing || selectedKeys.size === 0}>
              {dismissing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Dismiss Selected ({selectedKeys.size})
            </Button>
            <Button variant="outline" onClick={handleApplyMappings} disabled={applying} title="Applies vendor mappings to existing expenses.">
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Update Expense Page
            </Button>
            <Button onClick={handleSave} disabled={saving || (Object.keys(assignments).length === 0 && selectedKeys.size === 0)}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveAll className="mr-2 h-4 w-4" />}
              Save Mappings ({Object.keys(assignments).length + selectedKeys.size})
            </Button>
          </>
        )}
        {tab === "all" && (
          <>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelectedMappings}
              disabled={deleting || selectedMappingIds.size === 0}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected ({selectedMappingIds.size})
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAllMappings} disabled={deleting || allMappings.length === 0}>
              Delete All
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
          Unmapped ({totalUnmapped})
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Unmapped Vendors</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search unmapped vendors..."
                  value={unmappedSearch}
                  onChange={(e) => setUnmappedSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4"><VendorsSkeleton /></div>
            ) : (vendors.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                All vendors are mapped! No pending review items.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="px-3 py-3 w-10">
                          <Checkbox
                            checked={vendors.length > 0 && selectedKeys.size === vendors.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-3 py-3">Vendor Name</th>
                        <th className="px-3 py-3 text-right">Frequency</th>
                        <th className="px-3 py-3 text-right">Total Spend</th>
                        <th className="px-3 py-3">Current Cat</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Sub Category</th>
                      <th className="px-3 py-3">Person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((m) => (
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
              {totalUnmapped > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Showing {(unmappedPage - 1) * PAGE_SIZE + 1}&ndash;{Math.min(unmappedPage * PAGE_SIZE, totalUnmapped)} of {totalUnmapped}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled={unmappedPage <= 1} onClick={() => setUnmappedPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <span className="px-2 font-medium">{unmappedPage} / {Math.ceil(totalUnmapped / PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled={unmappedPage * PAGE_SIZE >= totalUnmapped} onClick={() => setUnmappedPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
              </>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Vendor Mappings</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4"><VendorsSkeleton /></div>
            ) : (filteredMappings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {searchTerm ? "No vendors match your search." : "No vendor mappings yet. Vendors are auto-learned from spreadsheet/GPay imports."}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="px-3 py-3 w-10">
                          <Checkbox
                            checked={filteredMappings.length > 0 && selectedMappingIds.size === filteredMappings.length}
                            onCheckedChange={toggleMappingSelectAll}
                          />
                      </th>
                      <th className="px-3 py-3">Vendor</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Sub</th>
                      <th className="px-3 py-3">Person</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Updated</th>
                      <th className="px-3 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className={`border-b transition-colors hover:bg-muted/30 text-sm ${selectedMappingIds.has(m.id) ? "bg-primary/5" : ""}`}>
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={selectedMappingIds.has(m.id)}
                            onCheckedChange={() => toggleMappingSelect(m.id)}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium">{m.description || m.vendorKey}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{m.description ? m.vendorKey : "—"}</td>
                        <td className="px-3 py-2.5">{m.category || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.subCategory || "—"}</td>
                        <td className="px-3 py-2.5">{m.person || "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px]">{(m as VendorMapping & { sourceLabel?: string }).sourceLabel || m.source}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                          {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll('/', "-") + " " + new Date(m.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
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
              {totalMappings > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Showing {(mappingsPage - 1) * PAGE_SIZE + 1}&ndash;{Math.min(mappingsPage * PAGE_SIZE, totalMappings)} of {totalMappings}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled={mappingsPage <= 1} onClick={() => setMappingsPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <span className="px-2 font-medium">{mappingsPage} / {Math.ceil(totalMappings / PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled={mappingsPage * PAGE_SIZE >= totalMappings} onClick={() => setMappingsPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
              </>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Mapping Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Mapping: {editMapping?.vendorKey}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
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
