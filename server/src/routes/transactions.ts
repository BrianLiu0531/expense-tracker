import type { Prisma, Transaction } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http.js';
import { gstComponent } from '../lib/region.js';
import { getUserId } from '../middleware/auth.js';
import { listQuerySchema, transactionSchema } from '../schemas.js';

export const transactionsRouter = Router();

function serialize(t: Transaction) {
  return {
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    category: t.category,
    description: t.description,
    date: t.date.toISOString().slice(0, 10),
    gstApplicable: t.gstApplicable,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function buildWhere(userId: string, query: unknown): Prisma.TransactionWhereInput {
  const q = listQuerySchema.parse(query);
  return {
    userId,
    type: q.type,
    category: q.category || undefined,
    date: q.from || q.to ? { gte: q.from, lte: q.to } : undefined,
    description: q.search ? { contains: q.search, mode: 'insensitive' } : undefined,
  };
}

async function findOwned(userId: string, id: string) {
  const tx = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!tx) throw new HttpError(404, 'Transaction not found');
  return tx;
}

transactionsRouter.get('/', async (req, res) => {
  const { page, pageSize } = listQuerySchema.parse(req.query);
  const where = buildWhere(getUserId(req), req.query);
  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ items: items.map(serialize), total, page, pageSize });
});

function csvCell(value: string | number) {
  const s = String(value);
  // Quote cells and neutralise spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

transactionsRouter.get('/export.csv', async (req, res) => {
  const userId = getUserId(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const items = await prisma.transaction.findMany({
    where: buildWhere(userId, req.query),
    orderBy: { date: 'asc' },
  });

  const header = ['Date', 'Type', 'Category', 'Description', 'Amount', 'GST'];
  const rows = items.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.type,
      t.category,
      t.description ?? '',
      (t.amountCents / 100).toFixed(2),
      t.gstApplicable ? (gstComponent(t.amountCents, user.region) / 100).toFixed(2) : '0.00',
    ]
      .map(csvCell)
      .join(','),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send([header.join(','), ...rows].join('\r\n'));
});

transactionsRouter.post('/', async (req, res) => {
  const data = transactionSchema.parse(req.body);
  const tx = await prisma.transaction.create({ data: { ...data, userId: getUserId(req) } });
  res.status(201).json(serialize(tx));
});

transactionsRouter.put('/:id', async (req, res) => {
  const userId = getUserId(req);
  const data = transactionSchema.parse(req.body);
  await findOwned(userId, req.params.id);
  const tx = await prisma.transaction.update({ where: { id: req.params.id }, data });
  res.json(serialize(tx));
});

transactionsRouter.delete('/:id', async (req, res) => {
  const userId = getUserId(req);
  await findOwned(userId, req.params.id);
  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
