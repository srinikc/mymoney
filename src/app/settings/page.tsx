"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Shield, Plug, Mail, Key, Server, Smartphone, FileText, Building2, Database, Download, Trash2, Loader2, LogIn, Users, HandCoins } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === "admin"
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(data => {
      setGoogleConnected(data.connected)
      setGoogleEmail(data.email || null)
      setGoogleLoading(false)
    }).catch(() => setGoogleLoading(false))
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch("/api/export/my-data")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mymoney-export-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Failed to download data. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "ARE YOU SURE? This will permanently delete your account and ALL associated data (expenses, budgets, investments, etc.). This cannot be undone."
    )
    if (!confirmed) return
    const doubleConfirm = window.confirm("This is your last chance. ALL data will be lost. Confirm deletion?")
    if (!doubleConfirm) return

    setDeleting(true)
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }),
      })
      if (res.ok) {
        router.push("/login")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete account")
      }
    } catch {
      alert("Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your application</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isAdmin && (
          <Link href="/settings/api-keys">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">API Keys</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configure LLM (OpenAI/Claude) and Resend API keys</p>
                <Badge variant="outline" className="mt-2 text-xs border-amber-200 text-amber-700">Admin only</Badge>
              </CardContent>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link href="/settings/environment">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-amber-200 dark:border-amber-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Environment</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View and override env config: DB URL, Auth secret, Google OAuth, App URL</p>
                <Badge variant="outline" className="mt-2 text-xs border-amber-200 text-amber-700">Admin only</Badge>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/settings/bank-accounts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Bank Accounts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Add and manage your bank accounts, set balances, and track FDs</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/gmail-parser">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Gmail Parsing</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Customize keywords for detecting UPI, purchases, gold, silver, bank, and other financial emails</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/integrations">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Plug className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Integrations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Zerodha, Sharekhan, Groww, MF Central, Google Drive, and GPay import setup</p>
            </CardContent>
          </Card>
        </Link>

        {/* Google Account */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Google Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : googleConnected ? (
              <>
                <p className="text-sm text-emerald-600 font-medium">● Connected</p>
                {googleEmail && <p className="text-sm text-muted-foreground mt-1">{googleEmail}</p>}
                <p className="text-xs text-muted-foreground mt-2">Enables Gmail import and GPay sync</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/api/auth/logout"}>
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Connect to enable Gmail import and GPay sync</p>
                <Button size="sm" className="mt-3" onClick={() => window.location.href = "/api/auth/google"}>
                  <LogIn className="h-4 w-4 mr-2" /> Connect Google Account
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Link href="/settings/session-link">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Mobile Session Link</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Share your session with the mobile app to log in without re-entering credentials</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/family">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Family Members</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Add spouse, children, parents for retirement planning context</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/obligations">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <HandCoins className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Financial Obligations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Track recurring commitments like parents support, charity, etc.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/privacy">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Privacy & Ad Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Control ads, cookies, and personalized recommendations</p>
            </CardContent>
          </Card>
        </Link>

        {isAdmin && (
          <Link href="/settings/database">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-amber-200 dark:border-amber-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Database</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Switch between production and test databases</p>
                <Badge variant="outline" className="mt-2 text-xs border-amber-200 text-amber-700">Admin only</Badge>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Download My Data */}
        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Download My Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Export all your data (expenses, budgets, investments, etc.) as a single JSON file</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {downloading ? "Exporting..." : "Download"}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">Delete Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
            <Button variant="destructive" size="sm" className="mt-3" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </CardContent>
        </Card>

        <Link href="/privacy">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Privacy Policy</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Required for Play Store listing. Describes data collection, storage, and third-party services.</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Rate limiting, audit logs, and access control</p>
            <Badge variant="outline" className="mt-2 text-xs">Coming soon</Badge>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure in-app, email, and WhatsApp alerts</p>
            <Badge variant="outline" className="mt-2 text-xs">Coming soon</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
