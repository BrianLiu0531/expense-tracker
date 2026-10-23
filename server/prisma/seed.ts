import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'Demo1234!';

// Small deterministic PRNG so the demo data is the same on every seed
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));

const expenseTemplates = [
  { category: 'Rent', description: 'Weekly rent', min: 52000, max: 52000, perMonth: 4, gst: false },
  { category: 'Groceries', description: 'Woolworths', min: 4000, max: 16000, perMonth: 5, gst: true },
  { category: 'Transport', description: 'Opal top-up', min: 2000, max: 5000, perMonth: 3, gst: true },
  { category: 'Utilities', description: 'Electricity & internet', min: 9000, max: 18000, perMonth: 1, gst: true },
  { category: 'Dining', description: 'Lunch with friends', min: 1800, max: 7500, perMonth: 4, gst: true },
  { category: 'Entertainment', description: 'Cinema / streaming', min: 1500, max: 4500, perMonth: 2, gst: true },
  { category: 'Health', description: 'Pharmacy', min: 1200, max: 6000, perMonth: 1, gst: false },
];

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Demo User',
      region: 'AU',
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });

  const data: Prisma.TransactionCreateManyInput[] = [];
  const today = new Date();
  // ~14 months of history so both the current and previous FY have data
  for (let m = 13; m >= 0; m--) {
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() - m;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const lastDay = m === 0 ? today.getUTCDate() : daysInMonth;
    const day = (d: number) => new Date(Date.UTC(year, month, Math.min(d, lastDay)));

    data.push(
      { userId: user.id, type: 'INCOME', category: 'Salary', description: 'Salary — Acme Pty Ltd', amountCents: 412000, date: day(1) },
      { userId: user.id, type: 'INCOME', category: 'Salary', description: 'Salary — Acme Pty Ltd', amountCents: 412000, date: day(15) },
    );
    if (rand() < 0.5) {
      data.push({
        userId: user.id,
        type: 'INCOME',
        category: 'Freelance',
        description: 'Website build for local café',
        amountCents: between(40000, 150000),
        date: day(between(5, 25)),
        gstApplicable: true,
      });
    }
    for (const t of expenseTemplates) {
      for (let i = 0; i < t.perMonth; i++) {
        data.push({
          userId: user.id,
          type: 'EXPENSE',
          category: t.category,
          description: t.description,
          amountCents: between(t.min, t.max),
          date: day(between(1, daysInMonth)),
          gstApplicable: t.gst,
        });
      }
    }
  }

  await prisma.transaction.createMany({ data });
  console.log(`Seeded ${data.length} transactions for ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
