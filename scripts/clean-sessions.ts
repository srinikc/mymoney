import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const bogus = await p.importSession.deleteMany({
    where: { status: "importing", autoMapped: 0 },
  })
  console.log(`Cleaned up ${bogus.count} bogus import sessions`)

  const remaining = await p.importSession.count()
  console.log(`Remaining sessions: ${remaining}`)

  const sessions = await p.importSession.findMany({ orderBy: { id: "desc" }, take: 5 })
  console.log("Recent sessions:", JSON.stringify(sessions, null, 2))

  await p.$disconnect().catch(() => {})
}
main()
