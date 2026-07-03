import { NextResponse } from "next/server"
import { spawn } from "child_process"
import { join } from "path"
import { existsSync } from "fs"
import { setGpayJob, getGpayJobs, deleteGpayJob } from "@/lib/gpay-job-store"

export async function POST(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get("action") || "refresh"

  // Re-auth: launches visible browser for one-time login
  if (action === "reauth") {
    const token = crypto.randomUUID()
    setGpayJob(token, {
      status: "reauth_started",
      startedAt: new Date().toISOString(),
      message: "A browser window will open. Log into your Google account, then close the browser.",
    })

    const scriptPath = join(process.cwd(), "scripts", "refresh-gpay.mjs")
    if (!existsSync(scriptPath)) {
      return NextResponse.json({ error: "Script not found" }, { status: 500 })
    }

    spawn("node", [scriptPath, "--setup"], {
      cwd: process.cwd(),
      stdio: "ignore",
      detached: true,
    }).unref()

    setTimeout(() => deleteGpayJob(token), 5 * 60 * 1000)

    return NextResponse.json({
      reauthToken: token,
      message: "Re-auth browser launched. Log into Google and close the window.",
      help: "If no browser opens, run: node scripts/refresh-gpay.mjs --setup",
    })
  }

  // Normal refresh
  const jobId = crypto.randomUUID()

  const scriptPath = join(process.cwd(), "scripts", "refresh-gpay.mjs")
  if (!existsSync(scriptPath)) {
    return NextResponse.json({ error: "Script not found" }, { status: 500 })
  }

  setGpayJob(jobId, {
    status: "running",
    startedAt: new Date().toISOString(),
  })

  const child = spawn("node", [scriptPath], {
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

  child.on("close", (code) => {
    const resultMatch = output.match(/RESULT:(.*)/)
    let result: Record<string, unknown> = {}

    if (resultMatch) {
      try {
        result = JSON.parse(resultMatch[1])
      } catch {
        result = {}
      }
    }

    const job = getGpayJobs().get(jobId)
    const startedAt = job?.startedAt || new Date().toISOString()

    if (code === 0 && result.status === "success") {
      setGpayJob(jobId, {
        status: "completed",
        startedAt,
        completedAt: new Date().toISOString(),
        fileName: result.fileName as string,
      })
    } else if (result.status === "auth_required") {
      setGpayJob(jobId, {
        status: "auth_required",
        startedAt,
        message: "Google session expired.",
        reauthUrl: "https://takeout.google.com",
        help: "Click 'Re-authenticate' to log into Google in a new browser window.",
      })
    } else {
      setGpayJob(jobId, {
        status: "failed",
        startedAt,
        error: errorOutput || (result.error as string) || "Unknown error",
      })
    }

    setTimeout(() => deleteGpayJob(jobId), 5 * 60 * 1000)
  })

  return NextResponse.json({ jobId }, { status: 202 })
}

export async function GET() {
  const jobs = getGpayJobs()
  const jobList = Array.from(jobs.entries()).map(([id, job]) => ({
    id,
    status: job.status,
    startedAt: job.startedAt,
    message: job.message,
    error: job.error,
    reauthUrl: job.reauthUrl,
    help: job.help,
  }))
  return NextResponse.json({ jobs: jobList })
}
