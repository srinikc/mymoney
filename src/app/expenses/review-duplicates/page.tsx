"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ReviewDuplicatesSkeleton } from "@/components/ui/page-skeleton"
import {
  Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Trash2,
} from "lucide-react"
import type { Expense } from "@/types"

interface PaginatedResponse {
  data: Expense[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function ReviewDuplicatesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)

  const pageSize = 50

  const loadFlagged = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search) params.set("search", search)
      const res = await fetch(`/api/expenses/flagged?${params}`)
      const data: PaginatedResponse = await res.json()
      setExpenses(data.data)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { loadFlagged() }, [loadFlagged])

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === expenses.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(expenses.map((e) => e.id)))
    }
  }

  const doBatchAction = async (action: "confirm" | "delete") => {
    if (selected.size === 0) return
    setActionLoading(true)
    try {
      await fetch("/api/expenses/flagged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [...selected] }),
      })
      setSelected(new Set())
      await loadFlagged()
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/expenses" className="text-sm text-muted-foreground hover:text-foreground">
              &larr; Back to Expenses
            </Link>
            <h1 className="text-2xl font-bold">Review Duplicates</h1>
            {!loading && (
              <Badge variant="outline" className="text-sm">
                {total} flagged
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => doBatchAction("confirm")}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Keep ({selected.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => doBatchAction("delete")}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selected.size})
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Flagged Duplicate Expenses
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flagged..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              These expenses were identified as potential duplicates (same date, amount, vendor, and description as existing records).
              Review each one: click <strong>Keep</strong> if it&apos;s a legitimate transaction, or <strong>Delete</strong> if it&apos;s a true duplicate.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-4"><ReviewDuplicatesSkeleton /></div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {search ? "No flagged records match your search." : "No flagged records to review."}
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <DataTable
                    columns={[
                      {
                        id: "select",
                        header: () => (
                          <Checkbox
                            checked={selected.size === expenses.length && expenses.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        ),
                        cell: ({ row }) => (
                          <Checkbox
                            checked={selected.has(row.original.id)}
                            onCheckedChange={() => toggleSelect(row.original.id)}
                          />
                        ),
                        enableSorting: false,
                      },
                      {
                        accessorKey: "date",
                        header: "Date",
                        cell: ({ row }) => (
                          <span className="whitespace-nowrap">{formatDate(row.original.date)}</span>
                        ),
                        enableSorting: false,
                      },
                      {
                        accessorKey: "vendor",
                        header: "Vendor",
                        cell: ({ row }) => (
                          <span className="max-w-[200px] truncate block" title={row.original.vendor || ""}>
                            {row.original.vendor || "-"}
                          </span>
                        ),
                        enableSorting: false,
                      },
                      {
                        accessorKey: "description",
                        header: "Description",
                        cell: ({ row }) => (
                          <span className="max-w-[300px] truncate block" title={row.original.description || ""}>
                            {row.original.description || "-"}
                          </span>
                        ),
                        enableSorting: false,
                      },
                      {
                        accessorKey: "amount",
                        header: "Amount",
                        cell: ({ row }) => (
                          <span className="text-right whitespace-nowrap font-mono block">
                            {formatCurrency(row.original.amount)}
                          </span>
                        ),
                        enableSorting: false,
                      },
                      {
                        accessorKey: "category",
                        header: "Category",
                        cell: ({ row }) => (
                          <Badge variant="outline">
                            {row.original.category?.name || "Uncategorized"}
                          </Badge>
                        ),
                        enableSorting: false,
                      },
                      {
                        accessorKey: "person",
                        header: "Person",
                        cell: ({ row }) => row.original.person || "-",
                        enableSorting: false,
                      },
                    ]}
                    data={expenses}
                    showPagination={false}
                  />
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    {total} flagged {search ? "matching" : "total"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
