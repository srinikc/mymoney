import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runBackup, getBackupHistory, type BackupDestination } from "@/lib/backup"
import { isR2Configured } from "@/lib/backup/r2-upload"
import { isSupabaseStorageConfigured } from "@/lib/backup/supabase-storage"
import { isLocalConfigured } from "@/lib/backup/local-storage"
import { isGoogleDriveConfigured } from "@/lib/backup/google-drive"

export const runtime = "nodejs"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if ((session.user as Record<string, unknown>).role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { userId: Number(session.user.id) }
}

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const type = searchParams.get("type") || undefined

  const result = await getBackupHistory(page, limit, type)
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  try {
    const body = await request.json().catch(() => ({}))

    // Filter destinations to only configured ones
    const requestedDests: BackupDestination[] = body.destinations || []
    const validDests: BackupDestination[] = []
    for (const d of requestedDests) {
      if (d === "local" && isLocalConfigured()) validDests.push(d)
      else if (d === "r2" && isR2Configured()) validDests.push(d)
      else if (d === "supabase" && isSupabaseStorageConfigured()) validDests.push(d)
      else if (d === "gdrive" && isGoogleDriveConfigured()) validDests.push(d)
    }

    if (validDests.length === 0) {
      return NextResponse.json({ error: "No valid backup destinations selected or configured" }, { status: 400 })
    }

    const result = await runBackup({
      includeDb: body.includeDb ?? true,
      includeFiles: body.includeFiles ?? true,
      includeConfig: body.includeConfig ?? true,
      destinations: validDests,
      triggeredBy: "manual",
      profileId: undefined,
    })

    return NextResponse.json({ id: result.id, status: "running", destinations: result.destinations, archiveSize: result.archiveSize }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup failed" }, { status: 500 })
  }
}
