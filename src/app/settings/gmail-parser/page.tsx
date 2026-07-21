"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, RotateCcw, Plus, X, Mail } from "lucide-react"
import Link from "next/link"

interface KeywordConfig {
  label: string
  key: string
  defaultKeywords: string[]
  description: string
}

const PARSER_CONFIGS: KeywordConfig[] = [
  { label: "UPI Payments", key: "upi", defaultKeywords: ["upi", "paid", "payment", "debited", "transaction"], description: "Keywords to detect UPI payment receipts" },
  { label: "Bank Transactions", key: "bank", defaultKeywords: ["debited", "credited", "transaction", "withdrawal", "deposit", "trf", "imps", "neft", "rtgs"], description: "Keywords to detect bank transaction alerts" },
  { label: "Salary", key: "salary", defaultKeywords: ["salary", "payslip", "payroll", "wage", "salary credit"], description: "Keywords to detect salary credit emails" },
  { label: "Purchases", key: "purchase", defaultKeywords: ["order", "placed", "shipped", "delivered", "purchase", "receipt", "invoice", "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq"], description: "Keywords to detect online purchase receipts" },
  { label: "Gold", key: "gold", defaultKeywords: ["gold", "24k", "22k", "916", "sovereign gold", "gold coin", "gold bar", "tanishq", "mmtc", "pamp", "caratlane", "gold loan", "digital gold"], description: "Keywords to detect gold purchase/transaction emails" },
  { label: "Silver", key: "silver", defaultKeywords: ["silver", "silver coin", "silver bar", "silver biscuit", "999 silver"], description: "Keywords to detect silver purchase emails" },
  { label: "Mutual Funds", key: "mutualFund", defaultKeywords: ["mutual fund", "folio", "nav", "sip", "redemption", "dividend", "cams", "kfintech"], description: "Keywords to detect mutual fund transaction emails" },
  { label: "Stock Trades", key: "trade", defaultKeywords: ["bought", "sold", "trade", "order", "executed", "zerodha", "groww", "upstox"], description: "Keywords to detect stock trade confirmations" },
  { label: "Insurance", key: "insurance", defaultKeywords: ["insurance", "premium", "policy", "renewal", "cover"], description: "Keywords to detect insurance-related emails" },
  { label: "Subscriptions", key: "subscription", defaultKeywords: ["subscription", "renewal", "billed", "monthly", "annual"], description: "Keywords to detect subscription payment emails" },
  { label: "Tax", key: "tax", defaultKeywords: ["form 16", "itr", "income tax", "tax return", "26as", "ais", "tax credit"], description: "Keywords to detect tax document emails" },
]

export default function GmailParserSettingsPage() {
  const [keywords, setKeywords] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newKeywords, setNewKeywords] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/settings/gmail-parser")
      .then((r) => r.json())
      .then((data) => {
        const kw: Record<string, string[]> = {}
        for (const config of PARSER_CONFIGS) {
          kw[config.key] = data.keywords?.[config.key] || [...config.defaultKeywords]
        }
        setKeywords(kw)
      })
      .catch(() => {
        const kw: Record<string, string[]> = {}
        for (const config of PARSER_CONFIGS) kw[config.key] = [...config.defaultKeywords]
        setKeywords(kw)
      })
      .finally(() => setLoading(false))
  }, [])

  const removeKeyword = (key: string, index: number) => {
    setKeywords((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }))
  }

  const addKeyword = (key: string) => {
    const value = newKeywords[key]?.trim()
    if (!value) return
    setKeywords((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), value],
    }))
    setNewKeywords((prev) => ({ ...prev, [key]: "" }))
  }

  const resetDefaults = () => {
    const kw: Record<string, string[]> = {}
    for (const config of PARSER_CONFIGS) kw[config.key] = [...config.defaultKeywords]
    setKeywords(kw)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/gmail-parser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      })
      if (!res.ok) throw new Error("Save failed")
      alert("Keywords saved successfully!")
    } catch {
      alert("Failed to save keywords")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Mail className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gmail Parser Keywords</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Customize keywords used to detect financial emails in your Gmail inbox. Add keywords specific to your email patterns.
      </p>

      <div className="grid gap-4">
        {PARSER_CONFIGS.map((config) => (
          <Card key={config.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{config.label}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">{keywords[config.key]?.length || 0} keywords</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(keywords[config.key] || []).map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-xs gap-1 pr-1">
                    {kw}
                    <button onClick={() => removeKeyword(config.key, i)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  size={1}
                  value={newKeywords[config.key] || ""}
                  onChange={(e) => setNewKeywords((prev) => ({ ...prev, [config.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(config.key) } }}
                  placeholder="Add keyword..."
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => addKeyword(config.key)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
