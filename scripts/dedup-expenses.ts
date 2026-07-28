import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Fetching all expenses...")
  const all = await prisma.expense.findMany({
    select: { id: true, date: true, amount: true, vendor: true, description: true },
    orderBy: { id: "asc" },
  })
  console.log(`Total expenses: ${all.length}`)

  const seen = new Map<string, number>() // key -> keep-id
  const deleteIds: number[] = []

  for (const exp of all) {
    const key = `${exp.date.toISOString().split("T")[0]}|${exp.amount}|${exp.vendor ?? ""}|${exp.description ?? ""}`
    if (seen.has(key)) {
      deleteIds.push(exp.id)
    } else {
      seen.set(key, exp.id)
    }
  }

  if (deleteIds.length === 0) {
    console.log("No duplicates found.")
    return
  }

  console.log(`Deleting ${deleteIds.length} duplicate expenses...`)

  // Delete in batches to avoid overwhelming SQLite
  const BATCH = 500
  let deleted = 0
  for (let i = 0; i < deleteIds.length; i += BATCH) {
    const batch = deleteIds.slice(i, i + BATCH)
    const r = await prisma.expense.deleteMany({ where: { id: { in: batch } } })
    deleted += r.count
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: deleted ${r.count}`)
  }

  console.log(`Done. Deleted ${deleted} duplicate expenses. Remaining: ${all.length - deleted}`)
}

main()
  .catch((error) => {
    console.error("Dedup failed:", error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
