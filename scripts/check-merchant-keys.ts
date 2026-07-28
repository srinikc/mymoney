import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const mappings = await p.merchantMapping.findMany({ orderBy: { id: "desc" }, take: 10 })
  console.log("Last 10 created mappings:")
  for (const m of mappings) console.log(`  id=${m.id} key="${m.merchantKey}" desc="${m.description}" source="${m.source}"`)

  console.log("\nSample of first 10 mappings:")
  const first10 = await p.merchantMapping.findMany({ orderBy: { id: "asc" }, take: 10 })
  for (const m of first10) console.log(`  id=${m.id} key="${m.merchantKey}" desc="${m.description}" source="${m.source}"`)

  const sources = await p.merchantMapping.groupBy({ by: ["source"], _count: true })
  console.log("\nBy source:", JSON.stringify(sources))

  const uniqueKeys = new Set(mappings.map(m => m.merchantKey))
  console.log(`\nUnique merchant keys: ${uniqueKeys.size} (total mappings: ${mappings.length})`)

  await p.$disconnect()
}
main().catch(error => { console.error(error); p.$disconnect() })
