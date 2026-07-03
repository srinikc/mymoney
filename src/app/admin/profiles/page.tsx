"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { createColumnHelper } from "@tanstack/react-table"
import { Shield, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AdminProfile {
  id: number
  name: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  userId: number
  user: { id: number; email: string; name: string | null; role: string }
  expenseCount: number
  budgetCount: number
  goalCount: number
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileUserId, setNewProfileUserId] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/profiles")
      if (res.ok) {
        const data = await res.json()
        setProfiles(data)
        setError(null)
      } else {
        if (res.status === 403) setError("Admin access required")
        else setError("Failed to load profiles")
        setProfiles([])
      }
    } catch {
      setError("Failed to load profiles")
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const deleteProfile = async (profileId: number) => {
    if (!confirm("Are you sure you want to delete this profile?")) return
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}`, { method: "DELETE" })
      if (res.ok) fetchProfiles()
    } catch {
      // silently fail
    }
  }

  const createProfile = async () => {
    setCreateError(null)
    const userId = Number.parseInt(newProfileUserId)
    if (!newProfileName.trim()) {
      setCreateError("Profile name is required")
      return
    }
    if (Number.isNaN(userId) || userId <= 0) {
      setCreateError("Valid user ID is required")
      return
    }
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProfileName.trim(), userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error || "Failed to create profile")
        return
      }
      setShowCreateDialog(false)
      setNewProfileName("")
      setNewProfileUserId("")
      fetchProfiles()
    } catch {
      setCreateError("Failed to create profile")
    }
  }

  const columnHelper = createColumnHelper<AdminProfile>()

  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("user", {
      header: "User",
      cell: (info) => (
        <span className="text-xs">
          {info.getValue().name || info.getValue().email}
          <span className="text-muted-foreground"> (#{info.getValue().id})</span>
        </span>
      ),
    }),
    columnHelper.accessor("isDefault", {
      header: "Default",
      cell: (info) =>
        info.getValue() ? (
          <Badge variant="success" className="text-[10px]">
            Default
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor("expenseCount", {
      header: "Expenses",
      cell: (info) => <span className="text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => <span className="text-xs">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => deleteProfile(info.row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    }),
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin — Profiles</h1>
          <p className="text-muted-foreground">Manage all user profiles</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Admin — Profiles</h1>
          <p className="text-muted-foreground">Manage all user profiles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfiles} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create Profile
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Profiles ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading profiles...</div>
          ) : (
            <DataTable columns={columns} data={profiles} pageSize={20} />
          )}
        </CardContent>
      </Card>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Profile</DialogTitle>
            <DialogDescription>
              Create a new profile for any user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Profile Name</label>
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g., Personal"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">User ID</label>
              <Input
                value={newProfileUserId}
                onChange={(e) => setNewProfileUserId(e.target.value)}
                placeholder="e.g., 1"
                type="number"
                className="mt-1"
              />
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createProfile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
