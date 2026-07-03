export interface GpayJob {
  status: "running" | "completed" | "failed" | "auth_required" | "reauth_started"
  startedAt: string
  completedAt?: string
  fileName?: string
  error?: string
  message?: string
  reauthUrl?: string
  help?: string
}

const jobs = new Map<string, GpayJob>()

export function getGpayJobs(): Map<string, GpayJob> {
  return jobs
}

export function setGpayJob(id: string, job: GpayJob): void {
  jobs.set(id, job)
}

export function getGpayJob(id: string): GpayJob | undefined {
  return jobs.get(id)
}

export function deleteGpayJob(id: string): void {
  jobs.delete(id)
}
