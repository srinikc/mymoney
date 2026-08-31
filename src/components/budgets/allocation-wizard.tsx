"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  Wand2,
  Lightbulb,
  Target,
} from "lucide-react"
import {
  BUCKET_COLORS,
  BUCKET_DESCRIPTIONS,
  BUCKET_LABELS,
  type AllocationResult,
  type BudgetSplit,
} from "@/shared/budget-allocation"
import { formatCurrency, formatCurrencyFull } from "@/lib/utils"

interface AllocationResponse extends AllocationResult {
  monthlyIncome: number
  totalSuggested: number
  usingOverride: boolean
  appliedSplit: BudgetSplit | null
}

interface Props {
  month: number
  year: number
  onApplied?: () => void
}

const SPLIT_PRESETS: Array<{ label: string; split: BudgetSplit; note: string }> = [
  {
    label: "50 / 30 / 20 (Standard)",
    split: { needs: 50, wants: 30, savings: 20 },
    note: "Classic rule for ages 26–50.",
  },
  {
    label: "40 / 30 / 30 (Aggressive)",
    split: { needs: 40, wants: 30, savings: 30 },
    note: "Best for ≤25 with low fixed costs.",
  },
  {
    label: "60 / 25 / 15 (Conservative)",
    split: { needs: 60, wants: 25, savings: 15 },
    note: "Best for 50+ with dependents.",
  },
  {
    label: "70 / 20 / 10 (Heavy expenses)",
    split: { needs: 70, wants: 20, savings: 10 },
    note: "High EMI / rent phase.",
  },
]

