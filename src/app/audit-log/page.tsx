"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "motion/react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number
  profileId: number
  profile?: { name: string }
  action: string
  entity: string
  entityId: number | null
  metadata: string | null
  createdAt: string
}

interface AuditLogResponse {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

interface Filters {
  action: string
  entity: string
  search: string
  dateFrom: string
  dateTo: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "view", label: "View" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
] as const

const ENTITY_TYPES = [
  { value: "", label: "All Entities" },
  { value: "expense", label: "Expense" },
  { value: "budget", label: "Budget" },
  { value: "goal", label: "Goal" },
  { value: "investment", label: "Investment" },
  { value: "reminder", label: "Reminder" },
  { value: "deal", label: "Deal" },
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "profile", label: "Profile" },
  { value: "user", label: "User" },
] as const

const ACTION_STYLES: Record<string, "default" | "destructive" | "success" | "warning" | "outline"> = {
  create: "success",
  update: "warning",
  delete: "destructive",
  view: "default",
  export: "outline",
  import: "default",
}

const ACTION_ICONS: Record<string, string> = {
  create: "+",
  update: "~",
  delete: "✕",
  view: "👁",
  export: "↓",
  import: "↑",
}

const PAGE_SIZE = 50

// ── Format helpers ─────────────────────────────────────────────────────────

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function parseMetadata(metadata: string | null): string {
  if (!metadata) return "—"
  try {
    const parsed = JSON.parse(metadata)
    return JSON.stringify(parsed, null, 1)
  } catch {
    return metadata
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    action: "",
    entity: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ── Fetch audit logs ──────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(PAGE_SIZE))
      if (filters.action) params.set("action", filters.action)
      if (filters.entity) params.set("entity", filters.entity)
      if (filters.search) params.set("search", filters.search)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)

      const res = await fetch(`/api/audit-log?${params}`)
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment.")
        }
        if (res.status === 403) {
          throw new Error("Access denied. Admin or manager role required.")
        }
        throw new Error(`Failed to fetch audit logs (HTTP ${res.status})`)
      }

      const data: AuditLogResponse = await res.json()
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "An unknown error occurred"
      setError(message)
      setEntries([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ── Export to CSV ─────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Timestamp", "Profile", "Action", "Entity", "Entity ID", "Details"]
    const rows = entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.profile?.name ?? `Profile #${e.profileId}`,
      e.action,
      e.entity,
      e.entityId ?? "",
      e.metadata ?? "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Filter helpers ────────────────────────────────────────────────────
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ action: "", entity: "", search: "", dateFrom: "", dateTo: "" })
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "")

  // ── Render badge for action ───────────────────────────────────────────
  const renderActionBadge = (action: string) => {
    const variant = ACTION_STYLES[action] ?? "outline"
    return (
      <Badge variant={variant} className="whitespace-nowrap capitalize">
        {ACTION_ICONS[action] && (
          <span className="mr-1 text-xs">{ACTION_ICONS[action]}</span>
        )}
        {action}
      </Badge>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all changes and actions across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={exportCSV}
            disabled={entries.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search details..."
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Action filter */}
                <Select
                  value={filters.action}
                  onValueChange={(v) => updateFilter("action", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Entity filter */}
                <Select
                  value={filters.entity}
                  onValueChange={(v) => updateFilter("entity", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date from */}
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  placeholder="From date"
                />

                {/* Date to */}
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                  placeholder="To date"
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-end mt-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                {(() => {
                  if (loading) return "Loading entries..."
                  if (total > 0) {
                    const filteredLabel = hasActiveFilters ? " (filtered)" : ""
                    return `${total} total entries${filteredLabel}`
                  }
                  return "No entries found"
                })()}
              </CardDescription>
            </div>
            {totalPages > 1 && (
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading audit logs...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3 max-w-md">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <h3 className="font-semibold text-lg">Unable to Load Audit Logs</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && entries.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Search className="h-10 w-10 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-lg">No Audit Entries</h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "No entries match the current filters. Try adjusting them."
                    : "Audit logging is active. Entries will appear here as actions are taken."}
                </p>
              </div>
            </div>
          )}

          {/* Data Table */}
          {!loading && !error && entries.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[140px]">Profile</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead className="w-[120px]">Entity</TableHead>
                      <TableHead className="w-[80px]">Entity ID</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatTimestamp(entry.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.profile?.name ?? (
                            <span className="text-muted-foreground">
                              Profile #{entry.profileId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{renderActionBadge(entry.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {entry.entity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {entry.entityId ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={parseMetadata(entry.metadata)}>
                          {parseMetadata(entry.metadata)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
                  <p>
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const startPage = Math.max(1, page - 2)
                      const pageNum = startPage + i
                      if (pageNum > totalPages) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "outline"}
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
