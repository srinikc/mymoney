export interface GpayJob {
  status: "running" | "completed" | "failed"
  startedAt: string
  completedAt?: string
  fileName?: string
  error?: string
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
