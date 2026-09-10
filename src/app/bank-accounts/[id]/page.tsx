"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { calcFdMaturity } from "@/shared/fd-utils"
import { ArrowLeft, Building2, Plus, PiggyBank, Search, Loader2, Pencil, Trash2, Wallet } from "lucide-react"

interface BankAccountData {
  id: number
  name: string
  bankName: string
  accountNumber?: string
  type: string
  balance: number
  fixedDeposits?: FixedDepositData[]
}

interface FixedDepositData {
  id: number
  fdNumber?: string
  principal: number
  interestRate: number
  startDate?: string
  maturityDate?: string
  maturityAmount?: number
  status: string
  notes?: string | null
}

interface TransactionData {
  id: number
  vendor?: string
  description?: string
  date: string
  category?: string
  amount: number
}

interface GoalData {
  id: number
  name: string
  status?: string
}

const FD_STATUSES = ["active", "matured", "closed"]

export default function BankAccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [account, setAccount] = useState<BankAccountData | null>(null)
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [txnLoading, setTxnLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showFdForm, setShowFdForm] = useState(false)
  const [showBalanceEdit, setShowBalanceEdit] = useState(false)
  const [balanceInput, setBalanceInput] = useState("")
  const [goals, setGoals] = useState<GoalData[]>([])
  const [fdSaving, setFdSaving] = useState(false)
  const [fdForm, setFdForm] = useState({ fdNumber: "", principal: "", interestRate: "", startDate: "", maturityDate: "", maturityAmount: "", goalId: "", status: "active", notes: "" })

  const fetchAccount = useCallback(async () => {
    const res = await fetch(`/api/bank-accounts/${id}`)
    if (res.ok) { const data = await res.json(); setAccount(data); setBalanceInput(String(data.balance || "0")) }
    setLoading(false)
  }, [id])

  const fetchTransactions = useCallback(async (searchQuery?: string) => {
    setTxnLoading(true)
    const params = new URLSearchParams()
    if (searchQuery) params.set("search", searchQuery)
    const res = await fetch(`/api/bank-accounts/${id}/transactions?${params}`)
    if (res.ok) { const data = await res.json(); setTransactions(data.transactions || []); setTransactionsTotal(data.total || 0) }
    setTxnLoading(false)
  }, [id])

  useEffect(() => { fetchAccount() }, [fetchAccount])

  useEffect(() => {
    fetch("/api/goals").then((r) => r.json()).then((d) => setGoals(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const autoMaturity = useMemo(() => {
    return calcFdMaturity(
      parseFloat(fdForm.principal) || 0,
      parseFloat(fdForm.interestRate) || 0,
      fdForm.startDate || null,
      fdForm.maturityDate || null,
    )
  }, [fdForm.principal, fdForm.interestRate, fdForm.startDate, fdForm.maturityDate])

  const handleBalanceUpdate = async () => {
    await fetch(`/api/bank-accounts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...account, balance: parseFloat(balanceInput) || 0 }) })
    setShowBalanceEdit(false); fetchAccount()
  }

  const handleAddFd = async () => {
    const principal = parseFloat(fdForm.principal) || 0
    if (principal <= 0) { toast.error("Principal is required"); return }
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
      const res = await fetch(`/api/bank-accounts/${id}/fds`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to save FD") }
      toast.success("FD added")
      setShowFdForm(false); setFdForm({ fdNumber: "", principal: "", interestRate: "", startDate: "", maturityDate: "", maturityAmount: "", goalId: "", status: "active", notes: "" }); fetchAccount()
    } catch (err) {
      toast.error((err as Error).message || "Failed to save FD")
    } finally {
      setFdSaving(false)
    }
  }

  const handleDeleteFd = async (fdId: number) => {
    if (confirm("Delete this FD?")) { await fetch(`/api/bank-accounts/${id}/fds/${fdId}`, { method: "DELETE" }); fetchAccount() }
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!account) return <div className="p-6 text-center text-muted-foreground">Account not found</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/bank-accounts")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Building2 className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold">{account.bankName}</h1>
          <p className="text-sm text-muted-foreground">{account.name} {account.accountNumber ? `· ${account.accountNumber}` : ""}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            {showBalanceEdit ? (
              <div className="flex items-center gap-2 mt-1">
                <Input value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} className="w-40" autoFocus />
                <Button size="sm" onClick={handleBalanceUpdate}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBalanceEdit(false)}>Cancel</Button>
              </div>
            ) : (
              <p className="text-3xl font-bold">{formatCurrency(account.balance)}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowBalanceEdit(!showBalanceEdit)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit Balance
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="fds">
        <TabsList>
          <TabsTrigger value="fds">Fixed Deposits ({account.fixedDeposits?.length || 0})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({transactionsTotal})</TabsTrigger>
        </TabsList>

        <TabsContent value="fds" className="space-y-4 mt-4">
          <Button size="sm" onClick={() => setShowFdForm(!showFdForm)}>
            <Plus className="h-4 w-4 mr-1" /> {showFdForm ? "Cancel" : "Add FD"}
          </Button>

          {showFdForm && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
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
                <Button onClick={handleAddFd} disabled={fdSaving}>
                  {fdSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wallet className="h-4 w-4 mr-1" />}
                  {fdSaving ? "Saving..." : "Save FD"}
                </Button>
              </CardContent>
            </Card>
          )}

          {(!account.fixedDeposits || account.fixedDeposits.length === 0) ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No FDs added yet</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {account.fixedDeposits.map((fd: FixedDepositData) => (
                <Card key={fd.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{fd.fdNumber || `FD #${fd.id}`}</p>
                        <Badge variant={fd.status === "active" ? "default" : "secondary"} className="text-xs">{fd.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(fd.principal)} @ {fd.interestRate}%
                        {fd.startDate ? ` · ${new Date(fd.startDate).toLocaleDateString("en-IN")}` : ""}
                        {fd.maturityDate ? ` → ${new Date(fd.maturityDate).toLocaleDateString("en-IN")}` : ""}
                      </p>
                      {fd.maturityAmount && <p className="text-xs text-emerald-500">Maturity: {formatCurrency(fd.maturityAmount)}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFd(fd.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search transactions..." value={search} onChange={(e) => { setSearch(e.target.value); fetchTransactions(e.target.value) }} />
            </div>
          </div>

          {txnLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : transactions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><p>No transactions found. Tag expenses with &quot;{account.name}&quot; as the bank account to see them here.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn: TransactionData) => (
                <Card key={txn.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{txn.vendor || txn.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(txn.date).toLocaleDateString("en-IN")} · {txn.category}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(txn.amount)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
