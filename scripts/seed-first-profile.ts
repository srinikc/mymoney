/**
 * seed-first-profile.ts
 *
 * P2.7 — Data migration script:
 * - Creates default User if none exists
 * - Creates default Profile
 * - Assigns all existing Expense/Budget/Goal/etc. to this profile via profileId
 * - Seeds default FeatureFlags from the DESIGN.md catalog
 *
 * Run: npx tsx scripts/seed-first-profile.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const FEATURE_FLAGS = [
  { name: "multi_profile", tier: "free" },
  { name: "expense_tracking", tier: "free" },
  { name: "budget_management", tier: "free" },
  { name: "goal_planning", tier: "free" },
  { name: "investment_tracking", tier: "free" },
  { name: "insurance_tracking", tier: "free" },
  { name: "net_worth", tier: "free" },
  { name: "basic_reports", tier: "free" },
  { name: "advanced_reports", tier: "pro" },
  { name: "pdf_export", tier: "free" },
  { name: "xlsx_export", tier: "free" },
  { name: "bank_import", tier: "free" },
  { name: "bank_pdf_parser", tier: "pro" },
  { name: "receipt_ocr", tier: "pro" },
  { name: "broker_zerodha", tier: "pro" },
  { name: "broker_groww", tier: "pro" },
  { name: "broker_sharekhan", tier: "pro" },
  { name: "mf_central", tier: "pro" },
  { name: "aa_integration", tier: "premium" },
  { name: "ai_advisor", tier: "pro" },
  { name: "llm_chatbot", tier: "premium" },
  { name: "what_if_simulator", tier: "pro" },
  { name: "tax_optimizer", tier: "premium" },
  { name: "portfolio_xirr", tier: "pro" },
  { name: "portfolio_rebalancing", tier: "pro" },
  { name: "risk_profiling", tier: "pro" },
  { name: "insurance_gap", tier: "premium" },
  { name: "retirement_planner", tier: "premium" },
  { name: "estate_planning", tier: "premium" },
  { name: "multi_family_dashboard", tier: "premium" },
  { name: "admin_console", tier: "free" },
  { name: "audit_log", tier: "free" },
  { name: "onboarding_wizard", tier: "free" },
  { name: "export_data", tier: "free" },
  { name: "import_data", tier: "free" },
] as const

type EntityTable = {
  name: string
  count: () => Promise<number>
  updateMany: (data: { profileId: number }) => Promise<{ count: number }>
}

async function main() {
  console.log("=== Seed First Profile ===")
  console.log("")

  // ── Step 1: Find or create default User ────────────────────────────────
  const existingUsers = await prisma.user.count()
  let userId: number

  if (existingUsers === 0) {
    const user = await prisma.user.create({
      data: {
        email: "admin@mymoney.app",
        name: "Admin",
        role: "admin",
        tier: "free",
      },
    })
    userId = user.id
    console.log(`  ✓ Created default user: ${user.email} (id=${user.id})`)
  } else {
    const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } })
    userId = firstUser!.id
    console.log(`  ✓ Using existing user id=${userId} (${firstUser!.email})`)
  }

  // ── Step 2: Find or create default Profile ─────────────────────────────
  const existingProfiles = await prisma.profile.count()
  let profileId: number

  if (existingProfiles === 0) {
    const profile = await prisma.profile.create({
      data: {
        name: "Default",
        userId,
        isDefault: true,
      },
    })
    profileId = profile.id
    console.log(`  ✓ Created default profile: "${profile.name}" (id=${profile.id})`)
  } else {
    const defaultProfile = await prisma.profile.findFirst({
      where: { userId, isDefault: true },
      orderBy: { id: "asc" },
    })
    profileId = defaultProfile!.id
    console.log(`  ✓ Using existing profile id=${profileId} ("${defaultProfile!.name}")`)
  }

  // ── Step 3: Assign existing records to this profile ─────────────────────
  const tables: EntityTable[] = [
    { name: "Expense", count: () => prisma.expense.count({ where: { profileId: null } }), updateMany: (d) => prisma.expense.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Budget", count: () => prisma.budget.count({ where: { profileId: null } }), updateMany: (d) => prisma.budget.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Goal", count: () => prisma.goal.count({ where: { profileId: null } }), updateMany: (d) => prisma.goal.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Investment", count: () => prisma.investment.count({ where: { profileId: null } }), updateMany: (d) => prisma.investment.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Plan", count: () => prisma.plan.count({ where: { profileId: null } }), updateMany: (d) => prisma.plan.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Reminder", count: () => prisma.reminder.count({ where: { profileId: null } }), updateMany: (d) => prisma.reminder.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Deal", count: () => prisma.deal.count({ where: { profileId: null } }), updateMany: (d) => prisma.deal.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Asset", count: () => prisma.asset.count({ where: { profileId: null } }), updateMany: (d) => prisma.asset.updateMany({ where: { profileId: null }, data: d }) },
    { name: "Liability", count: () => prisma.liability.count({ where: { profileId: null } }), updateMany: (d) => prisma.liability.updateMany({ where: { profileId: null }, data: d }) },
  ]

  let totalAssigned = 0
  for (const table of tables) {
    const count = await table.count()
    if (count > 0) {
      const result = await table.updateMany({ profileId })
      totalAssigned += result.count
      console.log(`  ✓ Assigned ${result.count} ${table.name}(s) to profile ${profileId}`)
    } else {
      console.log(`  - No unassigned ${table.name}(s) found`)
    }
  }

  if (totalAssigned > 0) {
    console.log(`  → Total records assigned: ${totalAssigned}`)
  } else {
    console.log(`  → No records needed assignment`)
  }

  // ── Step 4: Seed FeatureFlags ──────────────────────────────────────────
  let flagsSeeded = 0
  let flagsSkipped = 0
  for (const flag of FEATURE_FLAGS) {
    const existing = await prisma.featureFlag.findUnique({ where: { name: flag.name } })
    if (existing) {
      flagsSkipped++
    } else {
      await prisma.featureFlag.create({
        data: {
          name: flag.name,
          enabled: flag.tier === "free", // free features enabled by default
          tier: flag.tier,
        },
      })
      flagsSeeded++
    }
  }
  console.log(`  ✓ FeatureFlags: ${flagsSeeded} created, ${flagsSkipped} skipped (already exist)`)

  console.log("")
  console.log("=== Seed complete ===")
}

try {
  await main()
} catch (error) {
  console.error("Seed error:", error)
  throw error
} finally {
  await prisma.$disconnect()
}
