import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const e = await p.expense.deleteMany()
  const m = await p.merchantMapping.deleteMany()
  const s = await p.importSession.deleteMany()
  console.log(`Cleared: ${e.count} expenses, ${m.count} merchant mappings, ${s.count} import sessions`)
  await p.$disconnect()
}
main().catch((e) => { console.error(e); p.$disconnect() })
