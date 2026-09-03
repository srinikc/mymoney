import { NextResponse } from "next/server"
import { getVersionInfo, getVersionString } from "@/lib/version"

export const runtime = "nodejs"

// Public endpoint — anyone can check the build version (useful for
// support requests, debug, and verifying deployments).
export async function GET() {
  const info = getVersionInfo()
  return NextResponse.json({
    ...info,
    display: getVersionString({ includeTime: true, includeEnv: true, includeBranch: true }),
  })
}
