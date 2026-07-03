import Database from "better-sqlite3"
import { PrismaClient } from "@prisma/client"

const sqlitePath = process.env.SQLITE_PATH || "prisma/dev.db"
const sqlite = new Database(sqlitePath)
const prisma = new PrismaClient()

type Row = Record<string, unknown>

const DATE_FIELDS: Record<string, string[]> = {
  User: ["createdAt", "updatedAt"],
  Profile: ["createdAt", "updatedAt"],
  Session: ["expires"],
  VerificationToken: ["expires"],
  Category: ["createdAt"],
  MerchantMapping: ["createdAt", "updatedAt"],
  ImportSession: ["createdAt"],
  Expense: ["date", "createdAt", "updatedAt"],
  Budget: ["createdAt", "updatedAt"],
  Goal: ["deadline", "createdAt", "updatedAt"],
  Investment: ["purchaseDate", "createdAt", "updatedAt"],
  Plan: ["deadline", "createdAt", "updatedAt"],
  Reminder: ["dueDate", "completedAt", "createdAt", "updatedAt"],
  Deal: ["validUntil", "createdAt"],
  Asset: ["purchaseDate", "createdAt", "updatedAt"],
  Liability: ["dueDate", "createdAt", "updatedAt"],
  Subscription: ["nextDueDate", "createdAt", "updatedAt"],
  AuditLog: ["createdAt"],
  FeatureFlag: ["createdAt", "updatedAt"],
  AlertRule: ["createdAt", "updatedAt"],
  NotificationConfig: ["createdAt", "updatedAt"],
}

const BOOL_FIELDS: Record<string, string[]> = {
  Profile: ["isDefault"],
  FeatureFlag: ["enabled"],
  Expense: ["isShared", "flagged"],
  Reminder: ["isCompleted"],
  Deal: ["isActive"],
  AlertRule: ["isEnabled"],
  NotificationConfig: ["enabled"],
}

function convertRow(table: string, row: Row): Row {
  const dateFields = DATE_FIELDS[table] || []
  const boolFields = BOOL_FIELDS[table] || []
  const result: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (dateFields.includes(key) && typeof value === "number") {
      result[key] = new Date(value)
    } else if (boolFields.includes(key) && typeof value === "number") {
      result[key] = value !== 0
    } else {
      result[key] = value
    }
  }
  return result
}

async function migrateTable(table: string) {
  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[]
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (skipping)`)
    return
  }
  const model = table[0].toLowerCase() + table.slice(1)
  let count = 0
  for (const row of rows) {
    try {
      const data = convertRow(table, row)
      await (prisma as any)[model].create({ data })
      count++
    } catch (err: any) {
      console.error(`  Error inserting ${table} row ${row.id || JSON.stringify(row)}: ${err.message}`)
    }
  }
  console.log(`  ${table}: ${count} rows migrated`)
}

async function main() {
  console.log("=== SQLite → PostgreSQL Data Migration ===\n")

  for (const table of ["User", "Profile", "FeatureFlag", "Account", "Session", "VerificationToken",
    "Category", "MerchantMapping", "ImportSession", "Expense", "Budget", "Goal",
    "Investment", "Plan", "Reminder", "Deal", "Asset", "Liability",
    "Subscription", "AlertRule", "NotificationConfig", "AuditLog"]) {
    console.log(`Migrating ${table}...`)
    await migrateTable(table)
  }

  console.log("\n=== Migration complete! ===")
}

main()
  .catch((e) => {
    console.error("Migration failed:", e)
    process.exit(1)
  })
  .finally(() => {
    sqlite.close()
    prisma.$disconnect()
  })
