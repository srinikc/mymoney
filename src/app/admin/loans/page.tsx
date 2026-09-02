"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Landmark, Plus, Trash2, Sparkles, ArrowUp, ArrowDown, Search, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { formatIndianCurrency } from "@/lib/format"

interface LoanProduct {
  id: number
  bankName: string
  productName: string
  loanType: string
  interestRateMin: number
  interestRateMax: number
  maxAmount: number | null
  tenureMonths: number | null
  processingFee: string | null
  features: string | null
  affiliateUrl: string
  affiliateNetwork: string
  isActive: boolean
  isSponsored: boolean
  displayOrder: number
}

const LOAN_TYPES = ["home", "car", "personal", "education", "business", "gold"] as const

export default function AdminLoansPage() {
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    bankName: "",
    productName: "",
    loanType: "personal",
    interestRateMin: 10,
    interestRateMax: 16,
    maxAmount: 1000000,
    tenureMonths: 60,
    processingFee: "1% of loan amount",
    features: "",
    affiliateUrl: "",
    affiliateNetwork: "bankbazaar",
    isSponsored: false,
    displayOrder: 0,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/loans")
      if (res.ok) {
        const json = (await res.json()) as { products: LoanProduct[] }
        setProducts(json.products)
      }
    } catch (e) {
      toast.error("Failed to load loan products")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          features: form.features.split("\n").filter((f) => f.trim()),
        }),
      })
      if (res.ok) {
        toast.success("Loan product created")
        setShowAdd(false)
        setForm({
          bankName: "",
          productName: "",
          loanType: "personal",
          interestRateMin: 10,
          interestRateMax: 16,
          maxAmount: 1000000,
          tenureMonths: 60,
          processingFee: "1% of loan amount",
          features: "",
          affiliateUrl: "",
          affiliateNetwork: "bankbazaar",
          isSponsored: false,
          displayOrder: 0,
        })
        await load()
      } else {
        toast.error("Failed to create")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this loan product?")) return
    try {
      const res = await fetch(`/api/admin/loans/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Deleted")
        await load()
      }
    } catch {
      toast.error("Delete failed")
    }
  }

  const toggleSponsored = async (product: LoanProduct) => {
    // Quick toggle by re-posting with displayOrder change. Simpler: use dedicated update.
    // For brevity, mark for re-fetch via delete+recreate. Better: add a PATCH route.
    // Here we just call PATCH-style update via the existing API by deleting and re-adding — too heavy.
    // Instead, use a quick fix: mutate via fetch PATCH. Let's just refresh.
    toast.info("Use the edit flow to toggle Sponsored (coming in next PR)")
  }

  const filtered = products
    .filter((p) => (filter === "all" ? true : p.loanType === filter))
    .filter((p) => (search ? p.bankName.toLowerCase().includes(search.toLowerCase()) || p.productName.toLowerCase().includes(search.toLowerCase()) : true))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-7 w-7" /> Loan Products
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage curated loan products shown on the Loans page. Sponsored products appear first.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Loan Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Bank</label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="HDFC" />
                </div>
                <div>
                  <label className="text-xs">Product Name</label>
                  <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Personal Loan" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Loan Type</label>
                  <Select value={form.loanType} onValueChange={(v) => setForm({ ...form, loanType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOAN_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs">Affiliate Network</label>
                  <Select value={form.affiliateNetwork} onValueChange={(v) => setForm({ ...form, affiliateNetwork: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bankbazaar">BankBazaar</SelectItem>
                      <SelectItem value="policybazaar">PolicyBazaar</SelectItem>
                      <SelectItem value="creditmantri">CreditMantri</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Interest Rate Min (%)</label>
                  <Input type="number" step="0.01" value={form.interestRateMin} onChange={(e) => setForm({ ...form, interestRateMin: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs">Interest Rate Max (%)</label>
                  <Input type="number" step="0.01" value={form.interestRateMax} onChange={(e) => setForm({ ...form, interestRateMax: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Max Amount (₹)</label>
                  <Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs">Tenure (months)</label>
                  <Input type="number" value={form.tenureMonths} onChange={(e) => setForm({ ...form, tenureMonths: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="text-xs">Processing Fee</label>
                <Input value={form.processingFee} onChange={(e) => setForm({ ...form, processingFee: e.target.value })} placeholder="Up to 2% of loan amount" />
              </div>
              <div>
                <label className="text-xs">Features (one per line)</label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="No collateral required&#10;Disbursal in 4 seconds"
                />
              </div>
              <div>
                <label className="text-xs">Affiliate URL</label>
                <Input value={form.affiliateUrl} onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })} placeholder="https://www.bankbazaar.com/.../ref=mymoney" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Display Order</label>
                  <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isSponsored} onChange={(e) => setForm({ ...form, isSponsored: e.target.checked })} />
                    Sponsored
                  </label>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? "Creating..." : "Create Loan Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by bank or product..." className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Loan type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LOAN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{products.length} total</Badge>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No loan products match your filter.</CardContent></Card>
      ) : (
        <div className="grid gap-3" data-testid="admin-loans-list">
          {filtered.map((product) => (
            <Card key={product.id} data-testid="admin-loan-row" data-sponsored={product.isSponsored ? "true" : "false"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{product.bankName}</span>
                      {product.isSponsored && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-400 text-amber-700 gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Sponsored
                        </Badge>
                      )}
                      {!product.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <h3 className="font-semibold text-sm mt-0.5">{product.productName}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs mt-2">
                      <div>
                        <span className="text-muted-foreground text-[10px]">Rate</span>
                        <p className="font-medium">{product.interestRateMin}% - {product.interestRateMax}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Max</span>
                        <p className="font-medium">{product.maxAmount ? formatIndianCurrency(product.maxAmount) : "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Network</span>
                        <p className="font-medium">{product.affiliateNetwork}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Order</span>
                        <p className="font-medium">{product.displayOrder}</p>
                      </div>
                    </div>
                    <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2">
                      <ExternalLink className="h-2.5 w-2.5" /> {product.affiliateUrl.slice(0, 60)}...
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(product.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
