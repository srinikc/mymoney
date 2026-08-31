"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  Search,
  Loader2,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { EXPENSE_PURPOSES, UNUSUAL_THRESHOLD } from "@/shared/validation"
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/utils"

interface UnusualExpense {
  id: number
  date: string
  amount: number
  vendor: string | null
  description: string | null
  purpose: string | null
  category: { id: number; name: string; icon: string; color: string }
  subCategory: string | null
}

interface PurposeBreakdown {
  purpose: string
  count: number
  total: number
}

interface UnusualResponse {
  data: UnusualExpense[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  totalAmount: number
  threshold: number
  purposeBreakdown: PurposeBreakdown[]
}

export default function UnusualExpensesPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UnusualResponse | null>(null)
  const [search, setSearch] = useState("")
  const [purposeFilter, setPurposeFilter] = useState<string>("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [actionOpen, setActionOpen] = useState(false)
  const [bulkPurpose, setBulkPurpose] = useState<string>("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) return
    void load()
  }, [status, session, page, purposeFilter])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
        ...(search ? { search } : {}),
        ...(purposeFilter ? { purpose: purposeFilter } : {}),
      })
      const res = await fetch(`/api/expenses/unusual?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      const json: UnusualResponse = await res.json()
      setData(json)
      setSelected(new Set())
    } catch (e) {
      toast.error("Failed to load unusual expenses")
    } finally {
      setLoading(false)
    }
  }

  async function doBulkAction(action: "dismiss" | "categorize") {
    if (selected.size === 0) {
      toast.warning("Select at least one expense")
      return
    }
    if (action === "categorize" && !bulkPurpose) {
      toast.warning("Pick a purpose to categorize")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/expenses/unusual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: Array.from(selected),
          ...(action === "categorize" ? { purpose: bulkPurpose } : {}),
        }),
      })
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      toast.success(`Updated ${json.updated} expense${json.updated === 1 ? "" : "s"}`)
      setActionOpen(false)
      setBulkPurpose("")
      await load()
    } catch {
      toast.error("Bulk action failed")
    } finally {
      setBusy(false)
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!data) return
    if (selected.size === data.data.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.data.map((e) => e.id)))
    }
  }

  const unpurposed = useMemo(() => {
    if (!data) return []
    return data.data.filter((e) => !e.purpose)
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-amber-500" /> Unusual Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transactions over ₹{UNUSUAL_THRESHOLD.toLocaleString("en-IN")} not in regular bills/rent/EMI categories.
            Review and tag their purpose for better insights.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total flagged" value={String(data.total)} icon={AlertTriangle} color="amber" />
        <StatCard label="Total amount" value={formatCurrencyFull(data.totalAmount)} icon={TrendingUp} color="primary" />
        <StatCard label="On this page" value={String(data.data.length)} icon={Filter} color="muted" />
        <StatCard label="Unpurposed" value={String(unpurposed.length)} icon={Sparkles} color="rose" />
      </div>

      {/* Purpose breakdown */}
      {data.purposeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> By purpose
            </CardTitle>
            <CardDescription>How your flagged spend breaks down</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.purposeBreakdown.map((p) => (
                <button
                  key={p.purpose}
                  onClick={() => setPurposeFilter(purposeFilter === p.purpose ? "" : p.purpose)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                    purposeFilter === p.purpose ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm capitalize">{p.purpose.replace(/-/g, " ")}</span>
                  <span className="text-sm font-semibold">{formatCurrency(p.total)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Bulk action */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); void load() } }}
            className="pl-9"
          />
        </div>
        {purposeFilter && (
          <Button variant="outline" size="sm" onClick={() => setPurposeFilter("")}>
            <X className="h-3 w-3 mr-1" /> Clear purpose
          </Button>
        )}
        {selected.size > 0 && (
          <Button size="sm" onClick={() => setActionOpen(true)}>
            {selected.size} selected — Act
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={!!data && data.data.length > 0 && selected.size === data.data.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right pr-4">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        Nothing unusual. All large transactions are tagged.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {data.data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selected.has(e.id)}
                        onCheckedChange={() => toggleSelect(e.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{e.vendor || e.description || "—"}</div>
                      {e.description && e.vendor && (
                        <div className="text-xs text-muted-foreground">{e.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {e.category.name.replace(/-/g, " ")}
                    </TableCell>
                    <TableCell>
                      {e.purpose ? (
                        <Badge variant="secondary" className="capitalize">{e.purpose.replace(/-/g, " ")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Untagged</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4 font-semibold">
                      {formatCurrencyFull(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk action modal */}
      {actionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActionOpen(false)} />
          <Card className="relative w-full max-w-md animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-base">Act on {selected.size} expense{selected.size === 1 ? "" : "s"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={busy}
                onClick={() => doBulkAction("dismiss")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                Mark as not unusual
              </Button>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Tag with purpose (and mark as normal)</p>
                <Select value={bulkPurpose} onValueChange={setBulkPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_PURPOSES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p.replace(/-/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={busy || !bulkPurpose}
                  onClick={() => doBulkAction("categorize")}
                >
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Apply purpose
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setActionOpen(false)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-500 bg-amber-100",
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-muted",
    rose: "text-rose-500 bg-rose-100",
  }
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
