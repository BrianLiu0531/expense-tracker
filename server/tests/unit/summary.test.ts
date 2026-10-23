import { describe, expect, it } from 'vitest';
import { buildSummary, type SummaryTransaction } from '../../src/lib/summary.js';

const tx = (overrides: Partial<SummaryTransaction>): SummaryTransaction => ({
  type: 'EXPENSE',
  amountCents: 1000,
  category: 'Groceries',
  date: new Date('2025-08-10T00:00:00Z'),
  gstApplicable: false,
  ...overrides,
});

describe('buildSummary', () => {
  it('totals income, expenses and net', () => {
    const s = buildSummary(
      [tx({ type: 'INCOME', amountCents: 500000, category: 'Salary' }), tx({ amountCents: 120000 })],
      'AU',
      2026,
    );
    expect(s.totals).toMatchObject({ income: 500000, expense: 120000, net: 380000 });
  });

  it('calculates GST collected, paid and net payable', () => {
    const s = buildSummary(
      [
        tx({ type: 'INCOME', amountCents: 110000, gstApplicable: true }),
        tx({ amountCents: 22000, gstApplicable: true }),
        tx({ amountCents: 50000, gstApplicable: false }),
      ],
      'AU',
      2026,
    );
    expect(s.totals).toMatchObject({ gstCollected: 10000, gstPaid: 2000, netGst: 8000 });
  });

  it('buckets transactions by month and sorts categories by spend', () => {
    const s = buildSummary(
      [
        tx({ category: 'Rent', amountCents: 200000, date: new Date('2025-07-03T00:00:00Z') }),
        tx({ category: 'Dining', amountCents: 3000, date: new Date('2025-07-20T00:00:00Z') }),
        tx({ category: 'Dining', amountCents: 4000, date: new Date('2026-06-30T00:00:00Z') }),
      ],
      'AU',
      2026,
    );
    expect(s.monthly[0]).toEqual({ month: '2025-07', income: 0, expense: 203000 });
    expect(s.monthly[11]).toEqual({ month: '2026-06', income: 0, expense: 4000 });
    expect(s.expenseByCategory.map((c) => c.category)).toEqual(['Rent', 'Dining']);
    expect(s.range).toEqual({ from: '2025-07-01', to: '2026-06-30' });
  });
});
