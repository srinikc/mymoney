import { getStoredToken, storeToken } from "./token-store"
import { refreshAccessToken } from "./oauth"

const BASE = "https://takeout-pa.googleapis.com"
// Service name confirmed from Takeout page data-id attribute:
// <div data-id="google_pay">Google Pay</div>
const SERVICE_NAMES = [
  "google_pay",
  // Historical/alternative names (kept as fallbacks)
  "pay", "gpay", "payments", "wallet", "google_payments",
  "paisa", "tez", "payment", "googlepay", "google_payment",
]

export interface ServiceTryResult {
  serviceName: string
  status: number
  ok: boolean
  hasExportId: boolean
  response?: string
}

export interface CreateExportResult {
  success: boolean
  serviceName?: string
  exportId?: string
  error?: string
  tried?: ServiceTryResult[]
}

export interface ExportStatusResult {
  status: string
  percentDone?: number
  done: boolean
  failed?: boolean
  error?: string
}

export async function tryCreateTakeoutExport(): Promise<CreateExportResult> {
  const token = await getStoredToken()
  if (!token) return { success: false, error: "No Drive token" }
  if (!token.accessToken) return { success: false, error: "No access token" }

  let accessToken = token.accessToken
  const tried: ServiceTryResult[] = []

  for (const serviceName of SERVICE_NAMES) {
    try {
      const body = JSON.stringify({
        service: serviceName,
        archiveFormat: "ZIP",
        items: [],
        locale: "en-US",
      })

      let res = await fetch(`${BASE}/v2/${serviceName}/exports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body,
      })

      if (res.status === 401 && token.refreshToken) {
        const refreshed = await refreshAccessToken(token.refreshToken)
        accessToken = refreshed.access_token
        await storeToken({ ...token, accessToken: refreshed.access_token })
        res = await fetch(`${BASE}/v2/${serviceName}/exports`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body,
        })
      }

      const text = await res.text()
      let parsed = null
      try { parsed = JSON.parse(text) } catch { /* ignore */ }
      const hasExportId = !!parsed?.exportJob?.id
      tried.push({ serviceName, status: res.status, ok: res.ok, hasExportId, response: text.slice(0, 200) })

      if (res.ok && hasExportId) {
        return { success: true, serviceName, exportId: parsed.exportJob.id, tried }
      }
    } catch {
      tried.push({ serviceName, status: 0, ok: false, hasExportId: false })
      continue
    }
  }

  return { success: false, error: "No working service name found for GPay Takeout API", tried }
}

export interface ServiceDiscoveryResult {
  serviceName: string
  status: number
  ok: boolean
  body?: string
  error?: string
}

export async function discoverServices(): Promise<ServiceDiscoveryResult[]> {
  const token = await getStoredToken()
  if (!token) return []
  if (!token.accessToken) return []

  let accessToken = token.accessToken
  const results: ServiceDiscoveryResult[] = []

  for (const serviceName of SERVICE_NAMES) {
    try {
      const body = JSON.stringify({
        service: serviceName,
        archiveFormat: "ZIP",
        items: [],
        locale: "en-US",
      })

      let res = await fetch(`${BASE}/v2/${serviceName}/exports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body,
      })

      if (res.status === 401 && token.refreshToken) {
        const refreshed = await refreshAccessToken(token.refreshToken)
        accessToken = refreshed.access_token
        await storeToken({ ...token, accessToken: refreshed.access_token })
        res = await fetch(`${BASE}/v2/${serviceName}/exports`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body,
        })
      }

      const text = await res.text()
      results.push({
        serviceName,
        status: res.status,
        ok: res.ok,
        body: text.slice(0, 500),
      })
    } catch (err: unknown) {
      results.push({
        serviceName,
        status: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}

export async function getExportStatus(
  serviceName: string,
  exportId: string
): Promise<ExportStatusResult> {
  const token = await getStoredToken()
  if (!token) return { status: "unknown", done: false }

  try {
    const res = await fetch(`${BASE}/v2/${serviceName}/exports/${exportId}`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    })
    if (res.ok) {
      const data = await res.json()
      const job = data.exportJob || {}
      return {
        status: job.status || "UNKNOWN",
        percentDone: data.percentDone,
        done: job.status === "SUCCEEDED" || job.status === "FAILED",
        failed: job.status === "FAILED",
        error: job.debugFailureInfo,
      }
    }
    if (res.status === 404) {
      return { status: "not_found", done: false }
    }
  } catch { /* ignore */ }
  return { status: "unknown", done: false }
}
