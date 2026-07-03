import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
p.merchantMapping.deleteMany({ where: { source: "kcexpenses" } })
  .then((r) => { console.log("Deleted", r.count, "auto-created mappings"); return p.$disconnect() })
  .catch((error) => { console.error(error); return p.$disconnect() })
