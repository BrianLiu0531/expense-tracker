import { fyLabel, fyMonths, fyRange, gstComponent, type Region } from './region.js';

export interface SummaryTransaction {
  type: 'INCOME' | 'EXPENSE';
  amountCents: number;
  category: string;
  date: Date;
  gstApplicable: boolean;
}

export interface Summary {
  fy: number;
  label: string;
  range: { from: string; to: string };
  totals: {
    income: number;
    expense: number;
    net: number;
    gstCollected: number;
    gstPaid: number;
    netGst: number;
  };
  monthly: { month: string; income: number; expense: number }[];
  expenseByCategory: { category: string; total: number }[];
}

export function buildSummary(
  transactions: SummaryTransaction[],
  region: Region,
  fy: number,
): Summary {
  const monthly = new Map(fyMonths(region, fy).map((m) => [m, { month: m, income: 0, expense: 0 }]));
  const byCategory = new Map<string, number>();
  let income = 0;
  let expense = 0;
  let gstCollected = 0;
  let gstPaid = 0;

  for (const t of transactions) {
    const bucket = monthly.get(t.date.toISOString().slice(0, 7));
    const gst = t.gstApplicable ? gstComponent(t.amountCents, region) : 0;
    if (t.type === 'INCOME') {
      income += t.amountCents;
      gstCollected += gst;
      if (bucket) bucket.income += t.amountCents;
    } else {
      expense += t.amountCents;
      gstPaid += gst;
      if (bucket) bucket.expense += t.amountCents;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amountCents);
    }
  }

  const { start, end } = fyRange(region, fy);
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  return {
    fy,
    label: fyLabel(fy),
    range: { from: start.toISOString().slice(0, 10), to: lastDay.toISOString().slice(0, 10) },
    totals: {
      income,
      expense,
      net: income - expense,
      gstCollected,
      gstPaid,
      netGst: gstCollected - gstPaid,
    },
    monthly: [...monthly.values()],
    expenseByCategory: [...byCategory.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}
