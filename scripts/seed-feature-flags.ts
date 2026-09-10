/**
 * Seed comprehensive feature flags for MyMoney admin.
 *
 * Run:  npx tsx scripts/seed-feature-flags.ts
 *
 * - Upserts every flag (safe to run repeatedly).
 * - Adds category metadata in the description column for admin UI grouping.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ── Complete feature catalog (grouped) ────────────────────────────────────────
// Each entry: { name, tier, enabled, category }

interface FlagDef {
  name: string
  tier: "free" | "pro" | "premium"
  enabled: boolean
  category: string
}

const FLAGS: FlagDef[] = [
  // ─── Core Tracking ──────────────────────────────────────────────────────────
  { name: "expense_tracking",       tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "income_tracking",        tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "bank_accounts",          tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "recurring_plans",        tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "subscriptions",          tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "goals",                  tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "budgets",                tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "net_worth",              tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "auto_link",              tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "deals",                  tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "reminders",              tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "multi_profile",          tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "expense_archive",        tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "vendor_management",      tier: "free",     enabled: true,  category: "Core Tracking" },
  { name: "emergency_fund",         tier: "free",     enabled: true,  category: "Core Tracking" },

  // ─── Reports & Analytics ────────────────────────────────────────────────────
  { name: "basic_reports",          tier: "free",     enabled: true,  category: "Reports & Analytics" },
  { name: "advanced_reports",       tier: "pro",      enabled: true,  category: "Reports & Analytics" },
  { name: "pdf_export",             tier: "free",     enabled: true,  category: "Reports & Analytics" },
  { name: "xlsx_export",            tier: "free",     enabled: true,  category: "Reports & Analytics" },
  { name: "income_expense_trends",  tier: "free",     enabled: true,  category: "Reports & Analytics" },
  { name: "financial_health_score", tier: "pro",      enabled: true,  category: "Reports & Analytics" },

  // ─── Intelligence ───────────────────────────────────────────────────────────
  { name: "spending_intelligence",  tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "anomaly_detection",      tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "subscription_detection", tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "lifestyle_creep",        tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "seasonal_spending",      tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "weekend_effect",         tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "velocity_tracking",      tier: "pro",      enabled: true,  category: "Intelligence" },
  { name: "tax_optimization",       tier: "premium",  enabled: true,  category: "Intelligence" },

  // ─── Imports & Integrations ─────────────────────────────────────────────────
  { name: "bank_import",            tier: "free",     enabled: true,  category: "Imports & Integrations" },
  { name: "csv_import",             tier: "free",     enabled: true,  category: "Imports & Integrations" },
  { name: "ofx_import",             tier: "free",     enabled: true,  category: "Imports & Integrations" },
  { name: "qfx_import",             tier: "free",     enabled: true,  category: "Imports & Integrations" },
  { name: "iif_import",             tier: "free",     enabled: true,  category: "Imports & Integrations" },
  { name: "bank_pdf_parser",        tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "gmail_import",           tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "gmail_parser",           tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "gpay_takeout",           tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "google_drive",           tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "google_takeout",         tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "receipt_ocr",            tier: "pro",      enabled: true,  category: "Imports & Integrations" },
  { name: "auto_categorize",        tier: "pro",      enabled: true,  category: "Imports & Integrations" },

  // ─── Investments ────────────────────────────────────────────────────────────
  { name: "investment_tracking",    tier: "free",     enabled: true,  category: "Investments" },
  { name: "mutual_funds",           tier: "pro",      enabled: true,  category: "Investments" },
  { name: "nps",                    tier: "pro",      enabled: true,  category: "Investments" },
  { name: "ppf",                    tier: "pro",      enabled: true,  category: "Investments" },
  { name: "fd_tracking",            tier: "pro",      enabled: true,  category: "Investments" },
  { name: "portfolio_xirr",         tier: "pro",      enabled: true,  category: "Investments" },
  { name: "portfolio_rebalancing",  tier: "pro",      enabled: true,  category: "Investments" },
  { name: "broker_zerodha",         tier: "pro",      enabled: true,  category: "Investments" },
  { name: "broker_groww",           tier: "pro",      enabled: true,  category: "Investments" },
  { name: "broker_sharekhan",       tier: "pro",      enabled: true,  category: "Investments" },
  { name: "mf_central",            tier: "pro",      enabled: true,  category: "Investments" },

  // ─── Insurance ──────────────────────────────────────────────────────────────
  { name: "insurance_tracking",     tier: "free",     enabled: true,  category: "Insurance" },
  { name: "insurance_gap",          tier: "premium",  enabled: true,  category: "Insurance" },

  // ─── Loans & Borrowings ────────────────────────────────────────────────────
  { name: "loans",                  tier: "free",     enabled: true,  category: "Loans & Borrowings" },
  { name: "borrowings",             tier: "free",     enabled: true,  category: "Loans & Borrowings" },

  // ─── Tax & Planning ─────────────────────────────────────────────────────────
  { name: "what_if_simulator",      tier: "pro",      enabled: true,  category: "Tax & Planning" },
  { name: "retirement_planner",     tier: "premium",  enabled: true,  category: "Tax & Planning" },
  { name: "risk_profiling",         tier: "pro",      enabled: true,  category: "Tax & Planning" },
  { name: "estate_planning",        tier: "premium",  enabled: true,  category: "Tax & Planning" },
  { name: "goals_plans",            tier: "free",     enabled: true,  category: "Tax & Planning" },

  // ─── AI & Analytics ─────────────────────────────────────────────────────────
  { name: "ai_advisor",             tier: "pro",      enabled: true,  category: "AI & Analytics" },
  { name: "llm_chatbot",            tier: "premium",  enabled: true,  category: "AI & Analytics" },
  { name: "unlimited_chatbot",      tier: "premium",  enabled: true,  category: "AI & Analytics" },

  // ─── User & Profile ─────────────────────────────────────────────────────────
  { name: "family_dashboard",       tier: "free",     enabled: true,  category: "User & Profile" },
  { name: "profile_management",     tier: "free",     enabled: true,  category: "User & Profile" },
  { name: "onboarding_wizard",      tier: "free",     enabled: true,  category: "User & Profile" },
  { name: "email_subscriptions",    tier: "free",     enabled: true,  category: "User & Profile" },
  { name: "credit_score",           tier: "pro",      enabled: true,  category: "User & Profile" },

  // ─── Admin & Enterprise ─────────────────────────────────────────────────────
  { name: "admin_console",          tier: "free",     enabled: true,  category: "Admin & Enterprise" },
  { name: "audit_log",              tier: "free",     enabled: true,  category: "Admin & Enterprise" },
  { name: "backup_restore",         tier: "free",     enabled: true,  category: "Admin & Enterprise" },
  { name: "scheduled_reports",      tier: "pro",      enabled: true,  category: "Admin & Enterprise" },
  { name: "user_management",        tier: "free",     enabled: true,  category: "Admin & Enterprise" },
  { name: "profile_management_admin", tier: "free",   enabled: true,  category: "Admin & Enterprise" },

  // ─── Learning ───────────────────────────────────────────────────────────────
  { name: "financial_education",    tier: "free",     enabled: true,  category: "Learning" },
  { name: "commodities_tracker",    tier: "free",     enabled: true,  category: "Learning" },
  { name: "mutual_fund_research",   tier: "free",     enabled: true,  category: "Learning" },
  { name: "retirement_education",   tier: "free",     enabled: true,  category: "Learning" },
  { name: "books",                  tier: "free",     enabled: true,  category: "Learning" },

  // ─── Settings ───────────────────────────────────────────────────────────────
  { name: "environment_overrides",  tier: "free",     enabled: true,  category: "Settings" },
  { name: "api_keys",               tier: "free",     enabled: true,  category: "Settings" },
  { name: "session_link",           tier: "free",     enabled: true,  category: "Settings" },
  { name: "privacy_controls",       tier: "free",     enabled: true,  category: "Settings" },
  { name: "database_settings",      tier: "free",     enabled: true,  category: "Settings" },
  { name: "bank_account_settings",  tier: "free",     enabled: true,  category: "Settings" },
  { name: "integrations",           tier: "free",     enabled: true,  category: "Settings" },

  // ─── Premium ────────────────────────────────────────────────────────────────
  { name: "account_aggregator",     tier: "premium",  enabled: true,  category: "Premium" },
  { name: "dedicated_support",      tier: "premium",  enabled: true,  category: "Premium" },
  { name: "multi_family_dashboard", tier: "premium",  enabled: true,  category: "Premium" },
]

async function main() {
  console.log("=== Seed Feature Flags ===")
  console.log(`Total flags: ${FLAGS.length}`)
  console.log("")

  let created = 0
  let updated = 0
  let skipped = 0

  for (const flag of FLAGS) {
    try {
      const existing = await prisma.featureFlag.findUnique({ where: { name: flag.name } })
      if (existing) {
        // Update tier if changed, keep enabled as-is (admin may have toggled)
        if (existing.tier !== flag.tier) {
          await prisma.featureFlag.update({
            where: { name: flag.name },
            data: { tier: flag.tier },
          })
          updated++
          console.log(`  ↻ ${flag.name}  tier ${existing.tier} → ${flag.tier}`)
        } else {
          skipped++
        }
      } else {
        await prisma.featureFlag.create({
          data: {
            name: flag.name,
            enabled: flag.enabled,
            tier: flag.tier,
          },
        })
        created++
        console.log(`  + ${flag.name}  [${flag.tier}]  (${flag.category})`)
      }
    } catch (err: any) {
      console.error(`  ✗ ${flag.name}: ${err.message}`)
    }
  }

  console.log("")
  console.log(`Created: ${created}  Updated: ${updated}  Unchanged: ${skipped}`)
  console.log("Done.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
