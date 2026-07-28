"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { createColumnHelper } from "@tanstack/react-table"
import { Shield, Plus, Trash2, Search, ToggleLeft, ToggleRight, Users, ChevronDown, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface FeatureFlag {
  id: number
  name: string
  enabled: boolean
  tier: string
  createdAt: string
  updatedAt: string
}

interface UserFeature {
  name: string
  tier: string
  globallyEnabled: boolean
  tierAccess: boolean
  overrideEnabled: boolean | null
  effective: boolean
}

interface FeatureUser {
  id: number
  email: string
  name: string | null
  tier: string
  role: string
  createdAt: string
  features: UserFeature[]
}

interface UsersResponse {
  users: FeatureUser[]
  features: FeatureFlag[]
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  premium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<FeatureFlag[]>([])
  const [users, setUsers] = useState<FeatureUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedUser, setExpandedUser] = useState<number | null>(null)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newName, setNewName] = useState("")
  const [newTier, setNewTier] = useState("free")
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    setLoading(true)
    try {
      const [featRes, usersRes] = await Promise.all([
        fetch("/api/admin/features"),
        fetch("/api/admin/features/users"),
      ])
      if (featRes.ok && usersRes.ok) {
        const featData = await featRes.json()
        const usersData: UsersResponse = await usersRes.json()
        setFeatures(featData)
        setUsers(usersData.users)
        setError(null)
      } else {
        if (featRes.status === 403) setError("Admin access required")
        else setError("Failed to load data")
      }
    } catch {
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFeatures() }, [fetchFeatures])

  const toggleFeature = async (featureId: number, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/features/${featureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      })
      if (res.ok) fetchFeatures()
    } catch { /* ignore */ }
  }

  const updateFeatureTier = async (featureId: number, tier: string) => {
    try {
      const res = await fetch(`/api/admin/features/${featureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      if (res.ok) fetchFeatures()
    } catch { /* ignore */ }
  }

  const deleteFeature = async (featureId: number) => {
    if (!confirm("Are you sure you want to delete this feature flag?")) return
    try {
      const res = await fetch(`/api/admin/features/${featureId}`, { method: "DELETE" })
      if (res.ok) fetchFeatures()
    } catch { /* ignore */ }
  }

  const createFeature = async () => {
    setCreateError(null)
    if (!newName.trim()) {
      setCreateError("Feature name is required")
      return
    }
    try {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), tier: newTier }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error || "Failed to create feature")
        return
      }
      setShowCreateDialog(false)
      setNewName("")
      setNewTier("free")
      fetchFeatures()
    } catch {
      setCreateError("Failed to create feature")
    }
  }

  const bulkToggle = async (enable: boolean) => {
    const promises = features
      .filter((f) => f.enabled !== enable)
      .map((f) =>
        fetch(`/api/admin/features/${f.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: enable }),
        })
      )
    await Promise.all(promises)
    fetchFeatures()
  }

  const setUserFeatureOverride = async (userId: number, featureName: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/features/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, featureName, enabled }),
      })
      fetchFeatures()
    } catch { /* ignore */ }
  }

  const clearUserFeatureOverride = async (userId: number, featureName: string) => {
    try {
      await fetch("/api/admin/features/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, featureName }),
      })
      fetchFeatures()
    } catch { /* ignore */ }
  }

  const filteredFeatures = useMemo(
    () =>
      features.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.tier.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [features, searchQuery]
  )

  const columnHelper = createColumnHelper<FeatureFlag>()

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => (
        <span className="font-mono text-sm font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("enabled", {
      header: "Enabled",
      cell: (info) => (
        <button
          onClick={() => toggleFeature(info.row.original.id, info.getValue())}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
            info.getValue()
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {info.getValue() ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          {info.getValue() ? "On" : "Off"}
        </button>
      ),
    }),
    columnHelper.accessor("tier", {
      header: "Tier",
      cell: (info) => (
        <Select
          value={info.getValue()}
          onValueChange={(v) => updateFeatureTier(info.row.original.id, v)}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      ),
    }),
    columnHelper.accessor("updatedAt", {
      header: "Updated",
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
          onClick={() => deleteFeature(info.row.original.id)}
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
          <h1 className="text-3xl font-bold tracking-tight">Admin — Feature Flags</h1>
          <p className="text-muted-foreground">Manage feature flags and toggles</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Admin — Feature Flags</h1>
          <p className="text-muted-foreground">Manage features, tier access, and per-user overrides</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFeatures} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Feature
          </Button>
        </div>
      </div>

      {/* Feature Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => bulkToggle(true)}>
                Enable All
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => bulkToggle(false)}>
                Disable All
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading features...</div>
          ) : (
            <DataTable columns={columns} data={filteredFeatures} pageSize={20} />
          )}
        </CardContent>
      </Card>

      {/* Users & Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users &amp; Feature Access ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border">
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedUser === user.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={TIER_COLORS[user.tier] || TIER_COLORS.free}>
                        {user.tier}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </button>

                  {expandedUser === user.id && (
                    <div className="border-t px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {user.features.map((ft) => {
                          const isOverridden = ft.overrideEnabled !== null
                          const isEffective = ft.effective
                          return (
                            <div
                              key={ft.name}
                              className={`rounded-md border p-2 text-xs ${
                                isEffective
                                  ? "bg-emerald-500/5 border-emerald-200 dark:border-emerald-800"
                                  : "bg-muted/30 border-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-medium truncate">{ft.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isOverridden && (
                                    <button
                                      onClick={() => clearUserFeatureOverride(user.id, ft.name)}
                                      className="text-muted-foreground hover:text-destructive"
                                      title="Remove override"
                                    >
                                      &times;
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      setUserFeatureOverride(user.id, ft.name, !isEffective)
                                    }
                                    className={`shrink-0 ${
                                      isEffective ? "text-emerald-500" : "text-muted-foreground"
                                    }`}
                                    title={isOverridden ? "Toggle override" : "Override"}
                                  >
                                    {isEffective ? (
                                      <ToggleRight className="h-3.5 w-3.5" />
                                    ) : (
                                      <ToggleLeft className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge
                                  className={`px-1 py-0 text-[10px] ${
                                    ft.tier === "free"
                                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800"
                                      : ft.tier === "pro"
                                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                                      : "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                                  }`}
                                >
                                  {ft.tier}
                                </Badge>
                                {isOverridden && (
                                  <Badge variant="outline" className="px-1 py-0 text-[10px] text-muted-foreground">
                                    override
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Feature Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Feature Flag</DialogTitle>
            <DialogDescription>Create a new feature flag with tier access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Feature Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., dark-mode"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Minimum Tier</label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={createFeature}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
