import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"

export interface GpayJob {
  status: "running" | "completed" | "failed" | "auth_required" | "reauth_started" | "reauth_complete" | "reauth_failed" | "already_in_progress" | "export_created" | "export_succeeded" | "export_failed"
  startedAt: string
  completedAt?: string
  fileName?: string
  error?: string
  message?: string
  reauthUrl?: string
  help?: string
  serviceName?: string
  exportId?: string
  exportCreated?: boolean
}

// TODO(refactor): Migrate to Redis or DB table for Vercel compatibility.
// File-based store doesn't work on serverless (read-only fs, ephemeral
// instances). See docs/FOLLOWUPS.md item #41.
// Track in: docs/FOLLOWUPS.md
const STORE_PATH = join(process.cwd(), "data", "gpay-jobs.json")

function readStore(): Record<string, GpayJob> {
  try {
    if (!existsSync(STORE_PATH)) return {}
    return JSON.parse(readFileSync(STORE_PATH, "utf8"))
  } catch { return {} }
}

function writeStore(data: Record<string, GpayJob>): void {
  try {
    mkdirSync(join(process.cwd(), "data"), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(data, null, 2))
  } catch { /* best effort */ }
}

// Clean expired jobs on load
const ONE_HOUR = 3600_000

export function getGpayJobs(): Map<string, GpayJob> {
  const data = readStore()
  const now = Date.now()
  for (const [id, job] of Object.entries(data)) {
    if (job.completedAt && now - new Date(job.completedAt).getTime() > ONE_HOUR) {
      delete data[id]
    }
  }
  writeStore(data)
  return new Map(Object.entries(data))
}

export function setGpayJob(id: string, job: GpayJob): void {
  const data = readStore()
  data[id] = job
  writeStore(data)
}

export function getGpayJob(id: string): GpayJob | undefined {
  return readStore()[id]
}

export function deleteGpayJob(id: string): void {
  const data = readStore()
  delete data[id]
  writeStore(data)
}
