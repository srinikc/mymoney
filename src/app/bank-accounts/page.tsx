"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { Landmark, Plus, Building2, PiggyBank, RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface FixedDeposit {
  id: number; fdNumber?: string; principal: number; interestRate: number
  startDate?: string; maturityDate?: string; maturityAmount?: number; status: string
}

interface BankAccount {
  id: number; name: string; bankName: string; accountNumber?: string; type: string
  ifscCode?: string; balance: number; currency: string; source: string; isActive: boolean
  fixedDeposits: FixedDeposit[]; lastSynced?: string | null
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [totals, setTotals] = useState({ balance: 0, fdValue: 0 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [cashAmount, setCashAmount] = useState("")
  const [cashNotes, setCashNotes] = useState("")
  const [savingCash, setSavingCash] = useState(false)
  const [showCashForm, setShowCashForm] = useState(false)

  const fetchAccounts = async () => {
    const res = await fetch("/api/bank-accounts")
    const data = await res.json()
    setAccounts(data.accounts || [])
    setTotals(data.totals || { balance: 0, fdValue: 0 })
    setLoading(false)
  }

  const fetchCash = async () => {
    try {
      const res = await fetch("/api/cash-balance")
      const data = await res.json()
      if (data?.cash) {
        setCashAmount(data.cash.amount != null ? String(data.cash.amount) : "")
        setCashNotes(data.cash.notes || "")
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchAccounts(); fetchCash() }, [])

  const handleSaveCash = async () => {
    setSavingCash(true)
    try {
      const res = await fetch("/api/cash-balance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(cashAmount || "0") || 0, notes: cashNotes || null }),
      })
      if (!res.ok) throw new Error("Failed to save cash")
      toast.success("Cash amount saved")
      fetchCash()
    } catch (err) {
      toast.error((err as Error).message || "Failed to save cash")
    } finally {
      setSavingCash(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/bank-accounts/sync-balances", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      setSyncMessage(data.message || `Updated ${data.updated} account(s)`)
      toast.success("Balances synced successfully")
      fetchAccounts()
    } catch (err: unknown) {
      const msg = "Sync failed. Ensure Gmail is connected."
      setSyncMessage(msg)
      toast.error((err as Error).message || msg)
    } finally {
      setSyncing(false)
    }
  }

  const typeColors: Record<string, string> = {
    savings: "bg-emerald-500/10 text-emerald-500",
    current: "bg-blue-500/10 text-blue-500",
    salary: "bg-purple-500/10 text-purple-500",
    credit_card: "bg-amber-500/10 text-amber-500",
    loan: "bg-red-500/10 text-red-500",
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Bank Accounts</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? "Syncing..." : "Sync Balances"}
          </Button>
          <Link href="/settings/bank-accounts">
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Account</Button>
          </Link>
        </div>
      </div>

      {syncMessage && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {syncMessage}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => (<Card key={i} className="h-32 animate-pulse"><CardContent className="p-6" /></Card>))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Balance</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{formatCurrency(totals.balance)}</p></CardContent>
            </Card>
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total FD Value</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-emerald-500">{formatCurrency(totals.fdValue)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Worth (Bank)</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{formatCurrency(totals.balance + totals.fdValue)}</p></CardContent>
            </Card>
          </div>

          {/* Cash section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><PiggyBank className="h-4 w-4 text-emerald-500" /> Cash Amount</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowCashForm(!showCashForm)}>{showCashForm ? "Cancel" : "Update"}</Button>
            </CardHeader>
            <CardContent>
              {!showCashForm ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(parseFloat(cashAmount || "0") || 0)}</p>
                    {cashNotes && <p className="text-xs text-muted-foreground mt-1">{cashNotes}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="number" placeholder="Cash amount (₹)" className="h-9 w-48" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
                  <Input placeholder="Comments" className="h-9 flex-1 min-w-[160px]" value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} />
                  <Button size="sm" className="h-9" onClick={handleSaveCash} disabled={savingCash}>{savingCash ? "Saving..." : "Save Cash"}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No bank accounts configured</p>
                <p className="text-sm mt-1">Add your bank accounts in Settings, then sync balances from Gmail.</p>
                <Link href="/settings/bank-accounts"><Button className="mt-4" variant="outline"><Plus className="h-4 w-4 mr-2" />Add Bank Account</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => {
                const fdTotal = acc.fixedDeposits.reduce((s, f) => s + f.principal, 0)
                const activeFds = acc.fixedDeposits.filter((f) => f.status === "active").length
                return (
                  <Link key={acc.id} href={`/bank-accounts/${acc.id}`}>
                    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{acc.bankName}</CardTitle>
                              <p className="text-xs text-muted-foreground">{acc.name}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={typeColors[acc.type] || ""}>{acc.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(acc.balance)}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {acc.accountNumber && <span>{acc.accountNumber}</span>}
                          {activeFds > 0 && (
                            <span className="flex items-center gap-1">
                              <PiggyBank className="h-3 w-3" /> {activeFds} FD{activeFds > 1 ? "s" : ""} · {formatCurrency(fdTotal)}
                            </span>
                          )}
                        </div>
                        {acc.lastSynced && (
                          <p className="text-[10px] text-muted-foreground mt-2">Synced: {new Date(acc.lastSynced).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
