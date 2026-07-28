"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, AlertTriangle, CheckCircle, Loader2, ArrowRight } from "lucide-react"

export default function DatabaseSettingsPage() {
  const [mode, setMode] = useState<string>("loading")
  const [testConfigured, setTestConfigured] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchMode = async () => {
    try {
      const res = await fetch("/api/admin/db-mode")
      if (res.ok) {
        const data = await res.json()
        setMode(data.mode)
        setTestConfigured(data.testDatabaseConfigured)
      } else {
        setMode("production")
      }
    } catch {
      setMode("production")
    }
  }

  useEffect(() => { fetchMode() }, [])

  const handleSwitch = async (newMode: "production" | "test") => {
    setSwitching(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/db-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      })
      if (res.ok) {
        setMode(newMode)
        setSuccess(`Successfully switched to ${newMode === "test" ? "Test" : "Production"} database`)
        setTimeout(() => setSuccess(null), 4000)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to switch database")
      }
    } catch {
      setError("Failed to switch database")
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Mode</h1>
        <p className="text-muted-foreground mt-1">Switch between production and test databases</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{success}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              All subsequent queries will use the {mode === "test" ? "test" : "production"} database.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Database
          </CardTitle>
          <CardDescription>
            The app connects to either the production or test database. Switching recreates the connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            {mode === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : mode === "test" ? (
              <CheckCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <Database className="h-5 w-5 text-emerald-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {mode === "loading" ? "Loading..." : mode === "test" ? "Test Database" : "Production Database"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === "test"
                  ? "Using TEST_DATABASE_URL — all data operations go to the test database"
                  : "Using DATABASE_URL — all data operations go to the production database"}
              </p>
            </div>
            <Badge variant={mode === "test" ? "secondary" : "default"} className="transition-all">
              {mode === "test" ? "Test" : "Production"}
            </Badge>
          </div>

          {!testConfigured && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Test Database Not Configured</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Set TEST_DATABASE_URL in your .env file to use the test database mode.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {mode !== "loading" && testConfigured && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Switch Database</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={mode === "production" ? "default" : "outline"}
                  onClick={() => handleSwitch("production")}
                  disabled={switching || mode === "production"}
                  className="gap-2 min-w-[140px]"
                >
                  {switching && mode !== "production" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "production" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  Production DB
                </Button>
                <Button
                  variant={mode === "test" ? "default" : "outline"}
                  onClick={() => handleSwitch("test")}
                  disabled={switching || mode === "test"}
                  className="gap-2 min-w-[140px]"
                >
                  {switching && mode !== "test" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "test" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  Test DB
                </Button>
              </div>
            </div>
          )}

          {mode !== "loading" && mode !== "test" && testConfigured && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Try the test database</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Click <strong>Test DB</strong> above to switch to the test environment with sample data.
                  Log in with <code className="rounded bg-blue-100 dark:bg-blue-900 px-1">test@example.com</code> / <code className="rounded bg-blue-100 dark:bg-blue-900 px-1">test123</code>.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground border-t pt-3">
            When switched to test mode, the app connects to the test database. All users see test data.
            Switch back to production to return to your real data. This only affects the current server instance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
