"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Link2, RefreshCw, LogOut, Building2, Wallet, Loader2 } from "lucide-react"

type BrokerStatus = {
  configured: boolean
  authenticated: boolean
  loginUrl: string | null
  message: string
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [zerodhaStatus, setZerodhaStatus] = useState<BrokerStatus | null>(null)
  const [sharekhanStatus, setSharekhanStatus] = useState<BrokerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [importingZerodha, setImportingZerodha] = useState(false)
  const [importingSharekhan, setImportingSharekhan] = useState(false)
  const [gpayRefreshing, setGpayRefreshing] = useState(false)
  const [gpayJobId, setGpayJobId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const z = searchParams.get("zerodha")
    const s = searchParams.get("sharekhan")
    const errMsg = searchParams.get("message")

    if (z === "success") {
      setMessage("Zerodha connected successfully! You can now import your holdings.")
      const token = searchParams.get("access_token")
      if (token) localStorage.setItem("zerodha_access_token", token)
    } else if (z === "error") {
      setMessage(`Zerodha connection failed: ${errMsg || "Unknown error"}`)
    }

    if (s === "success") {
      setMessage("Sharekhan connected successfully! You can now import your holdings.")
      const token = searchParams.get("access_token")
      if (token) localStorage.setItem("sharekhan_access_token", token)
    } else if (s === "error") {
      setMessage(`Sharekhan connection failed: ${errMsg || "Unknown error"}`)
    }

    const clearParams = new URLSearchParams()
    router.replace("/settings/integrations")

    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const [zRes, sRes] = await Promise.all([
        fetch("/api/integrations/zerodha?action=status"),
        fetch("/api/integrations/sharekhan?action=status"),
      ])
      if (zRes.ok) setZerodhaStatus(await zRes.json())
      if (sRes.ok) setSharekhanStatus(await sRes.json())
    } catch {} finally {
      setLoading(false)
    }
  }

  const loginZerodha = async () => {
    const res = await fetch(`/api/integrations/zerodha?action=login`)
    const data = await res.json()
    if (data.loginUrl) window.location.href = data.loginUrl
  }

  const loginSharekhan = async () => {
    const res = await fetch(`/api/integrations/sharekhan?action=login`)
    const data = await res.json()
    if (data.loginUrl) window.location.href = data.loginUrl
  }

  const importZerodha = async () => {
    setImportingZerodha(true)
    try {
      const token = localStorage.getItem("zerodha_access_token")
      const res = await fetch("/api/integrations/zerodha", {
        method: "POST",
        body: JSON.stringify({ action: "import-holdings", accessToken: token }),
      })
      const data = await res.json()
      setMessage(data.message || `Imported ${data.imported} holdings`)
    } catch {} finally {
      setImportingZerodha(false)
    }
  }

  const importSharekhan = async () => {
    setImportingSharekhan(true)
    try {
      const token = localStorage.getItem("sharekhan_access_token")
      const res = await fetch("/api/integrations/sharekhan", {
        method: "POST",
        body: JSON.stringify({ action: "import-holdings", accessToken: token }),
      })
      const data = await res.json()
      setMessage(data.message || `Imported ${data.imported} holdings`)
    } catch {} finally {
      setImportingSharekhan(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your brokerage accounts to sync holdings automatically</p>
      </div>

      {message && (
        <Card className={`border ${message.includes("failed") ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
          <CardContent className="flex items-center gap-3 py-4">
            {message.includes("failed") ? (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            )}
            <p className={`text-sm ${message.includes("failed") ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <BrokerCard
          name="Zerodha"
          icon={<Building2 className="h-5 w-5" />}
          color="bg-blue-500/10 text-blue-500"
          status={zerodhaStatus}
          loading={loading}
          onLogin={loginZerodha}
          onImport={importZerodha}
          importing={importingZerodha}
        />
        <BrokerCard
          name="Sharekhan"
          icon={<Building2 className="h-5 w-5" />}
          color="bg-purple-500/10 text-purple-500"
          status={sharekhanStatus}
          loading={loading}
          onLogin={loginSharekhan}
          onImport={importSharekhan}
          importing={importingSharekhan}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>GPay Takeout Auto-Refresh</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically trigger a Google Takeout export for GPay transactions.
            Requires an active Google session saved in the browser profile.
          </p>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={async () => {
                setGpayRefreshing(true)
                setGpayJobId(null)
                try {
                  const res = await fetch("/api/refresh-gpay", { method: "POST" })
                  const data = await res.json()
                  setGpayJobId(data.jobId)
                  setMessage("GPay refresh started! Check back in a few minutes.")
                } catch (error) {
                  setMessage("GPay refresh failed to start.")
                } finally {
                  setGpayRefreshing(false)
                }
              }}
              disabled={gpayRefreshing}
            >
              {gpayRefreshing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              {gpayRefreshing ? "Starting..." : "Refresh GPay"}
            </Button>
            {gpayJobId && (
              <Button variant="outline" onClick={() => window.open("/expenses", "_blank")}>
                Go to Expenses
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Manual Stock Entry</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can also manually add stocks in the Investments page with symbol, quantity, and buy price.
          </p>
          <Button variant="outline" onClick={() => router.push("/investments")}>
            Go to Investments
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function BrokerCard({
  name, icon, color, status, loading, onLogin, onImport, importing,
}: {
  name: string; icon: React.ReactNode; color: string; status: BrokerStatus | null
  loading: boolean; onLogin: () => void; onImport: () => void; importing: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              {loading ? (
                <p className="text-xs text-muted-foreground">Checking status...</p>
              ) : !status ? (
                <p className="text-xs text-red-500">Unable to reach API</p>
              ) : !status.configured ? (
                <p className="text-xs text-amber-500">Not configured</p>
              ) : (
                <Badge variant="outline" className={`mt-1 text-[10px] ${status.authenticated ? "border-emerald-500 text-emerald-500" : "border-amber-500 text-amber-500"}`}>
                  {status.authenticated ? "Connected" : "Not connected"}
                </Badge>
              )}
            </div>
          </div>
          {status?.configured && (
            <Badge variant={status.authenticated ? "default" : "secondary"}>
              {status.authenticated ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{status?.message || `${name} API configuration`}</p>
        <div className="flex gap-2">
          {!status?.authenticated ? (
            <Button size="sm" onClick={onLogin} disabled={!status?.configured}>
              <Link2 className="mr-1.5 h-4 w-4" /> Connect
            </Button>
          ) : (
            <>
              <Button size="sm" variant="default" onClick={onImport} disabled={importing}>
                <RefreshCw className={`mr-1.5 h-4 w-4 ${importing ? "animate-spin" : ""}`} />
                {importing ? "Importing..." : "Import Holdings"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                localStorage.removeItem(`${name.toLowerCase()}_access_token`)
                window.location.reload()
              }}>
                <LogOut className="mr-1.5 h-4 w-4" /> Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
