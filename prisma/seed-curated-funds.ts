// Seed initial FundMetadata rows from curated config.
// AI scores are not computed here — run scripts/cron-analyze-funds.ts separately.

import { PrismaClient } from "@prisma/client"
import { UNIQUE_CURATED } from "../src/lib/curated-funds"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding curated fund metadata...")

  let created = 0
  let updated = 0

  for (const fund of UNIQUE_CURATED) {
    const existing = await prisma.fundMetadata.findUnique({
      where: { schemeCode: fund.schemeCode },
    })

    if (existing) {
      await prisma.fundMetadata.update({
        where: { schemeCode: fund.schemeCode },
        data: {
          schemeName: fund.schemeName,
          fundHouse: fund.fundHouse,
          category: fund.category,
          subCategory: fund.subCategory,
          isCurated: true,
        },
      })
      updated++
    } else {
      await prisma.fundMetadata.create({
        data: {
          schemeCode: fund.schemeCode,
          schemeName: fund.schemeName,
          fundHouse: fund.fundHouse,
          category: fund.category,
          subCategory: fund.subCategory,
          aiScore: 0,
          isCurated: true,
        },
      })
      created++
    }
  }

  console.log(`✓ Created ${created} fund metadata rows, updated ${updated}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
