import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding test database...")

  // Clean slate
  await prisma.budget.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.incomeSource.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.category.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash("test123", 10)

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      role: "admin",
      tier: "premium",
      hashedPassword,
    },
  })
  console.log(`  Created user: ${user.email}`)

  const profile = await prisma.profile.create({
    data: {
      name: "Default Profile",
      userId: user.id,
      isDefault: true,
    },
  })
  console.log(`  Created profile: ${profile.name}`)

  const category = await prisma.category.create({
    data: {
      name: "Test Category",
      type: "expense",
      icon: "circle",
      color: "#6366f1",
    },
  })
  console.log(`  Created category: ${category.name}`)

  const expense = await prisma.expense.create({
    data: {
      date: new Date(),
      amount: 100,
      categoryId: category.id,
      description: "Test expense",
      paymentMode: "UPI",
      profileId: profile.id,
    },
  })
  console.log(`  Created expense: ₹${expense.amount}`)

  const budget = await prisma.budget.create({
    data: {
      categoryId: category.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: 5000,
      profileId: profile.id,
    },
  })
  console.log(`  Created budget: ₹${budget.amount}`)

  console.log("Test seed complete!")
}

main()
  .catch((e) => {
    console.error("Test seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
