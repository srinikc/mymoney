import { gzipSync } from "node:zlib"
import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import type { BackupArtifact } from "./types"

const TABLES_IN_ORDER = [
  "user", "account", "session", "verificationToken",
  "profile", "category", "expense", "budget", "goal",
  "investment", "investmentGoalAllocation", "asset", "liability",
  "bankAccount", "fixedDeposit", "cashBalance", "loan", "insurance",
  "incomeSource", "subscription", "reminder", "deal",
  "taxDocument", "itrRecord", "expenseLink",
  "vendorMapping", "autoCatVendorRule", "importSession",
  "auditLog", "featureFlag", "systemConfig",
  "sharedProfile", "familyMember", "obligation",
  "gmailImportLog", "gmailScan",
  "adImpression", "adClick", "sponsoredPlacement",
  "userSetting", "payment", "alertRule", "notificationConfig",
  "fundMetadata", "fundReview", "loanProduct",
  "backupHistory",
]

export async function exportDatabase(profileId?: number): Promise<BackupArtifact & { tableCounts: Record<string, number> }> {
  const dump: Record<string, unknown[]> = {}
  const tableCounts: Record<string, number> = {}
  let totalRows = 0

  for (const table of TABLES_IN_ORDER) {
    try {
      const client = prisma as unknown as Record<string, unknown>
      const model = client[table] as { findMany: (args?: unknown) => Promise<unknown[]> } | undefined
      if (!model) continue
      const where = profileId ? { profileId } : undefined
      const data = await model.findMany(where ? { where } : undefined)
      dump[table] = data
      tableCounts[table] = Array.isArray(data) ? data.length : 0
      totalRows += tableCounts[table]
    } catch {
      // Table might not exist in schema, skip
    }
  }

  const json = JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), dump })
  const compressed = gzipSync(Buffer.from(json))
  const checksum = createHash("sha256").update(compressed).digest("hex")

  return {
    type: "db",
    data: compressed,
    filename: `db-dump-${Date.now()}.json.gz`,
    size: compressed.byteLength,
    tableCounts,
  }
}

export async function restoreDatabase(data: Buffer, profileId?: number): Promise<{ tablesRestored: number; rowsInserted: number }> {
  const { gunzipSync } = await import("node:zlib")
  const json = gunzipSync(data).toString("utf8")
  const { dump } = JSON.parse(json) as { dump: Record<string, unknown[]> }

  let tablesRestored = 0
  let rowsInserted = 0

  // Delete existing data in reverse dependency order
  for (const table of [...TABLES_IN_ORDER].reverse()) {
    try {
      const client = prisma as unknown as Record<string, unknown>
      const model = client[table] as { deleteMany: (args?: unknown) => Promise<{ count: number }> } | undefined
      if (!model) continue
      const where = profileId ? { profileId } : undefined
      await model.deleteMany(where ? { where } : undefined)
    } catch { /* skip */ }
  }

  // Insert in dependency order
  for (const table of TABLES_IN_ORDER) {
    const rows = dump[table]
    if (!rows || rows.length === 0) continue
    try {
      const client = prisma as unknown as Record<string, unknown>
      const model = client[table] as { createMany: (args: unknown) => Promise<{ count: number }> } | undefined
      if (!model) continue
      await model.createMany({ data: rows as never[], skipDuplicates: true })
      tablesRestored++
      rowsInserted += rows.length
    } catch (e) {
      console.error(`Failed to restore table ${table}:`, e)
    }
  }

  return { tablesRestored, rowsInserted }
}
