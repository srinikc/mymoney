import { refreshAccessToken } from "./oauth"

const BASE = "https://takeout-pa.googleapis.com"
const SERVICE_NAMES = [
  "google_pay",
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

export interface ServiceDiscoveryResult {
  serviceName: string
  status: number
  ok: boolean
  body?: string
  error?: string
}

async function refreshAndRetry(
  url: string,
  options: RequestInit,
  accessToken: string,
  refreshToken: string,
): Promise<Response> {
  let res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken)
    accessToken = refreshed.access_token
    res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${refreshed.access_token}` },
    })
  }
  return res
}

export async function tryCreateTakeoutExport(
  accessToken: string,
  refreshToken: string,
): Promise<CreateExportResult> {
  const tried: ServiceTryResult[] = []

  for (const serviceName of SERVICE_NAMES) {
    try {
      const body = JSON.stringify({
        service: serviceName,
        archiveFormat: "ZIP",
        items: [],
        locale: "en-US",
      })

      const res = await refreshAndRetry(
        `${BASE}/v2/${serviceName}/exports`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
        accessToken,
        refreshToken,
      )

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

export async function discoverServices(
  accessToken: string,
  refreshToken: string,
): Promise<ServiceDiscoveryResult[]> {
  const results: ServiceDiscoveryResult[] = []

  for (const serviceName of SERVICE_NAMES) {
    try {
      const body = JSON.stringify({
        service: serviceName,
        archiveFormat: "ZIP",
        items: [],
        locale: "en-US",
      })

      const res = await refreshAndRetry(
        `${BASE}/v2/${serviceName}/exports`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
        accessToken,
        refreshToken,
      )

      const text = await res.text()
      results.push({ serviceName, status: res.status, ok: res.ok, body: text.slice(0, 500) })
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
  exportId: string,
  accessToken: string,
): Promise<ExportStatusResult> {
  try {
    const res = await fetch(`${BASE}/v2/${serviceName}/exports/${exportId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
