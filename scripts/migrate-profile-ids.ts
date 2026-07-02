/**
 * migrate-profile-ids.ts
 *
 * P2.4 — Data migration script:
 * Assigns all orphaned records (profileId = null) to the user"s default profile.
 * Prints a summary of all migrations applied.
 *
 * Run: npx tsx scripts/migrate-profile-ids.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface EntityTable {
  name: string
  countOrphaned: () => Promise<number>
  assignToProfile: (profileId: number) => Promise<{ count: number }>
}

async function main() {
  console.log("=".repeat(55))
  console.log("  P2.4 \u2014 Migrate Orphaned Records to Default Profile")
  console.log("=".repeat(55))
  console.log("")

  // Find the default profile
  const defaultProfile = await prisma.profile.findFirst({
    where: { isDefault: true },
    orderBy: { id: "asc" },
  })

  if (!defaultProfile) {
    console.log("  No default profile found. Aborting.")
    console.log("  Run scripts/seed-first-profile.ts first to create one.")
    await prisma.$disconnect()
    process.exit(1)
  }

  const profileId = defaultProfile.id
  console.log("  Using default profile: \"" + defaultProfile.name + "\" (id=" + profileId + ")")
  console.log("")

  // Define all entity tables with profileId
  const tables: EntityTable[] = [
    {
      name: "Expense",
      countOrphaned: () => prisma.expense.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.expense.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Budget",
      countOrphaned: () => prisma.budget.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.budget.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Goal",
      countOrphaned: () => prisma.goal.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.goal.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Investment",
      countOrphaned: () => prisma.investment.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.investment.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Plan",
      countOrphaned: () => prisma.plan.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.plan.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Reminder",
      countOrphaned: () => prisma.reminder.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.reminder.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Deal",
      countOrphaned: () => prisma.deal.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.deal.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Asset",
      countOrphaned: () => prisma.asset.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.asset.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
    {
      name: "Liability",
      countOrphaned: () => prisma.liability.count({ where: { profileId: null } }),
      assignToProfile: (pid) => prisma.liability.updateMany({ where: { profileId: null }, data: { profileId: pid } }),
    },
  ]

  // Apply migrations
  let totalOrphaned = 0
  let totalAssigned = 0
  const results: { name: string; orphaned: number; assigned: number }[] = []

  for (const table of tables) {
    const orphaned = await table.countOrphaned()
    totalOrphaned += orphaned

    if (orphaned > 0) {
      const result = await table.assignToProfile(profileId)
      totalAssigned += result.count
      results.push({ name: table.name, orphaned, assigned: result.count })
      console.log("  " + table.name + ": " + result.count + " orphaned record(s) assigned to profile " + profileId)
    } else {
      results.push({ name: table.name, orphaned: 0, assigned: 0 })
      console.log("  - " + table.name + ": No orphaned records found")
    }
  }

  // Print summary
  console.log("")
  console.log("-".repeat(55))
  console.log("  Migration Summary")
  console.log("-".repeat(55))
  console.log("  Default profile ID:     " + profileId)
  console.log("  Default profile name:   \"" + defaultProfile.name + "\"")
  console.log("  Total orphaned records: " + totalOrphaned)
  console.log("  Total assigned:         " + totalAssigned)
  console.log("")

  // Table breakdown
  const pad = (s: string, n: number) => s.padEnd(n)
  console.log("  " + pad("Table", 15) + pad("Orphaned", 10) + pad("Assigned", 10))
  console.log("  " + "\u2500".repeat(15) + " " + "\u2500".repeat(10) + " " + "\u2500".repeat(10))
  for (const r of results) {
    console.log("  " + pad(r.name, 15) + pad(String(r.orphaned), 10) + pad(String(r.assigned), 10))
  }

  console.log("")
  if (totalOrphaned === 0) {
    console.log("  No orphaned records found - nothing to migrate.")
  } else if (totalOrphaned === totalAssigned) {
    console.log("  All orphaned records have been successfully migrated!")
  } else {
    console.log("  Partial migration: " + totalAssigned + "/" + totalOrphaned + " records assigned.")
  }

  console.log("")
  console.log("=".repeat(55))
}

try {
  await main()
} catch (error) {
  console.error("Migration error:", error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
