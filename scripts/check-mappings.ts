import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
Promise.all([
  p.merchantMapping.count(),
  p.expense.count(),
  p.expense.count({ where: { flagged: true } }),
]).then(([mappings, expenses, flagged]) => {
  console.log("Merchant mappings:", mappings)
  console.log("Total expenses:", expenses)
  console.log("Flagged expenses:", flagged)
  return p.$disconnect()
}).catch((error) => {
  console.error(error)
  return p.$disconnect()
})
