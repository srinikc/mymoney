"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Gift, Plus, Loader2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Deal {
  id: number
  merchant: string
  title: string
  description: string | null
  discount: string | null
  couponCode: string | null
  url: string | null
  validUntil: string | null
  category: string | null
  isActive: boolean
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ merchant: "", title: "", description: "", discount: "", couponCode: "", url: "", validUntil: "", category: "" })

  const loadDeals = async () => {
    const res = await fetch("/api/deals")
    setDeals(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadDeals() }, [])

  const handleSubmit = async () => {
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setOpen(false)
    setForm({ merchant: "", title: "", description: "", discount: "", couponCode: "", url: "", validUntil: "", category: "" })
    loadDeals()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/deals`, { method: "DELETE", body: JSON.stringify({ id }) })
    loadDeals()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">Track offers and discounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Deal</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <Input placeholder="Merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Discount" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                <Input placeholder="Coupon Code" value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} />
              </div>
              <Input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit}>Save Deal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : deals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No deals yet. Add one!</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <Card key={deal.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{deal.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{deal.merchant}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(deal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deal.description && <p className="text-sm mb-2">{deal.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {deal.discount && <Badge variant="secondary">{deal.discount} OFF</Badge>}
                  {deal.couponCode && <Badge variant="outline">{deal.couponCode}</Badge>}
                  {deal.category && <Badge>{deal.category}</Badge>}
                </div>
                {deal.validUntil && <p className="text-xs text-muted-foreground mt-2">Valid till {formatDate(deal.validUntil)}</p>}
                {deal.url && (
                  <a href={deal.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 block">
                    View Deal &rarr;
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
