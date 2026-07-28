import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const sessions = await p.session.findMany({ include: { user: true } })
  console.log("Sessions:", JSON.stringify(sessions, null, 2))
  await p.$disconnect()
}
main()
