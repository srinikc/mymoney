"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  Loader2, Cloud, LogOut, Edit3, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle2,
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
type FilterMode = "contains" | "not-contains"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [importSessions, setImportSessions] = useState<ImportSession[]>([])
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Multi-select filter state (arrays of selected values)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [personFilter, setPersonFilter] = useState<string[]>([])
  const [recurrenceFilter, setRecurrenceFilter] = useState<string[]>([])
  const [paymentModeFilter, setPaymentModeFilter] = useState<string[]>([])
  const [vendorFilter, setVendorFilter] = useState<string[]>([])
  const [subCategoryFilter, setSubCategoryFilter] = useState<string[]>([])
  const [bankFilter, setBankFilter] = useState<string[]>([])

  // Filter modes for text-based fields (P3.6)
  const [vendorFilterMode, setVendorFilterMode] = useState<FilterMode>("contains")
  const [subCategoryFilterMode, setSubCategoryFilterMode] = useState<FilterMode>("contains")

  const [sessionFilter, setSessionFilter] = useState("")
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
    if (sessionFilter) params.set("importSessionId", sessionFilter)

    // Multi-select filters: send comma-separated values
    if (categoryFilter.length > 0) params.set("categoryIds", categoryFilter.join(","))
    if (personFilter.length > 0) params.set("persons", personFilter.join(","))
    if (recurrenceFilter.length > 0) params.set("recurrenceTypes", recurrenceFilter.join(","))
    if (paymentModeFilter.length > 0) params.set("paymentModes", paymentModeFilter.join(","))
    if (vendorFilter.length > 0) {
      params.set("vendors", vendorFilter.join(","))
      params.set("vendorMode", vendorFilterMode)
    }
    if (subCategoryFilter.length > 0) {
      params.set("subCategories", subCategoryFilter.join(","))
      params.set("subCategoryMode", subCategoryFilterMode)
    }
    if (bankFilter.length > 0) params.set("bankAccounts", bankFilter.join(","))

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
  }, [search, categoryFilter, sessionFilter, personFilter, recurrenceFilter, paymentModeFilter, vendorFilter, subCategoryFilter, bankFilter, vendorFilterMode, subCategoryFilterMode, dateFrom, dateTo, amountMin, amountMax, sortField, sortDir, page, refreshKey])

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
      if (res.ok) {
        setImportResult(result.message || "Imported successfully")
        setPage(1)
        fetch("/api/import-sessions").then(r => r.json()).then(setImportSessions)
      } else {
        setImportResult(result.error || "Import failed (" + res.status + ")")
      }
    } catch (error) {
      setImportResult("Import failed: " + String(error))
    } finally { setImporting(false); e.target.value = "" }
  }

  const handleExport = async () => {
    const res = await fetch("/api/export?type=expenses&format=xlsx")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "expenses-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const [gpayJobId, setGpayJobId] = useState<string | null>(null)
  const [gpayDialogOpen, setGpayDialogOpen] = useState(false)
  const [gpayStep, setGpayStep] = useState<"idle" | "starting_export" | "export_in_progress" | "open_takeout" | "waiting_drive" | "importing" | "done" | "error">("idle")
  const knownGpayFilesRef = useRef<Set<string>>(new Set(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("mymoney-gpay-known-files") || "[]") as string[]
      : []
  ))
  const gpayAutoModeRef = useRef(false)
  const gpayPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gpayDrivePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gpayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastGpaySync, setLastGpaySync] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mymoney-gpay-last-sync") || "" : ""
  )
  const [gpayConfirmForce, setGpayConfirmForce] = useState(false)

  const persistLastGpaySync = useCallback((iso: string) => {
    setLastGpaySync(iso)
    localStorage.setItem("mymoney-gpay-last-sync", iso)
  }, [])

  const addKnownGpayFile = useCallback((id: string) => {
    knownGpayFilesRef.current.add(id)
    localStorage.setItem("mymoney-gpay-known-files", JSON.stringify([...knownGpayFilesRef.current]))
  }, [])

  // Persist pending GPay sync state across page navigations
  const saveGpayPendingState = (step: string) => {
    if (step === "waiting_drive" || step === "export_in_progress" || step === "importing") {
      localStorage.setItem("mymoney-gpay-pending", JSON.stringify({ step, timestamp: Date.now() }))
    } else {
      localStorage.removeItem("mymoney-gpay-pending")
    }
  }

  // Resume pending sync on mount (MUST run before save effect below)
  // Check if a GPay file already arrived while we were away
  const checkAndImportPendingGpayFile = async () => {
    try {
      const listRes = await fetch("/api/drive/list")
      if (!listRes.ok) return false
      const data = await listRes.json()
      const files: { id: string; name: string }[] = data.files || []
      const pendingFile = files.find(
        (f) => f.name === "MyActivity.html" && !knownGpayFilesRef.current.has(f.id)
      )
      if (pendingFile) {
        addKnownGpayFile(pendingFile.id)
        setGpayStep("importing")
        await handleImportFromDrive(pendingFile.id)
        setGpayStep("done")
        persistLastGpaySync(new Date().toISOString())
        return true
      }
      return false
    } catch { return false }
  }

  useEffect(() => {
    const pending = localStorage.getItem("mymoney-gpay-pending")
    if (pending) {
      (async () => {
        try {
          const { step, timestamp } = JSON.parse(pending)
          const elapsed = Date.now() - timestamp
          if (elapsed < 20 * 60 * 1000 && (step === "waiting_drive" || step === "export_in_progress" || step === "importing")) {
            gpayAutoModeRef.current = true
            setGpayStep("waiting_drive")
            // First check if file already arrived
            const found = await checkAndImportPendingGpayFile()
            if (!found) {
              // Start polling for it
              startGpayDrivePolling()
            }
          } else {
            localStorage.removeItem("mymoney-gpay-pending")
          }
        } catch {
          localStorage.removeItem("mymoney-gpay-pending")
        }
      })()
    }
  }, [])

  // Persist pending state across navigations (after resume effect, so it doesn't clear on mount)
  useEffect(() => {
    if (gpayStep === "waiting_drive" || gpayStep === "export_in_progress" || gpayStep === "importing") {
      localStorage.setItem("mymoney-gpay-pending", JSON.stringify({ step: gpayStep, timestamp: Date.now() }))
    } else {
      localStorage.removeItem("mymoney-gpay-pending")
    }
  }, [gpayStep])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (gpayPollRef.current) clearInterval(gpayPollRef.current)
      if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)
      if (gpayTimeoutRef.current) clearTimeout(gpayTimeoutRef.current)
    }
  }, [])

  const startGpayDrivePolling = async (timeoutMs = 900_000) => {
    // Record known html files first & clear any previously known MyActivity.html
    try {
      const listRes = await fetch("/api/drive/list")
      if (listRes.ok) {
        const data = await listRes.json()
        const files: { id: string; name: string }[] = data.files || []
        for (const f of files) {
          if (f.name.endsWith(".html") && f.name !== "MyActivity.html") addKnownGpayFile(f.id)
          if (f.name === "MyActivity.html") {
            knownGpayFilesRef.current.delete(f.id)
          }
        }
        localStorage.setItem("mymoney-gpay-known-files", JSON.stringify([...knownGpayFilesRef.current]))
        // Also import immediately if MyActivity.html exists
        const found = files.find((f) => f.name === "MyActivity.html" && !knownGpayFilesRef.current.has(f.id))
        if (found) {
          addKnownGpayFile(found.id)
          setGpayStep("importing")
          await handleImportFromDrive(found.id)
          setGpayStep("done")
          setGpayJobId(null)
          persistLastGpaySync(new Date().toISOString())
          return
        }
      }
    } catch {}

    if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)

    gpayDrivePollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/drive/list")
        if (!res.ok) return
        const data = await res.json()
        const files: { id: string; name: string }[] = data.files || []
        const newFile = files.find(
          (f) => f.name === "MyActivity.html" && !knownGpayFilesRef.current.has(f.id)
        )
        if (newFile) {
          if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)
          if (gpayTimeoutRef.current) clearTimeout(gpayTimeoutRef.current)
          setGpayStep("importing")
          addKnownGpayFile(newFile.id)
          await handleImportFromDrive(newFile.id)
          setGpayStep("done")
          setGpayJobId(null)
          persistLastGpaySync(new Date().toISOString())
        }
      } catch {}
    }, 15000)

    gpayTimeoutRef.current = setTimeout(() => {
      if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)
      if (gpayStep !== "done" && gpayStep !== "importing") {
        setGpayStep("waiting_drive")
        setGpayJobId(null)
      }
    }, timeoutMs)
  }

  const startGpayPolling = (jobId: string) => {
    if (gpayPollRef.current) clearInterval(gpayPollRef.current)
    if (gpayTimeoutRef.current) clearTimeout(gpayTimeoutRef.current)

    gpayPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/refresh-gpay?jobId=${jobId}`)
        const data = await res.json()
        const status = data.job?.status
        if (status === "export_created" || status === "already_in_progress") {
          if (gpayPollRef.current) clearInterval(gpayPollRef.current)
          gpayPollRef.current = null
          setGpayStep("waiting_drive")
          setGpayJobId(null)
          persistLastGpaySync(new Date().toISOString())
          startGpayDrivePolling()
        } else if (status === "failed" || status === "auth_required") {
          if (gpayPollRef.current) clearInterval(gpayPollRef.current)
          gpayPollRef.current = null
          setGpayStep("waiting_drive")
          setGpayJobId(null)
          startGpayDrivePolling()
        }
      } catch {
        // ignore polling errors
      }
    }, 5000)

    // Timeout after 15min — switch to Drive polling
    gpayTimeoutRef.current = setTimeout(() => {
      if (gpayPollRef.current) {
        clearInterval(gpayPollRef.current)
        gpayPollRef.current = null
      }
      setGpayStep("waiting_drive")
      setGpayJobId(null)
      startGpayDrivePolling()
    }, 900_000)
  }

  const handleGpayTakeout = async () => {
    setGpayConfirmForce(false)
    setImportResult(null)

    // If already in progress or waiting for Drive, just show status
    if (gpayStep === "export_in_progress" || gpayStep === "starting_export" || gpayStep === "waiting_drive" || gpayStep === "importing") {
      setGpayDialogOpen(true)
      return
    }

    // Synced < 1 hour ago: show confirmation instead of auto-starting
    if (lastGpaySync && (gpayStep === "done" || gpayStep === "idle")) {
      const lastSync = new Date(lastGpaySync)
      const now = new Date()
      const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / 3600000
      if (hoursSinceLastSync < 1) {
        setGpayConfirmForce(true)
        setGpayDialogOpen(true)
        return
      }
    }

    await startFreshExport()
  }

  const startFreshExport = async () => {
    gpayAutoModeRef.current = false
    setGpayStep("starting_export")
    setGpayDialogOpen(true)

    try {
      const res = await fetch("/api/refresh-gpay", { method: "POST" })
      const data = await res.json()
      if (data.jobId) {
        gpayAutoModeRef.current = true
        setGpayJobId(data.jobId)
        setGpayStep("export_in_progress")
        startGpayPolling(data.jobId)
        return
      }
    } catch {}

    // Fallback: poll Drive for new files
    gpayAutoModeRef.current = false
    setGpayStep("waiting_drive")
    startGpayDrivePolling()
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
    } catch (error) { setImportResult("Failed: " + String(error)) }
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
    } catch (error) {
      setImportResult("Preview failed: " + String(error))
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
    } catch (error) { setImportResult("Drive import failed: " + String(error)) }
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
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: Number.parseInt(form.categoryId),
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
    } catch (error) {
      console.error("Save failed:", error)
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

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset)
    setPage(1)
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    if (preset === "all") { setDateFrom(""); setDateTo(""); return }
    if (preset === "custom") { setDateFrom(""); setDateTo(""); return }
    switch (preset) {
    case "this-month": {
      setDateFrom(new Date(y, m, 1).toISOString().split("T")[0])
      setDateTo(new Date(y, m + 1, 0).toISOString().split("T")[0])
    
    break;
    }
    case "prev-month": {
      setDateFrom(new Date(y, m - 1, 1).toISOString().split("T")[0])
      setDateTo(new Date(y, m, 0).toISOString().split("T")[0])
    
    break;
    }
    case "this-quarter": {
      const q = Math.floor(m / 3) * 3
      setDateFrom(new Date(y, q, 1).toISOString().split("T")[0])
      setDateTo(new Date(y, q + 3, 0).toISOString().split("T")[0])
    
    break;
    }
    // No default
    }
  }

  const handleClearFilters = () => {
    setCategoryFilter([])
    setVendorFilter([])
    setPersonFilter([])
    setPaymentModeFilter([])
    setBankFilter([])
    setSubCategoryFilter([])
    setAmountMin("")
    setAmountMax("")
    setRecurrenceFilter([])
    setVendorFilterMode("contains")
    setSubCategoryFilterMode("contains")
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

          <Button variant="outline" size="sm" onClick={handleGpayTakeout}>
            {gpayStep === "export_in_progress" || gpayStep === "starting_export" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : gpayStep === "waiting_drive" ? (
              <Cloud className="mr-2 h-4 w-4 animate-pulse" />
            ) : gpayStep === "done" ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
            ) : gpayStep === "error" ? (
              <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {gpayStep === "idle" || gpayStep === "open_takeout" ? "Refresh GPay" :
             gpayStep === "starting_export" ? "Starting..." :
             gpayStep === "export_in_progress" ? "Exporting..." :
             gpayStep === "waiting_drive" ? "Waiting..." :
             gpayStep === "importing" ? "Importing..." :
             gpayStep === "done" ? "Refresh GPay" :
             gpayStep === "error" ? "Refresh GPay" : "Refresh GPay"}
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
        onCategoryChange={(vals) => { setCategoryFilter(vals); setPage(1) }}
        distinctVendors={distinctVendors}
        vendorValue={vendorFilter}
        onVendorChange={(vals) => { setVendorFilter(vals); setPage(1) }}
        vendorMode={vendorFilterMode}
        onVendorModeToggle={() => setVendorFilterMode((prev) => (prev === "contains" ? "not-contains" : "contains"))}
        distinctPersons={distinctPersons}
        personValue={personFilter}
        onPersonChange={(vals) => { setPersonFilter(vals); setPage(1) }}
        distinctPaymentModes={distinctPaymentModes}
        paymentModeValue={paymentModeFilter}
        onPaymentModeChange={(vals) => { setPaymentModeFilter(vals); setPage(1) }}
        distinctBankAccounts={distinctBankAccounts}
        bankValue={bankFilter}
        onBankChange={(vals) => { setBankFilter(vals); setPage(1) }}
        distinctSubCategories={distinctSubCategories}
        subCategoryValue={subCategoryFilter}
        onSubCategoryChange={(vals) => { setSubCategoryFilter(vals); setPage(1) }}
        subCategoryMode={subCategoryFilterMode}
        onSubCategoryModeToggle={() => setSubCategoryFilterMode((prev) => (prev === "contains" ? "not-contains" : "contains"))}
        amountMin={amountMin}
        amountMax={amountMax}
        onAmountMinChange={(val) => { setAmountMin(val); setPage(1) }}
        onAmountMaxChange={(val) => { setAmountMax(val); setPage(1) }}
        distinctRecurrenceTypes={distinctRecurrenceTypes}
        recurrenceValue={recurrenceFilter}
        onRecurrenceChange={(vals) => { setRecurrenceFilter(vals); setPage(1) }}
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

      <Dialog open={gpayDialogOpen} onOpenChange={(v) => setGpayDialogOpen(v)}>
        <DialogContent>
          <DialogHeader><DialogTitle>GPay Export</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {gpayStep === "done" && gpayConfirmForce && (
              <div className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium">Already synced recently</p>
                <p className="text-sm text-muted-foreground">
                  GPay data was last synced{" "}
                  <span className="font-medium">
                    {new Date(lastGpaySync).toLocaleString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                  {" "}({(() => {
                    const diff = Date.now() - new Date(lastGpaySync).getTime()
                    const mins = Math.floor(diff / 60000)
                    if (mins < 1) return "less than a minute ago"
                    if (mins === 1) return "1 minute ago"
                    return `${mins} minutes ago`
                  })()}
                  ). Google only allows one new export per day — force a new one?
                </p>
                <div className="flex justify-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => { setGpayConfirmForce(false); setGpayDialogOpen(false) }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => { setGpayConfirmForce(false); startFreshExport() }}>
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Force New Export
                  </Button>
                </div>
              </div>
            )}
            {gpayStep === "starting_export" && (
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Starting GPay export automatically...</p>
              </div>
            )}
            {gpayStep === "export_in_progress" && (
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Waiting for Google to create your GPay export...</p>
                <p className="text-xs text-muted-foreground">This typically takes 30 seconds to 5 minutes.</p>
              </div>
            )}
            {gpayStep === "waiting_drive" && (
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Waiting for GPay export file to appear in your Google Drive...
                </p>
                {gpayAutoModeRef.current ? (
                  <p className="text-xs text-muted-foreground">
                    The export was created automatically. It should arrive in Drive shortly.
                  </p>
                ) : (
                  <ol className="text-xs text-left text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Google Takeout is open in a new tab</li>
                    <li>Deselect all → select <strong>Google Pay</strong> only</li>
                    <li>Delivery method: <strong>Add to Drive</strong></li>
                    <li>Click <strong>Create export</strong> (takes 30s-5min)</li>
                  </ol>
                )}
                <p className="text-xs text-amber-500">This page will auto-detect the file and import it.</p>
              </div>
            )}
            {gpayStep === "importing" && (
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Importing GPay transactions...</p>
              </div>
            )}
            {gpayStep === "done" && !gpayConfirmForce && (
              <div className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">GPay export created!</p>
                {gpayAutoModeRef.current ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Google will email you a download link when it's ready.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Download the file and use <strong>File</strong> button to upload.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Follow the instructions in the Takeout tab, then download and upload the file using the <strong>File</strong> button.
                  </p>
                )}
              </div>
            )}
            {gpayStep === "error" && (
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  GPay export was created. Waiting for it to appear in Google Drive (can take 5-15 min)...
                </p>
                <p className="text-xs text-muted-foreground">
                  The file will be auto-detected once available. You can also scan manually.
                </p>
                <Button size="sm" variant="outline" onClick={() => { setGpayDialogOpen(false); handleScanDrive() }}>
                  <Cloud className="mr-1.5 h-4 w-4" /> Scan Drive Now
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
