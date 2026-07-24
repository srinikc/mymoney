"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ArchiveRestore, AlertCircle, Trash2 } from "lucide-react"
import type { Expense } from "@/types"

export default function ArchivePage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [autoPurged, setAutoPurged] = useState(0)
  const [confirmState, setConfirmState] = useState<{ open: boolean; ids: number[]; action: "purge" | "purge-all" }>({ open: false, ids: [], action: "purge" })

  const loadArchived = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/expenses?archived=true&pageSize=200")
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArchived()
    autoPurgeExpired()
  }, [])

  const autoPurgeExpired = async () => {
    try {
      const res = await fetch("/api/expenses/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge-expired" }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.count > 0) {
          setAutoPurged(data.count)
          loadArchived()
        }
      }
    } catch { /* auto-purge failed silently */ }
  }

  const restore = async (id: number) => {
    const res = await fetch("/api/expenses/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", ids: [id] }),
    })
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      toast.success("Expense restored")
    }
  }

  const restoreSelected = async () => {
    const ids = selectedIds.size > 0 ? [...selectedIds] : expenses.map((e) => e.id)
    const res = await fetch("/api/expenses/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", ids }),
    })
    if (res.ok) {
      setSelectedIds(new Set())
      loadArchived()
      toast.success(`${ids.length} expense${ids.length > 1 ? "s" : ""} restored`)
    }
  }

  const executePurge = async (ids: number[]) => {
    const res = await fetch("/api/expenses/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge", ids }),
    })
    if (res.ok) {
      if (confirmState.action === "purge" && ids.length === 1) {
        setExpenses((prev) => prev.filter((e) => e.id !== ids[0]))
      } else {
        setSelectedIds(new Set())
        loadArchived()
      }
      toast.success(`${ids.length} expense${ids.length > 1 ? "s" : ""} permanently deleted`)
    }
  }

  const promptPurge = (id: number) => {
    setConfirmState({ open: true, ids: [id], action: "purge" })
  }

  const promptPurgeSelected = () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setConfirmState({ open: true, ids, action: "purge-all" })
  }

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length && expenses.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)))
    }
  }

  const formatDateTime = (d: string | Date) => {
    const date = new Date(d)
    return date.toLocaleString()
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArchiveRestore className="h-5 w-5" />
            Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoPurged > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <AlertCircle className="h-3 w-3" />
              Auto-cleaned {autoPurged} expired record{autoPurged > 1 ? "s" : ""} (older than 7 days)
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button size="sm" className="h-7 text-xs" onClick={restoreSelected}>
                <ArchiveRestore className="h-3 w-3 mr-1" />
                Restore Selected
              </Button>
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={promptPurgeSelected}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Permanently
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No archived expenses.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] text-left">
                <thead>
                  <tr className="border-b text-left text-[10px] font-medium text-muted-foreground">
                    <th className="px-1.5 py-1 w-8">
                      <input type="checkbox" className="h-3 w-3" checked={expenses.length > 0 && selectedIds.size === expenses.length}
                        onChange={toggleSelectAll} />
                    </th>
                    <th className="px-1.5 py-1">Date</th>
                    <th className="px-1.5 py-1">Vendor</th>
                    <th className="px-1.5 py-1">Category</th>
                    <th className="px-1.5 py-1">Sub Cat</th>
                    <th className="px-1.5 py-1">Person</th>
                    <th className="px-1.5 py-1">Amount</th>
                    <th className="px-1.5 py-1">Archived At</th>
                    <th className="px-1.5 py-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-border/50">
                      <td className="px-1.5 py-1">
                        <input type="checkbox" className="h-3 w-3" checked={selectedIds.has(exp.id)}
                          onChange={() => toggleSelect(exp.id)} />
                      </td>
                      <td className="px-1.5 py-1 text-[10px]" title={formatDateTime(exp.date)}>{formatDate(exp.date)}</td>
                      <td className="px-1.5 py-1 text-[10px] max-w-[150px] truncate">{exp.vendor || "—"}</td>
                      <td className="px-1.5 py-1 text-[10px]">{exp.category?.name || "—"}</td>
                      <td className="px-1.5 py-1 text-[10px]">{exp.subCategory || "—"}</td>
                      <td className="px-1.5 py-1 text-[10px]">{exp.person || "—"}</td>
                      <td className="px-1.5 py-1 text-[10px]">{formatCurrency(exp.amount)}</td>
                      <td className="px-1.5 py-1 text-[10px]">{exp.deletedAt ? formatDateTime(exp.deletedAt) : "—"}</td>
                      <td className="px-1.5 py-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Restore" onClick={() => restore(exp.id)}>
                            <ArchiveRestore className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" title="Delete permanently" onClick={() => promptPurge(exp.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Permanently delete?"
        description={
          confirmState.ids.length === 1
            ? "This expense will be permanently deleted. This cannot be undone."
            : `${confirmState.ids.length} expenses will be permanently deleted. This cannot be undone.`
        }
        confirmLabel="Delete permanently"
        variant="destructive"
        onConfirm={() => {
          executePurge(confirmState.ids)
          setConfirmState((prev) => ({ ...prev, open: false }))
        }}
      />
    </div>
  )
}
