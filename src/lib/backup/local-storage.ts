import { writeFileSync, mkdirSync, readFileSync, statSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const BACKUP_DIR = join(process.cwd(), "data", "backups")

function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

export async function uploadToLocal(key: string, body: Buffer, _contentType: string): Promise<string> {
  ensureBackupDir()
  const filename = key.replaceAll(/[/\\]/g, "_")
  const filePath = join(BACKUP_DIR, filename)
  writeFileSync(filePath, body)
  return filename
}

export async function downloadFromLocal(key: string): Promise<Buffer> {
  const filename = key.replaceAll(/[/\\]/g, "_")
  const filePath = join(BACKUP_DIR, filename)
  if (!existsSync(filePath)) throw new Error(`Local backup not found: ${key}`)
  return readFileSync(filePath)
}

export async function getLocalStorageUsage(): Promise<{ usedBytes: number; objectCount: number }> {
  if (!existsSync(BACKUP_DIR)) return { usedBytes: 0, objectCount: 0 }
  let totalBytes = 0
  let count = 0
  function scan(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        scan(fullPath)
      } else {
        totalBytes += stat.size
        count++
      }
    }
  }
  scan(BACKUP_DIR)
  return { usedBytes: totalBytes, objectCount: count }
}

export function isLocalConfigured(): boolean {
  // Local backup is always available on non-Vercel environments
  return process.env.VERCEL !== "1"
}

export function getLocalBackupDir(): string {
  return BACKUP_DIR
}
