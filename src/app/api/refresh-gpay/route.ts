import { NextResponse } from "next/server"
import { spawn } from "node:child_process"
import path from "node:path"
import { existsSync, rmSync } from "node:fs"
import { setGpayJob, getGpayJob, getGpayJobs, deleteGpayJob } from "@/lib/gpay-job-store"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

async function requireAuth() {
  try {
    await getAuthContext()
    return true
  } catch {
    return false
  }
}

function isPlaywrightAvailable(): boolean {
  try {
    return existsSync(path.join(process.cwd(), "node_modules", "playwright", "package.json"))
  } catch {
    return false
  }
}

function isServerless(): boolean {
  // Vercel sets VERCEL=1. Netlify sets NETLIFY=true.
  return Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME)
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
        status: result.status === "success" ? "export_created" : "already_in_progress",
        startedAt,
        completedAt: new Date().toISOString(),
        exportId: exportId || undefined,
        message: result.status === "success" ? "GPay export created." : "GPay export already in progress or was created.",
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
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action") || "refresh"

  const serverless = isServerless()
  const playwrightAvailable = isPlaywrightAvailable()

  // On serverless (Vercel), Playwright cannot run. Re-auth should redirect
  // the user to Google OAuth in their own browser so they can grant fresh
  // consent. For refresh, instruct them to manually export from Google Takeout.
  if (serverless && (action === "reauth" || action === "reset")) {
    const ctx = await getAuthContext()
    // Force a fresh Google consent screen by appending prompt=consent.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://srinikc-mymoney.vercel.app"
    const params = new URLSearchParams({
      scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      prompt: "consent",
      access_type: "offline",
      state: String(ctx.userId),
    })
    return NextResponse.json({
      reauthUrl: `${baseUrl}/api/auth/google?${params.toString()}`,
      help: "Click the link to re-authorize Google in your browser. After authorizing, return here and click 'Refresh GPay' again.",
      message: "Serverless environment detected. Please re-authorize Google in your browser.",
    })
  }

  if (serverless && action === "refresh") {
    return NextResponse.json({
      error: "GPay automation not available on hosted deployment",
      message: "The GPay export automation requires a self-hosted environment with Playwright + Chrome installed. On Vercel, you can manually export your GPay data and upload it.",
      instructions: [
        "1. Open https://takeout.google.com/ in your browser",
        "2. Select 'Google Pay' (deselect all others)",
        "3. Click 'Export' and download the ZIP file",
        "4. Go to Expenses → Import → upload the ZIP file",
      ],
      help: "To enable automated refresh, deploy the app to a VPS or local machine with Playwright installed.",
    }, { status: 503 })
  }

  const scriptPath = path.join(process.cwd(), "scripts", "refresh-gpay.mjs")
  if (!existsSync(scriptPath)) {
    return NextResponse.json({ error: "GPay script not found" }, { status: 500 })
  }

  if (!playwrightAvailable) {
    return NextResponse.json({ error: "Playwright not available. Run 'npm install playwright' to enable automated GPay exports." }, { status: 500 })
  }

  if (action === "reauth" || action === "reset") {
    if (action === "reset") {
      // Delete the persisted Chrome profile so Google gets a fresh session.
      const profileDir = path.join(process.cwd(), ".gpay-profile")
      try {
        if (existsSync(profileDir)) {
          rmSync(profileDir, { recursive: true, force: true })
          console.log(`[refresh-gpay] Deleted stale GPay Chrome profile at ${profileDir}`)
        }
      } catch (err) {
        console.error("[refresh-gpay] Failed to reset GPay profile:", err)
      }
    }

    // Also delete stored Google OAuth tokens so user must re-consent.
    const ctx = await getAuthContext()
    await prisma.account.deleteMany({
      where: { userId: ctx.userId, provider: "google" },
    }).catch((e) => console.error("[refresh-gpay] Failed to delete Google account:", e))

    const token = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    setGpayJob(token, {
      status: "reauth_started",
      startedAt,
      message: action === "reset"
        ? "Resetting Google session and opening a fresh browser window. Log in, then close the browser."
        : "A browser window will open. Log into your Google account, then close the browser.",
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
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const specificJobId = url.searchParams.get("jobId")

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
