import type { Region, TransactionType } from '../types';

export const REGIONS = {
  AU: { label: 'Australia', currency: 'AUD', locale: 'en-AU', gstRate: 0.1, fyStartMonth: 6, taxAuthority: 'ATO', fyName: 'financial year (1 Jul – 30 Jun)' },
  NZ: { label: 'New Zealand', currency: 'NZD', locale: 'en-NZ', gstRate: 0.15, fyStartMonth: 3, taxAuthority: 'IRD', fyName: 'tax year (1 Apr – 31 Mar)' },
} as const;

export const CATEGORIES: Record<TransactionType, string[]> = {
  INCOME: ['Salary', 'Freelance', 'Investment', 'Government', 'Gift', 'Other'],
  EXPENSE: ['Rent', 'Groceries', 'Transport', 'Utilities', 'Dining', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other'],
};

const formatters = new Map<Region, Intl.NumberFormat>();

export function formatMoney(cents: number, region: Region): string {
  let f = formatters.get(region);
  if (!f) {
    const { locale, currency } = REGIONS[region];
    f = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatters.set(region, f);
  }
  return f.format(cents / 100);
}

/** Parses "1,234.5" or "$12" into integer cents; returns null if invalid. */
export function parseDollars(input: string): number | null {
  const s = input.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [dollars, cents = ''] = s.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

export function gstOf(cents: number, region: Region): number {
  const rate = REGIONS[region].gstRate;
  return Math.round((cents * rate) / (1 + rate));
}

export function currentFY(region: Region, now = new Date()): number {
  return now.getMonth() >= REGIONS[region].fyStartMonth ? now.getFullYear() + 1 : now.getFullYear();
}

export function fyLabel(fy: number): string {
  return `FY${fy - 1}–${String(fy).slice(2)}`;
}

export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function formatDate(iso: string, region: Region): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(REGIONS[region].locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
