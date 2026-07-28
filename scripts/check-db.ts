import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const total = await p.expense.count()
  const yrs = await p.expense.findMany({ select: { date: true }, distinct: ["date"], orderBy: { date: "asc" } })
  const years = [...new Set(yrs.map((r) => r.date.getFullYear()))].sort()
  const byYear = await Promise.all(years.map(async (y) => {
    const c = await p.expense.count({ where: { date: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } } })
    return { year: y, count: c }
  }))
  console.log("Total:", total)
  console.log("Years:", years)
  console.log("By year:", JSON.stringify(byYear))
  const sessions = await p.importSession.findMany({ orderBy: { id: "desc" }, take: 10 })
  console.log("Recent sessions:", sessions.map((s) => ({ id: s.id, source: s.source, total: s.totalRows, imported: s.autoMapped, skipped: s.skipped, status: s.status })))
  await p.$disconnect()
}
main()
