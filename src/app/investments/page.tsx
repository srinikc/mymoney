"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Investment } from "@/types"
import { Plus, TrendingUp, TrendingDown, Download } from "lucide-react"

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    type: "mutual_funds", name: "", amount: "", currentValue: "", purchaseDate: new Date().toISOString().split("T")[0], returnRate: "", notes: "",
  })

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
    await fetch("/api/investments", { method: "POST", body: JSON.stringify(form) })
    setOpen(false)
    setForm({ type: "mutual_funds", name: "", amount: "", currentValue: "", purchaseDate: new Date().toISOString().split("T")[0], returnRate: "", notes: "" })
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground">Track your investment portfolio across types</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Investment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                      <SelectItem value="ppf">PPF</SelectItem>
                      <SelectItem value="nps">NPS</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
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
                <Button onClick={handleSubmit}>Add Investment</Button>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : investments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No investments tracked yet.</div>
        ) : investments.map((inv) => (
          <Card key={inv.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{inv.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{inv.type.replace("_", " ")}</Badge>
                </div>
                <div className={`rounded-lg p-2 ${inv.returnPercent >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                  {inv.returnPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
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
    </div>
  )
}
