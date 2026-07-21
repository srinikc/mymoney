"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IndianRupee,
  FileText,
  Receipt,
  TrendingUp,
  Upload,
  Trash2,
  Plus,
  Pencil,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"

const FY_OPTIONS = ["2026-27", "2025-26", "2024-25", "2023-24"]
const DOC_TYPES = [
  { value: "form16", label: "Form 16" },
  { value: "form26as", label: "Form 26AS" },
  { value: "form10e", label: "Form 10E (Arrears)" },
  { value: "capital_gains", label: "Capital Gains Statement" },
  { value: "home_loan_cert", label: "Home Loan Certificate" },
  { value: "rent_receipts", label: "Rent Receipts" },
  { value: "donation_receipt", label: "Donation Receipt" },
  { value: "other", label: "Other" },
]
const ITR_FORMS = ["ITR-1 (Sahaj)", "ITR-2", "ITR-3", "ITR-4 (Sugam)"]
const ITR_STATUSES = ["not_filed", "in_progress", "filed", "verified", "refund_received"]

const ITR_STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  not_filed: { label: "Not Filed", icon: XCircle, color: "text-gray-500" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-500" },
  filed: { label: "Filed", icon: CheckCircle2, color: "text-emerald-500" },
  verified: { label: "Verified", icon: CheckCircle2, color: "text-emerald-600" },
  refund_received: { label: "Refund Received", icon: IndianRupee, color: "text-green-600" },
}

interface TaxSummary {
  fy: string
  grossTotalIncome: number
  incomeSources: { monthly: number; yearly: number; oneTime: number; variable: number }
  salaryIncome: number
  tdsFromForm16: number
  tdsFrom26AS: number
  documentsCount: number
}

interface TaxDocument {
  id: number
  type: string
  fy: string
  label: string | null
  fileName: string
  filePath: string
  mimeType: string
  fileSize: number
  metadata: any
  notes: string | null
  createdAt: string
}

interface ITRRecord {
  id: number
  ay: string
  itrForm: string
  status: string
  filedDate: string | null
  acknowledgmentNo: string | null
  refundAmount: number | null
  taxableIncome: number | null
  taxLiability: number | null
  tdsClaimed: number | null
  uploadedCopy: string | null
  notes: string | null
  createdAt: string
}

const TAX_BRACKETS_OLD = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250001, max: 500000, rate: 0.05 },
  { min: 500001, max: 1000000, rate: 0.2 },
  { min: 1000001, max: Infinity, rate: 0.3 },
]
const TAX_BRACKETS_NEW = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300001, max: 600000, rate: 0.05 },
  { min: 600001, max: 900000, rate: 0.1 },
  { min: 900001, max: 1200000, rate: 0.15 },
  { min: 1200001, max: 1500000, rate: 0.2 },
  { min: 1500001, max: Infinity, rate: 0.3 },
]

function calcTax(income: number, brackets: typeof TAX_BRACKETS_OLD): number {
  let tax = 0
  for (const b of brackets) {
    if (income > b.min) {
      const taxable = Math.min(income, b.max) - b.min
      tax += taxable * b.rate
    }
  }
  return Math.max(0, tax)
}

