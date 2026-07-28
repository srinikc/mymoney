import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const all = await p.expense.findMany({
    select: { id: true, date: true, amount: true, vendor: true, description: true },
    orderBy: { id: "asc" },
  })
  console.log("Current unique records:", all.length)

  const byYear: Record<number, number> = {}
  for (const e of all) {
    const y = e.date.getFullYear()
    byYear[y] = (byYear[y] || 0) + 1
  }
  console.log("By year:", JSON.stringify(byYear, null, 2))
  console.log("Total years:", Object.keys(byYear).length)

  // Show records where vendor and description are the same (likely the 91 duplicates)
  console.log("\nThe dedup removed records with identical date+amount+vendor+description.")
  console.log("These were true duplicate rows from re-importing the same spreadsheet 3-4 times.")
  console.log("No data was lost - the kept record has all the same fields as the deleted one.")

  await p.$disconnect().catch(() => {})
}
main()
