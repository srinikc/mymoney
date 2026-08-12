"use client"

import { useRef, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Upload, CheckCircle2, Sparkles } from "lucide-react"
import { toast } from "sonner"

type BankKey = "auto" | "yesbank" | "axis" | "hdfc" | "icici" | "sbi" | "generic"

interface SampleRow {
  expenseId: number
  reason: string
  merchant: string
  context: string
  bankAccount: string | null
  currentDescription: string | null
  proposedDescription: string | null
  bankDate: string
  bankNarration: string
}

interface PreviewData {
  format: string
  bank: string
  totalRows: number
  debitCount: number
  dateRange: { from: string; to: string }
  candidateCount: number
  matchedCount: number
  alreadyCount: number
  unmatched: number
  notes: string | null
  sample: SampleRow[]
  updates: { expenseId: number; description: string }[]
}

interface BankAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied?: () => void
}

const BANKS: { value: BankKey; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "yesbank", label: "Yes Bank" },
  { value: "axis", label: "Axis Bank" },
  { value: "hdfc", label: "HDFC Bank" },
  { value: "icici", label: "ICICI Bank" },
  { value: "sbi", label: "SBI" },
  { value: "generic", label: "Generic / Other" },
]

export function BankAnalysisDialog({ open, onOpenChange, onApplied }: BankAnalysisDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [bank, setBank] = useState<BankKey>("auto")
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [fileName, setFileName] = useState("")
  const [applied, setApplied] = useState(false)

  const reset = useCallback(() => {
    setPreview(null)
    setFileName("")
    setApplied(false)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const handleChoose = () => fileRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setAnalyzing(true)
    setApplied(false)
    toast("Analyzing statement…")
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (bank !== "auto") formData.append("bank", bank)
      const res = await fetch("/api/import/bank-analysis", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Analysis failed")
        setPreview(null)
      } else {
        setPreview(data)
      }
    } catch {
      toast.error("Failed to analyze the bank statement")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApply = async () => {
    if (!preview) return
    const updates = preview.updates || []
    if (updates.length === 0) return

    setApplying(true)
    try {
      const res = await fetch("/api/import/bank-analysis/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setApplied(true)
        toast.success(`Enriched ${data.updated} expense${data.updated === 1 ? "" : "s"}`)
        onApplied?.()
      } else {
        toast.error(data.error || "Failed to apply")
      }
    } catch {
      toast.error("Failed to apply")
    } finally {
      setApplying(false)
    }
  }

  const actionable = preview?.updates ?? []
  const canApply = preview && actionable.length > 0 && !applying
  const reasonLabel: Record<string, string> = {
    context_appended: "Note appended",
    merchant_only: "Merchant",
    self_transfer: "Self transfer",
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { reset(); setApplied(false) } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bank Transaction Analysis
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a bank statement to recover the GPAY note text (context) that bank statements keep but the
              GPAY import drops, and append it to the expense descriptions.
            </p>
            <div className="flex items-end gap-3">
              <div className="w-44">
                <Select value={bank} onValueChange={(v) => setBank(v as BankKey)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANKS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden"
                onChange={handleFile} />
              <Button onClick={handleChoose} disabled={analyzing} className="h-9">
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {analyzing ? "Analyzing…" : "Upload Statement"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported: CSV, XLSX/XLS, PDF. Matching is amount within ₹1 on the exact same calendar day.
            </p>
          </div>
        ) : applied ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-medium">Enrichment applied</p>
            <p className="text-sm text-muted-foreground">
              Up to {actionable.length} expense descriptions were updated with recovered notes.
            </p>
            <Button variant="outline" size="sm" onClick={() => { reset(); setApplied(false) }}>
              Analyze another statement
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="rounded border bg-background px-3 py-1.5">
                <p className="text-[10px] text-muted-foreground">Statement</p>
                <p className="text-xs font-semibold max-w-[180px] truncate">{fileName}</p>
              </div>
              <div className="rounded border bg-background px-3 py-1.5">
                <p className="text-[10px] text-muted-foreground">Bank</p>
                <p className="text-xs font-semibold">{preview.bank}</p>
              </div>
              <div className="rounded border bg-background px-3 py-1.5">
                <p className="text-[10px] text-muted-foreground">Rows</p>
                <p className="text-xs font-semibold">{preview.totalRows}</p>
              </div>
              <div className="rounded border bg-background px-3 py-1.5">
                <p className="text-[10px] text-muted-foreground">Matched</p>
                <p className="text-xs font-semibold text-emerald-600">{preview.matchedCount}</p>
              </div>
              <div className="rounded border bg-background px-3 py-1.5">
                <p className="text-[10px] text-muted-foreground">Date Range</p>
                <p className="text-xs font-semibold">{preview.dateRange.from} → {preview.dateRange.to}</p>
              </div>
            </div>

            {preview.notes && (
              <p className="rounded bg-amber-500/10 p-2 text-xs text-amber-700">{preview.notes}</p>
            )}

            {preview.sample.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No matches found. The statement may cover different dates than the GPAY expenses, or the bank may
                be different from the accounts on record.
              </p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-2 py-1.5">Merchant / Context</th>
                          <th className="px-2 py-1.5">Current</th>
                          <th className="px-2 py-1.5">Proposed</th>
                          <th className="px-2 py-1.5">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((s) => (
                          <tr key={s.expenseId} className="border-b align-top">
                            <td className="px-2 py-1.5">
                              <span className="font-medium">{s.merchant || "—"}</span>
                              {s.context && <span className="text-muted-foreground"> · {s.context}</span>}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground max-w-[180px] truncate">
                              {s.currentDescription || <span className="italic">blank</span>}
                            </td>
                            <td className="px-2 py-1.5 text-emerald-700 max-w-[180px] truncate">
                              {s.proposedDescription || <span className="text-muted-foreground italic">—</span>}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                              {reasonLabel[s.reason] ?? s.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.sample.length < preview.matchedCount && (
                    <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                      Showing {preview.sample.length} of {preview.matchedCount} matches.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleApply} disabled={!canApply}>
                {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {applying ? "Applying…" : `Apply ${actionable.length} updates`}
              </Button>
              <Button variant="outline" onClick={reset} disabled={applying}>
                Try another file
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={applying}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}