const docTypeLabel = (type: string) => DOC_TYPES.find((d) => d.value === type)?.label || type
const docTypeIcon = (type: string) => {
  if (type === "form16" || type === "form26as" || type === "form10e") return FileText
  if (type === "capital_gains" || type === "home_loan_cert") return Receipt
  return FileText
}
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function IncomeTab({ summary, fy, loading }: { summary: TaxSummary | null; fy: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const oldTax = summary ? calcTax(summary.grossTotalIncome, TAX_BRACKETS_OLD) : 0
  const newTax = summary ? calcTax(summary.grossTotalIncome, TAX_BRACKETS_NEW) : 0

  return (
    <div className="space-y-6">
      {summary && summary.grossTotalIncome === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <IndianRupee className="mx-auto h-8 w-8 mb-3 opacity-50" />
            <p>No income sources found. Add income sources first.</p>
          </CardContent>
        </Card>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Gross Total Income</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.grossTotalIncome)}</p>
                <p className="text-xs text-muted-foreground">FY {fy}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.incomeSources.monthly)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Salary (Form 16)</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.salaryIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{summary.documentsCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Tax Regime Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Old Regime</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(oldTax)}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    Income: {formatCurrency(summary.grossTotalIncome)} × {(oldTax / Math.max(summary.grossTotalIncome, 1) * 100).toFixed(1)}% effective
                  </p>
                </div>
                <div className={`rounded-lg border p-4 ${newTax <= oldTax ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950" : "border-gray-200"}`}>
                  <p className={`text-sm font-medium ${newTax <= oldTax ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600"}`}>
                    New Regime {newTax <= oldTax && <Badge variant="default" className="ml-2 text-[10px]">Recommended</Badge>}
                  </p>
                  <p className={`text-3xl font-bold ${newTax <= oldTax ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600"}`}>{formatCurrency(newTax)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Savings: {formatCurrency(Math.abs(oldTax - newTax))} {oldTax > newTax ? "under New" : "under Old"} regime
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold">Standard Deductions</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">80C Limit</p>
                    <p className="text-lg font-semibold">{formatCurrency(150000)}</p>
                    <p className="text-xs text-muted-foreground">ELSS, PPF, EPF, Insurance, etc.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">80D Limit</p>
                    <p className="text-lg font-semibold">{formatCurrency(25000)}</p>
                    <p className="text-xs text-muted-foreground">Health insurance (self + family)</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">NPS 80CCD(1B)</p>
                    <p className="text-lg font-semibold">{formatCurrency(50000)}</p>
                    <p className="text-xs text-muted-foreground">Additional NPS contribution</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function DocumentsTab({ fy }: { fy: string }) {
  const [documents, setDocuments] = useState<TaxDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadType, setUploadType] = useState("")
  const [uploadLabel, setUploadLabel] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/tax/documents?fy=${fy}`)
      if (res.ok) setDocuments(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [fy])

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleUpload = async () => {
    if (!file || !uploadType) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("type", uploadType)
      body.append("fy", fy)
      if (uploadLabel) body.append("label", uploadLabel)
      Object.entries(formData).forEach(([k, v]) => { if (v) body.append(k, v) })

      const res = await fetch("/api/tax/documents", { method: "POST", body })
      const data = await res.json()

      if (res.status === 409) {
        if (confirm(`${data.error}. Replace?`)) {
          body.append("replace", "true")
          const retry = await fetch("/api/tax/documents", { method: "POST", body })
          if (!retry.ok) throw new Error((await retry.json()).error)
        } else {
          setUploading(false)
          return
        }
      } else if (!res.ok) {
        throw new Error(data.error)
      }

      toast.success(data.message)
      setShowUpload(false)
      setFile(null)
      setUploadType("")
      setUploadLabel("")
      setFormData({})
      loadDocs()
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/tax/documents/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Document deleted")
      loadDocs()
    } catch {
      toast.error("Failed to delete document")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{documents.length} document(s) for FY {fy}</p>
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogTrigger asChild>
            <Button size="sm"><Upload className="mr-2 h-4 w-4" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Upload Tax Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} placeholder="e.g., Employer: ABC Corp" />
              </div>
              <div>
                <Label>File (PDF, PNG, JPG — max 10MB)</Label>
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({formatBytes(file.size)})</p>}
              </div>

              {uploadType === "form16" && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                  <p className="text-sm font-medium">Form 16 Metadata (optional)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Gross Salary (₹)</Label><Input type="number" value={formData.grossSalary || ""} onChange={(e) => setFormData((p) => ({ ...p, grossSalary: e.target.value }))} /></div>
                    <div><Label>TDS Deducted (₹)</Label><Input type="number" value={formData.tds || ""} onChange={(e) => setFormData((p) => ({ ...p, tds: e.target.value }))} /></div>
                    <div><Label>Employer Name</Label><Input value={formData.employerName || ""} onChange={(e) => setFormData((p) => ({ ...p, employerName: e.target.value }))} /></div>
                    <div><Label>TAN</Label><Input value={formData.tan || ""} onChange={(e) => setFormData((p) => ({ ...p, tan: e.target.value }))} /></div>
                    <div><Label>PAN</Label><Input value={formData.pan || ""} onChange={(e) => setFormData((p) => ({ ...p, pan: e.target.value }))} /></div>
                  </div>
                </div>
              )}
              {uploadType === "form26as" && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                  <p className="text-sm font-medium">Form 26AS Metadata (optional)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>TDS as per 26AS (₹)</Label><Input type="number" value={formData.tds || ""} onChange={(e) => setFormData((p) => ({ ...p, tds: e.target.value }))} /></div>
                    <div><Label>PAN</Label><Input value={formData.pan || ""} onChange={(e) => setFormData((p) => ({ ...p, pan: e.target.value }))} /></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={!file || !uploadType || uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-8 w-8 mb-3 opacity-50" />
            <p>No documents uploaded for FY {fy}.</p>
            <p className="text-xs mt-1">Upload Form 16, Form 26AS, or other tax documents.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const Icon = docTypeIcon(doc.type)
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.label || docTypeLabel(doc.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileName} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View metadata</summary>
                          <pre className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded">{JSON.stringify(doc.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete "{doc.label || docTypeLabel(doc.type)}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ITRTab({ fy }: { fy: string }) {
  const [records, setRecords] = useState<ITRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ITRRecord | null>(null)
  const [form, setForm] = useState({ ay: fy.replace("-", "-").replace("25", "26"), itrForm: "", status: "", filedDate: "", acknowledgmentNo: "", taxableIncome: "", taxLiability: "", tdsClaimed: "", refundAmount: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const loadITRs = useCallback(async () => {
    try {
      const res = await fetch("/api/tax/itr")
      if (res.ok) setRecords(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadITRs() }, [loadITRs])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: any = { ...form }
      if (body.filedDate) body.filedDate = body.filedDate ? new Date(body.filedDate).toISOString() : null
      body.taxableIncome = body.taxableIncome ? Number(body.taxableIncome) : null
      body.taxLiability = body.taxLiability ? Number(body.taxLiability) : null
      body.tdsClaimed = body.tdsClaimed ? Number(body.tdsClaimed) : null
      body.refundAmount = body.refundAmount ? Number(body.refundAmount) : null

      const url = editing ? `/api/tax/itr/${editing.id}` : "/api/tax/itr"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to save")
      toast.success(editing ? "ITR updated" : "ITR record created")
      setShowForm(false)
      setEditing(null)
      resetForm()
      loadITRs()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/tax/itr/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("ITR record deleted")
      loadITRs()
    } catch {
      toast.error("Failed to delete")
    }
  }

  const resetForm = () => {
    const nextAy = `${Number(fy.split("-")[0]) + 1}-${fy.split("-")[1]}`
    const ay = fy === "2026-27" ? nextAy : `20${fy.split("-")[0].slice(-2)}-${fy.split("-")[1]}`
    setForm({ ay, itrForm: "", status: "", filedDate: "", acknowledgmentNo: "", taxableIncome: "", taxLiability: "", tdsClaimed: "", refundAmount: "", notes: "" })
  }

  const openEdit = (r: ITRRecord) => {
    setEditing(r)
    setForm({
      ay: r.ay,
      itrForm: r.itrForm,
      status: r.status,
      filedDate: r.filedDate ? r.filedDate.split("T")[0] : "",
      acknowledgmentNo: r.acknowledgmentNo || "",
      taxableIncome: r.taxableIncome?.toString() || "",
      taxLiability: r.taxLiability?.toString() || "",
      tdsClaimed: r.tdsClaimed?.toString() || "",
      refundAmount: r.refundAmount?.toString() || "",
      notes: r.notes || "",
    })
    setShowForm(true)
  }

  const grouped = records.reduce<Record<string, ITRRecord[]>>((acc, r) => {
    if (!acc[r.ay]) acc[r.ay] = []
    acc[r.ay].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{records.length} ITR record(s)</p>
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditing(null); resetForm() } }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditing(null); resetForm() }}><Plus className="mr-2 h-4 w-4" /> Add ITR Record</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit ITR Record" : "Add ITR Record"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Assessment Year</Label><Input value={form.ay} onChange={(e) => setForm((p) => ({ ...p, ay: e.target.value }))} placeholder="e.g., 2025-26" /></div>
                <div><Label>ITR Form</Label>
                  <Select value={form.itrForm} onValueChange={(v) => setForm((p) => ({ ...p, itrForm: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ITR_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ITR_STATUSES.map((s) => <SelectItem key={s} value={s}>{ITR_STATUS_CONFIG[s]?.label || s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Filed Date</Label><Input type="date" value={form.filedDate} onChange={(e) => setForm((p) => ({ ...p, filedDate: e.target.value }))} /></div>
                <div><Label>Acknowledgment No.</Label><Input value={form.acknowledgmentNo} onChange={(e) => setForm((p) => ({ ...p, acknowledgmentNo: e.target.value }))} /></div>
                <div><Label>Taxable Income (₹)</Label><Input type="number" value={form.taxableIncome} onChange={(e) => setForm((p) => ({ ...p, taxableIncome: e.target.value }))} /></div>
                <div><Label>Tax Liability (₹)</Label><Input type="number" value={form.taxLiability} onChange={(e) => setForm((p) => ({ ...p, taxLiability: e.target.value }))} /></div>
                <div><Label>TDS Claimed (₹)</Label><Input type="number" value={form.tdsClaimed} onChange={(e) => setForm((p) => ({ ...p, tdsClaimed: e.target.value }))} /></div>
                <div><Label>Refund Amount (₹)</Label><Input type="number" value={form.refundAmount} onChange={(e) => setForm((p) => ({ ...p, refundAmount: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Save"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-8 w-8 mb-3 opacity-50" />
            <p>No ITR filings yet.</p>
            <p className="text-xs mt-1">Add your first ITR record to track filings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([ay, recs]) => (
            <div key={ay}>
              <h3 className="text-sm font-semibold mb-2">AY {ay}</h3>
              {recs.map((rec) => {
                const config = ITR_STATUS_CONFIG[rec.status] || ITR_STATUS_CONFIG.not_filed
                const StatusIcon = config.icon
                return (
                  <Card key={rec.id} className="mb-2">
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                        <div>
                          <p className="text-sm font-medium">{rec.itrForm}</p>
                          <p className="text-xs text-muted-foreground">
                            {config.label}
                            {rec.filedDate && ` · Filed: ${new Date(rec.filedDate).toLocaleDateString()}`}
                            {rec.acknowledgmentNo && ` · Ack: ${rec.acknowledgmentNo}`}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            {rec.taxableIncome != null && <span>Income: {formatCurrency(rec.taxableIncome)}</span>}
                            {rec.taxLiability != null && <span>Tax: {formatCurrency(rec.taxLiability)}</span>}
                            {rec.refundAmount != null && rec.refundAmount > 0 && <span>Refund: {formatCurrency(rec.refundAmount)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rec)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete ITR Record</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to delete this ITR record for AY {rec.ay}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rec.id)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectionsTab({ fy }: { fy: string }) {
  const [summary, setSummary] = useState<TaxSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [deductions, setDeductions] = useState({ sec80C: 0, sec80D: 0, sec80CCD1B: 0, hra: 0, homeLoanInterest: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/tax/summary?fy=${fy}`)
        if (res.ok) setSummary(await res.json())
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
  }, [fy])

  if (loading) return <Skeleton className="h-64 w-full" />

  if (!summary || summary.grossTotalIncome === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="mx-auto h-8 w-8 mb-3 opacity-50" />
          <p>Add income sources to see tax projections.</p>
        </CardContent>
      </Card>
    )
  }

  const totalDeductions = deductions.sec80C + deductions.sec80D + deductions.sec80CCD1B + deductions.hra + deductions.homeLoanInterest
  const taxableIncome = Math.max(0, summary.grossTotalIncome - totalDeductions)
  const oldTax = calcTax(taxableIncome, TAX_BRACKETS_OLD)
  const newTax = calcTax(summary.grossTotalIncome, TAX_BRACKETS_NEW)
  const recommendedTax = Math.min(oldTax, newTax)
  const tdsFromSources = (summary.tdsFromForm16 || 0) + (summary.tdsFrom26AS || 0)
  const estimatedRefund = tdsFromSources - recommendedTax
  const advTaxThreshold = 10000
  const advTaxInstallments = [
    { due: "15 Jun", percent: 0.15 },
    { due: "15 Sep", percent: 0.45 },
    { due: "15 Dec", percent: 0.75 },
    { due: "15 Mar", percent: 1 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Projected Annual Income</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.grossTotalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estimated Tax (Recommended)</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(recommendedTax)}</p>
            <p className="text-xs text-muted-foreground">
              {oldTax <= newTax ? "Old regime" : "New regime"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">TDS from Documents</p>
            <p className="text-2xl font-bold">{formatCurrency(tdsFromSources)}</p>
            <p className={`text-xs ${estimatedRefund > 0 ? "text-emerald-500" : "text-red-500"}`}>
              {estimatedRefund >= 0 ? `Refund: ${formatCurrency(estimatedRefund)}` : `Payable: ${formatCurrency(-estimatedRefund)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Deductions Estimator</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>80C (ELSS/PPF/EPF)</Label>
              <Input type="number" value={deductions.sec80C} onChange={(e) => setDeductions((p) => ({ ...p, sec80C: Number(e.target.value) }))} max={150000} />
              <p className="text-xs text-muted-foreground">Max: ₹1.5L {deductions.sec80C < 150000 && `· ₹${formatCurrency(150000 - deductions.sec80C)} remaining`}</p>
            </div>
            <div>
              <Label>80D (Health Insurance)</Label>
              <Input type="number" value={deductions.sec80D} onChange={(e) => setDeductions((p) => ({ ...p, sec80D: Number(e.target.value) }))} max={25000} />
              <p className="text-xs text-muted-foreground">Max: ₹25K</p>
            </div>
            <div>
              <Label>NPS 80CCD(1B)</Label>
              <Input type="number" value={deductions.sec80CCD1B} onChange={(e) => setDeductions((p) => ({ ...p, sec80CCD1B: Number(e.target.value) }))} max={50000} />
              <p className="text-xs text-muted-foreground">Max: ₹50K</p>
            </div>
            <div>
              <Label>HRA</Label>
              <Input type="number" value={deductions.hra} onChange={(e) => setDeductions((p) => ({ ...p, hra: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Home Loan Interest (24b)</Label>
              <Input type="number" value={deductions.homeLoanInterest} onChange={(e) => setDeductions((p) => ({ ...p, homeLoanInterest: Number(e.target.value) }))} max={200000} />
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted/30">
            <p className="text-sm">Total Deductions: <strong>{formatCurrency(totalDeductions)}</strong> · Taxable Income: <strong>{formatCurrency(taxableIncome)}</strong></p>
          </div>
        </CardContent>
      </Card>

      {recommendedTax > advTaxThreshold && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Advance Tax Payment Recommended</p>
                <p className="text-xs text-muted-foreground">
                  Your estimated tax liability of {formatCurrency(recommendedTax)} exceeds ₹10,000. Consider paying advance tax.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {advTaxInstallments.map((inst, i) => {
                const amount = recommendedTax * inst.percent
                const prevAmount = i > 0 ? recommendedTax * advTaxInstallments[i - 1].percent : 0
                const installmentAmount = amount - prevAmount
                return (
                  <div key={inst.due} className="rounded-lg border p-2 text-center">
                    <p className="text-xs text-muted-foreground">Due {inst.due}</p>
                    <p className="text-sm font-semibold">{formatCurrency(installmentAmount)}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {deductions.sec80C < 150000 && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-sm">
                You can invest <strong>{formatCurrency(150000 - deductions.sec80C)}</strong> more to utilize the 80C limit of ₹1.5L.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState("income")
  const [fy, setFy] = useState("2025-26")
  const [summary, setSummary] = useState<TaxSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setSummaryLoading(true)
      try {
        const res = await fetch(`/api/tax/summary?fy=${fy}`)
        if (res.ok) setSummary(await res.json())
      } catch {} finally {
        setSummaryLoading(false)
      }
    }
    load()
  }, [fy])

  const tabs = [
    { id: "income", label: "Income & Deductions" },
    { id: "documents", label: "Documents" },
    { id: "itr", label: "ITR Filings" },
    { id: "projections", label: "Projections" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax</h1>
          <p className="text-muted-foreground">Income summary, deductions, documents, and ITR filings</p>
        </div>
        <Select value={fy} onValueChange={setFy}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FY_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>FY {y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "income" && <IncomeTab summary={summary} fy={fy} loading={summaryLoading} />}
      {activeTab === "documents" && <DocumentsTab fy={fy} />}
      {activeTab === "itr" && <ITRTab fy={fy} />}
      {activeTab === "projections" && <ProjectionsTab fy={fy} />}
    </div>
  )
}
