"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import type { Investment } from "@/types"
import { Plus, TrendingUp, TrendingDown, Download, Building2, Pencil, Trash2 } from "lucide-react"

const defaultForm = {
  type: "mutual_funds", name: "", symbol: "", quantity: "", buyPrice: "", amount: "", currentValue: "", purchaseDate: new Date().toISOString().split("T")[0], returnRate: "", notes: "",
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editInv, setEditInv] = useState<Investment | null>(null)
  const [form, setForm] = useState(defaultForm)

  const loadData = async () => {
    const res = await fetch("/api/investments")
    const data = await res.json()
    setInvestments(data.map((i: Investment) => ({
      ...i,
      returnPercent: i.amount > 0 ? Math.round(((i.currentValue - i.amount) / i.amount) * 100) : 0,
    })))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    const body = { ...form }
    if (editInv) {
      await fetch("/api/investments", { method: "PUT", body: JSON.stringify({ id: editInv.id, ...body }) })
    } else {
      await fetch("/api/investments", { method: "POST", body: JSON.stringify(body) })
    }
    setOpen(false)
    setEditInv(null)
    setForm(defaultForm)
    loadData()
  }

  const handleEdit = (inv: Investment) => {
    setEditInv(inv)
    setForm({
      type: inv.type, name: inv.name, symbol: inv.symbol || "",
      quantity: inv.quantity ? String(inv.quantity) : "", buyPrice: inv.buyPrice ? String(inv.buyPrice) : "",
      amount: String(inv.amount), currentValue: String(inv.currentValue),
      purchaseDate: inv.purchaseDate.split("T")[0], returnRate: inv.returnRate ? String(inv.returnRate) : "", notes: inv.notes || "",
    })
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this investment?")) return
    await fetch(`/api/investments?id=${id}`, { method: "DELETE" })
    loadData()
  }

  const handleExport = async () => {
    const res = await fetch(`/api/export?type=investments&format=xlsx`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "investments-export.xlsx"; a.click()
    URL.revokeObjectURL(url)
  }

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0)
  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0)
  const totalReturn = totalValue - totalInvested
  const totalReturnPercent = totalInvested > 0 ? Math.round((totalReturn / totalInvested) * 100) : 0

  const stocks = investments.filter((i) => i.type === "stocks")
  const others = investments.filter((i) => i.type !== "stocks")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground">Track your investment portfolio across types</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditInv(null); setForm(defaultForm) } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Investment</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editInv ? "Edit Investment" : "Add Investment"}</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stocks">Stocks / Shares</SelectItem>
                      <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                      <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                      <SelectItem value="ppf">PPF</SelectItem>
                      <SelectItem value="nps">NPS</SelectItem>
                      <SelectItem value="gold">Gold ETF</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="bonds">Bonds</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Investment Name</label>
                  <Input placeholder="e.g. HDFC Mid-cap Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Symbol</label>
                    <Input placeholder="e.g. RELIANCE" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Qty</label>
                    <Input type="number" placeholder="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Buy Price</label>
                    <Input type="number" placeholder="2500" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Invested Amount (₹)</label>
                    <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Value (₹)</label>
                    <Input type="number" placeholder="0" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Purchase Date</label>
                  <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Return Rate (%)</label>
                  <Input type="number" placeholder="e.g. 12" value={form.returnRate} onChange={(e) => setForm({ ...form, returnRate: e.target.value })} />
                </div>
                <Button onClick={handleSubmit}>{editInv ? "Update Investment" : "Add Investment"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Invested</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalValue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Return</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {totalReturn >= 0 ? "+" : ""}{formatCurrency(totalReturn)}
              <span className="ml-1 text-sm">({totalReturnPercent >= 0 ? "+" : ""}{totalReturnPercent}%)</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({investments.length})</TabsTrigger>
          <TabsTrigger value="stocks">Stocks ({stocks.length})</TabsTrigger>
          <TabsTrigger value="others">Others ({others.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {loading ? <CardGridSkeleton /> : renderGrid(investments, handleEdit, handleDelete)}
        </TabsContent>
        <TabsContent value="stocks" className="mt-6">
          {stocks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No stocks tracked. Add a stock with symbol and quantity to track P&L.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Symbol</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                        <th className="px-4 py-3 text-right font-medium">Buy Price</th>
                        <th className="px-4 py-3 text-right font-medium">Invested</th>
                        <th className="px-4 py-3 text-right font-medium">Current Value</th>
                        <th className="px-4 py-3 text-right font-medium">P&L</th>
                        <th className="px-4 py-3 text-right font-medium">Return %</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((s) => {
                        const pl = s.currentValue - s.amount
                        const plPct = s.amount > 0 ? Math.round((pl / s.amount) * 100) : 0
                        return (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold">{s.symbol || "—"}</td>
                            <td className="px-4 py-3">{s.name}</td>
                            <td className="px-4 py-3 text-right">{s.quantity ?? "—"}</td>
                            <td className="px-4 py-3 text-right">{s.buyPrice ? formatCurrency(s.buyPrice) : "—"}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(s.amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(s.currentValue)}</td>
                            <td className={`px-4 py-3 text-right font-medium ${pl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {pl >= 0 ? "+" : ""}{formatCurrency(pl)}
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${plPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {plPct >= 0 ? "+" : ""}{plPct}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => handleEdit(s)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button className="rounded-md p-1 text-red-400 hover:bg-muted" onClick={() => handleDelete(s.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stocks.map((s) => {
                  const pl = s.currentValue - s.amount
                  const plPct = s.amount > 0 ? Math.round((pl / s.amount) * 100) : 0
                  return (
                    <Card key={s.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {s.symbol && <span className="font-mono">{s.symbol}</span>}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">{s.name}</p>
                            </div>
                          </div>
                          <div className={`rounded-lg p-2 ${pl >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                            {pl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {s.quantity && s.buyPrice && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Qty × Buy Price</span>
                            <span>{s.quantity} × {formatCurrency(s.buyPrice)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Invested</span>
                          <span className="font-medium">{formatCurrency(s.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current</span>
                          <span className="font-medium">{formatCurrency(s.currentValue)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">P&L</span>
                          <span className={`font-semibold ${pl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({plPct >= 0 ? "+" : ""}{plPct}%)
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="others" className="mt-6">
          {others.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No other investments tracked.</div>
          ) : renderGrid(others, handleEdit, handleDelete)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function renderGrid(items: Investment[], onEdit: (i: Investment) => void, onDelete: (id: number) => void) {
  if (items.length === 0) return <div className="py-12 text-center text-muted-foreground">No investments found.</div>
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((inv) => (
        <Card key={inv.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{inv.name}</CardTitle>
                <Badge variant="secondary" className="mt-1">{inv.type.replace("_", " ")}{inv.symbol ? ` · ${inv.symbol}` : ""}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className={`rounded-lg p-2 ${inv.returnPercent >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                  {inv.returnPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => onEdit(inv)}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button className="rounded-md p-1 text-red-400 hover:bg-muted" onClick={() => onDelete(inv.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invested</span>
              <span className="font-medium">{formatCurrency(inv.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current</span>
              <span className="font-medium">{formatCurrency(inv.currentValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Return</span>
              <span className={`font-semibold ${inv.returnPercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {inv.returnPercent >= 0 ? "+" : ""}{inv.returnPercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Since {formatDate(inv.purchaseDate)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
