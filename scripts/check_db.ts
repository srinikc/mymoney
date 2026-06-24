import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const mappings = await p.merchantMapping.count()
  const categories = await p.category.count()
  const expenses = await p.expense.count()
  console.log(`Mappings: ${mappings}, Categories: ${categories}, Expenses: ${expenses}`)
}
main().finally(() => p.$disconnect())
