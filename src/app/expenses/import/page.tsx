"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirectToLogin } from "@/lib/api"

interface SampleRow {
  date: string; expenseType: string; amount: number; description: string
  vendor: string; subCategory: string; person: string; paidThrough: string; bank: string
}

interface PreviewData {
  preview: boolean
  sheetName: string
  total: number
  dateRange: { from: string; to: string }
  totalAmount: number
  uniqueTypes: number
  uniquePersons: number
  years: number[]
  sample: SampleRow[]
  newVendorCount: number
  totalVendors: number
}

interface ImportResult {
  success: boolean
  imported: number
  skipped?: number
  newMappings: number
  total: number
  importSessionId?: number
  message: string
}

interface GpayPreviewData {
  preview: true
  source: string
  total: number
  willImport: number
  willSkip: number
  totalVendors: number
  autoMappable: number
  sample: { date: string; amount: number; vendor: string }[]
}

export default function ImportPage() {
  const [tab, setTab] = useState<"kcexpenses" | "gpay">("kcexpenses")
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [gpayPreview, setGpayPreview] = useState<GpayPreviewData | null>(null)
  const [gpayImporting, setGpayImporting] = useState(false)
  const [gpayResult, setGpayResult] = useState<{ message: string; imported: number; total: number; skipped: number; importSessionId?: number } | null>(null)
  const [gpayFile, setGpayFile] = useState<File | null>(null)
  const [gpayPreviews, setGpayPreviews] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    setPreview(null)
    setSelectedFile(file)
    setPreviewing(true)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/import/kcexpenses", { method: "POST", body: formData })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Preview failed"); return }
      setPreview(data)
    } catch (error_) {
      setError("Failed to preview: " + String(error_))
    } finally {
      setPreviewing(false)
      e.target.value = ""
    }
  }

  const handleImport = async () => {
    if (!preview || !selectedFile) return
    if (importing) return
    setImporting(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("confirm", "true")

    try {
      const res = await fetch("/api/import/kcexpenses", { method: "POST", body: formData })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Import failed"); setImporting(false); return }
      setResult(data)
      setPreview(null)
    } catch (error_) {
      setError("Import failed: " + String(error_))
    } finally {
      setImporting(false)
    }
  }

  const handleGPayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setGpayPreviews(true)
    setGpayResult(null)
    setError(null)
    setGpayFile(file)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/import/gpay-preview", { method: "POST", body: formData })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Preview failed"); setGpayPreviews(false); return }
      setGpayPreview(data)
    } catch (error_) {
      setError("Preview failed: " + String(error_))
    } finally {
      setGpayPreviews(false)
      e.target.value = ""
    }
  }

  const handleGPayImport = async () => {
    if (!gpayFile) return
    setGpayImporting(true)
    setError(null)
    const formData = new FormData()
    formData.append("file", gpayFile)
    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      if (res.status === 401) { redirectToLogin(); return }
      const data = await res.json()
      if (res.ok) {
        setGpayResult({ message: data.message || "", imported: data.imported || 0, total: data.total || 0, skipped: data.skipped || 0, importSessionId: data.importSessionId })
      } else {
        setGpayResult({ message: data.error || "GPay import failed", imported: 0, total: data.total || 0, skipped: 0 })
      }
      setGpayPreview(null)
    } catch (error_) {
      setGpayResult({ message: "Import failed: " + String(error_), imported: 0, total: 0, skipped: 0 })
    } finally {
      setGpayImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/expenses" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import</h1>
          <p className="text-muted-foreground">Bulk import expenses from a spreadsheet or GPay Takeout</p>
        </div>
      </div>

      {/* Import type tabs */}
      {!preview && !result && !importing && !previewing && !gpayPreview && !gpayResult && !gpayImporting && !gpayPreviews && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b">
            <button onClick={() => setTab("kcexpenses")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "kcexpenses" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              Upload Spreadsheet
            </button>
            <button onClick={() => setTab("gpay")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "gpay" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              GPay Takeout
            </button>
          </div>
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                {tab === "kcexpenses" ? <FileSpreadsheet className="h-10 w-10 text-muted-foreground" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
                <div>
                  <p className="text-base font-medium">{tab === "kcexpenses" ? "Upload Spreadsheet" : "GPay Takeout"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tab === "kcexpenses" ? ".xlsx format with Date, Expense Type, Amount, Person columns" : "Upload takeout ZIP or My Activity.html from Google Takeout"}
                  </p>
                </div>
                <label className="cursor-pointer">
                  <Button size="sm" asChild>
                    <span><Upload className="mr-2 h-4 w-4" /> Choose File</span>
                  </Button>
                  <input type="file" accept={tab === "kcexpenses" ? ".xlsx,.xls" : ".json,.zip,.htm,.html"} className="hidden" onChange={tab === "kcexpenses" ? handleFile : handleGPayUpload} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {importing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Importing expenses...</p>
              <p className="text-sm text-muted-foreground">This may take a minute for large files</p>
            </div>
          </CardContent>
        </Card>
      )}

      {previewing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Analysing spreadsheet...</p>
              <p className="text-sm text-muted-foreground">Parsing rows and deriving vendors — please wait</p>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Sheet</p>
                  <p className="text-lg font-semibold">{preview.sheetName}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                  <p className="text-lg font-semibold">{preview.total.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Date Range</p>
                  <p className="text-sm font-semibold">{preview.dateRange.from} — {preview.dateRange.to}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">₹{preview.totalAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Expense Types</p>
                  <p className="text-lg font-semibold">{preview.uniqueTypes}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Persons</p>
                  <p className="text-lg font-semibold">{preview.uniquePersons}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Years</p>
                  <p className="text-lg font-semibold">{preview.years.join(", ")}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Vendors</p>
                  <p className="text-lg font-semibold">{preview.newVendorCount} <span className="text-sm font-normal text-muted-foreground">/ {preview.totalVendors} new vendors learned</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Auto-learned with their category, sub-category &amp; person (deduped).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sample Data (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Vendor</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Sub Cat</th>
                      <th className="px-3 py-2">Person</th>
                      <th className="px-3 py-2">Paid Thru</th>
                      <th className="px-3 py-2">Bank</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2 font-medium">{row.vendor || "-"}</td>
                        <td className="px-3 py-2"><Badge variant="secondary">{row.expenseType}</Badge></td>
                        <td className="px-3 py-2 text-muted-foreground">{row.subCategory || "-"}</td>
                        <td className="px-3 py-2">{row.person || "-"}</td>
                        <td className="px-3 py-2">{row.paidThrough || "-"}</td>
                        <td className="px-3 py-2">{row.bank || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{row.description || "-"}</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">₹{row.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Vendors are auto-learned from this sheet (deduped) with their category, sub-category &amp; person.
            </p>
            <Button size="lg" onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import All {preview.total.toLocaleString()} Expenses
            </Button>
            <Button variant="outline" size="lg" onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {result && (
        <Card className={result.imported === 0 ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              {result.imported === 0
                ? <AlertCircle className="h-6 w-6 text-amber-500 mt-1" />
                : <CheckCircle2 className="h-6 w-6 text-emerald-500 mt-1" />}
              <div>
                <h3 className={`text-lg font-semibold ${result.imported === 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {result.imported === 0 ? "Nothing New to Import" : "Import Successful"}
                </h3>
                <p className="text-sm mt-1">{result.message}</p>
                <div className="flex gap-6 mt-3 text-sm">
                  <span>✅ <strong>{result.imported}</strong> expenses imported</span>
                  {result.skipped ? <span>⏭️ <strong>{result.skipped}</strong> already existed</span> : null}
                  <span>📦 <strong>{result.newMappings}</strong> merchant mappings created</span>
                </div>
                <div className="flex gap-3 mt-4">
                  {result.imported > 0 ? (
                    <Link href={`/expenses${result.importSessionId ? `?importSessionId=${result.importSessionId}` : ""}`}>
                      <Button>View Imported</Button>
                    </Link>
                  ) : (
                    <Link href="/expenses">
                      <Button>View All Expenses</Button>
                    </Link>
                  )}
                  <Link href="/expenses/import">
                    <Button variant="outline">Import Another</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {gpayPreviews && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-2 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing GPay Takeout...
          </CardContent>
        </Card>
      )}

      {gpayPreview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">GPay Import Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Records</p>
                  <p className="text-lg font-semibold">{gpayPreview.total.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Will Import</p>
                  <p className="text-lg font-semibold text-emerald-600">{gpayPreview.willImport.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Already Exist (skip)</p>
                  <p className="text-lg font-semibold text-amber-600">{gpayPreview.willSkip.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Unique Vendors</p>
                  <p className="text-lg font-semibold">{gpayPreview.totalVendors}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Auto-Mappable</p>
                  <p className="text-lg font-semibold">{gpayPreview.autoMappable} <span className="text-sm font-normal text-muted-foreground">/ {gpayPreview.totalVendors}</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{gpayPreview.totalVendors - gpayPreview.autoMappable} go to Unmapped for review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {gpayPreview.sample.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample Data (first {gpayPreview.sample.length} rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Vendor</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gpayPreview.sample.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                          <td className="px-3 py-2 font-medium">{row.vendor || "-"}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{row.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="lg" onClick={handleGPayImport} disabled={gpayImporting}>
              {gpayImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import All {gpayPreview.total.toLocaleString()} Records
            </Button>
            <Button variant="outline" size="lg" onClick={() => { setGpayPreview(null); setGpayFile(null) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {gpayImporting && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-2 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing GPay Takeout...
          </CardContent>
        </Card>
      )}

      {gpayResult && (
        <Card className={gpayResult.message.includes("fail") ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {gpayResult.message.includes("fail") ? <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{gpayResult.message}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>📄 {gpayResult.total} found</span>
                  <span>✅ {gpayResult.imported} imported</span>
                  {gpayResult.skipped > 0 && <span>⏭️ {gpayResult.skipped} skipped</span>}
                </div>
                {!gpayResult.message.includes("fail") && (
                  <div className="flex gap-3 mt-3">
                    <Link href={`/expenses${gpayResult.importSessionId ? `?importSessionId=${gpayResult.importSessionId}` : ""}`}>
                      <Button size="sm">View Imported</Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => { setGpayResult(null); setGpayFile(null) }}>
                      Import Another
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Error</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
