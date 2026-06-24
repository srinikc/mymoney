import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
p.expense.deleteMany().then(r => {
  console.log("Deleted", r.count, "expenses")
  return p.$disconnect()
}).catch(e => {
  console.error(e)
  return p.$disconnect()
})
