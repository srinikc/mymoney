// AI Fund Scorer Cron
// Run daily to refresh AI scores for all curated funds.
// Usage: tsx scripts/cron-analyze-funds.ts

import { prisma } from "../src/lib/prisma"
import { UNIQUE_CURATED } from "../src/lib/curated-funds"
import { scoreFund } from "../src/lib/ai-fund-scorer"

async function main() {
  console.log(`[${new Date().toISOString()}] Starting AI fund scoring...`)
  let success = 0
  let failed = 0

  for (const fund of UNIQUE_CURATED) {
    try {
      const score = await scoreFund(fund.schemeCode)
      if (!score) {
        console.log(`  [skip] ${fund.schemeName} — insufficient data`)
        failed++
        continue
      }

      await prisma.fundMetadata.update({
        where: { schemeCode: fund.schemeCode },
        data: {
          aiScore: score.aiScore,
          aiScoreBreakdown: JSON.stringify(score.breakdown),
          aiSummary: score.summary,
          prosPoints: JSON.stringify(score.pros),
          consPoints: JSON.stringify(score.cons),
          lastAnalyzedAt: new Date(),
        },
      })
      console.log(`  [ok]   ${fund.schemeName} — score ${score.aiScore}/10`)
      success++

      // Be respectful to the free API
      await new Promise((r) => setTimeout(r, 200))
    } catch (e) {
      console.error(`  [err]  ${fund.schemeName} — ${(e as Error).message}`)
      failed++
    }
  }

  console.log(`[${new Date().toISOString()}] Done. ${success} success, ${failed} failed.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
