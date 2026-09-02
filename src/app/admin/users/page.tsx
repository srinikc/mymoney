"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { createColumnHelper } from "@tanstack/react-table"
import { ChevronRight, Shield, User as UserIcon, Trash2, Plus, Loader2 } from "lucide-react"

interface AdminUser {
  id: number
  email: string
  name: string | null
  image: string | null
  role: string
  tier: string
  authMethod: "credentials" | "google" | "both"
  hasPassword: boolean
  createdAt: string
  updatedAt: string
  profileCount: number
  profiles: { id: number; name: string; isDefault: boolean; createdAt: string }[]
}

interface CreateUserForm {
  name: string
  email: string
  isGoogleLinked: boolean
  password: string
  confirmPassword: string
  role: string
  profileName: string
}

const initialForm: CreateUserForm = {
  name: "",
  email: "",
  isGoogleLinked: false,
  password: "",
  confirmPassword: "",
  role: "user",
  profileName: "Default",
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  // Set password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateUserForm>(initialForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
        setError(null)
      } else if (res.status === 403) {
        setError("Admin access required")
        setUsers([])
      } else {
        setError("Failed to load users")
        setUsers([])
      }
    } catch {
      setError("Failed to load users")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const updateUserRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        fetchUsers()
        if (selectedUser?.id === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, role } : null))
        }
      }
    } catch {
      // silently fail
    }
  }

  const updateUserTier = async (userId: number, tier: string) => {
    try {
      const res = await fetch("/api/admin/tier", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      })
      if (res.ok) {
        fetchUsers()
        if (selectedUser?.id === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, tier } : null))
        }
      }
    } catch {
      // silently fail
    }
  }

  const deleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      if (res.ok) {
        fetchUsers()
        if (selectedUser?.id === userId) setSelectedUser(null)
      }
    } catch {
      // silently fail
    }
  }

  const unlinkGoogle = async (userId: number) => {
    if (!confirm("Unlink Google account from this user? They will need to sign in with email + password (set one first if needed).")) return
    setActing(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/unlink-google`, { method: "POST" })
      if (res.ok) {
        fetchUsers()
        setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, authMethod: prev.hasPassword ? "both" : "credentials" } : prev))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to unlink Google")
      }
    } catch {
      alert("Network error")
    } finally {
      setActing(false)
    }
  }

  const handleSetPassword = async () => {
    if (!selectedUser) return
    if (newPassword !== confirmNewPassword) {
      alert("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters")
      return
    }
    setActing(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        fetchUsers()
        setSelectedUser((prev) => (prev ? { ...prev, hasPassword: true, authMethod: prev.authMethod === "google" ? "both" : prev.authMethod } : prev))
        setPasswordDialogOpen(false)
        setNewPassword("")
        setConfirmNewPassword("")
        alert("Password set successfully. The user can now sign in with email + password.")
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to set password")
      }
    } catch {
      alert("Network error")
    } finally {
      setActing(false)
    }
  }

  // ── Create User ──────────────────────────────────────

  const handleCreateUser = async () => {
    // Validate
    const errors: Record<string, string> = {}

    if (!form.name.trim()) {
      errors.name = "Name is required"
    }

    if (!form.email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Invalid email format"
    }

    if (!form.isGoogleLinked) {
      if (!form.password) {
        errors.password = "Password is required"
      } else if (form.password.length < 8) {
        errors.password = "Password must be at least 8 characters"
      }

      if (!form.confirmPassword) {
        errors.confirmPassword = "Please confirm your password"
      } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setCreating(true)
    setFormErrors({})
    setCreateSuccess(null)

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          isGoogleLinked: form.isGoogleLinked,
          password: form.isGoogleLinked ? undefined : form.password,
          role: form.role,
          profileName: form.profileName.trim() || "Default",
        }),
      })

      if (res.ok) {
        setCreateSuccess(`User ${form.name} created successfully!`)
        setForm(initialForm)
        fetchUsers()
        setTimeout(() => {
          setCreateDialogOpen(false)
          setCreateSuccess(null)
        }, 1500)
      } else {
        const data = await res.json()
        setFormErrors({ general: data.error || "Failed to create user" })
      }
    } catch {
      setFormErrors({ general: "Failed to create user. Please try again." })
    } finally {
      setCreating(false)
    }
  }

  const columnHelper = createColumnHelper<AdminUser>()

  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => <span className="text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("authMethod", {
      header: "Auth",
      cell: (info) => {
        const method = info.getValue()
        if (method === "google") {
          return (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-300 text-blue-700 dark:text-blue-300 gap-0.5">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Badge>
          )
        }
        if (method === "both") {
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-300 text-blue-700 dark:text-blue-300">
                Google + Email
              </Badge>
            </div>
          )
        }
        return <Badge variant="outline" className="text-[10px] h-5 px-1.5">Email</Badge>
      },
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: (info) => (
        <Select
          value={info.getValue()}
          onValueChange={(v) => updateUserRole(info.row.original.id, v)}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      ),
    }),
    columnHelper.accessor("tier", {
      header: "Tier",
      cell: (info) => (
        <Select
          value={info.getValue()}
          onValueChange={(v) => updateUserTier(info.row.original.id, v)}
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
    columnHelper.accessor("profileCount", {
      header: "Profiles",
      cell: (info) => <Badge variant="secondary">{info.getValue()}</Badge>,
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => <span className="text-xs">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSelectedUser(info.row.original)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => deleteUser(info.row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin — Users</h1>
          <p className="text-muted-foreground">Manage all users and their roles</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Admin — Users</h1>
          <p className="text-muted-foreground">Manage all users and their roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setForm(initialForm); setFormErrors({}); setCreateSuccess(null); setCreateDialogOpen(true) }} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Create User
          </Button>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading users...</div>
          ) : (
            <DataTable columns={columns} data={users} pageSize={20} />
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open && !creating) { setCreateDialogOpen(false); setFormErrors({}); setCreateSuccess(null) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create User
            </DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive access to MyMoney.
            </DialogDescription>
          </DialogHeader>

          {createSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-lg font-medium">{createSuccess}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formErrors.general && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {formErrors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={creating}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={creating}
                />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>

              {/* Google-linked toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.isGoogleLinked}
                  onCheckedChange={(checked) => setForm({ ...form, isGoogleLinked: checked === true })}
                  disabled={creating}
                />
                <Label htmlFor="create-google" className="cursor-pointer" onClick={() => setForm({ ...form, isGoogleLinked: !form.isGoogleLinked })}>
                  Create as Google-linked user
                </Label>
              </div>

              {/* Password fields (only if NOT Google-linked) */}
              {!form.isGoogleLinked && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password *</Label>
                    <Input
                      id="create-password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      disabled={creating}
                    />
                    {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-confirm-password">Confirm Password *</Label>
                    <Input
                      id="create-confirm-password"
                      type="password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      disabled={creating}
                    />
                    {formErrors.confirmPassword && <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>}
                  </div>
                </>
              )}

              {/* Role selection */}
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                  disabled={creating}
                >
                  <SelectTrigger id="create-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Profile Name */}
              <div className="space-y-2">
                <Label htmlFor="create-profile-name">Profile Name</Label>
                <Input
                  id="create-profile-name"
                  placeholder="Default"
                  value={form.profileName}
                  onChange={(e) => setForm({ ...form, profileName: e.target.value })}
                  disabled={creating}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {!createSuccess && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setCreateDialogOpen(false); setFormErrors({}); }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              {selectedUser?.name || selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              User ID: {selectedUser?.id} &middot; Joined {selectedUser && formatDate(selectedUser.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(v) => updateUserRole(selectedUser.id, v)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <Select
                    value={selectedUser.tier}
                    onValueChange={(v) => updateUserTier(selectedUser.id, v)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profiles</p>
                  <p className="text-sm font-medium">{selectedUser.profileCount}</p>
                </div>
              </div>

              {/* Profiles list */}
              {selectedUser.profiles.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Profiles</p>
                  <div className="space-y-1">
                    {selectedUser.profiles.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>
                          {p.name}
                          {p.isDefault && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              Default
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auth method management */}
              <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">Authentication Method</p>
                <div className="flex items-center gap-2 text-sm">
                  {selectedUser.authMethod === "google" ? (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
                      Google only (no password set)
                    </Badge>
                  ) : selectedUser.authMethod === "both" ? (
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                      Google + Email (both work)
                    </Badge>
                  ) : (
                    <Badge variant="outline">Email + Password</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedUser.authMethod !== "credentials" && selectedUser.id !== Number(session?.user?.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unlinkGoogle(selectedUser.id)}
                      disabled={acting}
                      data-testid="admin-unlink-google"
                    >
                      Unlink Google
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPasswordDialogOpen(true)}
                    disabled={acting || selectedUser.hasPassword}
                    data-testid="admin-set-password"
                  >
                    {selectedUser.hasPassword ? "Password set" : "Set Password"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Setting a password adds email login. Unlinking Google removes OAuth but keeps the user.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Set password dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}. They can sign in with email + password after this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={acting}
              data-testid="admin-new-password"
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              disabled={acting}
              data-testid="admin-confirm-password"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={acting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSetPassword} disabled={acting || newPassword.length < 8} data-testid="admin-save-password">
                {acting ? "Setting..." : "Set Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
