"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { calcFdMaturity } from "@/shared/fd-utils"
import {
  Landmark, Plus, Building2, PiggyBank, RefreshCw, Loader2, CheckCircle2, Wallet,
} from "lucide-react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { useBankAccountsData, useGoals, type BankAccount, type FixedDeposit } from "@/hooks/use-finance"
import type { Goal } from "@/types"
import { useCashBalance } from "@/hooks/use-dashboard"

type ViewMode = "accounts" | "fds"

const FD_STATUSES = ["active", "matured", "closed"]

export default function BankAccountsPage() {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [cashAmount, setCashAmount] = useState("")
  const [cashNotes, setCashNotes] = useState("")
  const [savingCash, setSavingCash] = useState(false)
  const [showCashForm, setShowCashForm] = useState(false)
  const [view, setView] = useState<ViewMode>("accounts")

  // FD dialog state
  const [fdDialogOpen, setFdDialogOpen] = useState(false)
  const [fdAccountId, setFdAccountId] = useState<number | null>(null)
  const [fdSaving, setFdSaving] = useState(false)
  const [fdForm, setFdForm] = useState({
    fdNumber: "", principal: "", interestRate: "", startDate: "", maturityDate: "", maturityAmount: "", goalId: "", status: "active", notes: "",
  })

  const accountsQuery = useBankAccountsData()
  const accounts = accountsQuery.data?.accounts ?? []
  const totals = accountsQuery.data?.totals ?? { balance: 0, fdValue: 0 }
  const loading = accountsQuery.isLoading

  const goalsQuery = useGoals()
  const goals = goalsQuery.data ?? []

  const cashQuery = useCashBalance()
  const cashData = cashQuery.data

  // Populate the cash form once from the server value; never clobber edits.
  const cashInitedRef = useRef(false)
  useEffect(() => {
    if (cashInitedRef.current || !cashData) return
    cashInitedRef.current = true
    setCashAmount(cashData.amount != null ? String(cashData.amount) : "")
    setCashNotes(cashData.notes || "")
  }, [cashData])

  const reloadAccounts = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts() })
  }

  const reloadCash = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cashBalance() })
  }

  const reloadGoals = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.goals() })
  }

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
      reloadCash()
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
      reloadAccounts()
    } catch (err: unknown) {
      const msg = "Sync failed. Ensure Gmail is connected."
      setSyncMessage(msg)
      toast.error((err as Error).message || msg)
    } finally {
      setSyncing(false)
    }
  }

  const openFdDialog = (accountId: number) => {
    setFdAccountId(accountId)
    setFdForm({ fdNumber: "", principal: "", interestRate: "", startDate: "", maturityDate: "", maturityAmount: "", goalId: "", status: "active", notes: "" })
    setFdDialogOpen(true)
  }

  const openFdDialogAll = () => {
    setFdAccountId(null)
    setFdForm({ fdNumber: "", principal: "", interestRate: "", startDate: "", maturityDate: "", maturityAmount: "", goalId: "", status: "active", notes: "" })
    setFdDialogOpen(true)
  }

  const autoMaturity = useMemo(() => {
    return calcFdMaturity(
      parseFloat(fdForm.principal) || 0,
      parseFloat(fdForm.interestRate) || 0,
      fdForm.startDate || null,
      fdForm.maturityDate || null,
    )
  }, [fdForm.principal, fdForm.interestRate, fdForm.startDate, fdForm.maturityDate])

  const saveFd = async () => {
    const principal = parseFloat(fdForm.principal) || 0
    if (principal <= 0) { toast.error("Principal is required"); return }
    if (!fdAccountId) { toast.error("Select a bank account"); return }
    setFdSaving(true)
    try {
      const body = {
        fdNumber: fdForm.fdNumber || null,
        principal,
        interestRate: parseFloat(fdForm.interestRate) || 0,
        startDate: fdForm.startDate || null,
        maturityDate: fdForm.maturityDate || null,
        maturityAmount: fdForm.maturityAmount ? parseFloat(fdForm.maturityAmount) : autoMaturity,
        goalId: fdForm.goalId ? Number(fdForm.goalId) : null,
        status: fdForm.status || "active",
        notes: fdForm.notes || null,
      }
      const res = await fetch(`/api/bank-accounts/${fdAccountId}/fds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to save FD") }
      toast.success("FD added")
      setFdDialogOpen(false)
      reloadAccounts()
    } catch (err) {
      toast.error((err as Error).message || "Failed to save FD")
    } finally {
      setFdSaving(false)
    }
  }

  const typeColors: Record<string, string> = {
    savings: "bg-emerald-500/10 text-emerald-500",
    current: "bg-blue-500/10 text-blue-500",
    salary: "bg-purple-500/10 text-purple-500",
    credit_card: "bg-amber-500/10 text-amber-500",
    loan: "bg-red-500/10 text-red-500",
  }

  // Flattened FD list across all accounts (for FD view)
  const allFds = useMemo(() => {
    const list: FixedDeposit[] = []
    for (const acc of accounts) {
      for (const fd of acc.fixedDeposits || []) {
        list.push({ ...fd, bankName: acc.bankName })
      }
    }
    return list
  }, [accounts])

  const fdInvested = allFds.reduce((s, f) => s + f.principal, 0)
  const fdMaturity = allFds.reduce((s, f) => s + (f.maturityAmount ?? f.principal), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Bank Accounts</h1>
          {/* View toggle */}
          <div className="flex rounded-md border text-xs overflow-hidden ml-3">
            <button
              onClick={() => setView("accounts")}
              className={`px-3 py-1.5 ${view === "accounts" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Bank Accounts
            </button>
            <button
              onClick={() => setView("fds")}
              className={`px-3 py-1.5 ${view === "fds" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Fixed Deposits ({allFds.length})
            </button>
          </div>
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
      ) : view === "fds" ? (
        /* ══════════ FIXED DEPOSITS VIEW ══════════ */
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">FD Invested</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{formatCurrency(fdInvested)}</p></CardContent>
            </Card>
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">FD Maturity</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-emerald-500">{formatCurrency(fdMaturity)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Interest Earned</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-emerald-500">{formatCurrency(fdMaturity - fdInvested)}</p></CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{allFds.length} FD{allFds.length === 1 ? "" : "s"} across {accounts.length} account{accounts.length === 1 ? "" : "s"}</p>
            <Button size="sm" onClick={openFdDialogAll}><Plus className="h-4 w-4 mr-1" /> Add FD</Button>
          </div>

          {allFds.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No fixed deposits yet</p>
                <p className="text-sm mt-1">Add an FD from a bank account card or here.</p>
                <Button className="mt-4" variant="outline" onClick={openFdDialogAll}><Plus className="h-4 w-4 mr-2" />Add FD</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">Bank</th>
                      <th className="px-4 py-3">FD #</th>
                      <th className="px-4 py-3">Invested</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Start</th>
                      <th className="px-4 py-3">Maturity</th>
                      <th className="px-4 py-3">Maturity Amt</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFds.map((fd) => (
                      <tr key={fd.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{fd.bankName}</td>
                        <td className="px-4 py-3">{fd.fdNumber || `#${fd.id}`}</td>
                        <td className="px-4 py-3">{formatCurrency(fd.principal)}</td>
                        <td className="px-4 py-3">{fd.interestRate}%</td>
                        <td className="px-4 py-3 text-muted-foreground">{fd.startDate ? new Date(fd.startDate).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fd.maturityDate ? new Date(fd.maturityDate).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(fd.maturityAmount ?? fd.principal)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={fd.status === "active" ? "default" : "secondary"} className="text-xs">{fd.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* ══════════ BANK ACCOUNTS VIEW ══════════ */
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Balance</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{formatCurrency(totals.balance)}</p></CardContent>
            </Card>
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">FD Invested</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-emerald-500">{formatCurrency(fdInvested)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">FD Maturity</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{formatCurrency(fdMaturity)}</p></CardContent>
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
                const fdMatTotal = acc.fixedDeposits.reduce((s, f) => s + (f.maturityAmount ?? f.principal), 0)
                const activeFds = acc.fixedDeposits.filter((f) => f.status === "active").length
                return (
                  <Card key={acc.id} className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Link href={`/bank-accounts/${acc.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base">{acc.bankName}</CardTitle>
                            <p className="text-xs text-muted-foreground">{acc.name}</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className={typeColors[acc.type] || ""}>{acc.type}</Badge>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openFdDialog(acc.id)}>
                            <Plus className="h-3 w-3 mr-1" /> FD
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <Link href={`/bank-accounts/${acc.id}`} className="hover:underline">
                          <p className="text-2xl font-bold">{formatCurrency(acc.balance)}</p>
                        </Link>
                        <span className="text-[10px] text-muted-foreground">balance</span>
                      </div>
                      <div className="mt-2 space-y-0.5 text-xs">
                        {activeFds > 0 && (
                          <>
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <PiggyBank className="h-3 w-3" /> {activeFds} FD{activeFds > 1 ? "s" : ""} · Invested {formatCurrency(fdTotal)}
                            </p>
                            <p className="text-emerald-600 dark:text-emerald-400 ml-4">Maturity {formatCurrency(fdMatTotal)}</p>
                          </>
                        )}
                        {activeFds === 0 && (
                          <p className="text-muted-foreground">No FDs yet</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {acc.accountNumber && <span>{acc.accountNumber}</span>}
                      </div>
                      {acc.lastSynced && (
                        <p className="text-[10px] text-muted-foreground mt-2">Synced: {new Date(acc.lastSynced).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* FD Dialog */}
      <Dialog open={fdDialogOpen} onOpenChange={setFdDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5" /> Add Fixed Deposit</DialogTitle>
            <DialogDescription>Record an FD for a bank. Maturity is auto-calculated with quarterly compounding.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Bank Account</Label>
              <Select value={fdAccountId ? String(fdAccountId) : ""} onValueChange={(v) => setFdAccountId(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.bankName} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">FD Number</Label>
              <Input value={fdForm.fdNumber} onChange={(e) => setFdForm({ ...fdForm, fdNumber: e.target.value })} placeholder="e.g. FD123456" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={fdForm.status} onValueChange={(v) => setFdForm({ ...fdForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FD_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Principal (₹) *</Label>
              <Input type="number" value={fdForm.principal} onChange={(e) => setFdForm({ ...fdForm, principal: e.target.value })} placeholder="100000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input type="number" value={fdForm.interestRate} onChange={(e) => setFdForm({ ...fdForm, interestRate: e.target.value })} placeholder="7.1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={fdForm.startDate} onChange={(e) => setFdForm({ ...fdForm, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maturity Date</Label>
              <Input type="date" value={fdForm.maturityDate} onChange={(e) => setFdForm({ ...fdForm, maturityDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maturity Amount (₹)</Label>
              <Input type="number" value={fdForm.maturityAmount} onChange={(e) => setFdForm({ ...fdForm, maturityAmount: e.target.value })} placeholder={autoMaturity ? String(autoMaturity) : "auto-calc"} />
              {autoMaturity !== null && !fdForm.maturityAmount && (
                <p className="text-[10px] text-emerald-600">Auto: {formatCurrency(autoMaturity)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Goal (optional)</Label>
              <Select value={fdForm.goalId} onValueChange={(v) => setFdForm({ ...fdForm, goalId: v })}>
                <SelectTrigger><SelectValue placeholder="Link to a goal" /></SelectTrigger>
                <SelectContent>
                  {goals.filter((g) => !g.status || g.status === "active").map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={fdForm.notes} onChange={(e) => setFdForm({ ...fdForm, notes: e.target.value })} placeholder="e.g. Emergency fund, kid's education" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFdDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveFd} disabled={fdSaving}>
              {fdSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
              {fdSaving ? "Saving..." : "Save FD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}