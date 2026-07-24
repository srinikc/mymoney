"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Building2, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

const BANK_TYPES = ["savings", "current", "salary", "credit_card", "loan"]

export default function BankAccountsSettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ bankName: "", name: "", accountNumber: "", type: "savings", ifscCode: "", balance: "" })

  const fetchAccounts = async () => {
    const res = await fetch("/api/bank-accounts")
    const data = await res.json()
    setAccounts(data.accounts || [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const handleSave = async () => {
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save account")
      toast.success("Bank account added")
      setShowForm(false)
      setForm({ bankName: "", name: "", accountNumber: "", type: "savings", ifscCode: "", balance: "" })
      fetchAccounts()
    } catch (err: any) {
      toast.error(err.message || "Failed to save account")
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("Delete this bank account?")) {
      try {
        const res = await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete account")
        toast.success("Bank account deleted")
        fetchAccounts()
      } catch {
        toast.error("Failed to delete account")
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <Building2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Bank Accounts</h1>
      </div>

      <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" />{showForm ? "Cancel" : "Add Bank Account"}</Button>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Salary Account" />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="XXXX1234" />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANK_TYPES.map((t) => (<SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} placeholder="HDFC0001234" />
              </div>
              <div className="space-y-2">
                <Label>Current Balance (₹)</Label>
                <Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0" />
              </div>
            </div>
            <Button onClick={handleSave}>Save Account</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map((i) => (<Card key={i} className="h-20 animate-pulse"><CardContent /></Card>))}</div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><p>No bank accounts added yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{acc.bankName} — {acc.name}</p>
                  <p className="text-sm text-muted-foreground">{acc.accountNumber || ""} {acc.ifscCode ? `· ${acc.ifscCode}` : ""}</p>
                  <p className="text-sm font-semibold mt-1">Balance: ₹{acc.balance.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{acc.type}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
