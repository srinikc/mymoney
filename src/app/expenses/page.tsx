"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColumnFilter } from "@/components/expenses/column-filter"
import { DriveDialog } from "@/components/expenses/drive-dialog"
import { formatCurrency, formatDate, toLocalDateString } from "@/lib/utils"
import { TableSkeleton } from "@/components/ui/page-skeleton"
import type { Expense, Category } from "@/types"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import DatePicker from "@/components/ui/date-picker"
import TransactionConfirm from "@/components/ui/transaction-confirm"
import {
  Upload, Search, Download, FileSpreadsheet,
  Loader2, Cloud, LogOut, Edit3, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle2, X,
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

type SortField = "date" | "amount" | "vendor" | "person" | "paymentMode" | "bankAccount"
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
  const [notesFilter, setNotesFilter] = useState("")
  const [otherTypeFilter, setOtherTypeFilter] = useState("")

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
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [gdriveConnected, setGdriveConnected] = useState(false)
  const [gdriveEmail, setGdriveEmail] = useState("")
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [driveDialogOpen, setDriveDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<number, { categoryId: string; subCategory: string; person: string; vendor: string }>>({})
  const [driveImporting, setDriveImporting] = useState(false)


  const [isAddingNew, setIsAddingNew] = useState(false)
  const newFormDefault = { date: new Date().toISOString().split("T")[0], amount: "", categoryId: "", vendor: "", description: "", paymentMode: "UPI", person: "", subCategory: "", bankAccount: "", notes: "" }
  const [newForm, setNewForm] = useState(newFormDefault)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: number[] }>({ open: false, ids: [] })
  const [confirmTx, setConfirmTx] = useState<{ open: boolean; pendingForm: typeof newFormDefault }>({ open: false, pendingForm: newFormDefault })

  const doAddExpense = async (formData: typeof newFormDefault) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setIsAddingNew(false)
        setNewForm(newFormDefault)
        toast.success("Expense added")
        loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to add expense")
      }
    } catch {
      toast.error("Failed to add expense")
    }
  }

  const handleAddNew = async () => {
    if (!newForm.amount || !newForm.date) return
    const amount = Number.parseFloat(newForm.amount)
    if (amount >= 10000) {
      setConfirmTx({ open: true, pendingForm: { ...newForm } })
      return
    }
    await doAddExpense(newForm)
  }

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
    if (notesFilter) params.set("notes", notesFilter)
    if (otherTypeFilter) params.set("otherType", otherTypeFilter)

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
  }, [search, categoryFilter, sessionFilter, personFilter, recurrenceFilter, paymentModeFilter, vendorFilter, subCategoryFilter, bankFilter, notesFilter, otherTypeFilter, vendorFilterMode, subCategoryFilterMode, dateFrom, dateTo, amountMin, amountMax, sortField, sortDir, page])

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

    // Check for un-imported GPay files in Drive on page load.
    // Instead of auto-importing, prompt the user to confirm.
    detectPendingGpayFile()
  }, [])

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
      if (res.ok) {
        setImportResult(result.message || "Imported successfully")
        toast.success(result.message || "File imported successfully")
        setPage(1)
        fetch("/api/import-sessions").then(r => r.json()).then(setImportSessions)
      } else {
        setImportResult(result.error || "Import failed (" + res.status + ")")
        toast.error(result.error || "Import failed")
      }
    } catch (error) {
      setImportResult("Import failed: " + String(error))
      toast.error("Import failed: " + String(error))
    } finally { setImporting(false); e.target.value = "" }
  }

  const handleExport = async () => {
    const res = await fetch("/api/export?type=expenses&format=xlsx")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "expenses-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const [, setGpayJobId] = useState<string | null>(null)
  const [gpayDialogOpen, setGpayDialogOpen] = useState(false)
  const [gpayStep, setGpayStep] = useState<"idle" | "starting_export" | "export_in_progress" | "open_takeout" | "waiting_drive" | "importing" | "done" | "error">("idle")
  const [reauthStatus, setReauthStatus] = useState<"idle" | "reauth_started" | "reauth_complete" | "reauth_failed">("idle")
  const reauthPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const knownGpayFilesRef = useRef<Set<string>>(new Set(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("mymoney-gpay-known-files") || "[]") as string[]
      : []
  ))
  const gpayAutoModeRef = useRef(false)
  const [gpayError, setGpayError] = useState("")
  const gpayPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gpayDrivePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gpayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastGpaySync, setLastGpaySync] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mymoney-gpay-last-sync") || "" : ""
  )
  const [gpayConfirmForce, setGpayConfirmForce] = useState(false)
  const [gpayImportResult, setGpayImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [gpayPendingFileId, setGpayPendingFileId] = useState<string | null>(null)
  const [, setGpayPendingFileName] = useState("")
  const [gpayPreviewPendingId, setGpayPreviewPendingId] = useState("")
  const [gpayReauthExportCreated, setGpayReauthExportCreated] = useState(true)
  const [gpayPreview, setGpayPreview] = useState<{
    total: number; willImport: number; willSkip: number; blankVendor: number; totalVendors: number; sample: { date: string; amount: number; vendor: string }[]
  } | null>(null)

  const persistLastGpaySync = useCallback((iso: string) => {
    setLastGpaySync(iso)
    localStorage.setItem("mymoney-gpay-last-sync", iso)
  }, [])

  const addKnownGpayFile = useCallback((id: string) => {
    knownGpayFilesRef.current.add(id)
    localStorage.setItem("mymoney-gpay-known-files", JSON.stringify([...knownGpayFilesRef.current]))
  }, [])

  // Resume pending sync on mount (MUST run before save effect below)
  // Check if a GPay file already arrived while we were away
  const checkAndImportPendingGpayFile = async () => {
    try {
      const listRes = await fetch("/api/drive/list")
      if (!listRes.ok) return false
      const data = await listRes.json()
      const files: { id: string; name: string }[] = data.files || []
      const pendingFile = files.find(
        (f) => (f.name === "MyActivity.html" || f.name.endsWith(".zip")) && !knownGpayFilesRef.current.has(f.id)
      )
      if (pendingFile) {
        const ok = await finishGpayAutoImport(pendingFile.id)
        if (ok) return true
        // File wasn't ready — caller will start polling
        return false
      }
      return false
    } catch { return false }
  }

  // Detects un-imported GPay files in Drive and prompts user (no auto-import)
  const detectPendingGpayFile = async () => {
    try {
      const listRes = await fetch("/api/drive/list")
      if (!listRes.ok) return
      const data = await listRes.json()
      const files: { id: string; name: string }[] = data.files || []
      const pendingFile = files.find(
        (f) => (f.name === "MyActivity.html" || f.name.endsWith(".zip")) && !knownGpayFilesRef.current.has(f.id)
      )
      if (pendingFile) {
        setGpayPendingFileId(pendingFile.id)
        setGpayPendingFileName(pendingFile.name)
      }
    } catch { /* ignore */ }
  }

  const confirmImportGpayFile = async () => {
    if (!gpayPendingFileId) return
    addKnownGpayFile(gpayPendingFileId)
    setGpayPreviewPendingId(gpayPendingFileId)
    setGpayPendingFileId(null)
    // Show preview first
    try {
      const previewRes = await fetch("/api/drive/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: gpayPendingFileId }) })
      if (previewRes.ok) {
        const preview = await previewRes.json()
        setGpayPreview(preview)
        return
      }
    } catch { /* fall through to direct import */ }
    // If preview fails, import directly
    doImportGpayFile(gpayPendingFileId)
  }

  const doImportGpayFile = async (fileId: string) => {
    setGpayStep("importing")
    try {
      const result = await handleImportFromDrive(fileId)
      if (result) setGpayImportResult({ imported: result.imported, skipped: result.skipped })
      setGpayStep("done")
      setGpayJobId(null)
      persistLastGpaySync(new Date().toISOString())
    } catch {
      setGpayStep("error")
      setGpayError("Failed to import GPay file from Drive.")
      setGpayJobId(null)
    }
  }

  const confirmImportPreview = async () => {
    setGpayPreview(null)
    setGpayStep("importing")
    try {
      const fileId = gpayPreviewPendingId || gpayPendingFileId || ""
      addKnownGpayFile(fileId)
      const result = await handleImportFromDrive(fileId)
      if (result) setGpayImportResult({ imported: result.imported, skipped: result.skipped })
      setGpayStep("done")
      setGpayJobId(null)
      persistLastGpaySync(new Date().toISOString())
    } catch {
      setGpayStep("error")
      setGpayError("Failed to import GPay file from Drive.")
      setGpayJobId(null)
    }
  }

  const dismissPendingGpayFile = () => {
    if (gpayPendingFileId) {
      addKnownGpayFile(gpayPendingFileId)
      setGpayPendingFileId(null)
      setGpayPendingFileName("")
    }
  }

  useEffect(() => {
    const pending = localStorage.getItem("mymoney-gpay-pending")
    if (!pending) return
    const pendingFileCheck = async () => {
      try {
        const { step, timestamp } = JSON.parse(pending)
        const elapsed = Date.now() - timestamp
        if (elapsed >= 12 * 60 * 60 * 1000 || !(step === "waiting_drive" || step === "export_in_progress" || step === "importing")) {
          localStorage.removeItem("mymoney-gpay-pending")
          return
        }

        // Check what's actually in Drive to reconcile state
        let listRes, data
        try {
          listRes = await fetch("/api/drive/list")
          if (listRes.ok) data = await listRes.json()
        } catch { /* drive list failed */ }
        const files: { id: string; name: string }[] = data?.files || []
        const gpayFiles = files.filter((f) => f.name === "MyActivity.html" || f.name.endsWith(".zip"))
        const unimported = gpayFiles.filter((f) => !knownGpayFilesRef.current.has(f.id))

        if (unimported.length > 0) {
          // Found un-imported files — import the first one
          gpayAutoModeRef.current = true
          setGpayStep("waiting_drive")
          await finishGpayAutoImport(unimported[0].id)
          return
        }

        // All GPay files already imported or no files at all
        if (gpayFiles.length > 0 && unimported.length === 0) {
          // All files already handled — nothing pending
          localStorage.removeItem("mymoney-gpay-pending")
          setGpayStep("idle")
          return
        }

        // No GPay files in Drive at all — only start polling if pending is fresh (< 5 min)
        // After server restart or long absence, the job is likely lost
        if (elapsed > 5 * 60 * 1000) {
          localStorage.removeItem("mymoney-gpay-pending")
          setGpayStep("idle")
          return
        }

        // Fresh pending state — start Drive polling
        gpayAutoModeRef.current = true
        setGpayStep(step === "export_in_progress" ? "waiting_drive" : step)
        const found = await checkAndImportPendingGpayFile()
        if (!found) startGpayDrivePolling()
      } catch {
        localStorage.removeItem("mymoney-gpay-pending")
      }
    }
    pendingFileCheck()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (reauthPollRef.current) clearInterval(reauthPollRef.current)
    }
  }, [])

  const startGpayDrivePolling = async (timeoutMs = 900_000) => {
    let lastKnownCount = knownGpayFilesRef.current.size
    let lastMatchCount = 0
    // Record known non-GPay html files so they aren't re-detected
    try {
      const listRes = await fetch("/api/drive/list")
      if (listRes.ok) {
        const data = await listRes.json()
        const files: { id: string; name: string }[] = data.files || []
        for (const f of files) {
          if (f.name.endsWith(".html") && f.name !== "MyActivity.html") addKnownGpayFile(f.id)
        }
        const gpayFiles = files.filter((f) => f.name === "MyActivity.html" || f.name.endsWith(".zip"))
        const newFile = gpayFiles.find((f) => !knownGpayFilesRef.current.has(f.id))
        if (newFile) {
          const ok = await finishGpayAutoImport(newFile.id)
          if (ok) return
        }
        lastKnownCount = knownGpayFilesRef.current.size
        lastMatchCount = gpayFiles.length
      }
    } catch { /* gpay poll failed */ }

    if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)

    gpayDrivePollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/drive/list")
        if (!res.ok) return
        const data = await res.json()
        const files: { id: string; name: string }[] = data.files || []
        const gpayFiles = files.filter((f) => f.name === "MyActivity.html" || f.name.endsWith(".zip"))
        const newFile = gpayFiles.find((f) => !knownGpayFilesRef.current.has(f.id))
        if (newFile) {
          if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)
          if (gpayTimeoutRef.current) clearTimeout(gpayTimeoutRef.current)
          const ok = await finishGpayAutoImport(newFile.id)
          if (ok) return
          // File wasn't ready — restart polling
          startGpayDrivePolling(timeoutMs)
          return
        }
        lastKnownCount = knownGpayFilesRef.current.size
        lastMatchCount = gpayFiles.length
      } catch { /* gpay interval poll failed */ }
    }, 15000)

    gpayTimeoutRef.current = setTimeout(() => {
      if (gpayDrivePollRef.current) clearInterval(gpayDrivePollRef.current)
      if (gpayStep !== "done" && gpayStep !== "importing") {
        const known = lastKnownCount
        const matched = lastMatchCount
        const skipped = matched > known ? matched - known : 0
        setGpayError(
          matched === 0
            ? `No GPay export file found in Drive after 15 minutes. Found ${matched} matching files (${skipped} already imported). The export may have been created with email delivery instead of Drive, or the Takeout page is showing a stale "in progress" status without creating a new export.`
            : `Found ${matched} GPay file(s) in Drive but ${skipped} already imported. No new file appeared in 15 minutes. The export may have been delivered to email instead of Drive.`
        )
        setGpayStep("error")
        setGpayJobId(null)
      }
    }, timeoutMs)
  }

  const startGpayPolling = (jobId: string) => {
    if (gpayPollRef.current) clearInterval(gpayPollRef.current)
    if (gpayTimeoutRef.current) clearTimeout(gpayTimeoutRef.current)

    const clearAllPolling = () => {
      if (gpayPollRef.current) { clearInterval(gpayPollRef.current); gpayPollRef.current = null }
      if (gpayDrivePollRef.current) { clearInterval(gpayDrivePollRef.current); gpayDrivePollRef.current = null }
      if (gpayTimeoutRef.current) { clearTimeout(gpayTimeoutRef.current); gpayTimeoutRef.current = null }
    }

    gpayPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/refresh-gpay?jobId=${jobId}`)
        if (res.status === 404) {
          clearAllPolling()
          setGpayError("The GPay export job was lost (server may have restarted). Please try again.")
          setGpayStep("error")
          setGpayJobId(null)
          return
        }
        const data = await res.json()
        const status = data.job?.status
        if (status === "export_created" || status === "already_in_progress") {
          clearAllPolling()
          setGpayStep("waiting_drive")
          setGpayJobId(null)
          // NOTE: persistLastGpaySync is NOT called here — it's only set
          // when the import actually completes (drive polling finds the file).
          // Calling it prematurely makes the next click show "synced recently"
          // even when nothing was imported.
          startGpayDrivePolling()
        } else if (status === "failed" || status === "auth_required") {
          clearAllPolling()
          setGpayError(data.job?.error || (status === "auth_required" ? "Google session expired. Click 'Re-authenticate' below to log in." : "Unknown error"))
          setGpayStep("error")
          setGpayJobId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 5000)

    // Timeout after 15min — the script may have failed silently
    gpayTimeoutRef.current = setTimeout(() => {
      if (gpayPollRef.current) {
        clearInterval(gpayPollRef.current)
        gpayPollRef.current = null
      }
      setGpayError("Script did not complete within 15 minutes. The export may not have been created.")
      setGpayStep("error")
      setGpayJobId(null)
    }, 900_000)
  }

  const handleGpayTakeout = async () => {
    setGpayConfirmForce(false)
    setImportResult(null)
    setGpayImportResult(null)

    // If in progress, waiting for Drive, or errored: just show the dialog (preserving error message)
    if (gpayStep === "export_in_progress" || gpayStep === "starting_export" || gpayStep === "waiting_drive" || gpayStep === "importing" || gpayStep === "error") {
      setGpayDialogOpen(true)
      return
    }

    setGpayError("")

    // Synced < 1 hour ago: show confirmation instead of auto-starting
    if (lastGpaySync) {
      const lastSync = new Date(lastGpaySync)
      const now = new Date()
      const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / 3600000
      if (hoursSinceLastSync < 1) {
        setGpayConfirmForce(true)
        setGpayStep("done")
        setGpayDialogOpen(true)
        return
      }
    }

    await startFreshExport()
  }

  const resetGpayState = () => {
    if (gpayPollRef.current) { clearInterval(gpayPollRef.current); gpayPollRef.current = null }
    if (gpayDrivePollRef.current) { clearInterval(gpayDrivePollRef.current); gpayDrivePollRef.current = null }
    if (gpayTimeoutRef.current) { clearTimeout(gpayTimeoutRef.current); gpayTimeoutRef.current = null }
    if (reauthPollRef.current) { clearInterval(reauthPollRef.current); reauthPollRef.current = null }
    setGpayStep("idle")
    setGpayJobId(null)
    setGpayError("")
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
    } catch { /* ignore */ }

    // Fallback: show error — the Playwright script could not be started
    setGpayError("The GPay automation script could not be started. Check that Playwright and Chrome are installed.")
    setGpayStep("error")
  }

  const startReauth = async () => {
    setReauthStatus("reauth_started")
    setGpayError("")
    setGpayDialogOpen(true)
    try {
      const res = await fetch("/api/refresh-gpay?action=reauth", { method: "POST" })
      const data = await res.json()
      if (data.reauthToken) {
        startReauthPolling(data.reauthToken)
      }
    } catch {
      setReauthStatus("reauth_failed")
      setGpayError("Failed to start re-authentication. Check that the server is running.")
    }
  }

  const startReauthPolling = (token: string) => {
    if (reauthPollRef.current) clearInterval(reauthPollRef.current)
    if (gpayTimeoutRef.current) { clearTimeout(gpayTimeoutRef.current); gpayTimeoutRef.current = null }

    const stopReauth = () => {
      if (reauthPollRef.current) { clearInterval(reauthPollRef.current); reauthPollRef.current = null }
      if (gpayTimeoutRef.current) { clearTimeout(gpayTimeoutRef.current); gpayTimeoutRef.current = null }
    }

    reauthPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/refresh-gpay?jobId=${token}`)
        if (res.status === 404) {
          stopReauth()
          setReauthStatus("reauth_failed")
          setGpayError("Re-authentication job was lost (server may have restarted). Please try again.")
          return
        }
        const data = await res.json()
        const status = data.job?.status
        if (status === "reauth_complete") {
          stopReauth()
          setReauthStatus("reauth_complete")
          setGpayReauthExportCreated(data.job?.exportCreated !== false)
        } else if (status === "reauth_failed" || status === "failed") {
          stopReauth()
          setReauthStatus("reauth_failed")
          setGpayError(data.job?.error || "Re-authentication failed.")
        }
      } catch { /* ignore */ }
    }, 2000)

    // Safety timeout: stop polling after 2 minutes even if server doesn't respond
    gpayTimeoutRef.current = setTimeout(() => {
      if (reauthPollRef.current) {
        clearInterval(reauthPollRef.current)
        reauthPollRef.current = null
      }
      if (reauthStatus === "reauth_started") {
        setReauthStatus("reauth_failed")
        setGpayError("Re-authentication timed out. Please try again.")
      }
    }, 120_000)
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

  const handleDrivePreview = async (fileId: string, _fileName: string) => {
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

  // Shared helper for auto-import: marks file as known only if new records were imported.
  // Returns true only when polling should stop (genuinely new data was imported).
  const finishGpayAutoImport = async (fileId: string) => {
    setGpayStep("importing")
    const result = await handleImportFromDrive(fileId)
    const importedCount = result?.imported ?? 0
    const hadContent = result && result.total && result.total > 0

    if (importedCount > 0) {
      // Genuinely new records — mark known, done, stop polling
      addKnownGpayFile(fileId)
      setGpayImportResult({ imported: importedCount, skipped: result?.skipped ?? 0 })
      setGpayStep("done")
      setGpayJobId(null)
      persistLastGpaySync(new Date().toISOString())
    } else if (hadContent) {
      // File was valid but all records already in DB — mark known so we don't re-try,
      // but continue polling for the real new file
      addKnownGpayFile(fileId)
      if (result) setGpayImportResult({ imported: 0, skipped: result.skipped })
      setGpayStep("waiting_drive")
    } else {
      // File had no recognizable transactions — mark as known to avoid infinite retry loop.
      // If the real file arrives later with a different Drive ID, polling will still find it.
      addKnownGpayFile(fileId)
      if (result) setGpayImportResult({ imported: 0, skipped: 0 })
      setGpayStep("waiting_drive")
    }
    return importedCount > 0
  }

  const handleImportFromDrive = async (fileId: string) => {
    setDriveImporting(true)
    setImportResult(null)
    try {
      const res = await fetch("/api/drive/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) })
      const result = await res.json()
      const msg = result.message || (res.ok ? "Imported successfully" : result.error || "Import failed")
      setImportResult(msg)
      setDriveDialogOpen(false)
      setPage(1)
      loadData(1)
      fetch("/api/import-sessions").then(r => r.json()).then(setImportSessions)
      return { imported: result.imported ?? 0, skipped: result.skipped ?? 0, total: result.total ?? 0, message: msg }
    } catch (error) { setImportResult("Drive import failed: " + String(error)); return null }
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
        vendor: expense.vendor || "",
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
          vendor: form.vendor || "",
        }),
      })
      const updated = await res.json()
      if (res.ok) {
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        setEditingId(null)
        toast.success("Expense updated")
      } else {
        toast.error("Failed to update expense")
      }
    } catch {
      toast.error("Failed to update expense")
    }
  }

  const deleteExpense = async (id: number) => {
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
        setEditingId(null)
        toast.success("Expense archived")
        loadData()
      }
    } catch {
      toast.error("Failed to archive expense")
    }
  }

  const promptDeleteExpense = (id: number) => {
    setConfirmDelete({ open: true, ids: [id] })
  }

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length && expenses.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)))
    }
  }

  const deleteSelected = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/expenses/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        toast.success(`${ids.length} expense${ids.length > 1 ? "s" : ""} archived`)
        loadData()
      }
    } catch {
      toast.error("Batch archive failed")
    }
  }

  const promptDeleteSelected = () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setConfirmDelete({ open: true, ids })
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
      setDateFrom(toLocalDateString(new Date(y, m, 1)))
      setDateTo(toLocalDateString(new Date(y, m + 1, 0)))
    
    break;
    }
    case "prev-month": {
      setDateFrom(toLocalDateString(new Date(y, m - 1, 1)))
      setDateTo(toLocalDateString(new Date(y, m, 0)))
    
    break;
    }
    case "this-quarter": {
      const q = Math.floor(m / 3) * 3
      setDateFrom(toLocalDateString(new Date(y, q, 1)))
      setDateTo(toLocalDateString(new Date(y, q + 3, 0)))
    
    break;
    }
    // No default
    }
  }

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

          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setIsAddingNew(true); setTimeout(() => { document.querySelector('.overflow-x-auto')?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, 100) }}>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add
          </Button>
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

      {gpayPendingFileId && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-2 text-xs">
            <Cloud className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="flex-1">New GPay data file detected in Drive. Import now?</span>
            <Button size="sm" className="h-7 text-xs" onClick={confirmImportGpayFile}>
              Yes, Import
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={dismissPendingGpayFile}>
              No, Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {gpayPreview && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Cloud className="h-4 w-4 text-primary" />
              GPay Import Preview
            </div>
            <div className="flex gap-4 flex-wrap">
              <span>Total records: <strong>{gpayPreview.total}</strong></span>
              <span className="text-emerald-600">Will import: <strong>{gpayPreview.willImport}</strong></span>
              {gpayPreview.willSkip > 0 && <span className="text-muted-foreground">Duplicates skipped: <strong>{gpayPreview.willSkip}</strong></span>}
              <span>Unique vendors: <strong>{gpayPreview.totalVendors}</strong></span>
            </div>
            {gpayPreview.sample.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">Sample records:</div>
                <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap">
                  {gpayPreview.sample.map((s, i) => (
                    <span key={i}>{s.date} — ₹{s.amount} {s.vendor ? `(${s.vendor})` : ""}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 text-xs" onClick={confirmImportPreview}>
                Confirm Import
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGpayPreview(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search vendor, description, notes..." aria-label="Search expenses" className="pl-8 h-8 text-xs"
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={promptDeleteSelected}>
            Archive Selected
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage(1)} aria-label="First page">
              First
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">
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
              <table role="grid" aria-label="Expenses transactions" className="min-w-[1400px]">
                <thead>
                  <tr className="border-b text-left text-[10px] font-medium text-muted-foreground">
                    <th className="px-1.5 py-1 w-8">
                      <input type="checkbox" className="h-3 w-3" checked={expenses.length > 0 && selectedIds.size === expenses.length}
                        onChange={toggleSelectAll} />
                    </th>
                    <ColumnFilter label="Date" type="daterange"
                      value={[]} onChange={() => {}}
                      dateFrom={dateFrom} dateTo={dateTo}
                      onDateFromChange={(val) => { setDateFrom(val); setPage(1) }}
                      onDateToChange={(val) => { setDateTo(val); setPage(1) }}
                      sortField="date" currentSort={sortField} sortDir={sortDir} onSort={() => toggleSort("date")} />
                    <ColumnFilter label="Vendor" type="multiselect-with-mode"
                      options={distinctVendors.map((v) => ({ label: v, value: v }))}
                      value={vendorFilter} onChange={(vals) => { setVendorFilter(vals); setPage(1) }}
                      mode={vendorFilterMode} onModeToggle={() => setVendorFilterMode((prev) => (prev === "contains" ? "not-contains" : "contains"))}
                      showBlankOption
                      sortField="vendor" currentSort={sortField} sortDir={sortDir} onSort={() => toggleSort("vendor")} />
                    <ColumnFilter label="Category" type="multiselect"
                      options={categories.map((c) => ({ label: c.name, value: String(c.id) }))}
                      value={categoryFilter} onChange={(vals) => { setCategoryFilter(vals); setPage(1) }} showBlankOption />
                    <ColumnFilter label="Sub Cat" type="multiselect-with-mode"
                      options={distinctSubCategories.map((v) => ({ label: v, value: v }))}
                      value={subCategoryFilter} onChange={(vals) => { setSubCategoryFilter(vals); setPage(1) }}
                      mode={subCategoryFilterMode} onModeToggle={() => setSubCategoryFilterMode((prev) => (prev === "contains" ? "not-contains" : "contains"))} showBlankOption />
                    <ColumnFilter label="Person" type="multiselect"
                      options={distinctPersons.map((v) => ({ label: v, value: v }))}
                      value={personFilter} onChange={(vals) => { setPersonFilter(vals); setPage(1) }}
                      showBlankOption
                      sortField="person" currentSort={sortField} sortDir={sortDir} onSort={() => toggleSort("person")} />
                    <ColumnFilter label="Mode" type="multiselect"
                      options={distinctPaymentModes.map((v) => ({ label: v, value: v }))}
                      value={paymentModeFilter} onChange={(vals) => { setPaymentModeFilter(vals); setPage(1) }}
                      showBlankOption
                      sortField="paymentMode" currentSort={sortField} sortDir={sortDir} onSort={() => toggleSort("paymentMode")} />
                    <ColumnFilter label="Bank" type="multiselect"
                      options={distinctBankAccounts.map((v) => ({ label: v, value: v }))}
                      value={bankFilter} onChange={(vals) => { setBankFilter(vals); setPage(1) }}
                      showBlankOption
                      sortField="bankAccount" currentSort={sortField} sortDir={sortDir} onSort={() => toggleSort("bankAccount")} />
                    <ColumnFilter label="Amount" type="amount"
                      value={[]} onChange={() => {}}
                      amountMin={amountMin} amountMax={amountMax}
                      onAmountMinChange={(val) => { setAmountMin(val); setPage(1) }}
                      onAmountMaxChange={(val) => { setAmountMax(val); setPage(1) }}
                      sortField="amount" currentSort={sortField} sortDir={sortDir} onSort={() => toggleSort("amount")} />
                    <ColumnFilter label="Comments" type="text"
                      value={[]} onChange={() => {}}
                      textValue={notesFilter} onTextChange={(val) => { setNotesFilter(val); setPage(1) }} />
                    <th className="px-1.5 py-1 text-right"></th>
                    <ColumnFilter label="Type" type="multiselect"
                      options={distinctRecurrenceTypes.map((v) => ({ label: v, value: v }))}
                      value={recurrenceFilter} onChange={(vals) => { setRecurrenceFilter(vals); setPage(1) }} showBlankOption />
                    <ColumnFilter label="Other" type="text"
                      value={[]} onChange={() => {}}
                      textValue={otherTypeFilter} onTextChange={(val) => { setOtherTypeFilter(val); setPage(1) }} />
                  </tr>
                </thead>
                <tbody>
                  {isAddingNew && (
                    <tr className="border-b text-xs bg-muted/10">
                      <td className="px-1.5 py-1"></td>
                      <td className="px-1.5 py-1">
                        <DatePicker value={newForm.date} onChange={(d) => setNewForm({ ...newForm, date: d })} label="Date" />
                      </td>
                      <td className="px-1.5 py-1">
                        <input list="vendor-edit" className="h-6 text-[10px] px-1 rounded border border-input bg-transparent w-24 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newForm.vendor} onChange={(e) => setNewForm({ ...newForm, vendor: e.target.value })} placeholder="Vendor" />
                      </td>
                      <td className="px-1.5 py-1">
                        <Select value={newForm.categoryId} onValueChange={(v) => setNewForm({ ...newForm, categoryId: v })}>
                          <SelectTrigger className="h-6 text-[10px] w-24"><SelectValue placeholder="Cat" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1.5 py-1">
                        <input list="subcat-edit" className="h-6 text-[10px] px-1 rounded border border-input bg-transparent w-16 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newForm.subCategory} onChange={(e) => setNewForm({ ...newForm, subCategory: e.target.value })} placeholder="Sub" />
                      </td>
                      <td className="px-1.5 py-1">
                        <input list="person-edit" className="h-6 text-[10px] px-1 rounded border border-input bg-transparent w-16 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newForm.person} onChange={(e) => setNewForm({ ...newForm, person: e.target.value })} placeholder="Person" />
                      </td>
                      <td className="px-1.5 py-1">
                        <Select value={newForm.paymentMode} onValueChange={(v) => setNewForm({ ...newForm, paymentMode: v })}>
                          <SelectTrigger className="h-6 text-[10px] w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1.5 py-1">
                        <input list="bank-edit" className="h-6 text-[10px] px-1 rounded border border-input bg-transparent w-20 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newForm.bankAccount} onChange={(e) => setNewForm({ ...newForm, bankAccount: e.target.value })} placeholder="Bank" />
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <input type="number" className="h-6 text-[10px] px-1 rounded border border-input bg-transparent w-20 text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newForm.amount} onChange={(e) => setNewForm({ ...newForm, amount: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") handleAddNew() }} placeholder="0" />
                      </td>
                      <td className="px-1.5 py-1">
                        <input className="h-6 text-[10px] px-1 rounded border border-input bg-transparent w-20 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Notes" />
                      </td>
                      <td className="px-1.5 py-1 text-right whitespace-nowrap">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-emerald-500 hover:text-emerald-600"
                            onClick={handleAddNew} aria-label="Save">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={() => { setIsAddingNew(false); setNewForm(newFormDefault) }} aria-label="Cancel">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </Button>
                        </div>
                      </td>
                      <td className="px-1.5 py-1"></td>
                      <td className="px-1.5 py-1"></td>
                    </tr>
                  )}
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-muted-foreground text-sm">
                        {search ? "No matching expenses" : "No expenses yet. Add one or bulk import!"}
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => {
                      const isEditing = editingId === expense.id
                      const ef = editForm[expense.id] || { categoryId: String(expense.categoryId), subCategory: expense.subCategory || "", person: expense.person || "", vendor: expense.vendor || "" }
                      return (
                      <tr key={expense.id} className={`border-b transition-colors text-xs ${isEditing ? "bg-muted/20" : "hover:bg-muted/30"} ${selectedIds.has(expense.id) ? "bg-primary/5" : ""}`}><td className="px-1.5 py-1 w-8">
                          <input type="checkbox" className="h-3 w-3" checked={selectedIds.has(expense.id)}
                            onChange={() => toggleSelect(expense.id)} />
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap" title={(() => { const d = new Date(expense.date); return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 ? formatDate(expense.date) + " (no time recorded)" : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) })()}>{formatDate(expense.date)}</td>
                        <td className="px-1.5 py-1 max-w-[150px] truncate">
                          {isEditing ? (
                            <input list="vendor-edit" className="w-24 h-6 text-[10px] px-1 rounded border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                              value={ef.vendor} onChange={(e) => setEditForm((prev) => ({ ...prev, [expense.id]: { ...prev[expense.id], vendor: e.target.value } }))} />
                          ) : (
                            <>
                              <p className="font-medium flex items-center gap-1 leading-tight truncate" title={expense.vendor || ""}>
                                {expense.flagged && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Flagged for review" />
                                )}
                                {expense.vendor || "-"}
                              </p>
                              {expense.description && (
                                <p className="text-[10px] text-muted-foreground truncate leading-tight">{expense.description}</p>
                              )}
                            </>
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
                                onClick={() => saveInlineEdit(expense)} aria-label="Save">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:text-red-600"
                                onClick={() => promptDeleteExpense(expense.id)} aria-label="Delete">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                onClick={cancelInlineEdit} aria-label="Cancel">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary"
                              onClick={() => startInlineEdit(expense)} aria-label="Edit expense">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                        <td className="px-1.5 py-1 text-[10px]">{expense.recurrenceType && expense.recurrenceType !== "onetime" ? expense.recurrenceType : "-"}</td>
                        <td className="px-1.5 py-1 text-[10px] text-muted-foreground">{expense.otherType || "-"}</td>
                      </tr>
                    )})
                  )}
                  {!isAddingNew && (
                    <tr className="border-t text-xs text-muted-foreground hover:bg-muted/20 cursor-pointer"
                      onClick={() => { setIsAddingNew(true); setTimeout(() => { document.querySelector('.overflow-x-auto')?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, 100) }}>
                      <td colSpan={13} className="py-2 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                          Add expense
                        </span>
                      </td>
                    </tr>
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
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage(1)} aria-label="First page">
              First
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">
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
      <datalist id="vendor-edit">
        {distinctVendors.map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id="bank-edit">
        {distinctBankAccounts.filter(Boolean).map((v) => <option key={v} value={v} />)}
      </datalist>

      <DriveDialog
        open={driveDialogOpen}
        onOpenChange={setDriveDialogOpen}
        files={driveFiles}
        onPreview={handleDrivePreview}
        onImport={(fileId: string) => { addKnownGpayFile(fileId); return handleImportFromDrive(fileId) }}
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
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { resetGpayState(); setGpayDialogOpen(false) }}>
                    <X className="mr-1.5 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={() => { resetGpayState(); setGpayDialogOpen(false); startFreshExport() }}>
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Restart
                  </Button>
                </div>
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
                {gpayImportResult ? (
                  <>
                    <p className="text-sm font-medium">Import complete</p>
                    <p className="text-sm text-muted-foreground">
                      {gpayImportResult.imported > 0
                        ? `Imported ${gpayImportResult.imported} new GPay transaction${gpayImportResult.imported > 1 ? "s" : ""}.`
                        : "No new transactions found."}
                      {gpayImportResult.skipped > 0 && (
                        <><br /><span className="text-xs">({gpayImportResult.skipped} duplicate{gpayImportResult.skipped > 1 ? "s" : ""} skipped)</span></>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">GPay export created!</p>
                    {gpayAutoModeRef.current ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          The export has been submitted to your Google Drive. It may take a few minutes to appear.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This page will auto-detect it and import the transactions.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Follow the instructions in the Takeout tab, then download and upload the file using the <strong>File</strong> button.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {reauthStatus === "reauth_started" && (
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Re-authenticating...</p>
                <p className="text-sm text-muted-foreground">
                  A Chrome browser window should open. Log into your Google account, then close the browser.
                </p>
                <p className="text-xs text-muted-foreground">
                  If no window appears within 30 seconds, the automation may need to be reset.
                </p>
                <Button size="sm" variant="outline" onClick={() => {
                  if (reauthPollRef.current) clearInterval(reauthPollRef.current)
                  setReauthStatus("idle")
                  setGpayStep("idle")
                  setGpayDialogOpen(false)
                }}>
                  <X className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
            {reauthStatus === "reauth_complete" && (
              <div className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">Re-authentication complete!</p>
                {gpayReauthExportCreated ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      A new export was created during re-authentication. The file should appear in Drive shortly.
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button size="sm" onClick={async () => { setReauthStatus("idle"); setGpayDialogOpen(false); gpayAutoModeRef.current = true; setGpayStep("waiting_drive"); const found = await checkAndImportPendingGpayFile(); if (!found) startGpayDrivePolling() }}>
                        <Cloud className="mr-1.5 h-4 w-4" /> Wait for File
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-amber-600">
                      An export was already in progress — no new one was created. The existing file may already have been imported.
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button size="sm" onClick={async () => { setReauthStatus("idle"); setGpayDialogOpen(false); gpayAutoModeRef.current = true; setGpayStep("waiting_drive"); const found = await checkAndImportPendingGpayFile(); if (!found) { setGpayError("No new GPay export was created. Wait a few minutes and try Refresh GPay again."); setGpayStep("error") } }}>
                        <RefreshCw className="mr-1.5 h-4 w-4" /> Check Drive
                      </Button>
                    </div>
                  </>
                )}
                <div className="flex justify-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => { setReauthStatus("idle"); setGpayDialogOpen(false) }}>
                    Close
                  </Button>
                </div>
              </div>
            )}
            {reauthStatus === "reauth_failed" && (
              <div className="text-center space-y-3">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="text-sm font-medium">Re-authentication failed</p>
                {gpayError && (
                  <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-700 text-left font-mono break-all">
                    {gpayError}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Could not set up the Google session. Make sure Chrome is installed and try again.
                </p>
                <div className="flex justify-center gap-3">
                  <Button size="sm" onClick={() => { setReauthStatus("idle"); startReauth() }}>
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Try Again
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setReauthStatus("idle"); setGpayDialogOpen(false) }}>
                    <X className="mr-1.5 h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            )}
            {gpayStep === "error" && reauthStatus === "idle" && (
              <div className="text-center space-y-3">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="text-sm font-medium">GPay export failed</p>
                {gpayError && (
                  <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-700 text-left font-mono break-all">
                    {gpayError}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  The automated export could not be created. The session may need to be refreshed.
                </p>
                <div className="flex justify-center gap-3">
                  <Button size="sm" onClick={() => { setGpayDialogOpen(false); handleGpayTakeout() }}>
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setGpayDialogOpen(false); startReauth() }}>
                    <LogOut className="mr-1.5 h-4 w-4" /> Re-authenticate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setGpayDialogOpen(false); handleScanDrive() }}>
                    <Cloud className="mr-1.5 h-4 w-4" /> Scan Drive
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TransactionConfirm
        open={confirmTx.open}
        onOpenChange={(open) => setConfirmTx((prev) => ({ ...prev, open }))}
        title="Confirm Large Expense"
        description="You are about to add a large expense. Please review and confirm."
        amount={Number.parseFloat(confirmTx.pendingForm.amount || "0")}
        actionLabel="Add Expense"
        onConfirm={async () => {
          await doAddExpense(confirmTx.pendingForm)
          setConfirmTx({ open: false, pendingForm: newFormDefault })
        }}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
        title={confirmDelete.ids.length === 1 ? "Archive this expense?" : `Archive ${confirmDelete.ids.length} expenses?`}
        description={
          confirmDelete.ids.length === 1
            ? "This expense will be archived. It can be restored later from Archive."
            : `${confirmDelete.ids.length} expenses will be archived. They can be restored later from Archive.`
        }
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => {
          if (confirmDelete.ids.length === 1) {
            deleteExpense(confirmDelete.ids[0])
          } else {
            deleteSelected()
          }
          setConfirmDelete((prev) => ({ ...prev, open: false }))
        }}
      />
    </div>
  )
}
