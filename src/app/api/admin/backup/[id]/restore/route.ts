import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { restoreDatabase } from "@/lib/backup/db-export"
import { decryptEnvFile } from "@/lib/backup/env-encrypt"
import { prisma } from "@/lib/prisma"
import { downloadBackupArchive } from "@/lib/backup"
import AdmZip from "adm-zip"
import { existsSync, rmSync } from "fs"
import { join } from "path"
import { createHash } from "crypto"

export const runtime = "nodejs"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if ((session.user as Record<string, unknown>).role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { userId: Number(session.user.id) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  const { id } = await params
  const backupId = parseInt(id)
  if (isNaN(backupId)) return NextResponse.json({ error: "Invalid backup ID" }, { status: 400 })

  const body = await request.json()
  if (body.confirmationToken !== "RESTORE") {
    return NextResponse.json({ error: "Type RESTORE to confirm" }, { status: 400 })
  }

  const backup = await prisma.backupHistory.findUnique({ where: { id: backupId } })
  if (!backup || backup.status !== "success") {
    return NextResponse.json({ error: "Backup not found or not successful" }, { status: 404 })
  }

  const restoreRecord = await prisma.backupHistory.create({
    data: {
      type: "restore",
      status: "running",
      includeDb: body.restoreDb ?? true,
      includeFiles: body.restoreFiles ?? true,
      includeConfig: body.restoreConfig ?? true,
      triggeredBy: "manual",
      restoredFrom: backupId,
      restoreTarget: [body.restoreDb && "db", body.restoreFiles && "files", body.restoreConfig && "config"].filter(Boolean).join("+"),
      destinations: backup.destinations,
    },
  })

  const startTime = Date.now()

  try {
    const result = await downloadBackupArchive(backupId)
    if (!result) throw new Error("Backup archive not found in any destination")
    const archiveData = result.data

    // Verify checksum
    const checksum = createHash("sha256").update(archiveData).digest("hex")
    if (backup.checksum && checksum !== backup.checksum) {
      throw new Error("Checksum mismatch — backup may be corrupted")
    }

    const zip = new AdmZip(archiveData)
    const entries = zip.getEntries()

    if (body.restoreDb) {
      const dbEntry = entries.find(e => e.entryName.startsWith("db-dump"))
      if (dbEntry) {
        const restoreResult = await restoreDatabase(dbEntry.getData())
        await prisma.backupHistory.update({
          where: { id: restoreRecord.id },
          data: { metadata: { restoreResult, sourceDestination: result.source } },
        })
      }
    }

    if (body.restoreFiles) {
      const fileEntry = entries.find(e => e.entryName.startsWith("files-archive"))
      if (fileEntry) {
        const fileZip = new AdmZip(fileEntry.getData())
        const uploadsDir = join(process.cwd(), "public", "uploads")
        if (existsSync(uploadsDir)) rmSync(uploadsDir, { recursive: true })
        fileZip.extractAllTo(join(process.cwd(), "public"), true)
      }
    }

    if (body.restoreConfig && process.env.BACKUP_ENCRYPTION_KEY) {
      const configEntry = entries.find(e => e.entryName.startsWith("env-config"))
      if (configEntry) {
        const decrypted = decryptEnvFile(configEntry.getData(), process.env.BACKUP_ENCRYPTION_KEY)
        console.log("Restored config (not auto-applied):", decrypted.substring(0, 100) + "...")
      }
    }

    const durationMs = Date.now() - startTime
    await prisma.backupHistory.update({
      where: { id: restoreRecord.id },
      data: { status: "success", durationMs },
    })

    return NextResponse.json({ id: restoreRecord.id, status: "success", durationMs, sourceDestination: result.source })
  } catch (error) {
    const durationMs = Date.now() - startTime
    await prisma.backupHistory.update({
      where: { id: restoreRecord.id },
      data: { status: "failed", error: error instanceof Error ? error.message : String(error), durationMs },
    })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Restore failed" }, { status: 500 })
  }
}
