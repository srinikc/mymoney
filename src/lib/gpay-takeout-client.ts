import { getStoredToken, storeToken } from "./token-store"
import { refreshAccessToken } from "./oauth"

const BASE = "https://takeout-pa.googleapis.com"
const SERVICE_NAMES = ["pay", "gpay", "payments", "wallet", "google_pay", "google_payments"]

export interface CreateExportResult {
  success: boolean
  serviceName?: string
  exportId?: string
  error?: string
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

      if (res.ok) {
        const data = await res.json()
        const exportId = data.exportJob?.id
        if (exportId) return { success: true, serviceName, exportId }
      }
    } catch {
      continue
    }
  }

  return { success: false, error: "No working service name found for GPay Takeout API" }
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
  } catch {}
  return { status: "unknown", done: false }
}
