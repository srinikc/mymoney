import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const sessions = await p.importSession.findMany({
  where: { source: { contains: 'gpay' } },
  orderBy: { createdAt: 'desc' },
  take: 5,
});

console.log('=== GPay Import Sessions ===');
for (const s of sessions) {
  console.log(`ID: ${s.id}, Source: ${s.source}, File: ${s.fileName}, Status: ${s.status}`);
  console.log(`  Total: ${s.totalRows}, Imported: ${s.autoMapped}, New Mappings: ${s.newMerchants}, Skipped: ${s.skipped}`);
  console.log(`  Created: ${s.createdAt}`);
  const count = await p.expense.count({ where: { importSessionId: s.id } });
  const minDate = await p.expense.aggregate({ where: { importSessionId: s.id }, _min: { date: true } });
  const maxDate = await p.expense.aggregate({ where: { importSessionId: s.id }, _max: { date: true } });
  console.log(`  Expenses in DB: ${count}`);
  console.log(`  Date range: ${minDate._min.date?.toISOString().split('T')[0]} to ${maxDate._max.date?.toISOString().split('T')[0]}`);
  console.log('');
}

const total = await p.expense.count();
const maxD = await p.expense.aggregate({ _max: { date: true } });
const minD = await p.expense.aggregate({ _min: { date: true } });
console.log('=== Overall ===');
console.log(`Total expenses: ${total}`);
console.log(`Date range: ${minD._min.date?.toISOString().split('T')[0]} to ${maxD._max.date?.toISOString().split('T')[0]}`);

await p.$disconnect();
