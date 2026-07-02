"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, WalletCards, TrendingUp, TrendingDown } from "lucide-react"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Asset {
  id: number; name: string; type: string; amount: number; notes: string | null
}
interface Liability {
  id: number; name: string; type: string; amount: number; interestRate: number | null; dueDate: string | null; notes: string | null
}

export default function NetWorthPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [loading, setLoading] = useState(true)
  const [assetOpen, setAssetOpen] = useState(false)
  const [liabOpen, setLiabOpen] = useState(false)
  const [assetForm, setAssetForm] = useState({ name: "", type: "other", amount: "", notes: "" })
  const [liabForm, setLiabForm] = useState({ name: "", type: "other", amount: "", interestRate: "", dueDate: "", notes: "" })

  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([fetch("/api/assets").then(r => r.json()), fetch("/api/liabilities").then(r => r.json())])
      setAssets(a); setLiabilities(l)
    } catch {
      setAssets([]); setLiabilities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)
  const netWorth = totalAssets - totalLiabilities

  const addAsset = async () => {
    await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assetForm) })
    setAssetOpen(false); setAssetForm({ name: "", type: "other", amount: "", notes: "" }); load()
  }

  const addLiability = async () => {
    await fetch("/api/liabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(liabForm) })
    setLiabOpen(false); setLiabForm({ name: "", type: "other", amount: "", interestRate: "", dueDate: "", notes: "" }); load()
  }

  const deleteAsset = async (id: number) => { await fetch(`/api/assets/${id}`, { method: "DELETE" }); load() }
  const deleteLiability = async (id: number) => { await fetch(`/api/liabilities/${id}`, { method: "DELETE" }); load() }

  if (loading) return <CardGridSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Net Worth</h1>
        <p className="text-muted-foreground">Track your assets and liabilities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Total Assets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAssets)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Total Liabilities</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" /> Net Worth</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${netWorth >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(netWorth)}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Assets</CardTitle>
            <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <Input placeholder="Name" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} />
                  <Select value={assetForm.type} onValueChange={(v) => setAssetForm({ ...assetForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Account</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Amount" value={assetForm.amount} onChange={(e) => setAssetForm({ ...assetForm, amount: e.target.value })} />
                  <Input placeholder="Notes (optional)" value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
                  <Button onClick={addAsset}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {assets.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No assets added</p>
            ) : (
              <div className="divide-y">
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.type}{a.notes ? ` - ${a.notes}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{formatCurrency(a.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteAsset(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Liabilities</CardTitle>
            <Dialog open={liabOpen} onOpenChange={setLiabOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Liability</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <Input placeholder="Name" value={liabForm.name} onChange={(e) => setLiabForm({ ...liabForm, name: e.target.value })} />
                  <Select value={liabForm.type} onValueChange={(v) => setLiabForm({ ...liabForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Amount" value={liabForm.amount} onChange={(e) => setLiabForm({ ...liabForm, amount: e.target.value })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="number" placeholder="Interest Rate %" value={liabForm.interestRate} onChange={(e) => setLiabForm({ ...liabForm, interestRate: e.target.value })} />
                    <Input type="date" value={liabForm.dueDate} onChange={(e) => setLiabForm({ ...liabForm, dueDate: e.target.value })} />
                  </div>
                  <Input placeholder="Notes" value={liabForm.notes} onChange={(e) => setLiabForm({ ...liabForm, notes: e.target.value })} />
                  <Button onClick={addLiability}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {liabilities.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No liabilities added</p>
            ) : (
              <div className="divide-y">
                {liabilities.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.type}{l.interestRate ? ` - ${l.interestRate}%` : ""}{l.dueDate ? ` due ${new Date(l.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-red-600">{formatCurrency(l.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteLiability(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
