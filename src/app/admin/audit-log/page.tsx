"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { Shield, Download, ChevronLeft, ChevronRight } from "lucide-react"

interface AuditEntry {
  id: number
  profileId: number
  action: string
  entity: string
  entityId: number | null
  metadata: string | null
  createdAt: string
  profile: {
    id: number
    name: string
    userId: number
    user: { id: number; email: string; name: string | null }
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState("")
  const [entityFilter, setEntityFilter] = useState("")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", "50")
      if (actionFilter) params.set("action", actionFilter)
      if (entityFilter) params.set("entity", entityFilter)
      if (userIdFilter) params.set("userId", userIdFilter)
      if (fromDate) params.set("from", new Date(fromDate).toISOString())
      if (toDate) params.set("to", new Date(toDate).toISOString())

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 403) setError("Admin access required")
        else setError("Failed to load audit log")
        setLogs([])
      } else {
        const data = await res.json()
        setLogs(data.logs)
        setPagination(data.pagination)
        setError(null)
      }
    } catch {
      setError("Failed to load audit log")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, entityFilter, userIdFilter, fromDate, toDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const resetFilters = () => {
    setActionFilter("")
    setEntityFilter("")
    setUserIdFilter("")
    setFromDate("")
    setToDate("")
    setPage(1)
  }

  const exportCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Entity", "Entity ID", "Details"]
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.profile?.user?.email || `User #${l.profile?.userId}`,
      l.action,
      l.entity,
      l.entityId ?? "",
      l.metadata || "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionBadge = (action: string) => {
    const variants: Record<string, string> = {
      create: "success",
      update: "warning",
      delete: "destructive",
      view: "secondary",
      export: "outline",
      import: "default",
    }
    return (
      <Badge variant={(variants[action] as any) || "outline"} className="text-[10px]">
        {action}
      </Badge>
    )
  }

  const columns: ColumnDef<AuditEntry>[] = [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt)
        return (
          <span className="text-xs whitespace-nowrap">
            {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )
      },
    },
    {
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.profile?.user?.name || row.original.profile?.user?.email || `User #${row.original.profile?.userId}`}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => actionBadge(row.original.action),
    },
    {
      accessorKey: "entity",
      header: "Entity",
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.entity}</span>,
    },
    {
      accessorKey: "entityId",
      header: "Entity ID",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.original.entityId ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "metadata",
      header: "Details",
      cell: ({ row }) => {
        const meta = row.original.metadata
        if (!meta) return <span className="text-xs text-muted-foreground">—</span>
        try {
          const parsed = JSON.parse(meta)
          return (
            <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
              {JSON.stringify(parsed)}
            </span>
          )
        } catch {
          return <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{meta}</span>
        }
      },
    },
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin — Audit Log</h1>
          <p className="text-muted-foreground">View all audit log entries</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-destructive opacity-50" />
            <p className="mt-4 text-lg font-medium text-destructive">Access Denied</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin — Audit Log</h1>
          <p className="text-muted-foreground">View all audit log entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={logs.length === 0}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Entity</label>
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1) }}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="profile">Profile</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="user.tier">Tier</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">User ID</label>
              <Input
                placeholder="User ID"
                value={userIdFilter}
                onChange={(e) => { setUserIdFilter(e.target.value); setPage(1) }}
                className="h-8 w-20 text-xs"
                type="number"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1) }}
                className="h-8 w-36 text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Audit Log Entries
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading audit log...</div>
          ) : (
            <>
              <DataTable columns={columns} data={logs} showPagination={false} />
              {/* Custom pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <p>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={page >= pagination.totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
