"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterBar } from "@/components/filters/filter-bar"
import { DriveDialog } from "@/components/expenses/drive-dialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TableSkeleton } from "@/components/ui/page-skeleton"
import type { Expense, Category } from "@/types"
import {
  Plus, Upload, Search, Download, FileSpreadsheet,
  Loader2, Cloud, LogOut, Edit3, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
} from "lucide-react"

interface DriveFile {
  id: string; name: string; size?: string; createdTime?: string
}

interface ImportSession {
  id: number; source: string; fileName: string | null; totalRows: number
  autoMapped: number; status: string; createdAt: string
}

interface PaginatedResponse {
  data: Expense[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  distinctPersons: string[]
  distinctRecurrenceTypes: string[]
  distinctPaymentModes: string[]
  distinctVendors: string[]
  distinctSubCategories: string[]
  distinctBankAccounts: string[]
  totalAmount: number
}

type SortField = "date" | "amount" | "vendor" | "person"
type SortDir = "asc" | "desc"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [importSessions, setImportSessions] = useState<ImportSession[]>([])
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [recurrenceFilter, setRecurrenceFilter] = useState("all")
  const [sessionFilter, setSessionFilter] = useState("")
  const [paymentModeFilter, setPaymentModeFilter] = useState("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [distinctPersons, setDistinctPersons] = useState<string[]>([])
  const [distinctRecurrenceTypes, setDistinctRecurrenceTypes] = useState<string[]>([])
  const [distinctPaymentModes, setDistinctPaymentModes] = useState<string[]>([])
  const [distinctVendors, setDistinctVendors] = useState<string[]>([])
  const [distinctSubCategories, setDistinctSubCategories] = useState<string[]>([])
  const [distinctBankAccounts, setDistinctBankAccounts] = useState<string[]>([])
  const [vendorFilter, setVendorFilter] = useState("")
  const [subCategoryFilter, setSubCategoryFilter] = useState("")
  const [bankFilter, setBankFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [datePreset, setDatePreset] = useState("all")
  const [totalAmount, setTotalAmount] = useState(0)
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [gdriveConnected, setGdriveConnected] = useState(false)
  const [gdriveEmail, setGdriveEmail] = useState("")
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [driveDialogOpen, setDriveDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<number, { categoryId: string; subCategory: string; person: string }>>({})
  const [driveImporting, setDriveImporting] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    categoryId: "",
    vendor: "",
    description: "",
    paymentMode: "UPI",
    notes: "",
  })

  const loadData = useCallback(async (targetPage?: number) => {
    const p = targetPage ?? page
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "100",
    })
    if (search) params.set("search", search)
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
    if (sessionFilter) params.set("importSessionId", sessionFilter)
    if (personFilter !== "all") params.set("person", personFilter)
    if (recurrenceFilter !== "all") params.set("recurrenceType", recurrenceFilter)
    if (paymentModeFilter !== "all") params.set("paymentMode", paymentModeFilter)
    if (vendorFilter) params.set("vendor", vendorFilter)
    if (subCategoryFilter) params.set("subCategory", subCategoryFilter)
    if (bankFilter) params.set("bankAccount", bankFilter)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (amountMin) params.set("amountMin", amountMin)
    if (amountMax) params.set("amountMax", amountMax)
    params.set("sortField", sortField)
    params.set("sortDir", sortDir)

    const [expRes, catRes] = await Promise.all([
      fetch(`/api/expenses?${params}`),
      fetch("/api/categories"),
    ])
    const result: PaginatedResponse = await expRes.json()
    setExpenses(result.data)
    setTotal(result.total)
    setPage(result.page)
    setTotalPages(result.totalPages)
    setDistinctPersons(result.distinctPersons)
    setDistinctRecurrenceTypes(result.distinctRecurrenceTypes)
    setDistinctPaymentModes(result.distinctPaymentModes || [])
    setDistinctVendors(result.distinctVendors || [])
    setDistinctSubCategories(result.distinctSubCategories || [])
    setDistinctBankAccounts(result.distinctBankAccounts || [])
    setTotalAmount(result.totalAmount || 0)
    setCategories(await catRes.json())
    setLoading(false)
  }, [search, categoryFilter, sessionFilter, personFilter, recurrenceFilter, paymentModeFilter, vendorFilter, subCategoryFilter, bankFilter, dateFrom, dateTo, amountMin, amountMax, sortField, sortDir, page, refreshKey])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(data => {
      if (data.connected) { setGdriveConnected(true); setGdriveEmail(data.email || "") }
    })
    fetch("/api/import-sessions").then(r => r.json()).then(setImportSessions)
    fetch("/api/expenses/flagged?pageSize=1").then(r => r.json()).then(d => setFlaggedCount(d.total || 0)).catch(() => {})
    const params = new URLSearchParams(window.location.search)
    const gdrive = params.get("gdrive")
    if (params.get("importSessionId")) setSessionFilter(params.get("importSessionId")!)
    if (gdrive === "connected") {
      setImportResult("Connected to Google Drive!")
      setGdriveConnected(true)
      window.history.replaceState({}, "", "/expenses")
    } else if (gdrive === "error") {
      setImportResult("Failed to connect Google Drive")
      window.history.replaceState({}, "", "/expenses")
    }
  }, [])

  const handleSubmit = async () => {
    await fetch("/api/expenses", { method: "POST", body: JSON.stringify(form) })
    setOpen(false)
    setForm({ date: new Date().toISOString().split("T")[0], amount: "", categoryId: "", vendor: "", description: "", paymentMode: "UPI", notes: "" })
    loadData()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      const result = await res.json()
      console.log("[FILE IMPORT] Response:", result)
      if (!res.ok) {
        setImportResult(result.error || "Import failed (" + res.status + ")")
      } else {
        setImportResult(result.message || "Imported successfully")
        setPage(1)
        fetch("/api/import-sessions").then(r => r.json()).then(setImportSessions)
      }
    } catch (err) {
      setImportResult("Import failed: " + String(err))
    } finally { setImporting(false); e.target.value = "" }
  }

  const handleExport = async () => {
    const res = await fetch("/api/export?type=expenses&format=xlsx")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "expenses-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const handleScanDrive = async () => {
    setScanning(true)
    setImportResult(null)
    try {
      const res = await fetch("/api/drive/list")
      const data = await res.json()
      if (data.needsReauth) { await fetch("/api/auth/logout"); window.location.href = "/api/auth/google"; return }
      if (data.error === "Not authenticated" || res.status === 401) { window.location.href = "/api/auth/google"; return }
      if (!res.ok) { setImportResult("Drive error: " + (data.errorDetail || data.error)); return }
      setDriveFiles(data.files || [])
      setDriveDialogOpen(true)
    } catch (err) { setImportResult("Failed: " + String(err)) }
    finally { setScanning(false) }
  }

  const handleDrivePreview = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch("/api/drive/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) })
      const data = await res.json()
      if (!res.ok) {
        setImportResult("Preview failed: " + (data.error || data.errorDetail || "Unknown error"))
        return null
      }
      return data
    } catch (err) {
      setImportResult("Preview failed: " + String(err))
      return null
    }
  }

  const handleImportFromDrive = async (fileId: string) => {
    setDriveImporting(true)
    setImportResult(null)
    try {
      const res = await fetch("/api/drive/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) })
      const result = await res.json()
      setImportResult(result.message || "Imported successfully")
      setDriveDialogOpen(false)
      setPage(1)
      loadData(1)
      fetch("/api/import-sessions").then(r => r.json()).then(setImportSessions)
    } catch (err) { setImportResult("Drive import failed: " + String(err)) }
    finally { setDriveImporting(false) }
  }

  const startInlineEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setEditForm((prev) => ({
      ...prev,
      [expense.id]: {
        categoryId: String(expense.categoryId),
        subCategory: expense.subCategory || "",
        person: expense.person || "",
      },
    }))
  }

  const cancelInlineEdit = () => {
    setEditingId(null)
  }

  const saveInlineEdit = async (expense: Expense) => {
    const form = editForm[expense.id]
    if (!form) return
    try {
      const cat = categories.find((c) => String(c.id) === form.categoryId)
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: parseInt(form.categoryId),
          subCategory: form.subCategory || null,
          person: form.person || null,
          vendor: expense.vendor || "",
        }),
      })
      const updated = await res.json()
      if (res.ok) {
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        setEditingId(null)
      }
    } catch (err) {
      console.error("Save failed:", err)
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleFilterChange = (setter: (val: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset)
    setPage(1)
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    if (preset === "all") { setDateFrom(""); setDateTo(""); return }
    if (preset === "custom") { setDateFrom(""); setDateTo(""); return }
    if (preset === "this-month") {
      setDateFrom(new Date(y, m, 1).toISOString().split("T")[0])
      setDateTo(new Date(y, m + 1, 0).toISOString().split("T")[0])
    } else if (preset === "prev-month") {
      setDateFrom(new Date(y, m - 1, 1).toISOString().split("T")[0])
      setDateTo(new Date(y, m, 0).toISOString().split("T")[0])
    } else if (preset === "this-quarter") {
      const q = Math.floor(m / 3) * 3
      setDateFrom(new Date(y, q, 1).toISOString().split("T")[0])
      setDateTo(new Date(y, q + 3, 0).toISOString().split("T")[0])
    }
  }

  const handleClearFilters = () => {
    setCategoryFilter("all")
    setVendorFilter("")
    setPersonFilter("all")
    setPaymentModeFilter("all")
    setBankFilter("")
    setSubCategoryFilter("")
    setAmountMin("")
    setAmountMax("")
    setRecurrenceFilter("all")
    setPage(1)
  }

  const handleVendorFilter = (val: string) => {
    setVendorFilter(val)
    setPage(1)
  }

  const handleSubCategoryFilter = (val: string) => {
    setSubCategoryFilter(val)
    setPage(1)
  }

  const handleBankFilter = (val: string) => {
    setBankFilter(val)
    setPage(1)
  }

  const handleAmountMinFilter = (val: string) => {
    setAmountMin(val)
    setPage(1)
  }

  const handleAmountMaxFilter = (val: string) => {
    setAmountMax(val)
    setPage(1)
  }

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th className={`px-3 py-3 cursor-pointer select-none hover:text-foreground ${className}`} onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && <ArrowUpDown className={`h-3 w-3 ${sortDir === "desc" ? "rotate-180" : ""}`} />}
      </div>
    </th>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and manage all your transactions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/expenses/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
          </Link>

          <Link href="/expenses/review-duplicates">
            <Button variant="outline" size="sm" className="relative">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Review
              {flaggedCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {flaggedCount > 99 ? "99+" : flaggedCount}
                </span>
              )}
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={handleScanDrive} disabled={scanning}>
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
            {gdriveConnected ? "Drive" : "GDrive"}
          </Button>

          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="mr-2 h-4 w-4" /> File</span>
            </Button>
            <input type="file" accept=".xlsx,.xls,.csv,.json,.zip,.htm,.html" className="hidden" onChange={handleFileUpload} />
          </label>

          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Date</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><label className="text-sm font-medium">Amount</label><Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                </div>
                <div><label className="text-sm font-medium">Category</label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Vendor</label><Input placeholder="e.g. Big Bazaar" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Payment</label>
                  <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit}>Save Expense</Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {gdriveConnected && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-1 text-xs">
            <Cloud className="h-3.5 w-3.5 text-primary" />
            <span>Drive connected {gdriveEmail && `(${gdriveEmail})`}</span>
            <a href="/api/auth/logout" className="ml-auto text-[10px] text-muted-foreground hover:text-red-500 flex items-center gap-1">
              <LogOut className="h-2.5 w-2.5" /> Disconnect
            </a>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card className={
          importResult.includes("fail") || importResult.includes("Error") || importResult.includes("Preview failed") || importResult.includes("error")
            ? "border-red-500/30 bg-red-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
        }>
          <CardContent className={`flex items-center gap-2 py-1 text-xs ${importResult.includes("fail") || importResult.includes("Error") || importResult.includes("Preview failed") || importResult.includes("error") ? "text-red-600" : "text-emerald-600"}`}>
            {importResult.includes("fail") || importResult.includes("Error") || importResult.includes("Preview failed") || importResult.includes("error")
              ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              : <FileSpreadsheet className="h-3.5 w-3.5" />
            }
            <span>{importResult}</span>
          </CardContent>
        </Card>
      )}

      {importing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-2 py-1 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Importing expenses...
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search vendor, description, notes..." className="pl-8 h-8 text-xs"
            value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <Select value={datePreset} onValueChange={handleDatePreset}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="prev-month">Prev Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {datePreset === "all" ? null : (
          <>
            <input type="date" className="h-8 text-[10px] px-1 rounded border border-input bg-transparent w-28"
              value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
            <span className="text-[10px] text-muted-foreground">—</span>
            <input type="date" className="h-8 text-[10px] px-1 rounded border border-input bg-transparent w-28"
              value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
          </>
        )}
        {importSessions.length > 0 && (
          <Select value={sessionFilter} onValueChange={(v) => { setSessionFilter(v); setPage(1); window.history.replaceState({}, "", v ? `/expenses?importSessionId=${v}` : "/expenses") }}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Import Session" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Imports</SelectItem>
              {importSessions.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.fileName || s.source} ({s.totalRows})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Badge variant="secondary" className="text-[10px]">{total.toLocaleString()} items</Badge>
      </div>

      <FilterBar
        categories={categories}
        categoryValue={categoryFilter}
        onCategoryChange={handleFilterChange(setCategoryFilter)}
        distinctVendors={distinctVendors}
        vendorValue={vendorFilter}
        onVendorChange={handleVendorFilter}
        distinctPersons={distinctPersons}
        personValue={personFilter}
        onPersonChange={handleFilterChange(setPersonFilter)}
        distinctPaymentModes={distinctPaymentModes}
        paymentModeValue={paymentModeFilter}
        onPaymentModeChange={handleFilterChange(setPaymentModeFilter)}
        distinctBankAccounts={distinctBankAccounts}
        bankValue={bankFilter}
        onBankChange={handleBankFilter}
        distinctSubCategories={distinctSubCategories}
        subCategoryValue={subCategoryFilter}
        onSubCategoryChange={handleSubCategoryFilter}
        amountMin={amountMin}
        amountMax={amountMax}
        onAmountMinChange={handleAmountMinFilter}
        onAmountMaxChange={handleAmountMaxFilter}
        distinctRecurrenceTypes={distinctRecurrenceTypes}
        recurrenceValue={recurrenceFilter}
        onRecurrenceChange={handleFilterChange(setRecurrenceFilter)}
        onClear={handleClearFilters}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage(1)}>
              First
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              Last
            </Button>
          </div>
        </div>
      )}

      <Card className="shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Transactions</CardTitle>
            <span className="text-xs font-mono text-muted-foreground">Total: {formatCurrency(totalAmount)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-[10px] font-medium text-muted-foreground">
                    <SortHeader field="date" label="Date" />
                    <SortHeader field="vendor" label="Vendor" className="max-w-[150px]" />
                    <th className="px-1.5 py-1">Category</th>
                    <th className="px-1.5 py-1">Sub Cat</th>
                    <SortHeader field="person" label="Person" />
                    <th className="px-1.5 py-1">Mode</th>
                    <th className="px-1.5 py-1">Bank</th>
                    <SortHeader field="amount" label="Amount" className="text-right" />
                    <th className="px-1.5 py-1">Comments</th>
                    <th className="px-1.5 py-1 text-right"></th>
                    <th className="px-1.5 py-1">Type</th>
                    <th className="px-1.5 py-1">Other</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground text-sm">
                        {search ? "No matching expenses" : "No expenses yet. Add one or bulk import!"}
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => {
                      const isEditing = editingId === expense.id
                      const ef = editForm[expense.id] || { categoryId: String(expense.categoryId), subCategory: expense.subCategory || "", person: expense.person || "" }
                      return (
                      <tr key={expense.id} className={`border-b transition-colors text-xs ${isEditing ? "bg-muted/20" : "hover:bg-muted/30"}`}>
                        <td className="px-1.5 py-1 whitespace-nowrap">{formatDate(expense.date)}</td>
                        <td className="px-1.5 py-1 max-w-[150px] truncate" title={expense.vendor || ""}>
                          <p className="font-medium flex items-center gap-1 leading-tight truncate">
                            {expense.flagged && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Flagged for review" />
                            )}
                            {expense.vendor || "-"}
                          </p>
                          {expense.description && (
                            <p className="text-[10px] text-muted-foreground truncate leading-tight">{expense.description}</p>
                          )}
                        </td>
                        <td className="px-1.5 py-1">
                          {isEditing ? (
                            <Select value={ef.categoryId}
                              onValueChange={(v) => setEditForm((prev) => ({ ...prev, [expense.id]: { ...prev[expense.id], categoryId: v } }))}>
                              <SelectTrigger className="h-6 text-[10px] w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 whitespace-nowrap"
                              style={{ backgroundColor: expense.category?.color + "20", color: expense.category?.color }}>
                              {expense.category?.name}
                            </Badge>
                          )}
                        </td>
                        <td className="px-1.5 py-1">
                          {isEditing ? (
                            <input list="subcat-edit" className="w-20 h-6 text-[10px] px-1 rounded border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                              value={ef.subCategory} onChange={(e) => setEditForm((prev) => ({ ...prev, [expense.id]: { ...prev[expense.id], subCategory: e.target.value } }))} />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{expense.subCategory || "-"}</span>
                          )}
                        </td>
                        <td className="px-1.5 py-1">
                          {isEditing ? (
                            <input list="person-edit" className="w-20 h-6 text-[10px] px-1 rounded border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                              value={ef.person} onChange={(e) => setEditForm((prev) => ({ ...prev, [expense.id]: { ...prev[expense.id], person: e.target.value } }))} />
                          ) : (
                            <span className="text-[10px]">{expense.person || "-"}</span>
                          )}
                        </td>
                        <td className="px-1.5 py-1 text-[10px] text-muted-foreground">{expense.paymentMode}</td>
                        <td className="px-1.5 py-1 text-[10px] text-muted-foreground max-w-[80px] truncate">{expense.bankAccount || "-"}</td>
                        <td className="px-1.5 py-1 text-right font-semibold whitespace-nowrap text-xs">{formatCurrency(expense.amount)}</td>
                        <td className="px-1.5 py-1 text-[10px] text-muted-foreground max-w-[100px] truncate leading-tight" title={expense.notes || ""}>{expense.notes || "-"}</td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-emerald-500 hover:text-emerald-600"
                                onClick={() => saveInlineEdit(expense)}>
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                onClick={cancelInlineEdit}>
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary"
                              onClick={() => startInlineEdit(expense)}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                        <td className="px-1.5 py-1 text-[10px]">{expense.recurrenceType && expense.recurrenceType !== "onetime" ? expense.recurrenceType : "-"}</td>
                        <td className="px-1.5 py-1 text-[10px] text-muted-foreground">{expense.otherType || "-"}</td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage(1)}>
              First
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Shared datalists for inline edit */}
      <datalist id="subcat-edit">
        {distinctSubCategories.map((s) => <option key={s} value={s} />)}
      </datalist>
      <datalist id="person-edit">
        {distinctPersons.map((p) => <option key={p} value={p} />)}
      </datalist>

      <DriveDialog
        open={driveDialogOpen}
        onOpenChange={setDriveDialogOpen}
        files={driveFiles}
        onPreview={handleDrivePreview}
        onImport={handleImportFromDrive}
        importing={driveImporting}
      />
    </div>
  )
}