import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const [e, m] = await Promise.all([p.expense.count(), p.merchantMapping.count()]);
console.log('Expenses:', e);
console.log('Mappings:', m);
await p.$disconnect();
