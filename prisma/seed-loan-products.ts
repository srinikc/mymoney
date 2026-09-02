// Seed initial loan products from curated config.
// Idempotent: deletes existing and recreates.

import { PrismaClient } from "@prisma/client"
import { CURATED_LOANS } from "../src/lib/curated-loans"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding loan products...")

  // Delete existing
  await prisma.loanProduct.deleteMany({})

  // Insert from curated config
  for (const loan of CURATED_LOANS) {
    const affiliateUrl = `https://www.bankbazaar.com${loan.affiliateTargetPath}?ref=mymoney&utm_source=mymoney&utm_medium=affiliate&utm_campaign=${loan.affiliateUtm}`
    await prisma.loanProduct.create({
      data: {
        bankName: loan.bankName,
        productName: loan.productName,
        loanType: loan.loanType,
        interestRateMin: loan.interestRateMin,
        interestRateMax: loan.interestRateMax,
        maxAmount: loan.maxAmount,
        tenureMonths: loan.tenureMonths,
        processingFee: loan.processingFee,
        features: JSON.stringify(loan.features),
        affiliateUrl,
        affiliateNetwork: loan.affiliatePlatform,
        isActive: true,
        isSponsored: loan.isSponsored ?? false,
        displayOrder: loan.displayOrder ?? 0,
      },
    })
  }

  const count = await prisma.loanProduct.count()
  console.log(`✓ Seeded ${count} loan products`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
