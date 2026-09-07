"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, Download, Upload, Shield, Clock, HardDrive, Cloud, CheckCircle2, Loader2, AlertTriangle, RefreshCw, Folder, FolderOpen } from "lucide-react"

interface BackupRecord {
  id: number
  type: string
  status: string
  backupType: string
  compressedSize: number | null
  durationMs: number | null
  triggeredBy: string
  error: string | null
  r2Key: string | null
  supabaseKey: string | null
  localKey: string | null
  googleDriveKey: string | null
  destinations: string | null
  restoreTarget: string | null
  createdAt: string
}

interface StorageInfo {
  usedBytes: number
  objectCount: number
  limitBytes: number
  configured: boolean
}

interface AllStorage {
  local: StorageInfo
  r2: StorageInfo
  supabase: StorageInfo
  gdrive: StorageInfo
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

const DESTINATION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  local: { label: "Local Disk", icon: "💾", color: "text-gray-600" },
  r2: { label: "Cloudflare R2", icon: "☁️", color: "text-orange-600" },
  supabase: { label: "Supabase Storage", icon: "🟢", color: "text-emerald-600" },
  gdrive: { label: "Google Drive", icon: "📁", color: "text-blue-600" },
}

export default function BackupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === "admin"

  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [storage, setStorage] = useState<AllStorage | null>(null)
  const [loading, setLoading] = useState(true)
  const [backing, setBacking] = useState(false)
  const [restoreId, setRestoreId] = useState<number | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState("")
  const [restoreOptions, setRestoreOptions] = useState({ db: true, files: true, config: false })
  const [error, setError] = useState<string | null>(null)
  const [lastBackup, setLastBackup] = useState<BackupRecord | null>(null)
  const [lastRestore, setLastRestore] = useState<BackupRecord | null>(null)

  // Destination checkboxes for new backup
  const [selectedDestinations, setSelectedDestinations] = useState<{ local: boolean; r2: boolean; supabase: boolean; gdrive: boolean }>({
    local: true, r2: true, supabase: true, gdrive: false,
  })
  const [includeOptions, setIncludeOptions] = useState({ db: true, files: true, config: true })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [backupRes, storageRes] = await Promise.all([
        fetch("/api/admin/backup?limit=20"),
        fetch("/api/admin/backup/storage"),
      ])
      if (backupRes.ok) {
        const data = await backupRes.json()
        setBackups(data.backups)
        setLastBackup(data.backups.find((b: BackupRecord) => b.type === "backup" && b.status === "success") || null)
        setLastRestore(data.backups.find((b: BackupRecord) => b.type === "restore" && b.status === "success") || null)
      }
      if (storageRes.ok) {
        setStorage(await storageRes.json())
      }
    } catch {
      setError("Failed to load backup data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) { router.push("/"); return }
    fetchData()
  }, [isAdmin, router, fetchData])

  const handleBackupNow = async () => {
    const dests = (Object.entries(selectedDestinations).filter(([_, v]) => v).map(([k]) => k) as string[])
      .filter(d => {
        if (!storage) return false
        if (d === "local") return storage.local.configured
        if (d === "r2") return storage.r2.configured
        if (d === "supabase") return storage.supabase.configured
        if (d === "gdrive") return storage.gdrive.configured
        return false
      })

    if (dests.length === 0) {
      setError("No destinations configured. Set up R2/Supabase/Google Drive credentials in .env")
      return
    }

    setBacking(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...includeOptions, destinations: dests }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Backup failed")
      const { id } = await res.json()
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const check = await fetch(`/api/admin/backup?limit=5`)
        if (check.ok) {
          const data = await check.json()
          const record = data.backups.find((b: BackupRecord) => b.id === id)
          if (record && (record.status === "success" || record.status === "failed")) {
            clearInterval(poll)
            setBacking(false)
            fetchData()
          }
        }
        if (attempts > 60) { clearInterval(poll); setBacking(false) }
      }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed")
      setBacking(false)
    }
  }

  const handleRestore = async (backupId: number) => {
    if (restoreConfirm !== "RESTORE") return
    setRestoreId(null)
    setRestoreConfirm("")
    setError(null)
    try {
      const res = await fetch(`/api/admin/backup/${backupId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...restoreOptions, confirmationToken: "RESTORE" }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Restore failed")
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed")
    }
  }

  if (!isAdmin) return null

  const availableDests = storage ? Object.entries({
    local: storage.local,
    r2: storage.r2,
    supabase: storage.supabase,
    gdrive: storage.gdrive,
  }).filter(([_, info]) => info.configured) : []

  return (
    <div className="container max-w-5xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Backup & Restore
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Disaster recovery for MyMoney — DB + files + config</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-3 flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastBackup ? (
              <div>
                <p className="text-sm font-medium">{formatDate(lastBackup.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(lastBackup.compressedSize || 0)} · {formatDuration(lastBackup.durationMs)}</p>
                {lastBackup.destinations && (
                  <p className="text-xs text-muted-foreground mt-1">{lastBackup.destinations.split(",").map(d => DESTINATION_LABELS[d]?.label || d).join(", ")}</p>
                )}
              </div>
            ) : <p className="text-sm text-muted-foreground">No backups yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Upload className="h-4 w-4 text-blue-500" /> Last Restore
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastRestore ? (
              <div>
                <p className="text-sm font-medium">{formatDate(lastRestore.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{lastRestore.restoreTarget}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">No restores yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Database className="h-4 w-4" /> Total Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{backups.filter(b => b.type === "backup").length}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Every 6 hours</p>
            <p className="text-xs text-muted-foreground">DB + Files + Config</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <HardDrive className="h-4 w-4" /> Storage Destinations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storage && ([
              { key: "local", info: storage.local, icon: "💾", label: "Local Disk (data/backups/)" },
              { key: "r2", info: storage.r2, icon: "☁️", label: "Cloudflare R2 (10GB free)" },
              { key: "supabase", info: storage.supabase, icon: "🟢", label: "Supabase Storage (1GB free)" },
              { key: "gdrive", info: storage.gdrive, icon: "📁", label: "Google Drive (15GB free)" },
            ] as { key: string; info: StorageInfo; icon: string; label: string }[]).map(({ key, info, icon, label }) => (
              <div key={key} className={`p-3 rounded border ${info.configured ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{icon} {label}</span>
                  {info.configured ? (
                    <Badge variant="outline" className="text-xs text-green-600">Configured</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400">Not configured</Badge>
                  )}
                </div>
                {info.configured && (
                  <>
                    <p className="text-xs text-muted-foreground">{formatBytes(info.usedBytes)} / {formatBytes(info.limitBytes)} ({info.objectCount} files)</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div className={`h-1.5 rounded-full ${key === "r2" ? "bg-orange-500" : key === "supabase" ? "bg-emerald-500" : key === "gdrive" ? "bg-blue-500" : "bg-gray-500"}`} style={{ width: `${Math.min((info.usedBytes / info.limitBytes) * 100, 100)}%` }} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backup Now with destination selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <Database className="h-4 w-4" /> Create Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Destinations ({availableDests.length} configured)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(["local", "r2", "supabase", "gdrive"] as const).map(d => {
                const info = storage?.[d]
                const isConfigured = info?.configured
                return (
                  <label key={d} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${selectedDestinations[d] && isConfigured ? "border-primary bg-primary/5" : "opacity-50 cursor-not-allowed"}`}>
                    <input
                      type="checkbox"
                      checked={selectedDestinations[d]}
                      onChange={e => setSelectedDestinations(p => ({ ...p, [d]: e.target.checked }))}
                      disabled={!isConfigured}
                    />
                    <span className="text-sm">{DESTINATION_LABELS[d].icon} {DESTINATION_LABELS[d].label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground underline"
            >
              {showAdvanced ? "Hide" : "Show"} advanced options
            </button>
            {showAdvanced && (
              <div className="mt-2 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeOptions.db} onChange={e => setIncludeOptions(p => ({ ...p, db: e.target.checked }))} />
                  Database (all tables)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeOptions.files} onChange={e => setIncludeOptions(p => ({ ...p, files: e.target.checked }))} />
                  File artifacts (receipts, tax docs)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeOptions.config} onChange={e => setIncludeOptions(p => ({ ...p, config: e.target.checked }))} />
                  Configuration (encrypted)
                </label>
              </div>
            )}
          </div>

          <Button onClick={handleBackupNow} disabled={backing}>
            {backing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            {backing ? "Backing up to selected destinations..." : `Backup to ${availableDests.length} destination${availableDests.length !== 1 ? "s" : ""}`}
          </Button>
          <p className="text-xs text-muted-foreground">
            Backup includes: all user data, expenses, income, investments, goals, file artifacts (receipts/tax docs), schema, and encrypted config.
          </p>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Backup History</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => fetchData()}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No backups yet. Click above to create your first backup.</p>
          ) : (
            <div className="space-y-2">
              {backups.map(b => {
                const dests = (b.destinations || "").split(",").filter(Boolean)
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {b.type === "backup" ? <Database className="h-4 w-4 text-blue-500" /> : <Upload className="h-4 w-4 text-green-500" />}
                      <div>
                        <p className="text-sm font-medium">{formatDate(b.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.type} · {b.triggeredBy} · {formatBytes(b.compressedSize || 0)} · {formatDuration(b.durationMs)}
                        </p>
                        {dests.length > 0 && (
                          <p className="text-xs mt-1">
                            {dests.map(d => (
                              <span key={d} className="mr-1">{DESTINATION_LABELS[d]?.icon}{DESTINATION_LABELS[d]?.label || d}</span>
                            ))}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.status === "success" && <Badge variant="outline" className="text-green-600 border-green-200">Success</Badge>}
                      {b.status === "failed" && <Badge variant="outline" className="text-red-600 border-red-200">Failed</Badge>}
                      {b.status === "running" && <Badge variant="outline" className="text-blue-600 border-blue-200"><Loader2 className="h-3 w-3 animate-spin mr-1" />Running</Badge>}
                      {b.type === "backup" && b.status === "success" && (
                        <Button variant="ghost" size="sm" onClick={() => setRestoreId(b.id)}>
                          <Download className="h-3 w-3 mr-1" />Restore
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      {restoreId && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Restore from Backup #{restoreId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will <strong>overwrite</strong> your current data. The system will automatically try each destination (local → R2 → Supabase → Google Drive) until it finds the backup.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={restoreOptions.db} onChange={e => setRestoreOptions(p => ({ ...p, db: e.target.checked }))} />
                Database
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={restoreOptions.files} onChange={e => setRestoreOptions(p => ({ ...p, files: e.target.checked }))} />
                Files
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={restoreOptions.config} onChange={e => setRestoreOptions(p => ({ ...p, config: e.target.checked }))} />
                Configuration
              </label>
            </div>
            <div>
              <p className="text-sm mb-1">Type <strong>RESTORE</strong> to confirm:</p>
              <input
                type="text"
                value={restoreConfirm}
                onChange={e => setRestoreConfirm(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="RESTORE"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => handleRestore(restoreId)} disabled={restoreConfirm !== "RESTORE"}>
                Restore Now
              </Button>
              <Button variant="outline" onClick={() => { setRestoreId(null); setRestoreConfirm("") }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
