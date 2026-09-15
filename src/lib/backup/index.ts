import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"
import AdmZip from "adm-zip"
import { prisma } from "@/lib/prisma"
import { encryptEnvFile } from "./env-encrypt"
import { exportDatabase } from "./db-export"
import { uploadToR2, isR2Configured } from "./r2-upload"
import { uploadToSupabaseStorage, isSupabaseStorageConfigured, ensureSupabaseStorageBucket } from "./supabase-storage"
import { uploadToLocal, isLocalConfigured, getLocalStorageUsage as getLocalUsage } from "./local-storage"
import { uploadToGoogleDrive, isGoogleDriveConfigured, getGoogleDriveUsage as getGDriveUsage } from "./google-drive"
import type { BackupArtifact, BackupConfig } from "./types"

export type BackupDestination = "local" | "r2" | "supabase" | "gdrive"

function archiveDirectory(dirPath: string): { zip: Buffer; fileCount: number } | null {
  if (!existsSync(dirPath)) return null
  const zip = new AdmZip()
  let fileCount = 0
  function addDir(dir: string) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        addDir(fullPath)
      } else {
        zip.addLocalFile(fullPath, dir.replace(dirPath, ""))
        fileCount++
      }
    }
  }
  addDir(dirPath)
  return { zip: zip.toBuffer(), fileCount }
}

function exportSchema(): BackupArtifact {
  const schemaPath = join(process.cwd(), "prisma", "schema.prisma")
  const migrationsDir = join(process.cwd(), "prisma", "migrations")
  const schemaContent = existsSync(schemaPath) ? readFileSync(schemaPath) : Buffer.from("")
  const zip = new AdmZip()
  zip.addFile("schema.prisma", schemaContent)
  if (existsSync(migrationsDir)) {
    const addMigrations = (dir: string): void => {
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          addMigrations(fullPath)
        } else {
          zip.addLocalFile(fullPath, "migrations/" + dir.replace(migrationsDir, ""))
        }
      }
    }
    addMigrations(migrationsDir)
  }
  const data = zip.toBuffer()
  return { type: "schema", data, filename: "schema-and-migrations.zip", size: data.byteLength }
}

function getEnvDump(): string {
  const safeKeys = [
    "DATABASE_URL", "TEST_DATABASE_URL", "AUTH_URL", "NEXT_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_APP_URL", "REDIS_URL", "REDIS_ENABLED", "LLM_PROVIDER",
    "LLM_MODEL", "R2_ENDPOINT", "R2_BUCKET",
  ]
  const lines: string[] = []
  for (const key of safeKeys) {
    const val = process.env[key]
    if (val !== undefined) lines.push(`${key}="${val}"`)
  }
  return lines.join("\n")
}

export interface RunBackupOptions {
  includeDb?: boolean
  includeFiles?: boolean
  includeConfig?: boolean
  destinations?: BackupDestination[]
  triggeredBy?: string
  profileId?: number
}

export interface RunBackupResult {
  id: number
  destinations: BackupDestination[]
  archiveSize: number
  durationMs: number
}

