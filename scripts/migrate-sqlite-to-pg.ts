/**
 * migrate-sqlite-to-pg.ts
 *
 * P2.2 — One-time migration script: reads all data from SQLite via Prisma
 * and writes it to PostgreSQL.
 *
 * Prerequisites:
 *   1. PostgreSQL must be running and DATABASE_URL must point to it in .env
 *   2. PostgreSQL schema must be created via `npx prisma db push`
 *   3. SQLite database must exist at the path in DATABASE_URL_SQLITE
 *
 * Run: npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 * Environment:
 *   DATABASE_URL         — PostgreSQL connection (target)
 *   DATABASE_URL_SQLITE  — SQLite connection (source, default: "file:./dev.db")
 */

import { PrismaClient as SQLitePrisma } from "@prisma/client"
import { PrismaClient as PGPrisma } from "@prisma/client"

const SQLITE_URL = process.env.DATABASE_URL_SQLITE || "file:./prisma/dev.db"
const PG_URL = process.env.DATABASE_URL!

async function main() {
  console.log("=== SQLite → PostgreSQL Migration ===")
  console.log(`Source: ${SQLITE_URL}`)
  console.log(`Target: ${PG_URL}`)
  console.log("")

  // Connect to source (SQLite)
  const sqlite = new SQLitePrisma({
    datasources: { db: { url: SQLITE_URL } },
  })

  // Connect to target (PostgreSQL)
  const pg = new PGPrisma({
    datasources: { db: { url: PG_URL } },
  })

  try {
    // ── Step 1: Create default User and Profile ─────────────────────────
    console.log("Step 1: Creating default User and Profile...")
    const user = await pg.user.create({
      data: {
        email: "migrated@mymoney.app",
        name: "Migrated User",
        role: "user",
        tier: "free",
      },
    })
    const profile = await pg.profile.create({
      data: {
        name: "Default",
        userId: user.id,
        isDefault: true,
      },
    })
    console.log(`  ✓ User id=${user.id}, Profile id=${profile.id}`)

    // ── Step 2: Migrate Categories ───────────────────────────────────────
    console.log("Step 2: Migrating Categories...")
    const categories = await sqlite.category.findMany()
    if (categories.length > 0) {
      await pg.category.createMany({
        data: categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          createdAt: c.createdAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${categories.length} categories migrated`)
    } else {
      console.log(`  - No categories to migrate`)
    }

    // ── Step 3: Migrate Merchant Mappings ───────────────────────────────
    console.log("Step 3: Migrating Merchant Mappings...")
    const merchantMappings = await sqlite.merchantMapping.findMany()
    if (merchantMappings.length > 0) {
      await pg.merchantMapping.createMany({
        data: merchantMappings.map((m) => ({
          id: m.id,
          merchantKey: m.merchantKey,
          description: m.description,
          expenseType: m.expenseType,
          subCategory: m.subCategory,
          person: m.person,
          source: m.source,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${merchantMappings.length} merchant mappings migrated`)
    } else {
      console.log(`  - No merchant mappings to migrate`)
    }

    // ── Step 4: Migrate Import Sessions ─────────────────────────────────
    console.log("Step 4: Migrating Import Sessions...")
    const importSessions = await sqlite.importSession.findMany()
    if (importSessions.length > 0) {
      await pg.importSession.createMany({
        data: importSessions.map((s) => ({
          id: s.id,
          source: s.source,
          fileName: s.fileName,
          totalRows: s.totalRows,
          autoMapped: s.autoMapped,
          newMerchants: s.newMerchants,
          skipped: s.skipped,
          status: s.status,
          createdAt: s.createdAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${importSessions.length} import sessions migrated`)
    } else {
      console.log(`  - No import sessions to migrate`)
    }

    // ── Step 5: Migrate Expenses ─────────────────────────────────────────
    console.log("Step 5: Migrating Expenses...")
    const expenses = await sqlite.expense.findMany()
    if (expenses.length > 0) {
      // Batch in chunks of 500
      const chunkSize = 500
      for (let i = 0; i < expenses.length; i += chunkSize) {
        const chunk = expenses.slice(i, i + chunkSize)
        await pg.expense.createMany({
          data: chunk.map((e) => ({
            id: e.id,
            date: e.date,
            amount: e.amount,
            categoryId: e.categoryId,
            subCategory: e.subCategory,
            person: e.person,
            vendor: e.vendor,
            description: e.description,
            paymentMode: e.paymentMode,
            recurrenceType: e.recurrenceType,
            otherType: e.otherType,
            tags: e.tags,
            receiptUrl: e.receiptUrl,
            isShared: e.isShared,
            sharedWith: e.sharedWith,
            paidThrough: e.paidThrough,
            bankAccount: e.bankAccount,
            notes: e.notes,
            importSessionId: e.importSessionId,
            flagged: e.flagged,
            profileId: profile.id,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })),
          skipDuplicates: true,
        })
      }
      console.log(`  ✓ ${expenses.length} expenses migrated`)
    } else {
      console.log(`  - No expenses to migrate`)
    }

    // ── Step 6: Migrate Budgets ─────────────────────────────────────────
    console.log("Step 6: Migrating Budgets...")
    const budgets = await sqlite.budget.findMany()
    if (budgets.length > 0) {
      await pg.budget.createMany({
        data: budgets.map((b) => ({
          id: b.id,
          categoryId: b.categoryId,
          month: b.month,
          year: b.year,
          amount: b.amount,
          profileId: profile.id,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${budgets.length} budgets migrated`)
    } else {
      console.log(`  - No budgets to migrate`)
    }

    // ── Step 7: Migrate Goals ───────────────────────────────────────────
    console.log("Step 7: Migrating Goals...")
    const goals = await sqlite.goal.findMany()
    if (goals.length > 0) {
      await pg.goal.createMany({
        data: goals.map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
          category: g.category,
          notes: g.notes,
          status: g.status,
          profileId: profile.id,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${goals.length} goals migrated`)
    } else {
      console.log(`  - No goals to migrate`)
    }

    // ── Step 8: Migrate Investments ─────────────────────────────────────
    console.log("Step 8: Migrating Investments...")
    const investments = await sqlite.investment.findMany()
    if (investments.length > 0) {
      await pg.investment.createMany({
        data: investments.map((i) => ({
          id: i.id,
          type: i.type,
          name: i.name,
          amount: i.amount,
          currentValue: i.currentValue,
          purchaseDate: i.purchaseDate,
          returnRate: i.returnRate,
          notes: i.notes,
          status: i.status,
          profileId: profile.id,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${investments.length} investments migrated`)
    } else {
      console.log(`  - No investments to migrate`)
    }

    // ── Step 9: Migrate Plans ──────────────────────────────────────────
    console.log("Step 9: Migrating Plans...")
    const plans = await sqlite.plan.findMany()
    if (plans.length > 0) {
      await pg.plan.createMany({
        data: plans.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          amountNeeded: p.amountNeeded,
          amountSaved: p.amountSaved,
          monthlyContribution: p.monthlyContribution,
          deadline: p.deadline,
          status: p.status,
          notes: p.notes,
          profileId: profile.id,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${plans.length} plans migrated`)
    } else {
      console.log(`  - No plans to migrate`)
    }

    // ── Step 10: Migrate Reminders ─────────────────────────────────────
    console.log("Step 10: Migrating Reminders...")
    const reminders = await sqlite.reminder.findMany()
    if (reminders.length > 0) {
      await pg.reminder.createMany({
        data: reminders.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          priority: r.priority,
          dueDate: r.dueDate,
          amount: r.amount,
          categoryId: r.categoryId,
          merchantKey: r.merchantKey,
          recurring: r.recurring,
          isCompleted: r.isCompleted,
          completedAt: r.completedAt,
          profileId: profile.id,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${reminders.length} reminders migrated`)
    } else {
      console.log(`  - No reminders to migrate`)
    }

    // ── Step 11: Migrate Deals ──────────────────────────────────────────
    console.log("Step 11: Migrating Deals...")
    const deals = await sqlite.deal.findMany()
    if (deals.length > 0) {
      await pg.deal.createMany({
        data: deals.map((d) => ({
          id: d.id,
          merchant: d.merchant,
          title: d.title,
          description: d.description,
          discount: d.discount,
          couponCode: d.couponCode,
          url: d.url,
          validUntil: d.validUntil,
          category: d.category,
          isActive: d.isActive,
          profileId: profile.id,
          createdAt: d.createdAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${deals.length} deals migrated`)
    } else {
      console.log(`  - No deals to migrate`)
    }

    // ── Step 12: Migrate Assets ─────────────────────────────────────────
    console.log("Step 12: Migrating Assets...")
    const assets = await sqlite.asset.findMany()
    if (assets.length > 0) {
      await pg.asset.createMany({
        data: assets.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          amount: a.amount,
          notes: a.notes,
          profileId: profile.id,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${assets.length} assets migrated`)
    } else {
      console.log(`  - No assets to migrate`)
    }

    // ── Step 13: Migrate Liabilities ──────────────────────────────────
    console.log("Step 13: Migrating Liabilities...")
    const liabilities = await sqlite.liability.findMany()
    if (liabilities.length > 0) {
      await pg.liability.createMany({
        data: liabilities.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          amount: l.amount,
          interestRate: l.interestRate,
          dueDate: l.dueDate,
          notes: l.notes,
          profileId: profile.id,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`  ✓ ${liabilities.length} liabilities migrated`)
    } else {
      console.log(`  - No liabilities to migrate`)
    }

    // ── Step 14: Migrate Alert Rules & Notification Configs ────────────
    console.log("Step 14: Migrating Alert Rules & Notification Configs...")
    const alertRules = await sqlite.alertRule.findMany()
    if (alertRules.length > 0) {
      await pg.alertRule.createMany({
        data: alertRules,
        skipDuplicates: true,
      })
      console.log(`  ✓ ${alertRules.length} alert rules migrated`)
    } else {
      console.log(`  - No alert rules to migrate`)
    }

    const notifConfigs = await sqlite.notificationConfig.findMany()
    if (notifConfigs.length > 0) {
      await pg.notificationConfig.createMany({
        data: notifConfigs,
        skipDuplicates: true,
      })
      console.log(`  ✓ ${notifConfigs.length} notification configs migrated`)
    } else {
      console.log(`  - No notification configs to migrate`)
    }

    // ── Step 15: Migrate Audit Logs (raw query — old schema has entityType) ─
    console.log("Step 15: Migrating Audit Logs (via raw query)...")
    const rawAuditLogs: Array<{ id: number; action: string; entityType: string; entityId: number | null; metadata: string | null; ip: string | null; createdAt: Date }> =
      await sqlite.$queryRawUnsafe("SELECT id, action, entityType, entityId, metadata, ip, createdAt FROM AuditLog")
    if (rawAuditLogs.length > 0) {
      // Batch insert to PG using the new schema (entity instead of entityType)
      const chunkSize = 500
      for (let i = 0; i < rawAuditLogs.length; i += chunkSize) {
        const chunk = rawAuditLogs.slice(i, i + chunkSize)
        const values = chunk.map((a) => ({
          profileId: profile.id,
          action: a.action,
          entity: a.entityType, // Map old entityType → entity
          entityId: a.entityId,
          metadata: a.metadata,
          createdAt: a.createdAt,
        }))
        await pg.auditLog.createMany({ data: values, skipDuplicates: true })
      }
      console.log(`  ✓ ${rawAuditLogs.length} audit logs migrated`)
    } else {
      console.log(`  - No audit logs to migrate`)
    }

    console.log("")
    console.log("=== Migration complete! ===")
    console.log(`All data migrated to PostgreSQL. Update .env DATABASE_URL to point to PostgreSQL.`)
  } finally {
    await sqlite.$disconnect()
    await pg.$disconnect()
  }
}

try {
  await main()
} catch (error) {
  console.error("Migration failed:", error)
  throw error
}
