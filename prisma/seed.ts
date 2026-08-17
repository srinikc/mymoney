import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Seed default categories if empty
  const catCount = await prisma.category.count()
  if (catCount === 0) {
    const defaultCategories = [
      { name: "Food & Dining", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Transportation", type: "expense", icon: "car", color: "#f97316" },
      { name: "Shopping", type: "expense", icon: "shopping-bag", color: "#eab308" },
      { name: "Bills & Utilities", type: "expense", icon: "file-text", color: "#22c55e" },
      { name: "Entertainment", type: "expense", icon: "film", color: "#3b82f6" },
      { name: "Health & Fitness", type: "expense", icon: "heart", color: "#ec4899" },
      { name: "Education", type: "expense", icon: "book", color: "#8b5cf6" },
      { name: "Travel", type: "expense", icon: "plane", color: "#06b6d4" },
      { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#84cc16" },
      { name: "Rent", type: "expense", icon: "home", color: "#64748b" },
      { name: "Income", type: "income", icon: "trending-up", color: "#22c55e" },
      { name: "Investment", type: "expense", icon: "trending-up", color: "#6366f1" },
      { name: "Other", type: "expense", icon: "more-horizontal", color: "#a1a1aa" },
    ]
    await prisma.category.createMany({ data: defaultCategories })
    console.log(`  Created ${defaultCategories.length} categories`)
  }

  // Load vendor mappings from bundled JSON (per-user: assign to first user)
  const mappingsPath = path.join(__dirname, "..", "data", "mappings.json")
  const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } })
  if (fs.existsSync(mappingsPath) && firstUser) {
    const mappingsData = JSON.parse(fs.readFileSync(mappingsPath, "utf-8"))
    let loaded = 0
    for (const m of mappingsData) {
      const existing = await prisma.vendorMapping.findUnique({
        where: { userId_vendorKey: { userId: firstUser.id, vendorKey: m.merchantKey ?? m.vendorKey } },
      })
      if (!existing) {
        await prisma.vendorMapping.create({
          data: {
            userId: firstUser.id,
            vendorKey: m.merchantKey ?? m.vendorKey,
            description: m.description ?? null,
            category: m.expenseType ?? m.category ?? null,
            subCategory: m.subCategory ?? null,
            person: m.person ?? null,
            source: "seed",
          },
        })
        loaded++
      }
    }
    console.log(`  Loaded ${loaded} vendor mappings for user ${firstUser.id} (${mappingsData.length} total in file)`)
  } else {
    console.log("  No mappings.json found or no user exists — skipping vendor mappings seed")
  }

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