export async function runBackup(options: RunBackupOptions = {}): Promise<RunBackupResult> {
  const destinations: BackupDestination[] = options.destinations && options.destinations.length > 0
    ? options.destinations
    : (["r2", "supabase"] as BackupDestination[]).filter(d =>
        d === "r2" ? isR2Configured() : isSupabaseStorageConfigured()
      ) as BackupDestination[]

  const record = await prisma.backupHistory.create({
    data: {
      type: "backup",
      status: "pending",
      includeDb: options.includeDb ?? true,
      includeFiles: options.includeFiles ?? true,
      includeConfig: options.includeConfig ?? true,
      triggeredBy: options.triggeredBy || "manual",
      profileId: options.profileId,
      destinations: destinations.join(","),
    },
  })

  const startTime = Date.now()

  try {
    await prisma.backupHistory.update({ where: { id: record.id }, data: { status: "running" } })

    const artifacts: BackupArtifact[] = []

    if (record.includeDb) {
      const dbArtifact = await exportDatabase(options.profileId)
      artifacts.push(dbArtifact)
      await prisma.backupHistory.update({
        where: { id: record.id },
        data: { dbDumpSize: dbArtifact.size, metadata: { tableCounts: dbArtifact.tableCounts } },
      })
    }

    if (record.includeFiles) {
      const uploadsDir = join(process.cwd(), "public", "uploads")
      const dataUploadsDir = join(process.cwd(), "data", "uploads")
      const allFilesZip = new AdmZip()
      let fileCount = 0
      for (const dir of [uploadsDir, dataUploadsDir]) {
        const result = archiveDirectory(dir)
        if (result) {
          const innerZip = new AdmZip(result.zip)
          for (const entry of innerZip.getEntries()) {
            if (!entry.isDirectory) {
              allFilesZip.addFile(entry.entryName, entry.getData())
              fileCount++
            }
          }
        }
      }
      if (fileCount > 0) {
        const filesData = allFilesZip.toBuffer()
        artifacts.push({ type: "files", data: filesData, filename: "files-archive.zip", size: filesData.byteLength })
        await prisma.backupHistory.update({
          where: { id: record.id },
          data: { filesSize: filesData.byteLength },
        })
      }
    }

    if (record.includeConfig) {
      const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY
      if (encryptionKey) {
        const envContent = getEnvDump()
        const encrypted = encryptEnvFile(envContent, encryptionKey)
        artifacts.push({ type: "config", data: encrypted, filename: "env-config.enc", size: encrypted.byteLength })
        await prisma.backupHistory.update({
          where: { id: record.id },
          data: { configSize: encrypted.byteLength },
        })
      }
    }

    artifacts.push(exportSchema())

    const finalZip = new AdmZip()
    for (const artifact of artifacts) {
      finalZip.addFile(artifact.filename, artifact.data)
    }
    const archive = finalZip.toBuffer()
    const checksum = createHash("sha256").update(archive).digest("hex")

    const timestamp = new Date().toISOString().replaceAll(/[.:]/g, "-")
    const baseKey = `backups/${timestamp}-${record.includeDb && record.includeFiles ? "full" : "partial"}.zip`
    const baseFilename = baseKey.split("/").pop() || `${timestamp}.zip`

    const updateData: Record<string, unknown> = {
      checksum,
      compressedSize: archive.byteLength,
      totalSize: artifacts.reduce((sum, a) => sum + a.size, 0),
    }

    // Upload to each selected destination
    for (const dest of destinations) {
      try {
        if (dest === "local" && isLocalConfigured()) {
          const localFilename = await uploadToLocal(baseKey, archive, "application/zip")
          updateData.localKey = localFilename
        } else if (dest === "r2" && isR2Configured()) {
          await uploadToR2(baseKey, archive, "application/zip")
          updateData.r2Key = baseKey
        } else if (dest === "supabase" && isSupabaseStorageConfigured()) {
          try { await ensureSupabaseStorageBucket() } catch { /* bucket may already exist */ }
          await uploadToSupabaseStorage(baseKey, archive)
          updateData.supabaseKey = baseKey
        } else if (dest === "gdrive" && isGoogleDriveConfigured()) {
          const { fileId } = await uploadToGoogleDrive(baseKey, archive, "application/zip")
          updateData.googleDriveKey = fileId
        }
      } catch (e) {
        console.error(`Failed to upload to ${dest}:`, e)
      }
    }

    const durationMs = Date.now() - startTime
    updateData.durationMs = durationMs
    updateData.status = "success"

    await prisma.backupHistory.update({ where: { id: record.id }, data: updateData })

    return {
      id: record.id,
      destinations: destinations.filter(d => {
        if (d === "local") return !!updateData.localKey
        if (d === "r2") return !!updateData.r2Key
        if (d === "supabase") return !!updateData.supabaseKey
        if (d === "gdrive") return !!updateData.googleDriveKey
        return false
      }),
      archiveSize: archive.byteLength,
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    await prisma.backupHistory.update({
      where: { id: record.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        durationMs,
      },
    })
    throw error
  }
}

export async function getBackupHistory(page = 1, limit = 20, type?: string) {
  const where = type ? { type } : {}
  const [backups, total] = await Promise.all([
    prisma.backupHistory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.backupHistory.count({ where }),
  ])
  return { backups, total, page, limit }
}

export async function getLatestBackup(type = "backup") {
  return prisma.backupHistory.findFirst({
    where: { type, status: "success" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAllStorageUsage() {
  const [local, r2, supabase, gdrive] = await Promise.all([
    isLocalConfigured() ? getLocalUsage().catch(() => ({ usedBytes: 0, objectCount: 0 })) : Promise.resolve({ usedBytes: 0, objectCount: 0 }),
    isR2Configured()
      ? import("./r2-upload").then((m) => m.getR2StorageUsage()).catch(() => ({ usedBytes: 0, objectCount: 0 }))
      : Promise.resolve({ usedBytes: 0, objectCount: 0 }),
    isSupabaseStorageConfigured()
      ? import("./supabase-storage").then((m) => m.getSupabaseStorageUsage()).catch(() => ({ usedBytes: 0, objectCount: 0 }))
      : Promise.resolve({ usedBytes: 0, objectCount: 0 }),
    isGoogleDriveConfigured() ? getGDriveUsage().catch(() => ({ usedBytes: 0, objectCount: 0 })) : Promise.resolve({ usedBytes: 0, objectCount: 0 }),
  ])

  return {
    local: { ...local, configured: isLocalConfigured(), limitBytes: 50 * 1024 * 1024 * 1024 }, // 50GB assumed
    r2: { ...r2, configured: isR2Configured(), limitBytes: 10 * 1024 * 1024 * 1024 },
    supabase: { ...supabase, configured: isSupabaseStorageConfigured(), limitBytes: 1 * 1024 * 1024 * 1024 },
    gdrive: { ...gdrive, configured: isGoogleDriveConfigured(), limitBytes: 15 * 1024 * 1024 * 1024 },
  }
}

export async function downloadBackupArchive(backupId: number): Promise<{ data: Buffer; source: BackupDestination } | null> {
  const backup = await prisma.backupHistory.findUnique({ where: { id: backupId } })
  if (!backup || backup.status !== "success") return null

  // Try each destination in order: local, r2, supabase, gdrive
  if (backup.localKey) {
    try {
      const { downloadFromLocal } = await import("./local-storage")
      return { data: await downloadFromLocal(backup.localKey), source: "local" }
    } catch { /* try next */ }
  }
  if (backup.r2Key) {
    try {
      const { downloadFromR2 } = await import("./r2-upload")
      return { data: await downloadFromR2(backup.r2Key), source: "r2" }
    } catch { /* try next */ }
  }
  if (backup.supabaseKey) {
    try {
      const { downloadFromSupabaseStorage } = await import("./supabase-storage")
      return { data: await downloadFromSupabaseStorage(backup.supabaseKey), source: "supabase" }
    } catch { /* try next */ }
  }
  if (backup.googleDriveKey) {
    try {
      const { downloadFromGoogleDrive } = await import("./google-drive")
      return { data: await downloadFromGoogleDrive(backup.googleDriveKey), source: "gdrive" }
    } catch { /* try next */ }
  }
  return null
}
