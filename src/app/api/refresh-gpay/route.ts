import { NextResponse } from "next/server"
import { spawn } from "node:child_process"
import path from "node:path"
import { existsSync } from "node:fs"
import { setGpayJob, getGpayJob, getGpayJobs, deleteGpayJob } from "@/lib/gpay-job-store"

function isPlaywrightAvailable(): boolean {
  try {
    return existsSync(path.join(process.cwd(), "node_modules", "playwright", "package.json"))
  } catch {
    return false
  }
}

function spawnGpayScript(scriptPath: string, jobId: string, args: string[] = []) {
  const child = spawn("node", [scriptPath, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  })

  let output = ""
  let errorOutput = ""

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString()
    output += text
    process.stdout.write(`[refresh-gpay] ${text}`)
  })

  child.stderr?.on("data", (data: Buffer) => {
    const text = data.toString()
    errorOutput += text
    process.stderr.write(`[refresh-gpay:err] ${text}`)
  })

  child.on("error", (err) => {
    setGpayJob(jobId, {
      status: "failed",
      startedAt: new Date().toISOString(),
      error: err.message,
    })
  })

  child.on("close", (_code) => {
    const resultMatch = output.match(/RESULT:(.*)/)
    let result: Record<string, unknown> = {}

    if (resultMatch) {
      try {
        result = JSON.parse(resultMatch[1])
      } catch {
        result = {}
      }
    }

    const job = getGpayJob(jobId)
    const startedAt = job?.startedAt || new Date().toISOString()

    if (result.status === "success" || result.status === "already_in_progress") {
      const exportId = result.exportId as string | undefined

      setGpayJob(jobId, {
        status: "already_in_progress",
        startedAt,
        completedAt: new Date().toISOString(),
        exportId: exportId || undefined,
        message: "GPay export already in progress or was created.",
      })

      setTimeout(() => deleteGpayJob(jobId), 10 * 60 * 1000)
    } else if (result.status === "auth_required") {
      setGpayJob(jobId, {
        status: "auth_required",
        startedAt,
        message: "Google session expired.",
        error: (result.error as string) || "Google session expired. Click Re-authenticate to log in.",
        help: "Click 'Re-authenticate' to log into Google in a new browser window.",
      })
      setTimeout(() => deleteGpayJob(jobId), 5 * 60 * 1000)
    } else {
      setGpayJob(jobId, {
        status: "failed",
        startedAt,
        error: errorOutput || (result.error as string) || "Unknown error",
      })
      setTimeout(() => deleteGpayJob(jobId), 5 * 60 * 1000)
    }
  })

  return child
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get("action") || "refresh"

  const scriptPath = path.join(process.cwd(), "scripts", "refresh-gpay.mjs")
  if (!existsSync(scriptPath)) {
    return NextResponse.json({ error: "GPay script not found" }, { status: 500 })
  }

  if (!isPlaywrightAvailable()) {
    return NextResponse.json({ error: "Playwright not available" }, { status: 500 })
  }

  if (action === "reauth") {
    const token = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    setGpayJob(token, {
      status: "reauth_started",
      startedAt,
      message: "A browser window will open. Log into your Google account, then close the browser.",
    })

    const child = spawn("node", [scriptPath, "--setup"], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let output = ""
    child.stdout?.on("data", (data: Buffer) => {
      output += data.toString()
    })

    child.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(`[refresh-gpay:reauth] ${data}`)
    })

    child.on("error", (err) => {
      setGpayJob(token, {
        status: "reauth_failed",
        startedAt,
        error: err.message,
        message: "Failed to launch the setup browser.",
      })
    })

    child.on("close", (_code) => {
      const resultMatch = output.match(/RESULT:(.*)/)
      let result: Record<string, unknown> = {}
      if (resultMatch) {
        try { result = JSON.parse(resultMatch[1]) } catch { result = {} }
      }

      if (result.status === "setup_complete") {
        setGpayJob(token, {
          status: "reauth_complete",
          startedAt,
          completedAt: new Date().toISOString(),
          message: "Re-authentication complete. You can now retry the GPay export.",
        })
      } else {
        setGpayJob(token, {
          status: "reauth_failed",
          startedAt,
          error: (result.error as string) || "Re-authentication failed or was cancelled.",
          message: "Re-authentication did not complete successfully.",
        })
      }
      setTimeout(() => deleteGpayJob(token), 2 * 60 * 1000)
    })

    return NextResponse.json({
      reauthToken: token,
      message: "Opening browser for Google login...",
      help: "A Chrome window should open. Log into your Google account, then close the browser.",
    })
  }

  const jobId = crypto.randomUUID()
  setGpayJob(jobId, { status: "running", startedAt: new Date().toISOString() })
  spawnGpayScript(scriptPath, jobId)

  return NextResponse.json({ jobId }, { status: 202 })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const specificJobId = url.searchParams.get("jobId")
  const poll = url.searchParams.get("poll")

  if (poll === "true") {
    const scriptPath = path.join(process.cwd(), "scripts", "refresh-gpay.mjs")
    const jobId = crypto.randomUUID()
    setGpayJob(jobId, { status: "running", startedAt: new Date().toISOString() })
    spawnGpayScript(scriptPath, jobId, ["--poll"])
    return NextResponse.json({ pollJobId: jobId }, { status: 202 })
  }

  if (specificJobId) {
    const job = getGpayJob(specificJobId)
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
    return NextResponse.json({ job })
  }

  const jobs = getGpayJobs()
  const jobList = [...jobs.entries()].map(([id, job]) => ({
    id,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    message: job.message,
    error: job.error,
  }))
  return NextResponse.json({ jobs: jobList })
}
