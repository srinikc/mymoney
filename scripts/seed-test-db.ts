import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

async function main() {
  if (!TEST_DATABASE_URL) {
    console.error("TEST_DATABASE_URL not set")
    process.exit(1)
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  })

  console.log("Seeding test database...")

  // Clean slate
  await prisma.userSetting.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.incomeSource.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.investment.deleteMany()
  await prisma.insurance.deleteMany()
  await prisma.loan.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.liability.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.notificationConfig.deleteMany()
  await prisma.alertRule.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.expenseLink.deleteMany()
  await prisma.vendorMapping.deleteMany()
  await prisma.importSession.deleteMany()
  await prisma.taxDocument.deleteMany()
  await prisma.iTRRecord.deleteMany()
  await prisma.bankAccount.deleteMany()
  await prisma.fixedDeposit.deleteMany()
  await prisma.sharedProfile.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
  await prisma.featureFlag.deleteMany()

  // Default categories
  const categories = [
    { name: "Food & Dining", type: "expense", icon: "utensils", color: "#ef4444" },
    { name: "Transportation", type: "expense", icon: "car", color: "#f97316" },
    { name: "Shopping", type: "expense", icon: "shopping-bag", color: "#eab308" },
    { name: "Entertainment", type: "expense", icon: "film", color: "#22c55e" },
    { name: "Bills & Utilities", type: "expense", icon: "file-text", color: "#06b6d4" },
    { name: "Health", type: "expense", icon: "heart", color: "#3b82f6" },
    { name: "Education", type: "expense", icon: "book", color: "#8b5cf6" },
    { name: "Travel", type: "expense", icon: "plane", color: "#a855f7" },
    { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#ec4899" },
    { name: "Rent", type: "expense", icon: "home", color: "#f43f5e" },
    { name: "Insurance", type: "expense", icon: "shield", color: "#14b8a6" },
    { name: "Investments", type: "expense", icon: "trending-up", color: "#10b981" },
    { name: "Other", type: "expense", icon: "circle", color: "#6b7280" },
    { name: "Salary", type: "income", icon: "briefcase", color: "#22c55e" },
    { name: "Freelance", type: "income", icon: "laptop", color: "#3b82f6" },
    { name: "Rental Income", type: "income", icon: "home", color: "#8b5cf6" },
    { name: "Interest", type: "income", icon: "banknote", color: "#eab308" },
    { name: "Dividend", type: "income", icon: "gift", color: "#10b981" },
    { name: "Business", type: "income", icon: "building", color: "#f97316" },
    { name: "Other Income", type: "income", icon: "circle", color: "#6b7280" },
  ]

  for (const cat of categories) {
    await prisma.category.create({ data: cat })
  }
  console.log(`  Created ${categories.length} categories`)

  // Feature flags (same as seed-features.ts)
  const features = [
    { name: "basic-tracking", tier: "free", enabled: true },
    { name: "manual-import", tier: "free", enabled: true },
    { name: "budget-alerts", tier: "free", enabled: true },
    { name: "reports", tier: "free", enabled: true },
    { name: "ai-insights", tier: "pro", enabled: true },
    { name: "gmail-parsing", tier: "pro", enabled: true },
    { name: "auto-linking", tier: "pro", enabled: true },
    { name: "tax-optimization", tier: "pro", enabled: true },
    { name: "what-if-simulator", tier: "pro", enabled: true },
    { name: "llm-chatbot", tier: "pro", enabled: true },
    { name: "gpay-auto-import", tier: "pro", enabled: true },
    { name: "multi-profile", tier: "pro", enabled: true },
    { name: "unlimited-chatbot", tier: "premium", enabled: true },
    { name: "admin-console", tier: "premium", enabled: true },
    { name: "account-aggregator", tier: "premium", enabled: true },
    { name: "dedicated-support", tier: "premium", enabled: true },
  ]

  for (const f of features) {
    await prisma.featureFlag.create({ data: f })
  }
  console.log(`  Created ${features.length} feature flags`)

  // Test users
  const testPassword = await bcrypt.hash("test123", 10)
  const adminPassword = await bcrypt.hash("admin123", 10)

  const testUser = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      role: "user",
      tier: "free",
      hashedPassword: testPassword,
    },
  })
  console.log(`  Created test user: ${testUser.email} / test123`)

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@test.com",
      name: "Test Admin",
      role: "admin",
      tier: "premium",
      hashedPassword: adminPassword,
    },
  })
  console.log(`  Created admin user: ${adminUser.email} / admin123`)

  // Profiles
  const testProfile = await prisma.profile.create({
    data: { name: "Personal", userId: testUser.id, isDefault: true },
  })

  const adminProfile = await prisma.profile.create({
    data: { name: "Default", userId: adminUser.id, isDefault: true },
  })

  // Sample expenses
  const expenseCategories = await prisma.category.findMany({ where: { type: "expense" } })
  const catMap = Object.fromEntries(expenseCategories.map((c) => [c.name, c.id]))

  const sampleExpenses = [
    { date: new Date("2026-07-01"), amount: 450, categoryId: catMap["Food & Dining"], vendor: "Pizza Hut", description: "Lunch with team", paymentMode: "UPI" },
    { date: new Date("2026-07-02"), amount: 1200, categoryId: catMap["Groceries"], vendor: "Big Basket", description: "Weekly groceries", paymentMode: "UPI" },
    { date: new Date("2026-07-03"), amount: 250, categoryId: catMap["Transportation"], vendor: "Uber", description: "Office to home", paymentMode: "UPI" },
    { date: new Date("2026-07-05"), amount: 1999, categoryId: catMap["Entertainment"], vendor: "Netflix", description: "Monthly subscription", paymentMode: "UPI" },
    { date: new Date("2026-07-07"), amount: 5000, categoryId: catMap["Rent"], vendor: "Landlord", description: "July rent", paymentMode: "Bank Transfer" },
    { date: new Date("2026-07-10"), amount: 800, categoryId: catMap["Shopping"], vendor: "Amazon", description: "Wireless mouse", paymentMode: "UPI" },
    { date: new Date("2026-07-12"), amount: 1500, categoryId: catMap["Health"], vendor: "Apollo Pharmacy", description: "Monthly medicines", paymentMode: "UPI" },
    { date: new Date("2026-07-15"), amount: 350, categoryId: catMap["Food & Dining"], vendor: "Starbucks", description: "Coffee meeting", paymentMode: "UPI" },
    { date: new Date("2026-07-18"), amount: 3000, categoryId: catMap["Travel"], vendor: "IRCTC", description: "Train tickets to Goa", paymentMode: "UPI" },
    { date: new Date("2026-07-20"), amount: 600, categoryId: catMap["Food & Dining"], vendor: "Dominos", description: "Weekend dinner", paymentMode: "UPI" },
  ]

  for (const exp of sampleExpenses) {
    await prisma.expense.create({
      data: { ...exp, profileId: testProfile.id },
    })
  }
  console.log(`  Created ${sampleExpenses.length} sample expenses`)

  // Income sources
  const incomeCategories = await prisma.category.findMany({ where: { type: "income" } })
  const incCatMap = Object.fromEntries(incomeCategories.map((c) => [c.name, c.id]))

  await prisma.incomeSource.create({
    data: { name: "Salary", type: "monthly", amount: 75000, categoryId: incCatMap["Salary"], profileId: testProfile.id, startDate: new Date("2026-01-01") },
  })
  await prisma.incomeSource.create({
    data: { name: "Freelance Project", type: "variable", amount: 15000, categoryId: incCatMap["Freelance"], profileId: testProfile.id, startDate: new Date("2026-03-01") },
  })
  console.log("  Created 2 income sources")

  // Budgets
  await prisma.budget.create({ data: { categoryId: catMap["Food & Dining"], month: 7, year: 2026, amount: 8000, profileId: testProfile.id } })
  await prisma.budget.create({ data: { categoryId: catMap["Groceries"], month: 7, year: 2026, amount: 5000, profileId: testProfile.id } })
  await prisma.budget.create({ data: { categoryId: catMap["Entertainment"], month: 7, year: 2026, amount: 3000, profileId: testProfile.id } })
  console.log("  Created 3 budgets")

  // Sample investments
  await prisma.investment.create({
    data: { name: "HDFC Mutual Fund", type: "Mutual Funds", amount: 50000, currentValue: 52300, profileId: testProfile.id, purchaseDate: new Date("2026-01-15") },
  })
  await prisma.investment.create({
    data: { name: "Reliance Industries", type: "Stocks/Shares", symbol: "RELIANCE", quantity: 10, buyPrice: 2450, amount: 24500, currentValue: 26100, profileId: testProfile.id, purchaseDate: new Date("2026-02-01") },
  })
  console.log("  Created 2 investments")

  // Subscription
  await prisma.subscription.create({
    data: { name: "Netflix", provider: "Netflix", amount: 499, billingCycle: "monthly", category: "entertainment", profileId: testProfile.id, status: "active", nextDueDate: new Date("2026-08-01") },
  })
  console.log("  Created 1 subscription")

  // Reminder
  await prisma.reminder.create({
    data: { title: "Pay Electricity Bill", type: "Bill", priority: "high", dueDate: new Date("2026-08-05"), amount: 2500, profileId: testProfile.id, isCompleted: false },
  })
  console.log("  Created 1 reminder")

  await prisma.$disconnect()
  console.log("\nTest database seeded successfully!")
  console.log("Users: test@example.com / test123 (free), admin@test.com / admin123 (admin)")
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