export function AllocationWizard({ month, year, onApplied }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [data, setData] = useState<AllocationResponse | null>(null)
  const [customNeeds, setCustomNeeds] = useState<string>("")
  const [customWants, setCustomWants] = useState<string>("")
  const [customSavings, setCustomSavings] = useState<string>("")
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(
    new Set(["needs", "wants", "savings"]),
  )

  useEffect(() => {
    if (open) void fetchRecommendation(null)
  }, [open])

  async function fetchRecommendation(split: BudgetSplit | null) {
    setLoading(true)
    try {
      const res = await fetch("/api/budgets/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(split ? { split } : {}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to fetch recommendations")
      }
      const json: AllocationResponse = await res.json()
      setData(json)
      setCustomNeeds(String(json.appliedSplit?.needs ?? 50))
      setCustomWants(String(json.appliedSplit?.wants ?? 30))
      setCustomSavings(String(json.appliedSplit?.savings ?? 20))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function applyCustomSplit() {
    const n = Number(customNeeds)
    const w = Number(customWants)
    const s = Number(customSavings)
    if (!Number.isFinite(n) || !Number.isFinite(w) || !Number.isFinite(s)) {
      toast.error("All split values must be numbers")
      return
    }
    if (n + w + s !== 100) {
      toast.error(`Split must total 100 (currently ${n + w + s})`)
      return
    }
    void fetchRecommendation({ needs: n, wants: w, savings: s })
  }

  async function applySelected() {
    if (!data) return
    const chosen = data.allocations.filter((a) => selectedBuckets.has(a.bucket))
    if (chosen.length === 0) {
      toast.error("Pick at least one bucket to apply")
      return
    }
    setApplying(true)
    try {
      const results = await Promise.allSettled(
        chosen.map((a) =>
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId: a.categoryId,
              subCategory: null,
              month,
              year,
              amount: a.amount,
            }),
          }).then((r) => {
            if (!r.ok) throw new Error(`${a.categoryName}: ${r.status}`)
            return r.json()
          }),
        ),
      )
      const ok = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - ok
      if (ok > 0) {
        toast.success(`Applied ${ok} suggested budget${ok === 1 ? "" : "s"}`)
        onApplied?.()
      }
      if (failed > 0) {
        toast.warning(`${failed} suggestion${failed === 1 ? "" : "s"} could not be applied (may already exist)`)
      }
    } catch (e) {
      toast.error("Failed to apply suggestions")
    } finally {
      setApplying(false)
    }
  }

  function toggleBucket(b: string) {
    setSelectedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(b)) next.delete(b)
      else next.add(b)
      return next
    })
  }

  const splitSum =
    (Number(customNeeds) || 0) + (Number(customWants) || 0) + (Number(customSavings) || 0)

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Wand2 className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">50/30/20 Allocation Wizard</CardTitle>
            {data?.ageBucket && (
              <Badge variant="secondary" className="ml-2">{data.ageBucket.label}</Badge>
            )}
            {data?.usingOverride && (
              <Badge variant="outline" className="ml-1">Custom split</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? "Hide" : "Suggest budgets"}
          </Button>
        </div>
        {!open && data && (
          <p className="text-xs text-muted-foreground mt-1">
            Suggested total: {formatCurrencyFull(data.totalSuggested)} ·{" "}
            {data.appliedSplit?.needs}/{data.appliedSplit?.wants}/{data.appliedSplit?.savings}
          </p>
        )}
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 pt-0">
          {loading && !data ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <>
              {/* Income + split summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground font-semibold">Monthly Income</p>
                  <p className="text-lg font-bold">{formatCurrencyFull(data.monthlyIncome)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground font-semibold">Suggested Total</p>
                  <p className="text-lg font-bold">{formatCurrencyFull(data.totalSuggested)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground font-semibold">Current Split</p>
                  <p className="text-lg font-bold">
                    {data.appliedSplit?.needs}/{data.appliedSplit?.wants}/{data.appliedSplit?.savings}
                  </p>
                </div>
              </div>

              {/* Bucket bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {(["needs", "wants", "savings"] as const).map((b) => {
                  const selected = selectedBuckets.has(b)
                  return (
                    <button
                      key={b}
                      onClick={() => toggleBucket(b)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        selected ? "border-primary/40 bg-primary/5" : "opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: BUCKET_COLORS[b] }}
                          />
                          <span className="font-semibold text-sm">{BUCKET_LABELS[b]}</span>
                        </div>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{BUCKET_DESCRIPTIONS[b]}</p>
                      <p className="text-lg font-bold mt-1">{formatCurrencyFull(b === "needs" ? data.totalNeeds : b === "wants" ? data.totalWants : data.totalSavings)}</p>
                      <p className="text-xs text-muted-foreground">{data.appliedSplit?.[b]}% of income</p>
                    </button>
                  )
                })}
              </div>

              {/* Presets + custom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Quick Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SPLIT_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-left flex flex-col items-start"
                        onClick={() => void fetchRecommendation(p.split)}
                        disabled={loading}
                      >
                        <span className="text-xs font-semibold">{p.label}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{p.note}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Custom Split (must total 100)</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Needs %"
                        value={customNeeds}
                        onChange={(e) => setCustomNeeds(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Wants %"
                        value={customWants}
                        onChange={(e) => setCustomWants(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Savings %"
                        value={customSavings}
                        onChange={(e) => setCustomSavings(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={splitSum === 100 ? "text-emerald-600" : "text-amber-600"}>
                      Sum: {splitSum}/100
                    </span>
                    <Button size="sm" variant="secondary" onClick={applyCustomSplit} disabled={loading}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              {/* Per-category suggestions */}
              {data.allocations.length > 0 && (
                <div className="rounded-lg border">
                  <div className="p-3 border-b flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Per-category suggestions</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {data.allocations.filter((a) => selectedBuckets.has(a.bucket)).length} selected
                    </span>
                  </div>
                  <div className="max-h-72 overflow-auto divide-y">
                    {data.allocations
                      .filter((a) => selectedBuckets.has(a.bucket))
                      .sort((a, b) => b.amount - a.amount)
                      .map((a) => (
                        <div key={a.categoryId} className="flex items-center gap-3 px-3 py-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: BUCKET_COLORS[a.bucket] }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.categoryName}</p>
                            <p className="text-xs text-muted-foreground">{a.rationale}</p>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(a.amount)}</span>
                        </div>
                      ))}
                    {data.allocations.filter((a) => selectedBuckets.has(a.bucket)).length === 0 && (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        Select at least one bucket above
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes / rationale */}
              {data.notes.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold">Why this split?</span>
                  </div>
                  {data.notes.map((n, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{n}</p>
                  ))}
                </div>
              )}

              {/* Apply */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={applying}
                >
                  Close
                </Button>
                <Button
                  onClick={applySelected}
                  disabled={applying || !data || selectedBuckets.size === 0}
                >
                  {applying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Apply {data?.allocations.filter((a) => selectedBuckets.has(a.bucket)).length ?? 0} suggestions
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}
