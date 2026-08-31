"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { Mail, RefreshCw, Check, Loader2, LogIn, CircleStop, Settings2, Save, X, Plus } from "lucide-react"

interface Transaction {
  type: string
  date: string
  amount: number
  description: string
  vendor?: string
  category?: string
  messageId: string
  emailSubject?: string
  emailSnippet?: string
  emailFrom?: string
  alreadyExists?: boolean
  source?: string
}

interface ScanStatus {
  id: number
  status: string
  totalEmails: number
  processed: number
  parsed: number
  alreadyImported: number
  error?: string | null
}

interface JournalEntry {
  matched: number
  alreadyExists: number
  imported: number
}

interface ImportSummary {
  imported: number
  skippedExisting: number
  skippedAlreadyImported: number
  total: number
}

export default function GmailImportPage() {
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<ScanStatus | null>(null)
  const [scanId, setScanId] = useState<number | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [importedResults, setImportedResults] = useState<Array<{ id: number; type: string; amount: number; date: string; description: string; vendor?: string; category?: string; emailSnippet?: string }>>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [journal, setJournal] = useState<Record<string, JournalEntry> | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [keywords, setKeywords] = useState<Record<string, string[]>>({})
  const [showKeywords, setShowKeywords] = useState(false)
  const [savingKeywords, setSavingKeywords] = useState(false)
  const [newTerm, setNewTerm] = useState<Record<string, string>>({})
  const [scanRange, setScanRange] = useState("since-last")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const modulePath = (type: string) => {
    switch (type) {
      case "expense": return "/expenses"
      case "income":
      case "salary": return "/income"
      case "investment": return "/investments"
      case "insurance": return "/insurance"
      case "subscription": return "/subscriptions"
      case "asset": return "/assets"
      case "tax_document": return "/tax-documents"
      default: return "/expenses"
    }
  }

  const moduleLabel = (type: string) => {
    switch (type) {
      case "expense": return "View in Expenses"
      case "income":
      case "salary": return "View in Income"
      case "investment": return "View in Investments"
      case "insurance": return "View in Insurance"
      case "subscription": return "View in Subscriptions"
      case "asset": return "View in Assets"
      case "tax_document": return "View in Tax Documents"
      default: return "View"
    }
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const applyStatus = (scan: ScanStatus, txs: Transaction[], j: Record<string, JournalEntry> | null = null) => {
    setSummary(scan)
    setTransactions(txs)
    if (j) setJournal(j)
    if (scan.status === "done" || scan.status === "error") {
      setScanning(false)
      stopPolling()
      setScanId(null)
      if (scan.status === "error") {
        toast.error(scan.error || "Scan failed")
      } else if (txs.length > 0) {
        toast.success(`Scan complete: ${txs.length} transactions found`)
      }
    }
  }

  const pollScan = (id: number) => {
    stopPolling()
    const tick = async () => {
      try {
        const res = await fetch(`/api/gmail/scan/status?scanId=${id}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (!data.scan) return
        applyStatus(data.scan, data.transactions || [], data.journal || null)
      } catch {
        // transient — keep polling
      }
    }
    void tick()
    pollRef.current = setInterval(() => void tick(), 2500)
  }

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(data => setConnected(data.connected)).catch(() => setConnected(false))

    // Resume a scan still running in the background (e.g. after navigating back)
    fetch("/api/gmail/scan/status")
      .then(r => r.json())
      .then((data) => {
        if (!data.scan) return
        const s = data.scan as ScanStatus
        setScanId(s.id)
        setTransactions(data.transactions || [])
        if (data.journal) setJournal(data.journal)
        if (s.status === "running") {
          setScanning(true)
          setSummary(s)
          pollScan(s.id)
        } else if (s.status === "done" && data.transactions?.length) {
          setSummary(s)
        }
      })
      .catch(() => {})
    return stopPolling
  }, [])

  useEffect(() => {
    fetch("/api/gmail/keywords")
      .then(r => {
        if (r.status === 401 || r.status === 404) {
          window.location.href = "/login?callbackUrl=/gmail-import"
          throw new Error("unauthorized")
        }
        return r.json()
      })
      .then(data => setKeywords(data.keywords || {}))
      .catch(() => {})
  }, [])

  const handleSaveKeywords = async () => {
    setSavingKeywords(true)
    try {
      const res = await fetch("/api/gmail/keywords", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setKeywords(data.keywords || {})
      toast.success("Parser keywords saved — next scan uses them")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save keywords")
    } finally {
      setSavingKeywords(false)
    }
  }

  const addTerm = (cat: string) => {
    const term = (newTerm[cat] || "").trim()
    if (!term) return
    setKeywords(prev => ({
      ...prev,
      [cat]: [...(prev[cat] || []), term],
    }))
    setNewTerm(prev => ({ ...prev, [cat]: "" }))
  }

  const removeTerm = (cat: string, term: string) => {
    setKeywords(prev => ({
      ...prev,
      [cat]: (prev[cat] || []).filter(t => t !== term),
    }))
  }

  const handleScan = async () => {
    setScanning(true)
    setTransactions([])
    setSelected(new Set())
    setSummary(null)
    setJournal(null)
    setImportSummary(null)
    try {
      const res = await fetch("/api/gmail/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          range: scanRange,
          from: scanRange === "custom" ? customFrom : undefined,
          to: scanRange === "custom" ? customTo : undefined,
        }),
      })
      if (res.status === 401) {
        toast.error("Connect Google in Settings first")
        setScanning(false)
        return
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScanId(data.scanId)
      pollScan(data.scanId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed")
      setScanning(false)
    }
  }

  const handleCancelScan = () => {
    stopPolling()
    setScanning(false)
    setScanId(null)
    setSummary(null)
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const items = transactions.filter((t) => selected.has(t.messageId))
      const res = await fetch("/api/gmail/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          transactions: items.map((t) => ({
            type: t.type,
            date: t.date,
            amount: t.amount,
            description: t.description,
            vendor: t.vendor,
            category: t.category,
            messageId: t.messageId,
            emailSubject: t.emailSubject,
            emailSnippet: t.emailSnippet,
            emailFrom: t.emailFrom,
            source: t.source,
          })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setImportedResults(data.results || [])
      setImportSummary({
        imported: data.imported || 0,
        skippedExisting: data.skippedExisting || 0,
        skippedAlreadyImported: data.skippedAlreadyImported || 0,
        total: data.total || 0,
      })
      toast.success(`Imported ${data.imported} transactions successfully!`)
      setSelected(new Set())
      setScanId(null)
      // Refresh the last scan's journal so it reflects the just-imported
      // counts (the import route already updated it in the DB).
      fetch("/api/gmail/scan/status")
        .then(r => r.json())
        .then((d) => { if (d.journal) setJournal(d.journal); if (d.scan) setSummary(d.scan) })
        .catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const typeColors: Record<string, string> = {
    expense: "bg-red-500/10 text-red-500",
    income: "bg-emerald-500/10 text-emerald-500",
    investment: "bg-blue-500/10 text-blue-500",
    insurance: "bg-purple-500/10 text-purple-500",
    subscription: "bg-cyan-500/10 text-cyan-500",
    salary: "bg-green-500/10 text-green-500",
    tax_document: "bg-amber-500/10 text-amber-500",
    asset: "bg-yellow-500/10 text-yellow-600",
  }

  const typeLabel: Record<string, string> = {
    expense: "Expenses",
    income: "Income",
    salary: "Salary",
    investment: "Investments",
    insurance: "Insurance",
    subscription: "Subscriptions",
    tax_document: "Tax Docs",
    asset: "Assets",
  }

  const categoryCounts = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1
    return acc
  }, {})

  const filtered = activeCategory === "all" ? transactions : transactions.filter((t) => t.type === activeCategory)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gmail Import</h1>
        </div>
        {connected === false ? (
          <Button onClick={() => window.location.href = "/settings"}>
            <LogIn className="h-4 w-4 mr-2" /> Connect in Settings
          </Button>
        ) : (
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Scan Gmail
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowKeywords(prev => !prev)}>
          <Settings2 className="h-4 w-4 mr-1" /> Parser Keywords
        </Button>
      </div>

      <Card>
        <CardContent className="py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Scan range:</label>
            <select
              value={scanRange}
              onChange={(e) => setScanRange(e.target.value)}
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="since-last">Since last scan (default)</option>
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="1y">Last 1 year</option>
              <option value="18m">Last 18 months (1.5 years)</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
            {scanRange === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                />
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {scanRange === "since-last"
              ? "Scans emails since the last scan's start (skips ones already imported)."
              : "Scans all emails in the selected window — the AI decides which are real transactions."}
          </p>
        </CardContent>
      </Card>

      {showKeywords && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Search keywords per category</p>
                <p className="text-xs text-muted-foreground">These drive the Gmail search that finds candidate emails. Add, remove or edit terms — saved keywords are used by the next scan. AI still classifies each matched email, so broad keywords are safe.</p>
              </div>
              <Button size="sm" onClick={handleSaveKeywords} disabled={savingKeywords}>
                {savingKeywords ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(keywords).map(([cat, terms]) => (
                <div key={cat} className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(terms || []).map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1">
                        {t}
                        <button type="button" onClick={() => removeTerm(cat, t)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex h-8 w-full rounded-md border bg-transparent px-3 text-sm"
                      placeholder="Add keyword…"
                      value={newTerm[cat] || ""}
                      onChange={(e) => setNewTerm(prev => ({ ...prev, [cat]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { addTerm(cat) } }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => addTerm(cat)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scanning && summary && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Scanning your Gmail in the background…</p>
              <Button size="sm" variant="ghost" onClick={handleCancelScan}>
                <CircleStop className="h-4 w-4 mr-1" /> Stop
              </Button>
            </div>
            <Progress value={summary.totalEmails ? Math.round((summary.processed / summary.totalEmails) * 100) : 0} />
            <p className="text-xs text-muted-foreground">
              Processed <strong>{summary.processed}</strong> / {summary.totalEmails} emails
              · Found <strong>{summary.parsed}</strong> transactions
              · {summary.alreadyImported > 0 ? `${summary.alreadyImported} already imported · ` : ""}
              You can leave this page — the scan keeps running.
            </p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 text-sm">
              <span>Scanned <strong>{summary.totalEmails}</strong> emails</span>
              {summary.alreadyImported ? <span>Already imported <strong>{summary.alreadyImported}</strong></span> : null}
              <span>Found <strong>{summary.parsed}</strong> financial transactions</span>
              <span>Selected <strong>{selected.size}</strong> for import</span>
            </div>
            {selected.size > 0 && (
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Import Selected
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {journal && Object.keys(journal).length > 0 && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <p className="font-medium text-sm">Scan journal (last scan)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(journal).map(([type, j]) => (
                <Badge key={type} variant="outline" className={typeColors[type] || ""}>
                  {typeLabel[type] || type}: {j.matched} matched
                  {j.alreadyExists > 0 ? ` · ${j.alreadyExists} already existed` : ""}
                  {j.imported > 0 ? ` · ${j.imported} imported` : ""}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {importSummary && importSummary.imported > 0 && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">
                Import summary — {importSummary.imported} added, {importSummary.skippedExisting} skipped (already in app), {importSummary.skippedAlreadyImported} skipped (already imported)
              </p>
              <Button size="sm" variant="ghost" onClick={() => setImportSummary(null)}>Dismiss</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Of {importSummary.total} selected transactions, {importSummary.imported} were added to your records. The rest were already present (matching date + amount + vendor).
            </p>
          </CardContent>
        </Card>
      )}

      {importedResults.length > 0 && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Imported {importedResults.length} items</p>
              <Button size="sm" variant="ghost" onClick={() => setImportedResults([])}>Dismiss</Button>
            </div>
            {importedResults.map((r, i) => (
              <div key={`${r.id}-${i}`} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={typeColors[r.type] || ""}>{r.type}</Badge>
                    <span className="text-sm font-medium truncate">{r.description}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(r.date).toLocaleDateString("en-IN")}
                    {r.vendor ? ` — ${r.vendor}` : ""}
                    {r.emailSnippet ? ` — "${r.emailSnippet}"` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-semibold text-sm ${r.type === "income" || r.type === "salary" ? "text-emerald-500" : ""}`}>
                    {formatCurrency(r.amount)}
                  </span>
                  <a href={modulePath(r.type)} className="text-xs text-primary underline whitespace-nowrap">
                    {moduleLabel(r.type)}
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {transactions.length === 0 && !scanning && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No transactions scanned yet</p>
            <p className="text-sm mt-1">{connected === false ? "Go to Settings → Google Account to connect, then scan." : "Click &ldquo;Scan Gmail&rdquo; to find financial transactions in your inbox."}</p>
            <p className="text-xs mt-2 opacity-60">Requires Gmail API access with read-only scope.</p>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={activeCategory === "all" ? "default" : "outline"} onClick={() => setActiveCategory("all")}>
              All ({transactions.length})
            </Button>
            {Object.entries(typeLabel).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={activeCategory === key ? "default" : "outline"}
                onClick={() => setActiveCategory(key)}
                disabled={!categoryCounts[key]}
              >
                {label} ({categoryCounts[key] || 0})
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map((t, i) => (
              <Card key={t.messageId || i} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => toggleSelect(t.messageId)}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selected.has(t.messageId)} onChange={() => toggleSelect(t.messageId)} className="h-4 w-4" />
                    <Badge variant="outline" className={typeColors[t.type] || ""}>{t.type}</Badge>
                    {t.source === "bank" ? (
                      <Badge variant="secondary">Bank transaction</Badge>
                    ) : t.source === "upi" ? (
                      <Badge variant="secondary">UPI</Badge>
                    ) : null}
                    {t.alreadyExists && <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Already in app</Badge>}
                    <div>
                      <p className="font-medium text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("en-IN")}
                        {t.vendor ? ` — ${t.vendor}` : ""}
                      </p>
                      {t.emailSnippet && (
                        <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2 italic">
                          &quot;{t.emailSnippet}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${t.type === "income" || t.type === "salary" ? "text-emerald-500" : ""}`}>
                      {formatCurrency(t.amount)}
                    </p>
                    {t.category && <p className="text-xs text-muted-foreground">{t.category}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
