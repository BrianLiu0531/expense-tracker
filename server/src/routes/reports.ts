import { Router } from 'express';
import { prisma } from '../db.js';
import { fyForDate, fyRange } from '../lib/region.js';
import { buildSummary } from '../lib/summary.js';
import { getUserId } from '../middleware/auth.js';
import { summaryQuerySchema } from '../schemas.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', async (req, res) => {
  const userId = getUserId(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const { fy = fyForDate(user.region, new Date()) } = summaryQuerySchema.parse(req.query);
  const { start, end } = fyRange(user.region, fy);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    select: { type: true, amountCents: true, category: true, date: true, gstApplicable: true },
  });

  res.json(buildSummary(transactions, user.region, fy));
});
