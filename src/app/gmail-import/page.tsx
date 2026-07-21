"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Mail, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react"

interface Transaction {
  type: string
  date: string
  amount: number
  description: string
  vendor?: string
  category?: string
  messageId: string
}

export default function GmailImportPage() {
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<{ totalEmails: number; parsed: number } | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)

  const handleScan = async () => {
    setScanning(true)
    setTransactions([])
    setSelected(new Set())
    setSummary(null)
    try {
      const res = await fetch("/api/gmail/scan", { method: "POST" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTransactions(data.transactions || [])
      setSummary({ totalEmails: data.totalEmails, parsed: data.parsed })
      setSessionId(data.sessionId)
      setSelected(new Set((data.transactions || []).map((t: Transaction) => t.messageId)))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Scan failed")
    } finally {
      setScanning(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const items = transactions.filter((t) => selected.has(t.messageId))
      const res = await fetch("/api/gmail/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          transactions: items.map((t) => ({
            type: t.type,
            date: t.date,
            amount: t.amount,
            description: t.description,
            vendor: t.vendor,
            category: t.category,
            messageId: t.messageId,
          })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(`Imported ${data.imported} transactions successfully!`)
      setTransactions([])
      setSummary(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed")
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
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gmail Import</h1>
        </div>
        <Button onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Scan Gmail
        </Button>
      </div>

      {summary && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 text-sm">
              <span>Scanned <strong>{summary.totalEmails}</strong> emails</span>
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

      {scanning && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Scanning your Gmail for financial transactions...</p>
          </CardContent>
        </Card>
      )}

      {transactions.length === 0 && !scanning && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No transactions scanned yet</p>
            <p className="text-sm mt-1">Click "Scan Gmail" to find financial transactions in your inbox.</p>
            <p className="text-xs mt-2 opacity-60">Requires Gmail API access with read-only scope.</p>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((t, i) => (
            <Card key={t.messageId || i} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => toggleSelect(t.messageId)}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selected.has(t.messageId)} onChange={() => toggleSelect(t.messageId)} className="h-4 w-4" />
                  <Badge variant="outline" className={typeColors[t.type] || ""}>{t.type}</Badge>
                  <div>
                    <p className="font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-IN")}
                      {t.vendor ? ` — ${t.vendor}` : ""}
                    </p>
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
      )}
    </div>
  )
}
