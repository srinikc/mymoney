import { PrismaClient, Prisma } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

interface KeywordEntry {
  pattern: string
  subCategory: string
  priority: number
}

interface CategoryConfig {
  name: string
  type: string
  icon: string
  color: string
  keywords: KeywordEntry[]
}

async function main() {
  console.log("Seeding categories with auto-categorize keywords...")

  const configPath = path.join(__dirname, "categories.json")
  if (!fs.existsSync(configPath)) {
    console.error("  categories.json not found at", configPath)
    process.exit(1)
  }

  const categories: CategoryConfig[] = JSON.parse(fs.readFileSync(configPath, "utf-8"))
  let created = 0
  let updated = 0
  let skipped = 0

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } })

    if (existing) {
      // Update keywords if category exists but has no keywords
      if (!existing.keywords) {
        await prisma.category.update({
          where: { id: existing.id },
          data: { keywords: cat.keywords as unknown as Prisma.InputJsonValue },
        })
        updated++
        console.log(`  Updated: ${cat.name} (added ${cat.keywords.length} keywords)`)
      } else {
        skipped++
      }
    } else {
      // Create new category with keywords
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          keywords: cat.keywords as unknown as Prisma.InputJsonValue,
        },
      })
      created++
      console.log(`  Created: ${cat.name} (${cat.keywords.length} keywords)`)
    }
  }

  console.log(`\nSeed complete: ${created} created, ${updated} updated, ${skipped} skipped`)
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
