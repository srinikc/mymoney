"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { Link2, Check, X, Loader2 } from "lucide-react"

interface Suggestion {
  expenseId: number
  expenseDate: string
  expenseAmount: number
  expenseVendor: string
  matchType: "income" | "investment" | "insurance" | "loan"
  matchLabel: string
  targetId?: number
  targetName: string
}

export default function AutoLinkPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/auto-link/suggestions")
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [])

  const handleAccept = async (s: Suggestion) => {
    const key = `${s.expenseId}-${s.matchType}-${s.targetId || s.targetName}`
    try {
      const res = await fetch("/api/auto-link/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: s.expenseId,
          linkType: s.matchType,
          targetId: s.targetId || s.expenseId,
        }),
      })
      if (res.ok) {
        setAccepted((prev) => new Set(prev).add(key))
        toast.success("Link accepted")
      } else {
        throw new Error((await res.json()).error || "Failed to accept link")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to accept link")
    }
  }

  const typeColors: Record<string, string> = {
    income: "bg-emerald-500/10 text-emerald-500",
    investment: "bg-blue-500/10 text-blue-500",
    insurance: "bg-purple-500/10 text-purple-500",
    loan: "bg-amber-500/10 text-amber-500",
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Auto-Link Suggestions</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No suggestions found</p>
            <p className="text-sm mt-1">Add expenses and income sources to generate auto-link suggestions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s, i) => {
            const key = `${s.expenseId}-${s.matchType}-${s.targetId || s.targetName}`
            const isAccepted = accepted.has(key)
            return (
              <Card key={i} className={isAccepted ? "opacity-50" : ""}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={typeColors[s.matchType]}>
                      {s.matchType}
                    </Badge>
                    <div>
                      <p className="font-medium">{s.expenseVendor}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.expenseDate} — {formatCurrency(s.expenseAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.matchLabel}: <span className="font-medium">{s.targetName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAccepted ? (
                      <Badge variant="secondary" className="text-xs">Linked</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleAccept(s)}>
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
