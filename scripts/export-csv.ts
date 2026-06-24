import { PrismaClient } from "@prisma/client"
import * as fs from "fs"

const p = new PrismaClient()
async function main() {
  const all = await p.expense.findMany({
    orderBy: [{ date: "asc" }, { id: "asc" }],
    include: { category: true },
  })
  console.log(`Total records: ${all.length}`)

  // Check for any remaining duplicates
  const seen = new Map<string, number[]>()
  for (const e of all) {
    const key = `${e.date.toISOString().split("T")[0]}|${e.amount}|${e.vendor ?? ""}|${e.description ?? ""}`
    if (!seen.has(key)) seen.set(key, [])
    seen.get(key)!.push(e.id)
  }
  const dups = [...seen.entries()].filter(([, ids]) => ids.length > 1)
  if (dups.length > 0) {
    console.log(`WARNING: ${dups.length} duplicate keys still exist!`)
    for (const [key, ids] of dups.slice(0, 5)) {
      console.log(`  ${key}: IDs ${ids.join(",")}`)
    }
  } else {
    console.log("No remaining duplicates. All keys are unique.")
  }

  // Total unique keys
  console.log(`Unique date|amount|vendor|description combinations: ${seen.size}`)

  // Export to CSV
  const header = "ID,Date,Amount,Vendor,Description,Category,SubCategory,Person,PaymentMode,RecurrenceType,Notes,ImportSessionID"
  const rows = all.map((e) =>
    [
      e.id,
      e.date.toISOString().split("T")[0],
      e.amount,
      `"${(e.vendor ?? "").replace(/"/g, '""')}"`,
      `"${(e.description ?? "").replace(/"/g, '""')}"`,
      `"${(e.category?.name ?? "").replace(/"/g, '""')}"`,
      `"${(e.subCategory ?? "").replace(/"/g, '""')}"`,
      `"${(e.person ?? "").replace(/"/g, '""')}"`,
      e.paymentMode,
      e.recurrenceType ?? "",
      `"${(e.notes ?? "").replace(/"/g, '""')}"`,
      e.importSessionId ?? "",
    ].join(",")
  )
  fs.writeFileSync("expenses-export.csv", [header, ...rows].join("\n"), "utf-8")
  console.log("\nExported to expenses-export.csv")

  // By year
  const byYear: Record<number, number> = {}
  for (const e of all) {
    const y = e.date.getFullYear()
    byYear[y] = (byYear[y] || 0) + 1
  }
  console.log("\nBy year:", JSON.stringify(byYear))

  await p.$disconnect().catch(() => {})
}
main()
