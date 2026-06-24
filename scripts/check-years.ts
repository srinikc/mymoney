import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  // Check years API query
  const result = await p.$queryRawUnsafe(`SELECT DISTINCT CAST(strftime('%Y', date) AS INTEGER) as year FROM Expense ORDER BY year ASC`)
  console.log("Years from SQL:", JSON.stringify(result))

  // Count by year directly
  const all = await p.expense.findMany({ select: { date: true } })
  const byYear: Record<number, number> = {}
  let nullDates = 0
  for (const e of all) {
    if (!e.date) { nullDates++; continue }
    const y = e.date.getFullYear()
    byYear[y] = (byYear[y] || 0) + 1
  }
  console.log("Total records:", all.length)
  console.log("Null dates:", nullDates)
  console.log("By year (from JS):", JSON.stringify(byYear))

  await p.$disconnect().catch(() => {})
}
main()
